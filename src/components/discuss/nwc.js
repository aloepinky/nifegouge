// Notes, warnings and cautions in an emergency procedure.
//
// A section with `ep: true` renders its list as a checklist: numbered steps, with any list entry
// carrying `kind` drawn as a NATOPS note, warning or caution in the same boxes the EPs/Limits
// page uses (NWC_BUBBLE_STYLES in TW4Cockpit.js). An entry with `kind` is never numbered. It sits
// under the step it belongs to as a sub-entry, or at the top level where NATOPS prints it for the
// whole procedure. Its `text` holds the words only; the label comes from `kind`.
//
// Only an entry the publication labels NOTE, WARNING or CAUTION is one. Other text printed beside
// a step stays an ordinary sub-entry.

export const NWC_KINDS = ['warning', 'caution', 'note'];

export const NWC_LABELS = { warning: 'WARNING', caution: 'CAUTION', note: 'NOTE' };

const PREFIX = /^\s*(WARNING|CAUTION|NOTE)\s*:\s*/;

// "CAUTION: Higher power settings…" → { kind: 'caution', text: 'Higher power settings…' }.
// Case-sensitive on purpose: the publication prints the label in capitals.
function fromPrefix(entry) {
  if (entry.kind) return entry;
  const m = PREFIX.exec(entry.text || '');
  if (!m) return entry;
  return { ...entry, kind: m[1].toLowerCase(), text: entry.text.slice(m[0].length) };
}

function toPrefix(entry) {
  if (!entry.kind) return entry;
  const out = { ...entry, text: `${NWC_LABELS[entry.kind]}: ${entry.text || ''}` };
  delete out.kind;
  return out;
}

const mapList = (items, fn) =>
  items && items.map((x) => {
    const y = fn(x);
    return x.sub ? { ...y, sub: mapList(x.sub, fn) } : y;
  });

// Turn a list into an EP. Entries and paragraphs whose text opens with a capitalised label become
// notes, warnings and cautions; a labelled paragraph moves to the top of the list, which is where
// it rendered before.
export function toEp(section) {
  const out = { ...section, ep: true };
  delete out.numbered;
  const paras = section.paras || [];
  const moved = paras.filter((p) => PREFIX.test(p.text || '')).map((p) => fromPrefix({ id: p.id, text: p.text, refs: p.refs }));
  const kept = paras.filter((p) => !PREFIX.test(p.text || ''));
  out.paras = kept.length ? kept : undefined;
  const items = [...moved, ...(mapList(section.items, fromPrefix) || [])];
  out.items = items.length ? items : undefined;
  return out;
}

// Turn an EP back into a plain list, keeping each label in the text so nothing is lost.
export function fromEp(section, numbered) {
  const out = { ...section, items: mapList(section.items, toPrefix) };
  delete out.ep;
  if (numbered) out.numbered = true;
  else delete out.numbered;
  if (!out.items) delete out.items;
  return out;
}
