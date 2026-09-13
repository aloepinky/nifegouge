// The page-level panel: everything that is not the inside of one section.
//
// The lead is edited here rather than through an `[edit]` of its own, because the lead is not
// a section — MOS gives it no heading, so there is nowhere honest to hang a link. Wikipedia
// puts it behind the page edit for the same reason.
import React, { useState } from 'react';
import { clone } from './draft';
import { newSectionId } from './ids';
import { SYSTEM_TABS } from '../../systems/systemTabs';
import {
  Grow, Line, RowTools, SlugList, EditorActions, useEscape, move, BOLD_HINT,
} from './fields';

// References are numbered 1..N in list order and nothing else is coherent: `n` is the printed
// marker, the `<li value>` and the anchor `#ref-n` all at once. So a removal or a reorder
// renumbers the list and rewrites every `refs` array on the page in the same operation. This
// is the one place the editor changes an identifier, and it is why it asks first.
function remapRefs(item, map) {
  const fix = (refs) => {
    if (!refs || !refs.length) return undefined;
    const next = refs.map((n) => map[n]).filter((n) => n !== undefined && n !== null);
    return next.length ? next.sort((a, b) => a - b) : undefined;
  };
  const block = (b) => {
    if (b.refs) b.refs = fix(b.refs);
    for (const p of b.paras || []) p.refs = fix(p.refs);
    for (const f of b.figures || []) f.refs = fix(f.refs);
    const walk = (list) => {
      for (const x of list || []) {
        x.refs = fix(x.refs);
        walk(x.sub);
      }
    };
    walk(b.items);
  };
  for (const n of item.numbers || []) n.refs = fix(n.refs);
  for (const s of item.sections || []) {
    block(s);
    for (const sub of s.subsections || []) block(sub);
  }
  return item;
}

function StructureRow({ block, isSub, index, count, onMove, onRemove, onShift, shiftBlocked }) {
  return (
    <div className={`discuss-editor-row${isSub ? ' discuss-editor-row--sub' : ''}`}>
      {/* No anchor id here. It is derived from the heading and nobody can act on it, so
          printing it would be noise in a list that is about order and level. */}
      <span className="discuss-editor-structure-title">{block.title}</span>
      <button
        type="button"
        className="discuss-editor-shift"
        onClick={onShift}
        disabled={!!shiftBlocked}
        title={
          shiftBlocked ||
          (isSub
            ? 'Promote to a section of its own'
            : 'Demote to a subsection of the section above it')
        }
      >
        {isSub ? '← promote' : '→ demote'}
      </button>
      <RowTools
        index={index}
        count={count}
        onMove={onMove}
        onRemove={onRemove}
        what={isSub ? 'subsection' : 'section'}
        confirmRemove
      />
    </div>
  );
}

function PageEditor({ item, onSave, onCancel, onSource, check }) {
  const [p, setP] = useState(() => clone(item));
  useEscape(onCancel);

  const problems = check ? check(p) : { errors: [], warnings: [] };
  const set = (key, value) => setP((prev) => ({ ...prev, [key]: value || undefined }));
  const sections = p.sections || [];
  const setSections = (next) => setP((prev) => ({ ...prev, sections: next }));

  const diagrams = Array.isArray(p.diagram) ? p.diagram : p.diagram ? [p.diagram] : [];
  const toggleDiagram = (id) => {
    const next = diagrams.includes(id) ? diagrams.filter((d) => d !== id) : [...diagrams, id];
    set('diagram', next.length === 0 ? undefined : next.length === 1 ? next[0] : next);
  };

  const removeSection = (i) => setSections(sections.filter((_, j) => j !== i));

  // A section whose every sentence is about a sibling's subject belongs under it, and a
  // section that names a set should promote its members. These are the two moves the style
  // guide names, so they are the two buttons the structure list carries.
  const demote = (i) => {
    const above = sections[i - 1];
    const s = sections[i];
    const next = sections.filter((_, j) => j !== i);
    next[i - 1] = { ...above, subsections: [...(above.subsections || []), s] };
    setSections(next);
  };

  // Two levels is the limit, so a section carrying subsections cannot go down a level and a
  // first section has nothing to go under. Both are stated on the disabled button.
  const demoteBlocked = (s, i) => {
    if (i === 0) return 'Nothing above it to become a subsection of';
    if (s.subsections && s.subsections.length) {
      return 'A section with subsections cannot be demoted — two levels is the limit';
    }
    return null;
  };

  const promote = (i, j) => {
    const parent = sections[i];
    const sub = parent.subsections[j];
    const subs = parent.subsections.filter((_, k) => k !== j);
    const next = [...sections];
    next[i] = { ...parent, subsections: subs.length ? subs : undefined };
    next.splice(i + 1, 0, sub);
    setSections(next);
  };

  // The id minted here is a placeholder. `__new` marks the section as still tracking its
  // heading, so the id becomes the real one the moment somebody types a real title in the
  // section's own editor, and fixes when that editor is first saved.
  const addSection = () => {
    const title = 'New section';
    setSections([...sections, { id: newSectionId(p, title), title, __new: true }]);
  };

  const addSubsection = (i) => {
    const s = sections[i];
    const title = 'New subsection';
    const next = [...sections];
    next[i] = {
      ...s,
      subsections: [
        ...(s.subsections || []),
        { id: newSectionId(p, title), title, __new: true },
      ],
    };
    setSections(next);
  };

  // --- references ------------------------------------------------------------------------
  const refs = (p.references || []).map((r, i) => ({ ...r, __was: r.__was === undefined ? r.n : r.__was, n: i + 1 }));
  const setRefs = (next) => set('references', next.map((r, i) => ({ ...r, n: i + 1 })));
  const setRef = (i, key, value) => setRefs(refs.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const removeRef = (i) => setRefs(refs.filter((_, j) => j !== i));

  const save = () => {
    const out = clone(p);
    // Reference numbers are position-derived, so commit the renumber and rewrite every
    // citation before the draft sees it.
    const map = {};
    for (const r of out.references || []) map[r.__was === undefined ? r.n : r.__was] = r.n;
    // Anything the page cited that is no longer in the list maps to nothing and its markers go.
    for (const r of item.references || []) if (!(r.n in map)) map[r.n] = null;
    remapRefs(out, map);
    for (const r of out.references || []) delete r.__was;
    onSave(out);
  };

  return (
    <div className="discuss-editor discuss-editor--page" role="group" aria-label="Editing the page">
      <h3>The lead</h3>

      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Page title</label>
        <Line value={p.title} onChange={(v) => setP((prev) => ({ ...prev, title: v }))} />
        <p className="discuss-editor-hint">
          A noun phrase, even where the JPPT's wording is not — <em>any applicable day
          emergency</em> becomes <em>Day emergency procedures</em>. This is the one name the
          item is shown under everywhere; the JPPT's wording stays on the event.
        </p>
      </div>

      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Lead</label>
        <p className="discuss-editor-hint">
          A summary of the whole page, not a definition of the title. No heading, never
          sectioned. {BOLD_HINT}
        </p>
        <Grow value={p.lede} rows={4} onChange={(v) => setP((prev) => ({ ...prev, lede: v }))} />
      </div>

      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Note</label>
        <p className="discuss-editor-hint">
          A page-wide caveat above the body. Not a sourced claim and it carries no marker. No
          markup.
        </p>
        <Grow value={p.note} rows={2} onChange={(v) => set('note', v)} />
      </div>

      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Systems diagram</label>
        <div className="discuss-editor-checks">
          {SYSTEM_TABS.map((t) => (
            <label className="discuss-editor-check" key={t.id}>
              <input
                type="checkbox"
                checked={diagrams.includes(t.id)}
                onChange={() => toggleDiagram(t.id)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Flags</label>
        <div className="discuss-editor-checks">
          <label className="discuss-editor-check">
            <input
              type="checkbox"
              checked={!!p.maneuver}
              onChange={(e) => set('maneuver', e.target.checked || undefined)}
            />
            maneuver
          </label>
          <label className="discuss-editor-check">
            <input
              type="checkbox"
              checked={!!p.stub}
              onChange={(e) => set('stub', e.target.checked || undefined)}
            />
            stub
          </label>
        </div>
        <p className="discuss-editor-hint">
          <strong>maneuver</strong> is what puts an item into the generated "any previously
          discussed maneuver" lists — a flag rather than a derivation, because the JPPT does
          not classify its discuss items. <strong>stub</strong> replaces the body with the
          sourcing lead below.
        </p>
      </div>

      {p.stub && (
        <div className="discuss-editor-field">
          <label className="discuss-editor-label">Sourcing lead</label>
          <p className="discuss-editor-hint">Where the next writer should look.</p>
          <Grow value={p.sourcingLead} rows={3} onChange={(v) => set('sourcingLead', v)} />
        </div>
      )}

      <h3>Structure</h3>
      <p className="discuss-editor-hint">
        Order, level and removal. The words inside a section are edited from its own{' '}
        <code>[edit]</code> link on the page.
      </p>

      <div className="discuss-editor-structure">
        {sections.map((s, i) => (
          <React.Fragment key={s.id}>
            <StructureRow
              block={s}
              index={i}
              count={sections.length}
              onMove={(from, to) => setSections(move(sections, from, to))}
              onRemove={removeSection}
              onShift={() => demote(i)}
              shiftBlocked={demoteBlocked(s, i)}
            />
            {(s.subsections || []).map((sub, j) => (
              <StructureRow
                key={sub.id}
                block={sub}
                isSub
                index={j}
                count={s.subsections.length}
                onMove={(from, to) => {
                  const next = [...sections];
                  next[i] = { ...s, subsections: move(s.subsections, from, to) };
                  setSections(next);
                }}
                onRemove={(k) => {
                  const rest = s.subsections.filter((_, m) => m !== k);
                  const next = [...sections];
                  next[i] = { ...s, subsections: rest.length ? rest : undefined };
                  setSections(next);
                }}
                onShift={() => promote(i, j)}
              />
            ))}
            <button
              type="button"
              className="discuss-editor-add discuss-editor-add--sub"
              onClick={() => addSubsection(i)}
            >
              + subsection of {s.title}
            </button>
          </React.Fragment>
        ))}
        <button type="button" className="discuss-editor-add" onClick={addSection}>
          + section
        </button>
      </div>

      <h3>See also</h3>
      <SlugList
        slugs={p.seeAlso}
        onChange={(v) => set('seeAlso', v)}
        label="Links"
        hint="Internal links only, and not ones already linked in the body."
      />

      <h3>References</h3>
      <p className="discuss-editor-hint">
        The section, plus the page that section starts on — never a range, never the page a
        particular sentence sits on. No document numbers in the work name. Numbering follows
        this order, so moving or removing an entry rewrites the markers on the page.
      </p>
      <div className="discuss-editor-structure">
        {refs.map((r, i) => (
          <div className="discuss-editor-row" key={r.__was ?? `new-${i}`}>
            <span className="discuss-editor-id">{r.n}</span>
            <Line value={r.work} onChange={(v) => setRef(i, 'work', v)} placeholder="NATOPS" />
            <Line value={r.loc} onChange={(v) => setRef(i, 'loc', v)} placeholder="§522 — Spin" />
            <Line value={r.pages} onChange={(v) => setRef(i, 'pages', v)} placeholder="p. 5-33" />
            <RowTools
              index={i}
              count={refs.length}
              onMove={(from, to) => setRefs(move(refs, from, to))}
              onRemove={removeRef}
              what="reference"
              confirmRemove
            />
          </div>
        ))}
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() => setRefs([...refs, { n: refs.length + 1, work: '', loc: '', pages: '' }])}
        >
          + reference
        </button>
      </div>

      <EditorActions
        onSave={save}
        onCancel={onCancel}
        errors={problems.errors}
        warnings={problems.warnings}
      >
        <button type="button" className="discuss-editor-secondary" onClick={onSource}>
          View source
        </button>
      </EditorActions>
    </div>
  );
}

export default PageEditor;
