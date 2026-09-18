// The whole page in one form: the lead, the Numbers box, every section and subsection in
// page order, See also and the references, saved together. It is what `[edit page]` opens; a
// heading's own `[edit]` still opens that one block, for the one-line fix.
//
// The section editors inside it are the same SectionEditor a heading's `[edit]` opens,
// embedded: they hold no state of their own and every keystroke lands in this form's copy of
// the page, so the ids minted for a new paragraph in one section see the paragraphs added in
// another a moment ago. The lead is edited here and nowhere else, because the lead is not a
// section — MOS gives it no heading, so there is nowhere honest to hang a link.
import React, { useState } from 'react';
import { clone } from './draft';
import { newSectionId } from './ids';
import { psmPage, psmPagesForSchool, psmLinksOf } from '../psmPages';
import { Grow, Line, RowTools, SlugList, EditorActions, ProgramFields, useEscape, move, BOLD_HINT } from './fields';
import { withDefaultProgram } from '../program';
import { workDate } from '../works';
import SectionEditor from './SectionEditor';
import NumbersEditor from './NumbersEditor';

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
    for (const t of b.tables || []) t.refs = fix(t.refs);
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

// The head of a section's block in the form: where it sits, what level it is, and the two
// moves the style guide names — a section whose every sentence is about a sibling's subject
// is demoted under it, and a section that names a set promotes its members. No anchor id: it
// is derived from the heading and nobody can act on it.
function SectionHead({ number, title, isSub, index, count, onMove, onRemove, onShift, shiftBlocked }) {
  return (
    <div className="discuss-editor-sectionhead">
      <h4>
        {number} {title || (isSub ? 'Subsection' : 'Section')}
      </h4>
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

// The pages of this site this page links under its lead. A dropdown of every page for this
// school rather than a checkbox per destination: the two checkboxes it replaced could say
// "systems diagram" and "memory limits" and nothing else, and a page about the course rules
// or the jet log has the same reason to point at the tab that carries it.
function PsmLinkPicker({ school, links, onChange }) {
  const offered = psmPagesForSchool(school).filter((p) => !links.includes(p.path));
  return (
    <div className="discuss-editor-field">
      <label className="discuss-editor-label">Pages on this site</label>
      <p className="discuss-editor-hint">
        Optional. Another part of pinksheetmafia.com that carries this subject — its systems
        diagram, the limits, the course rules. The links show under the lead.
      </p>
      <div className="discuss-editor-structure">
        {links.map((path, i) => (
          <div className="discuss-editor-row" key={path}>
            <span className="discuss-editor-resolve">{psmPage(path).label}</span>
            <RowTools
              index={i}
              count={links.length}
              onMove={(from, to) => onChange(move(links, from, to))}
              onRemove={(k) => onChange(links.filter((_, j) => j !== k))}
              what="link"
            />
          </div>
        ))}
        <select
          className="discuss-editor-select"
          aria-label="Add a page on this site"
          value=""
          onChange={(e) => e.target.value && onChange([...links, e.target.value])}
        >
          <option value="">+ page on this site</option>
          {offered.map((p) => (
            <option value={p.path} key={p.path}>{p.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PageEditor({ item, onSave, onCancel, check }) {
  // A page from before the aircraft and school fields existed opens with the defaults filled
  // in, so its next save carries them. `diagram` and `limits` are read the same way: the form
  // holds them as the list of site pages that replaced them and writes that list alone, so a
  // page converts the next time anyone saves it and nothing has to be migrated on the server.
  const [p, setP] = useState(() => {
    const next = { ...clone(item), ...withDefaultProgram(item) };
    const links = psmLinksOf(next);
    delete next.diagram;
    delete next.limits;
    if (links.length) next.psmLinks = links;
    return next;
  });
  useEscape(onCancel);

  const problems = check ? check(p) : { errors: [], warnings: [] };
  const set = (key, value) => setP((prev) => ({ ...prev, [key]: value || undefined }));
  const sections = p.sections || [];
  const setSections = (next) => setP((prev) => ({ ...prev, sections: next.length ? next : undefined }));

  const setSection = (i, next) => setSections(sections.map((x, j) => (j === i ? next : x)));
  const removeSection = (i) => setSections(sections.filter((_, j) => j !== i));
  const setSubs = (i, subs) =>
    setSection(i, { ...sections[i], subsections: subs.length ? subs : undefined });

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
      return 'A section with subsections of its own cannot become a subsection';
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
  // heading, so the id follows whatever gets typed into the heading field and fixes for good
  // when the page is saved.
  const addSection = () => {
    const title = 'New section';
    setSections([...sections, { id: newSectionId(p, title), title, __new: true }]);
  };

  const addSubsection = (i) => {
    const title = 'New subsection';
    setSubs(i, [...(sections[i].subsections || []), { id: newSectionId(p, title), title, __new: true }]);
  };

  // --- references ------------------------------------------------------------------------
  const refs = (p.references || []).map((r, i) => ({ ...r, __was: r.__was === undefined ? r.n : r.__was, n: i + 1 }));
  const setRefs = (next) => set('references', next.map((r, i) => ({ ...r, n: i + 1 })));
  const setRef = (i, key, value) => setRefs(refs.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const removeRef = (i) => setRefs(refs.filter((_, j) => j !== i));
  // A source added from inside a section or the Numbers box: appended, numbered next, and
  // its number handed back so the block that asked can cite it.
  const addReference = (ref) => {
    const n = refs.length + 1;
    setRefs([...refs, { n, ...ref }]);
    return n;
  };

  const save = () => {
    const out = clone(p);
    // Reference numbers are position-derived, so commit the renumber and rewrite every
    // citation before the page goes out.
    const map = {};
    for (const r of out.references || []) map[r.__was === undefined ? r.n : r.__was] = r.n;
    // Anything the page cited that is no longer in the list maps to nothing and its markers go.
    for (const r of item.references || []) if (!(r.n in map)) map[r.n] = null;
    remapRefs(out, map);
    for (const r of out.references || []) {
      delete r.__was;
      // A blank date prints the site's own date for the work, so it is not stored.
      if (typeof r.date === 'string') r.date = r.date.trim();
      if (!r.date) delete r.date;
    }
    // A new section's id stops tracking its heading the moment the page is saved.
    for (const s of out.sections || []) {
      delete s.__new;
      for (const sub of s.subsections || []) delete sub.__new;
    }
    onSave(out);
  };

  return (
    <div className="discuss-editor discuss-editor--page" role="group" aria-label="Editing the page">
      <h3>The page</h3>

      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Page title</label>
        <Line value={p.title} onChange={(v) => setP((prev) => ({ ...prev, title: v }))} />
      </div>

      <ProgramFields
        idPrefix="page-program"
        value={p}
        onChange={(v) => setP((prev) => ({ ...prev, ...v }))}
      />

      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Flags</label>
        <div className="discuss-editor-checks">
          <label className="discuss-editor-check">
            <input
              type="checkbox"
              checked={!!p.maneuver}
              onChange={(e) => set('maneuver', e.target.checked || undefined)}
            />
            Maneuver
          </label>
          <label className="discuss-editor-check">
            <input
              type="checkbox"
              checked={!!p.stub}
              onChange={(e) => set('stub', e.target.checked || undefined)}
            />
            Placeholder
          </label>
        </div>
        <p className="discuss-editor-hint">
          A maneuver page is included in the "any previously discussed maneuver" lists. A
          placeholder creates an empty page to be fleshed out by someone else. You may provide
          a pointer to potential sources to help others.
        </p>
      </div>

      {/* A placeholder has no body to write, so the form does not offer one. A lead written
          above a page that then says no page is written is work thrown away, and the fields
          under it are the same invitation. Untick it and the page comes back, with whatever
          was in it. */}
      {p.stub ? (
        <div className="discuss-editor-field">
          <label className="discuss-editor-label">Where to look</label>
          <p className="discuss-editor-hint">
            Optional. The publications and sections an author could start from.
          </p>
          <Grow value={p.sourcingLead} rows={3} onChange={(v) => set('sourcingLead', v)} />
        </div>
      ) : (
        <>
        <div className="discuss-editor-field">
          <label className="discuss-editor-label">Lead</label>
          <p className="discuss-editor-hint">
            A short summary of the whole page, shown at the top. {BOLD_HINT}
          </p>
          <Grow value={p.lede} rows={4} onChange={(v) => setP((prev) => ({ ...prev, lede: v }))} />
        </div>

        <div className="discuss-editor-field">
          <label className="discuss-editor-label">Note</label>
          <p className="discuss-editor-hint">
            Optional. A caveat shown above the body, if the whole page needs one.
          </p>
          <Grow value={p.note} rows={2} onChange={(v) => set('note', v)} />
        </div>

        <PsmLinkPicker
          school={p.school}
          links={p.psmLinks || []}
          onChange={(next) => set('psmLinks', next.length ? next : undefined)}
        />

        <h3>Numbers</h3>
        <NumbersEditor
          embedded
          item={p}
          onAddReference={addReference}
          onChange={(rows) => set('numbers', rows && rows.length ? rows : undefined)}
        />

        <h3>Sections</h3>
        <p className="discuss-editor-hint">
          The arrows change section order, demote a section to make it a subsection or promote
          a subsection to make it a section.
        </p>

        {sections.map((s, i) => (
          <div className="discuss-editor-section" key={s.id}>
            <SectionHead
              number={`${i + 1}.`}
              title={s.title}
              index={i}
              count={sections.length}
              onMove={(from, to) => setSections(move(sections, from, to))}
              onRemove={removeSection}
              onShift={() => demote(i)}
              shiftBlocked={demoteBlocked(s, i)}
            />
            <SectionEditor
              embedded
              section={s}
              item={p}
              onAddReference={addReference}
              onChange={(next) => setSection(i, next)}
            />

            {(s.subsections || []).map((sub, j) => (
              <div className="discuss-editor-section discuss-editor-section--sub" key={sub.id}>
                <SectionHead
                  number={`${i + 1}.${j + 1}`}
                  title={sub.title}
                  isSub
                  index={j}
                  count={s.subsections.length}
                  onMove={(from, to) => setSubs(i, move(s.subsections, from, to))}
                  onRemove={(k) => setSubs(i, s.subsections.filter((_, m) => m !== k))}
                  onShift={() => promote(i, j)}
                />
                <SectionEditor
                  embedded
                  isSub
                  section={sub}
                  item={p}
                  onAddReference={addReference}
                  onChange={(next) => setSubs(i, s.subsections.map((x, k) => (k === j ? next : x)))}
                />
              </div>
            ))}

            <button
              type="button"
              className="discuss-editor-add discuss-editor-add--sub"
              onClick={() => addSubsection(i)}
            >
              + subsection of {s.title}
            </button>
          </div>
        ))}
        <button type="button" className="discuss-editor-add" onClick={addSection}>
          + section
        </button>

        <h3>See also</h3>
        <SlugList
          slugs={p.seeAlso}
          onChange={(v) => set('seeAlso', v)}
          label="Links"
          hint="Related pages, and anything else worth reading next."
        />

        <h3>References</h3>
        <div className="discuss-editor-structure">
          {refs.map((r, i) => (
            <div className="discuss-editor-row" key={r.__was ?? `new-${i}`}>
              <span className="discuss-editor-marker">{r.n}</span>
              <Line value={r.work} onChange={(v) => setRef(i, 'work', v)} placeholder="Publication, e.g. NATOPS" />
              <Line value={r.loc} onChange={(v) => setRef(i, 'loc', v)} placeholder="Section, e.g. §522 — Spin" />
              <Line value={r.pages} onChange={(v) => setRef(i, 'pages', v)} placeholder="Page, e.g. p. 5-33" />
              <Line
                value={r.date}
                onChange={(v) => setRef(i, 'date', v)}
                placeholder={workDate(r.work) || 'Date, e.g. 08AUG16'}
                aria-label="Date of the publication"
                title="The date of the edition cited. Filled in for the publications the site knows; type one to change it."
                className="discuss-editor-line discuss-editor-date"
              />
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
        </>
      )}

      <EditorActions
        draft
        onSave={save}
        onCancel={onCancel}
        errors={problems.errors}
        warnings={problems.warnings}
      />
    </div>
  );
}

export default PageEditor;
