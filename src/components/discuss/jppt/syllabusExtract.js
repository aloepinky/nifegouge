import { expand, blockOf } from './flowExtract';

// Stages, blocks, events and each event's discuss items, read out of a JPPT's text.
//
// Every JPPT prints its syllabus chapters the same way, which is what makes this possible:
//
//   Chapter IV                       a stage: the chapter number, its title on the next line
//   Familiarization Training
//   Blk #  Media  Title  Events  Hrs  H/X      a block: the header row, its values beneath
//   FAM22  UTD/OFT  Familiarization ...  2  2.6  1.3
//   1. Prerequisites                 numbered sections, in this order
//   2. Syllabus Notes / 2. Events
//   3. Special Syllabus Requirements
//   4. Discuss Items                 "None.", one running sentence, or per-event paragraphs
//   5. Block MIF
//
// The output is good, not perfect: the table cells are read by position and the item lists by
// splitting a sentence, and both have exceptions. What has to be right at publish time is the
// flow, and the flow editor is where that gets fixed; everything here is community-editable
// later.

const EVENT_ID = /^[A-Z]{1,3}\d{4}[A-Z]?$/;
const BLOCK_ID = /^[A-Z]{1,3}\d{2}$/;
const EVENT_TOKEN = /\b([A-Z]{1,3}\d{4})[A-Z]?(?:-(\d{1,2}))?\b/g;
const THROUGH = /\b([A-Z]{1,3})(\d{4})[A-Z]?\s+through\s+\1(\d{4})\b/g;

// Running heads and feet: the instruction number, its date, the page number, blank pages.
const FURNITURE = [
  /^CNATRAINST\s+\S+$/,
  /^\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}$/,
  /^[IVX]+-\d+$/,
  /^BLANK PAGE$/i,
  /^MIF continued on next page\.?$/i,
  /^Change\s+\d+$/i,
];

const SECTION = /^(\d)\.\s*(Prerequisites|Events|Syllabus Notes|Special Syllabus Requirements|Discuss Items|Block MIF)\b\.?\s*(.*)$/i;

const MEDIA_WORDS = new Set([
  'Class', 'Sqdn', 'Lect', 'CAI', 'MIL', 'Offline', 'UTD', 'OFT', 'VTD', 'T-6B', 'UTD/ER',
  'CAI/MIL', 'CAI/MIL/', '/Lect', 'Lect/CAI', 'Flt', 'Sim',
]);

const isFurniture = (text) => FURNITURE.some((re) => re.test(text));

// Wordings the Delta registry already treats as one item even though they contain a comma or
// an "and": "ATF, ATS, CTS and MIF", "brief and debrief", "smoke and fume elimination". They
// come from the loaded syllabus and item index (jppt/matchItems.js protectedPhrases) and are
// set for the duration of one extractSyllabus() call.
let PROTECTED = [];
// The phrase matcher (jppt/matchItems.js buildMatcher), set the same way; the splitter asks it
// whether a segment is already a wording some page answers to.
let MATCHER = null;
const matchDetail = (label) => (MATCHER ? MATCHER.matchDetail(label) : { target: null, how: null });

function joinLines(lines) {
  return lines.reduce((out, t) => {
    if (!out) return t;
    return /[A-Za-z]-$/.test(out) && !/\s-$/.test(out) ? out + t : `${out} ${t}`;
  }, '').replace(/\s+/g, ' ').trim();
}

// " and " outside parentheses: "precautionary emergency landing (PEL) and BFI" is two items,
// "(SID/STAR, holding, and approach)" is part of one.
function splitAnd(part) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < part.length; i += 1) {
    const ch = part[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0 && /^\s+and\s+/i.test(part.slice(i)) && /\s/.test(ch)) {
      const m = /^\s+and\s+/i.exec(part.slice(i));
      out.push(part.slice(start, i).trim());
      start = i + m[0].length;
      i = start - 1;
    }
  }
  out.push(part.slice(start).trim());
  return out.filter(Boolean);
}

// "a, b, c and d." -> ['a', 'b', 'c', 'd'], keeping the protected wordings whole.
export function splitItems(sentence) {
  let text = sentence.replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  text = text.replace(/^discuss\s+/i, '');
  // A lead-in before the list: "Discussion items will be at the discretion of the squadron.
  // Some examples may include inflight split, ..., etc." Keep the last sentence, less its opener.
  const sentences = text.split(/\.\s+(?=[A-Z])/);
  if (sentences.length > 1) text = sentences[sentences.length - 1];
  text = text.replace(/^(?:some\s+)?examples\s+(?:may\s+)?include\s+/i, '').replace(/,?\s*etc\.?$/i, '');
  if (!text) return [];

  const COMMA = '\u0001';
  const AND = '\u0002';
  const lower = text.toLowerCase();
  const guard = [];
  PROTECTED.forEach((phrase) => {
    let from = 0;
    let at;
    while ((at = lower.indexOf(phrase, from)) !== -1) {
      const start = at;
      const end = at + phrase.length;
      const before = start === 0 || /[\s,(]/.test(lower[start - 1]);
      const after = end === lower.length || /[\s,.)]/.test(lower[end]);
      if (before && after && !guard.some(([s, e]) => start < e && end > s)) {
        guard.push([start, end]);
      }
      from = at + phrase.length;
    }
  });
  let masked = '';
  for (let i = 0; i < text.length; i += 1) {
    const inGuard = guard.some(([s, e]) => i >= s && i < e);
    if (inGuard && text[i] === ',') masked += COMMA;
    else masked += text[i];
  }
  guard.forEach(([s, e]) => {
    masked = masked.slice(0, s) + masked.slice(s, e).replace(/ and /gi, (m) => m.replace(/ /g, AND)) + masked.slice(e);
  });

  // Commas and semicolons separate items, except inside parentheses: "flight planning (submit a
  // DD-1801 and jet log: an en route holding delay (1st leg), and terminal delay (2nd leg))".
  const segments = [];
  let depth = 0;
  let cur = '';
  for (const ch of masked) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) {
      segments.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  segments.push(cur.trim());
  for (let k = segments.length - 1; k >= 0; k -= 1) if (!segments[k]) segments.splice(k, 1);
  const out = [];
  segments.forEach((seg, i) => {
    const part = seg.replace(/^and\s+/i, '');
    const last = i === segments.length - 1;
    // An "and" inside the last segment is the list's own conjunction unless the whole
    // segment is already a wording some page answers to.
    const plain = part.split(COMMA).join(',').split(AND).join(' ');
    const halves = last ? splitAnd(part) : [part];
    if (halves.length > 1 && matchDetail(plain).how !== 'exact') {
      halves.forEach((p) => out.push(p));
    } else {
      out.push(part);
    }
  });
  return out
    .map((s) => s.split(COMMA).join(',').split(AND).join(' ').trim())
    .filter(Boolean);
}

// The event ids a block's own text names. `tableIds` are the ids its "2. Events" table lists,
// which is the authority on what the block actually holds.
//
// A range in prose spans the block's NUMBERING rather than its event list, and the two are not
// the same: the T-44C syllabi write prerequisites as "G0301 prior to G0401-90 (in order)",
// where 90 is an exam event and the block holds four events, not ninety. So an id that only a
// range produced has to be one the table names; an id written out on its own is kept as it was.
// A block whose table would not parse keeps everything, which is what this did before.
function eventIdsIn(text, blockId, tableIds = null) {
  const ids = [];
  const ranged = new Set();
  const add = (id, fromRange) => {
    if (blockOf(id) !== blockId) return;
    if (!ids.includes(id)) {
      ids.push(id);
      if (fromRange) ranged.add(id);
    } else if (!fromRange) {
      ranged.delete(id);
    }
  };
  let m;
  THROUGH.lastIndex = 0;
  while ((m = THROUGH.exec(text)) !== null) {
    const start = parseInt(m[2], 10);
    const stop = parseInt(m[3], 10);
    for (let n = start; n <= stop && n - start < 100; n += 1) add(`${m[1]}${String(n).padStart(4, '0')}`, true);
  }
  EVENT_TOKEN.lastIndex = 0;
  while ((m = EVENT_TOKEN.exec(text)) !== null) {
    const label = m[2] ? `${m[1]}-${m[2]}` : m[1];
    const spanned = expand(label);
    spanned.forEach((id) => add(id, spanned.length > 1));
  }
  if (!tableIds || !tableIds.size) return ids;
  return ids.filter((id) => !ranged.has(id) || tableIds.has(id));
}

const center = (w) => (w.x + w.x2) / 2;

// The block header table, read by column position. Column widths vary page to page and cells
// wrap onto a second line, so each word goes to the header it sits nearest to.
function readHeader(headerLine, rows) {
  const hw = headerLine.words;
  const find = (t) => hw.find((w) => w.text.toLowerCase() === t.toLowerCase());
  const media = find('Media');
  const title = find('Title');
  const events = find('Events');
  const hrs = find('Hrs');
  const hx = find('H/X');
  const name = find('Name');

  const words = rows.flatMap((l) => l.words);
  const idWord = words.find((w) => BLOCK_ID.test(w.text));
  const out = { id: idWord ? idWord.text : null, media: [], title: [], blkName: [], numbers: [] };

  const nums = [];
  words.forEach((w) => {
    if (w === idWord) return;
    if (/^\d+(\.\d+)?$/.test(w.text)) {
      nums.push(w);
      return;
    }
    const c = center(w);
    // The media cell is one short token naming a device (Class, OFT, T-44C, Sqdn/Lect), set
    // under its own header. The title is long and left-aligned in a wide column, so its first
    // word can start well left of the centred word "Title" — which is why the boundary is the
    // media column's own span rather than the midpoint between the two headers. At the
    // midpoint, "Crew Resource Management" came out as media "Class Crew", and "Search and
    // Rescue Fundamentals" as media "OFT Search". The tolerance is a header word's width, so
    // it scales with the type rather than being a number in points.
    const reach = media ? Math.max(media.x2 - media.x, 12) : 0;
    if (name && c >= (hrs ? (hrs.x2 + name.x) / 2 : name.x - 20)) out.blkName.push(w.text);
    else if (media && title && c < (media.x2 + title.x) / 2 && c <= media.x2 + reach) out.media.push(w.text);
    else out.title.push(w.text);
  });

  // Each number goes to its nearest numeric column, and each column keeps the closest one: a
  // title can end in a digit ("Systems 1"), and that digit sits further from the Events
  // column than the event count does.
  const cols = [['events', events], ['hours', hrs], ['hx', hx]].filter(([, w]) => w);
  const closest = {};
  nums.forEach((w) => {
    let best = null;
    cols.forEach(([k, hwd]) => {
      const d = Math.abs(center(w) - center(hwd));
      if (!best || d < best.d) best = { k, d };
    });
    if (best && (!closest[best.k] || best.d < closest[best.k].d)) closest[best.k] = { d: best.d, w };
  });
  Object.entries(closest).forEach(([k, { w }]) => { out[k] = parseFloat(w.text); });
  // A title digit that lost its column is still part of the title.
  nums.filter((w) => !Object.values(closest).some((c) => c.w === w)).forEach((w) => {
    if (title && center(w) < center(events || hrs || w) - 8) out.title.push(w.text);
  });
  return out;
}

function sectionsOf(lines) {
  const sections = {};
  let cur = null;
  lines.forEach((line) => {
    const m = SECTION.exec(line.text);
    if (m) {
      cur = m[2].toLowerCase();
      sections[cur] = { inline: m[3].trim(), lines: [] };
      return;
    }
    if (cur) sections[cur].lines.push(line);
  });
  return sections;
}

function listText(section) {
  if (!section) return '';
  const parts = [section.inline, ...section.lines.map((l) => l.text)].filter(Boolean);
  const text = joinLines(parts);
  if (/^none\.?$/i.test(text)) return '';
  return text;
}

// "a. FAM2102 (...). b. PR0105 (...)." -> "FAM2102 (...); PR0105 (...)"
function prereqText(section) {
  const text = listText(section);
  return text
    .split(/(?:^|\s)[a-z]\.\s+/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .join('; ');
}

function eventTitles(section) {
  const titles = {};
  if (!section) return titles;
  section.lines.forEach((line) => {
    const [first, ...rest] = line.words.map((w) => w.text);
    if (!first || !EVENT_ID.test(first)) return;
    const words = [...rest];
    while (words.length && MEDIA_WORDS.has(words[0])) words.shift();
    // Trailing columns: the block name code, then the hours. One of each, so a title ending in a
    // digit ("Familiarization Flight 0") keeps it.
    if (words.length > 1 && /^[A-Z]{2,}\d*$/.test(words[words.length - 1])) words.pop();
    if (words.length > 1 && /^\d+\.\d+$/.test(words[words.length - 1])) words.pop();
    const id = first.replace(/^([A-Z]{1,3}\d{4})[A-Z]$/, '$1');
    if (!titles[id] && words.length) titles[id] = words.join(' ').replace(/\.$/, '');
  });
  return titles;
}

// Per-event paragraphs under "4. Discuss Items", or one sentence for the whole block.
function discussItems(section, eventIds) {
  if (!section) return { briefed: false, byEvent: {} };
  const inline = section.inline.trim();
  if (/^none\.?$/i.test(inline)) return { briefed: false, byEvent: {} };

  const byEvent = {};
  const blockWide = inline ? [inline] : [];
  let current = null;
  section.lines.forEach((line) => {
    const tokens = line.text.split(/[\s,]+/).filter((t) => t && !/^and$/i.test(t));
    const ids = tokens.length && tokens.every((t) => /^[A-Z]{1,3}\d{4}[A-Z]?(-\d{1,2})?$/.test(t))
      ? tokens.flatMap((t) => expand(t.replace(/^([A-Z]{1,3}\d{4})[A-Z]/, '$1')))
      : null;
    if (ids && ids.length) {
      current = ids;
      ids.forEach((id) => { byEvent[id] = byEvent[id] || []; });
      return;
    }
    if (current) current.forEach((id) => byEvent[id].push(line.text));
    else blockWide.push(line.text);
  });

  const out = {};
  const toItems = (parts) => {
    const text = joinLines(parts);
    if (!text || /^none\.?$/i.test(text) || /^per\s/i.test(text)) return [];
    return splitItems(text);
  };
  const shared = toItems(blockWide);
  // An event gets a row only if the JPPT names items for it, or for its whole block: G01's
  // entry names G0102 alone, and its other seven events have nothing to open.
  eventIds.forEach((id) => {
    if (byEvent[id]) out[id] = toItems(byEvent[id]);
    else if (blockWide.length) out[id] = shared;
  });
  const briefed = blockWide.length > 0 || Object.keys(byEvent).length > 0;
  return { briefed, byEvent: out };
}

function stageIdFor(chapter, blocks) {
  const prefix = (b) => b.id.replace(/\d+$/, '');
  const pool = blocks.filter((b) => b.hx != null);
  const counts = {};
  (pool.length ? pool : blocks).forEach((b) => { counts[prefix(b)] = (counts[prefix(b)] || 0) + 1; });
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : chapter;
}

// pages: from pdfText.loadTextPages. -> { stages, blocks, events, source, warnings }
export function extractSyllabus(pages, { phrases = [], matcher = null } = {}) {
  PROTECTED = phrases;
  MATCHER = matcher;
  const warnings = [];
  const lines = [];
  pages.forEach((page, p) => page.forEach((line) => {
    if (!isFurniture(line.text)) lines.push({ ...line, page: p + 1 });
  }));

  // The instruction number and date come from the running head, which every page prints
  // as a line of its own. The first mention in the text is often the superseded revision
  // ("cancels CNATRAINST 1542.166D"), so the most frequent head wins.
  const commonest = (re) => {
    const counts = new Map();
    pages.forEach((pg) => pg.forEach((l) => {
      const t = l.text.trim();
      if (re.test(t)) counts.set(t, (counts.get(t) || 0) + 1);
    }));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)[0] || null;
  };
  const instruction = commonest(/^CNATRAINST\s+[\d.]+[A-Z]?$/)
    || (pages.flat().map((l) => l.text).join('\n').match(/CNATRAINST\s+[\d.]+[A-Z]?/) || [])[0]
    || null;
  const date = commonest(/^\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}$/);

  // Chapters, then blocks within each chapter.
  const chapters = [];
  let chapter = null;
  let block = null;
  lines.forEach((line, i) => {
    const ch = /^Chapter\s+([IVX]+)$/.exec(line.text);
    if (ch) {
      const next = lines.slice(i + 1).find((l) => l.text.trim());
      chapter = { roman: ch[1], title: next ? next.text : '', blocks: [] };
      chapters.push(chapter);
      block = null;
      return;
    }
    if (!chapter) return;
    if (/^Blk\s*#/.test(line.text)) {
      block = { header: line, lines: [] };
      chapter.blocks.push(block);
      return;
    }
    if (block) block.lines.push(line);
  });

  const stages = [];
  const blocks = [];
  const events = [];

  chapters.forEach((chap) => {
    const built = [];
    chap.blocks.forEach((raw) => {
      const firstSection = raw.lines.findIndex((l) => SECTION.test(l.text));
      const headerRows = firstSection === -1 ? raw.lines.slice(0, 4) : raw.lines.slice(0, firstSection);
      const head = readHeader(raw.header, headerRows);
      if (!head.id) {
        warnings.push(`A block header on page ${raw.header.page} has no block id.`);
        return;
      }
      const body = firstSection === -1 ? [] : raw.lines.slice(firstSection);
      const sections = sectionsOf(body);
      const bodyText = body.map((l) => l.text).join('\n');

      const titles = eventTitles(sections.events);
      let ids = eventIdsIn(bodyText, head.id, new Set(Object.keys(titles)));
      const tableOrder = Object.keys(titles).filter((id) => ids.includes(id));
      ids = [...tableOrder, ...ids.filter((id) => !tableOrder.includes(id)).sort()];
      if (head.events != null && ids.length !== head.events) {
        warnings.push(`${head.id}: the header counts ${head.events} events and ${ids.length} were found (${ids.join(', ') || 'none'}).`);
      }

      const discuss = discussItems(sections['discuss items'], ids);
      const row = {
        id: head.id,
        stage: null,
        media: head.media.join(' ').replace(/\s*\/\s*/g, '/') || null,
        title: head.title.join(' ') || head.id,
        hours: head.hours != null ? head.hours : null,
        events: ids.map((id) => (titles[id] ? { id, title: titles[id] } : { id })),
        briefed: discuss.briefed,
      };
      if (head.hx != null) row.hx = head.hx;
      const blkName = head.blkName.join(' ');
      if (blkName) row.blkName = blkName;
      const prereqs = prereqText(sections.prerequisites);
      if (prereqs) row.prereqs = prereqs;
      built.push(row);

      if (discuss.briefed) {
        const notes = listText(sections['syllabus notes']);
        ids.filter((id) => discuss.byEvent[id]).forEach((id) => {
          events.push({
            id,
            title: titles[id] || row.title,
            block: row.blkName && row.blkName !== 'See Below' ? row.blkName : row.id,
            media: row.media,
            hours: row.hx != null ? row.hx : null,
            prereqs: row.prereqs || null,
            syllabusNotes: notes || null,
            items: (discuss.byEvent[id] || []).map((label) => ({ label })),
          });
        });
      }
    });

    if (!built.length) return;
    const stageId = stageIdFor(chap.roman, built);
    const id = stages.some((s) => s.id === stageId) ? `${stageId}-${chap.roman}` : stageId;
    stages.push({ id, label: chap.title, weight: null, graded: !/ground/i.test(chap.title), chapter: chap.roman });
    built.forEach((b) => { b.stage = id; blocks.push(b); });
  });

  if (!blocks.length) warnings.push('No training blocks were found in the text.');

  return {
    stages,
    blocks,
    events,
    source: { instruction, date },
    warnings,
  };
}
