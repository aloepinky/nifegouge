import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmButton, Grow, Line, RowTools, move, useEscape } from '../discuss/edit/fields';
import { getAuthor, setAuthor } from '../serverApi';
import { MARK, applyEdit, inlineHtml, sameWording } from './rules';
import { publishEdit } from './courseRulesApi';

// Edits one map feature's words: its course rule (with the quiz blanks marked in it), its
// radio calls, its example comms and, for an airfield, the airfield's card. One publish bar at
// the foot sends them all as one revision of the wing's document.
//
// Edits are kept in this browser as they are typed (`courseRulesDraft:<id>`), so a closed tab
// or a refused publish loses nothing; publishing or discarding clears them.

const DRAFT_PREFIX = 'courseRulesDraft:';

const readDraft = (id) => {
  try {
    return JSON.parse(window.localStorage.getItem(DRAFT_PREFIX + id) || 'null');
  } catch (err) {
    return null;
  }
};
const writeDraft = (id, draft) => {
  try {
    if (draft) window.localStorage.setItem(DRAFT_PREFIX + id, JSON.stringify(draft));
    else window.localStorage.removeItem(DRAFT_PREFIX + id);
  } catch (err) {
    // Private mode: the edit still publishes, it just isn't kept.
  }
};

const copy = (o) => JSON.parse(JSON.stringify(o));

function fromDoc(doc, id) {
  const leg = (doc.legs && doc.legs[id]) || {};
  return {
    rule: copy(leg.rule || []),
    comms: copy(leg.comms || []),
    examples: copy(leg.examples || []),
    page: leg.page || '',
    card: doc.airfields && doc.airfields[id] ? copy(doc.airfields[id]) : null,
  };
}

// What the server will refuse, said before it is sent.
function problemsOf(edit) {
  const out = [];
  edit.rule.forEach((p, i) => {
    const text = p.text || '';
    if (!text.trim()) out.push(`Course rule paragraph ${i + 1} is empty.`);
    const open = text.split('[[').length - 1;
    if (open !== text.split(']]').length - 1 || open !== (text.match(MARK) || []).length) {
      out.push(`Course rule paragraph ${i + 1} has a quiz blank that isn't closed with ]].`);
    }
  });
  edit.comms.forEach((c, i) => { if (!(c.text || '').trim()) out.push(`Radio call ${i + 1} has no words.`); });
  edit.examples.forEach((b, i) => {
    if (!(b.title || '').trim()) out.push(`Example ${i + 1} has no title.`);
    b.lines.forEach((l, j) => {
      if (!((l.text ?? l.note ?? l.label ?? l.manual) || '').trim()) out.push(`Example ${i + 1}, line ${j + 1} is empty.`);
    });
  });
  if (edit.card) {
    if (!(edit.card.title || '').trim()) out.push('The airfield card has no title.');
    edit.card.blocks.forEach((b, i) => {
      if (!(b.heading || '').trim() && !b.lines.length) out.push(`Airfield card block ${i + 1} is empty.`);
    });
  }
  return out;
}

// The leg as it goes into the document: blank optional fields dropped.
function legOf(edit) {
  const trim = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null && v !== false));
  return {
    rule: edit.rule.map((p) => trim({ text: p.text.trim(), heading: !!p.heading })),
    comms: edit.comms.map((c) => trim({ when: c.when, radio: c.radio, who: c.who, text: c.text, after: c.after })),
    examples: edit.examples.map((b) => trim({ ...b, lines: b.lines.map(trim) })),
    page: edit.page,
  };
}

function cardOf(edit) {
  if (!edit.card) return null;
  return {
    title: edit.card.title,
    blocks: edit.card.blocks.map((b) => {
      const out = { lines: b.lines.map((l) => l.trim()).filter(Boolean) };
      if ((b.heading || '').trim()) out.heading = b.heading.trim();
      if (b.warning) out.warning = true;
      return out;
    }),
  };
}

// ---------------------------------------------------------------------------------------

function Preview({ text, heading }) {
  // inlineHtml escapes everything it is given before adding its own <b>.
  const html = inlineHtml(text);
  return heading
    ? <u className="cr-edit-preview" dangerouslySetInnerHTML={{ __html: html }} />
    : <span className="cr-edit-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

// Wraps the selected words in [[ ]], or takes the marks off a blank the cursor is in.
function toggleBlank(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  for (const m of text.matchAll(MARK)) {
    if (start >= m.index && end <= m.index + m[0].length) {
      return text.slice(0, m.index) + m[1] + text.slice(m.index + m[0].length);
    }
  }
  if (start === end) return null;
  let a = start;
  let b = end;
  while (a < b && text[a] === ' ') a += 1;
  while (b > a && text[b - 1] === ' ') b -= 1;
  const words = text.slice(a, b);
  if (!words || /\[\[|\]\]/.test(words)) return null;
  return `${text.slice(0, a)}[[${words}]]${text.slice(b)}`;
}

function RuleParagraph({ p, index, count, onChange, onMove, onRemove }) {
  const ref = useRef(null);
  return (
    <div className="discuss-editor-block">
      <div className="discuss-editor-blockhead">
        <label className="discuss-editor-check">
          <input type="checkbox" checked={!!p.heading} onChange={(e) => onChange({ ...p, heading: e.target.checked })} />
          {' '}Subheading
        </label>
        {!p.heading && (
          <button
            type="button"
            className="discuss-editor-add"
            title="Select words in the text, then click to make them a quiz blank. Click inside a blank to remove it."
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const area = ref.current && ref.current.querySelector('textarea');
              const next = area && toggleBlank(area, p.text || '');
              if (next != null) onChange({ ...p, text: next });
            }}
          >
            Quiz blank
          </button>
        )}
        <RowTools index={index} count={count} onMove={onMove} onRemove={onRemove} what="paragraph" />
      </div>
      <div ref={ref}>
        <Grow value={p.text} onChange={(text) => onChange({ ...p, text })} rows={p.heading ? 1 : 3} />
      </div>
      {(p.text || '').includes('[[') && (
        <p className="cr-edit-shows">Shows as: <Preview text={p.text} heading={p.heading} /></p>
      )}
    </div>
  );
}

const CALL_FIELDS = [
  ['when', 'When', 'e.g. Abeam the approach end numbers:'],
  ['radio', 'Channel', 'e.g. CH 8 UHF'],
  ['who', 'Speaker', 'e.g. AIRCRAFT, TWR, RDO'],
  ['text', 'Words', 'The call, without quotation marks'],
  ['after', 'Note after', 'The manual\'s note under the call'],
];

function CallRow({ call, index, count, onChange, onMove, onRemove }) {
  return (
    <div className="discuss-editor-block">
      <div className="discuss-editor-blockhead">
        <span className="cr-edit-rowname">Call {index + 1}</span>
        <RowTools index={index} count={count} onMove={onMove} onRemove={onRemove} what="call" />
      </div>
      <div className="cr-edit-grid">
        {CALL_FIELDS.map(([key, label, hint]) => (
          <label key={key} className={`cr-edit-cell${key === 'text' ? ' cr-edit-cell--wide' : ''}`}>
            <span className="discuss-editor-label">{label}</span>
            <Line value={call[key]} onChange={(v) => onChange({ ...call, [key]: v })} placeholder={hint} />
          </label>
        ))}
      </div>
    </div>
  );
}

const LINE_KINDS = [
  ['call', 'Call'],
  ['note', 'Direction'],
  ['label', 'Caption'],
  ['manual', 'The manual says'],
];
const kindOf = (l) => (l.note != null ? 'note' : l.label != null ? 'label' : l.manual != null ? 'manual' : 'call');

function ExampleBlock({ block, index, count, onChange, onMove, onRemove }) {
  const setLine = (j, line) => onChange({ ...block, lines: block.lines.map((l, k) => (k === j ? line : l)) });
  return (
    <div className="discuss-editor-block">
      <div className="discuss-editor-blockhead">
        <span className="cr-edit-rowname">Example {index + 1}</span>
        <RowTools index={index} count={count} onMove={onMove} onRemove={onRemove} what="example" confirmRemove />
      </div>
      <label className="cr-edit-cell cr-edit-cell--wide">
        <span className="discuss-editor-label">Title</span>
        <Line value={block.title} onChange={(title) => onChange({ ...block, title })} />
      </label>
      {block.lines.map((line, j) => {
        const kind = kindOf(line);
        return (
          <div key={j} className="cr-edit-exline">
            <select
              className="discuss-editor-select"
              value={kind}
              onChange={(e) => {
                const k = e.target.value;
                const words = line.text ?? line.note ?? line.label ?? line.manual ?? '';
                setLine(j, k === 'call' ? { radio: '', text: words } : { [k]: words });
              }}
              aria-label="Kind of line"
            >
              {LINE_KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            {kind === 'call' && (
              <Line
                value={line.radio || line.who}
                onChange={(v) => setLine(j, line.who != null && line.radio == null ? { ...line, who: v } : { ...line, radio: v })}
                placeholder="Channel, or who replies"
                className="discuss-editor-line cr-edit-exwho"
              />
            )}
            <Line
              value={line[kind === 'call' ? 'text' : kind]}
              onChange={(v) => setLine(j, { ...line, [kind === 'call' ? 'text' : kind]: v })}
            />
            {kind === 'manual' && (
              <Line value={line.page} onChange={(v) => setLine(j, { ...line, page: v })} placeholder="Page" className="discuss-editor-line cr-edit-exwho" />
            )}
            <RowTools
              index={j}
              count={block.lines.length}
              onMove={(a, b) => onChange({ ...block, lines: move(block.lines, a, b) })}
              onRemove={(k) => onChange({ ...block, lines: block.lines.filter((_, i) => i !== k) })}
              what="line"
            />
          </div>
        );
      })}
      <button type="button" className="discuss-editor-add" onClick={() => onChange({ ...block, lines: [...block.lines, { radio: '', text: '' }] })}>
        + line
      </button>
    </div>
  );
}

function CardBlock({ block, index, count, onChange, onMove, onRemove }) {
  return (
    <div className="discuss-editor-block">
      <div className="discuss-editor-blockhead">
        <label className="discuss-editor-check">
          <input type="checkbox" checked={!!block.warning} onChange={(e) => onChange({ ...block, warning: e.target.checked })} />
          {' '}Warning
        </label>
        <RowTools index={index} count={count} onMove={onMove} onRemove={onRemove} what="block" />
      </div>
      <label className="cr-edit-cell cr-edit-cell--wide">
        <span className="discuss-editor-label">Heading</span>
        <Line value={block.heading} onChange={(heading) => onChange({ ...block, heading })} placeholder="e.g. Runway 13/31" />
      </label>
      <label className="cr-edit-cell cr-edit-cell--wide">
        <span className="discuss-editor-label">Lines (one per row)</span>
        <Grow
          value={block.lines.join('\n')}
          onChange={(v) => onChange({ ...block, lines: v.split('\n') })}
          rows={2}
        />
      </label>
    </div>
  );
}

function Part({ title, open, children, count }) {
  return (
    <details className="cr-edit-part" open={open}>
      <summary>{title}{count != null && <span className="cr-edit-count">{count}</span>}</summary>
      {children}
    </details>
  );
}

// ---------------------------------------------------------------------------------------

function LegEditor({ id, names, record, part, isAirfield, onClose, onPublished }) {
  const saved = useMemo(() => readDraft(id), [id]);
  const [restored, setRestored] = useState(!!saved);
  const [edit, setEdit] = useState(() => (saved ? saved.edit : fromDoc(record.doc, id)));
  const [base] = useState(() => record);
  const others = useMemo(() => sameWording(base.doc, id), [base, id]);
  const [also, setAlso] = useState(() => (saved && saved.also != null ? saved.also : true));
  const [author, setAuthorField] = useState(getAuthor);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const top = useRef(null);
  useEscape(onClose);

  useEffect(() => { if (top.current) top.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, []);

  const pristine = JSON.stringify(edit) === JSON.stringify(fromDoc(record.doc, id));
  useEffect(() => { writeDraft(id, pristine ? null : { edit, also }); }, [id, edit, also, pristine]);

  const set = (key) => (value) => setEdit((e) => ({ ...e, [key]: value }));
  const listOps = (key) => ({
    onMove: (a, b) => setEdit((e) => ({ ...e, [key]: move(e[key], a, b) })),
    onRemove: (i) => setEdit((e) => ({ ...e, [key]: e[key].filter((_, k) => k !== i) })),
    onChangeAt: (i) => (value) => setEdit((e) => ({ ...e, [key]: e[key].map((x, k) => (k === i ? value : x)) })),
  });
  const rule = listOps('rule');
  const comms = listOps('comms');
  const examples = listOps('examples');
  const setCard = set('card');

  const problems = problemsOf(edit);
  const ready = !pristine && !problems.length && summary.trim() && !busy;
  const alsoIds = also ? others : [];

  const publish = async () => {
    if (!ready) return;
    setBusy(true);
    setError('');
    const name = author.trim();
    setAuthor(name);
    try {
      const change = { leg: legOf(edit), card: cardOf(edit) };
      const result = await publishEdit({
        base,
        edit: (doc) => applyEdit(doc, id, change, alsoIds),
        touched: [id, ...alsoIds],
        author: name,
        summary: summary.trim(),
      });
      writeDraft(id, null);
      onPublished(result);
    } catch (err) {
      setBusy(false);
      if (err.clash) {
        setError('Someone else published a change to this since you opened it. Your edits are kept in this browser: '
          + 'copy what you need, cancel, and open the editor again to start from their version.');
      } else {
        setError(`Not published. ${err.message}`);
      }
    }
  };

  return (
    <div className="discuss-editor cr-edit" ref={top} role="group" aria-label={`Edit ${names[id] || 'this leg'}`}>
      <h3 className="cr-edit-title">Editing: {names[id] || id}</h3>
      {restored && (
        <p className="discuss-editor-notice">
          Your unpublished edits from before are back.{' '}
          <button
            type="button"
            className="discuss-editor-secondary"
            onClick={() => { writeDraft(id, null); setEdit(fromDoc(record.doc, id)); setRestored(false); }}
          >
            Discard them
          </button>
        </p>
      )}

      <Part title="Course rule" open={part === 'rule' || !part} count={edit.rule.length || null}>
        <p className="discuss-editor-hint">
          Copy the manual's words. To make words a quiz blank, select them and click Quiz blank;
          they show in <b>bold</b> on the page and are hidden in the quiz.
        </p>
        {edit.rule.map((p, i) => (
          <RuleParagraph
            key={i}
            p={p}
            index={i}
            count={edit.rule.length}
            onChange={rule.onChangeAt(i)}
            onMove={rule.onMove}
            onRemove={rule.onRemove}
          />
        ))}
        <div className="discuss-editor-adds">
          <button type="button" className="discuss-editor-add" onClick={() => set('rule')([...edit.rule, { text: '' }])}>+ paragraph</button>
          <button type="button" className="discuss-editor-add" onClick={() => set('rule')([...edit.rule, { text: '', heading: true }])}>+ subheading</button>
        </div>
        <label className="cr-edit-cell">
          <span className="discuss-editor-label">Manual page</span>
          <Line value={edit.page} onChange={set('page')} placeholder="e.g. 2-30" maxLength={20} />
        </label>
        {others.length > 0 && (
          <label className="discuss-editor-check cr-edit-also">
            <input type="checkbox" checked={also} onChange={(e) => setAlso(e.target.checked)} />
            {' '}Also change the {others.length === 1 ? 'other leg' : `${others.length} other legs`} with the same wording:{' '}
            {others.map((o) => names[o] || o).join(', ')}
          </label>
        )}
      </Part>

      <Part title="Radio calls" open={part === 'comms'} count={edit.comms.length || null}>
        <p className="discuss-editor-hint">The manual's calls for this leg, word for word.</p>
        {edit.comms.map((c, i) => (
          <CallRow key={i} call={c} index={i} count={edit.comms.length} onChange={comms.onChangeAt(i)} onMove={comms.onMove} onRemove={comms.onRemove} />
        ))}
        <button type="button" className="discuss-editor-add" onClick={() => set('comms')([...edit.comms, { text: '' }])}>+ call</button>
      </Part>

      <Part title="Example comms" open={part === 'examples'} count={edit.examples.length || null}>
        <p className="discuss-editor-hint">
          A worked exchange, controller's side included. The page labels these as not from a TW-4 publication.
        </p>
        {edit.examples.map((b, i) => (
          <ExampleBlock key={i} block={b} index={i} count={edit.examples.length} onChange={examples.onChangeAt(i)} onMove={examples.onMove} onRemove={examples.onRemove} />
        ))}
        <button type="button" className="discuss-editor-add" onClick={() => set('examples')([...edit.examples, { title: '', lines: [{ radio: '', text: '' }] }])}>
          + example
        </button>
      </Part>

      {(edit.card || isAirfield) && (
        <Part title="Airfield card" open={part === 'card'}>
          {edit.card ? (
            <>
              <label className="cr-edit-cell cr-edit-cell--wide">
                <span className="discuss-editor-label">Title</span>
                <Line value={edit.card.title} onChange={(title) => setCard({ ...edit.card, title })} />
              </label>
              {edit.card.blocks.map((b, i) => (
                <CardBlock
                  key={i}
                  block={b}
                  index={i}
                  count={edit.card.blocks.length}
                  onChange={(v) => setCard({ ...edit.card, blocks: edit.card.blocks.map((x, k) => (k === i ? v : x)) })}
                  onMove={(a, c) => setCard({ ...edit.card, blocks: move(edit.card.blocks, a, c) })}
                  onRemove={(k) => setCard({ ...edit.card, blocks: edit.card.blocks.filter((_, j) => j !== k) })}
                />
              ))}
              <button type="button" className="discuss-editor-add" onClick={() => setCard({ ...edit.card, blocks: [...edit.card.blocks, { lines: [] }] })}>
                + block
              </button>
            </>
          ) : (
            <button type="button" className="discuss-editor-add" onClick={() => setCard({ title: names[id] || '', blocks: [{ lines: [] }] })}>
              + airfield card
            </button>
          )}
        </Part>
      )}

      <div className="discuss-editor-actions">
        {problems.length > 0 && (
          <ul className="discuss-editor-problems discuss-editor-problems--error">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        <p className="discuss-editor-hint">
          Publishing puts your edits on the site for everyone. Every revision is kept, so a mistake
          is undone from the history.
        </p>
        <div className="cr-edit-grid">
          <label className="cr-edit-cell">
            <span className="discuss-editor-label">Your name</span>
            <Line value={author} onChange={setAuthorField} placeholder="Optional, shown in the history" maxLength={40} />
          </label>
          <label className="cr-edit-cell cr-edit-cell--wide">
            <span className="discuss-editor-label">What changed <span className="discuss-editor-req">required</span></span>
            <Line
              value={summary}
              onChange={setSummary}
              placeholder="e.g. New pattern altitude from the 2026 manual, p. 2-30"
              maxLength={200}
              onKeyDown={(e) => { if (e.key === 'Enter') publish(); }}
            />
          </label>
        </div>
        {error && <p className="discuss-editor-warn">{error}</p>}
        <div className="discuss-editor-buttons">
          <button
            type="button"
            className="discuss-editor-save"
            onClick={publish}
            disabled={!ready}
            title={pristine ? 'Nothing has changed yet' : !summary.trim() ? 'Say what you changed first' : undefined}
          >
            {busy ? 'Publishing…' : 'Publish'}
          </button>
          {pristine ? (
            <button type="button" className="discuss-editor-cancel" onClick={onClose} disabled={busy}>Close</button>
          ) : (
            <ConfirmButton
              className="discuss-editor-cancel"
              label="Cancel"
              question="Throw away these edits?"
              confirmLabel="Throw away"
              onConfirm={() => { writeDraft(id, null); onClose(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default LegEditor;
