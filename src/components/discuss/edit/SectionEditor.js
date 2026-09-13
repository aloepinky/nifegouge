// The section form. Same component for a section and for one of its subsections, because a
// subsection is a section that happens to sit inside another one — the same reason
// `SectionBody` in ItemPage.js renders both.
//
// It holds its own copy of the section and hands it back on Save. Nothing it does touches the
// draft until then, which is what makes Cancel mean cancel.
import React, { useState } from 'react';
import { clone } from './draft';
import {
  newParaId, newBulletId, newFigureId, newTableId, newSubBulletId, newSectionId,
} from './ids';
import {
  Grow, Line, RefsPicker, RowTools, SlugList, EditorActions, useEscape, move, BOLD_HINT,
} from './fields';
import { uploadFigure } from './figureUpload';

// A figure's `src` is an image address: a path under public/ for the figures that ship with
// the site, or the mirror's URL for one uploaded here. Upload converts to WebP in the
// browser, as tools/convert-images.py does for the repository's images, and fills the field
// in. Either way the field previews it and says plainly when it resolves to nothing.
function FigureRow({ figure, index, count, references, slug, onChange, onMove, onRemove }) {
  const [broken, setBroken] = useState(false);
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const set = (key, value) => onChange({ ...figure, [key]: value });

  const upload = async (file) => {
    if (!file) return;
    setUploadError(null);
    setProgress('Preparing');
    try {
      const url = await uploadFigure(file, slug, setProgress);
      setBroken(false);
      set('src', url);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="discuss-editor-block">
      <div className="discuss-editor-blockhead">
        <span className="discuss-editor-id">figure {figure.id}</span>
        <RefsPicker
          refs={figure.refs}
          references={references}
          onChange={(refs) => set('refs', refs)}
        />
        <RowTools
          index={index}
          count={count}
          onMove={onMove}
          onRemove={onRemove}
          what="figure"
        />
      </div>
      <label className="discuss-editor-label">Image</label>
      <div className="discuss-editor-row discuss-editor-row--tight discuss-figure-upload">
        <input
          type="file"
          accept="image/*"
          aria-label="Upload an image"
          disabled={!!progress}
          onChange={(e) => {
            upload(e.target.files && e.target.files[0]);
            e.target.value = '';
          }}
        />
        {progress && <span className="discuss-upload-progress" role="status">{progress}…</span>}
      </div>
      {uploadError && <p className="discuss-editor-warn">{uploadError}</p>}
      <p className="discuss-editor-hint">
        Upload converts to WebP and fills in the address below. Or type the address of an image
        already on the site.
      </p>
      <Line
        value={figure.src}
        onChange={(v) => {
          setBroken(false);
          set('src', v);
        }}
        placeholder="/discuss/<slug>/<name>.webp"
      />
      <label className="discuss-editor-label">
        Alt text <span className="discuss-editor-req">required</span>
      </label>
      <p className="discuss-editor-hint">
        Alt describes the image for a reader who cannot see it. It is not the caption.
      </p>
      <Grow value={figure.alt} onChange={(v) => set('alt', v)} />
      <label className="discuss-editor-label">Caption</label>
      <p className="discuss-editor-hint">
        What the figure is, and the citation. No bold — captions take no markup.
      </p>
      <Grow value={figure.caption} onChange={(v) => set('caption', v)} />
      {figure.src && (
        <div className="discuss-editor-preview">
          {broken ? (
            <p className="discuss-editor-warn">
              Nothing at <code>{figure.src}</code>. Upload the image, or check the address; a
              broken image is worse than the sentence saying where the chart lives.
            </p>
          ) : (
            <img src={figure.src} alt={figure.alt || ''} onError={() => setBroken(true)} />
          )}
        </div>
      )}
    </div>
  );
}

// A table is edited as a grid, because a grid is what it is — editing `rows` as a list of
// arrays through anything else means counting commas. Adding or removing a column rewrites
// every row in the same operation, which is what keeps a row from going ragged: a short row
// renders with its columns silently shifted and nothing on the page says which cell went.
function TableRow({ table, index, count, references, onChange, onMove, onRemove }) {
  const cols = table.cols || [];
  const rows = table.rows || [];
  const set = (key, value) => onChange({ ...table, [key]: value });

  const setCell = (r, c, value) =>
    set('rows', rows.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? value : cell)) : row)));

  const addColumn = () =>
    onChange({ ...table, cols: [...cols, ''], rows: rows.map((r) => [...r, '']) });
  // Below two columns a table is a list, so the control is disabled rather than the action
  // refused after the fact.
  const removeColumn = (c) =>
    onChange({
      ...table,
      cols: cols.filter((_, j) => j !== c),
      rows: rows.map((r) => r.filter((_, j) => j !== c)),
    });

  return (
    <div className="discuss-editor-block">
      <div className="discuss-editor-blockhead">
        <span className="discuss-editor-id">table {table.id}</span>
        <RefsPicker refs={table.refs} references={references} onChange={(v) => set('refs', v)} />
        <label className="discuss-editor-check">
          <input
            type="checkbox"
            checked={!!table.numeric}
            onChange={(e) => set('numeric', e.target.checked || undefined)}
          />
          numeric
        </label>
        <RowTools index={index} count={count} onMove={onMove} onRemove={onRemove} what="table" />
      </div>

      <label className="discuss-editor-label">
        Caption <span className="discuss-editor-req">required</span>
      </label>
      <Grow value={table.caption} onChange={(v) => set('caption', v)} />

      <div className="discuss-editor-grid-wrap">
        <table className="discuss-editor-grid">
          <thead>
            <tr>
              <th aria-label="Row controls" />
              {cols.map((c, j) => (
                // eslint-disable-next-line react/no-array-index-key
                <th key={j}>
                  <Line value={c} onChange={(v) => set('cols', cols.map((x, k) => (k === j ? v : x)))} />
                  <button
                    type="button"
                    className="discuss-editor-remove"
                    onClick={() => removeColumn(j)}
                    disabled={cols.length <= 2}
                    title={
                      cols.length <= 2
                        ? 'A table needs at least two columns — below that it is a list'
                        : 'Remove column'
                    }
                    aria-label={`Remove column ${j + 1}`}
                  >
                    ✕
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              // Rows have no ids of their own — the table is the addressable unit.
              // eslint-disable-next-line react/no-array-index-key
              <tr key={r}>
                <th scope="row">
                  <RowTools
                    index={r}
                    count={rows.length}
                    onMove={(from, to) => set('rows', move(rows, from, to))}
                    onRemove={(k) => set('rows', rows.filter((_, m) => m !== k))}
                    what="row"
                  />
                </th>
                {row.map((cell, c) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <td key={c}>
                    <Line value={cell} onChange={(v) => setCell(r, c, v)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="discuss-editor-adds">
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() => set('rows', [...rows, cols.map(() => '')])}
        >
          + row
        </button>
        <button type="button" className="discuss-editor-add" onClick={addColumn}>
          + column
        </button>
      </div>
      <p className="discuss-editor-hint">
        The first cell of a row is its row header, which is what makes this a table to a screen
        reader rather than a grid of text. A table earns itself by having two axes or by being
        scanned under time pressure — two columns of parallel facts is a list wearing a border.
      </p>
    </div>
  );
}

function BulletRow({
  bullet, index, count, references, sectionId, item,
  onChange, onMove, onRemove, depth = 0,
}) {
  const subs = bullet.sub || [];
  const setSubs = (next) => onChange({ ...bullet, sub: next.length ? next : undefined });

  return (
    <div className={`discuss-editor-block${depth ? ' discuss-editor-block--sub' : ''}`}>
      <div className="discuss-editor-blockhead">
        <span className="discuss-editor-id">{bullet.id}</span>
        <RefsPicker
          refs={bullet.refs}
          references={references}
          onChange={(refs) => onChange({ ...bullet, refs })}
        />
        <RowTools
          index={index}
          count={count}
          onMove={onMove}
          onRemove={onRemove}
          what={depth ? 'sub-element' : 'element'}
        />
      </div>
      <Grow value={bullet.text} onChange={(v) => onChange({ ...bullet, text: v })} />

      {subs.map((s, i) => (
        <BulletRow
          key={s.id}
          bullet={s}
          index={i}
          count={subs.length}
          references={references}
          sectionId={sectionId}
          item={item}
          depth={depth + 1}
          onChange={(next) => setSubs(subs.map((x, j) => (j === i ? next : x)))}
          onMove={(from, to) => setSubs(move(subs, from, to))}
          onRemove={(j) => setSubs(subs.filter((_, k) => k !== j))}
        />
      ))}

      {/* Two levels is the limit — an item page has no H4 and no third-level bullet. */}
      {depth === 0 && (
        <button
          type="button"
          className="discuss-editor-add discuss-editor-add--sub"
          onClick={() => setSubs([...subs, { id: newSubBulletId(item, bullet), text: '' }])}
        >
          + sub-element
        </button>
      )}
    </div>
  );
}

// `check` builds the page as it would be with this section saved and validates that, rather
// than validating the section alone — a citation of a reference that does not exist is only
// visible from the whole page, and that is exactly the kind of break worth catching.
//
// `embedded` is how PageEditor hosts one of these per section: the form then holds no state
// of its own, every change goes up through `onChange`, and there is no footer — the page
// form's Save sends everything at once. `item` is then the page as it stands in that form,
// so an id minted here sees the paragraphs added in a sibling section a moment ago.
function SectionEditor({
  section, item, isSub, onSave, onCancel, onRemove, check, embedded, onChange,
}) {
  const [local, setLocal] = useState(() => clone(section));
  useEscape(embedded ? null : onCancel);

  const s = embedded ? section : local;
  const setS = embedded
    ? (next) => onChange(typeof next === 'function' ? next(section) : next)
    : setLocal;

  const problems = !embedded && check ? check(s) : { errors: [], warnings: [] };
  const refs = item.references || [];
  const set = (key, value) => setS((prev) => ({ ...prev, [key]: value }));

  // The anchor id is derived from the heading and never typed — there is no field for it and
  // nothing about it on screen. While a section is new it follows whatever the heading says;
  // at its first save `__new` is dropped and the id fixes for good.
  //
  // It has to fix. The id is the URL fragment, the contents-rail link and the seam a community
  // edit attaches to, so letting an existing section's id chase a retitle would break bookmarks
  // and orphan annotations — and `validate.js` would rightly refuse the save for a lost anchor.
  // `section.id` is excluded from the collision check so re-deriving the same slug is a no-op
  // rather than a drift to `-2`.
  const setTitle = (title) =>
    setS((prev) => ({
      ...prev,
      title,
      ...(prev.__new ? { id: newSectionId(item, title, section.id) } : {}),
    }));

  const paras = s.paras || [];
  const items = s.items || [];
  const figures = s.figures || [];
  const tables = s.tables || [];

  // Empty arrays are dropped rather than kept, so a section that had its last paragraph
  // removed serializes without a `paras: []` nobody wrote.
  const setList = (key, next) => set(key, next.length ? next : undefined);

  return (
    <div
      className={embedded ? 'discuss-editor-embedded' : 'discuss-editor'}
      role="group"
      aria-label={`Editing ${section.title}`}
    >
      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Heading</label>
        <Line value={s.title} onChange={setTitle} />
        <p className="discuss-editor-hint">
          Sentence case, a noun phrase, four words or fewer, and never a restatement of the
          page title. A heading is an index entry, not a sentence.
        </p>
      </div>

      <div className="discuss-editor-field discuss-editor-field--inline">
        <RefsPicker
          refs={s.refs}
          references={refs}
          onChange={(v) => set('refs', v)}
          label="Section source"
        />
        <label className="discuss-editor-check">
          <input
            type="checkbox"
            checked={!!s.numbered}
            onChange={(e) => set('numbered', e.target.checked || undefined)}
          />
          numbered list
        </label>
      </div>
      <p className="discuss-editor-hint">
        Setting a section source cites the whole section once at its foot and hides the
        per-block markers. Right whenever every claim comes off one section of one publication.
        Number a list only when the sequence is the content.
      </p>

      <SlugList
        slugs={s.main}
        onChange={(v) => set('main', v)}
        label="Main page"
        hint="Where this section's topic is itself a discussion item with a page of its own."
      />
      <SlugList
        slugs={s.further}
        onChange={(v) => set('further', v)}
        label="Further information"
      />

      {figures.length > 0 && (
        <div className="discuss-editor-group">
          <h4>Figures</h4>
          {figures.map((f, i) => (
            <FigureRow
              key={f.id}
              figure={f}
              index={i}
              count={figures.length}
              references={refs}
              slug={item.slug}
              onChange={(next) => setList('figures', figures.map((x, j) => (j === i ? next : x)))}
              onMove={(from, to) => setList('figures', move(figures, from, to))}
              onRemove={(j) => setList('figures', figures.filter((_, k) => k !== j))}
            />
          ))}
        </div>
      )}

      {tables.length > 0 && (
        <div className="discuss-editor-group">
          <h4>Tables</h4>
          {tables.map((t, i) => (
            <TableRow
              key={t.id}
              table={t}
              index={i}
              count={tables.length}
              references={refs}
              onChange={(next) => setList('tables', tables.map((x, j) => (j === i ? next : x)))}
              onMove={(from, to) => setList('tables', move(tables, from, to))}
              onRemove={(j) => setList('tables', tables.filter((_, k) => k !== j))}
            />
          ))}
        </div>
      )}

      {paras.length > 0 && (
        <div className="discuss-editor-group">
          <h4>Paragraphs</h4>
          <p className="discuss-editor-hint">{BOLD_HINT}</p>
          {paras.map((p, i) => (
            <div className="discuss-editor-block" key={p.id}>
              <div className="discuss-editor-blockhead">
                <span className="discuss-editor-id">{p.id}</span>
                <RefsPicker
                  refs={p.refs}
                  references={refs}
                  onChange={(v) => setList('paras', paras.map((x, j) => (j === i ? { ...x, refs: v } : x)))}
                />
                <RowTools
                  index={i}
                  count={paras.length}
                  onMove={(from, to) => setList('paras', move(paras, from, to))}
                  onRemove={(j) => setList('paras', paras.filter((_, k) => k !== j))}
                  what="paragraph"
                />
              </div>
              <Grow
                value={p.text}
                rows={3}
                onChange={(v) => setList('paras', paras.map((x, j) => (j === i ? { ...x, text: v } : x)))}
              />
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="discuss-editor-group">
          <h4>{s.numbered ? 'Numbered list' : 'List'}</h4>
          <p className="discuss-editor-hint">
            Keep every element the same grammatical form. An element running past two lines is
            a paragraph wearing a bullet.
          </p>
          {items.map((b, i) => (
            <BulletRow
              key={b.id}
              bullet={b}
              index={i}
              count={items.length}
              references={refs}
              sectionId={s.id}
              item={item}
              onChange={(next) => setList('items', items.map((x, j) => (j === i ? next : x)))}
              onMove={(from, to) => setList('items', move(items, from, to))}
              onRemove={(j) => setList('items', items.filter((_, k) => k !== j))}
            />
          ))}
        </div>
      )}

      <div className="discuss-editor-adds">
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() => set('paras', [...paras, { id: newParaId(item, s, s.id), text: '' }])}
        >
          + paragraph
        </button>
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() => set('items', [...items, { id: newBulletId(item, s, s.id), text: '' }])}
        >
          + list element
        </button>
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() =>
            set('figures', [...figures, { id: newFigureId(item, s), src: '', alt: '', caption: '' }])
          }
        >
          + figure
        </button>
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() =>
            set('tables', [
              ...tables,
              {
                id: newTableId(item, s),
                caption: '',
                cols: ['', ''],
                rows: [['', ''], ['', '']],
              },
            ])
          }
        >
          + table
        </button>
      </div>

      {!embedded && (
        <EditorActions
          draft
          onSave={() => {
            const out = clone(s);
            delete out.__new;
            onSave(out);
          }}
          onCancel={onCancel}
          errors={problems.errors}
          warnings={problems.warnings}
          remove={{
            label: `Remove ${isSub ? 'subsection' : 'section'}`,
            question: `Remove "${s.title}" and everything in it?`,
            onConfirm: onRemove,
          }}
        />
      )}
    </div>
  );
}

export default SectionEditor;
