// The section form. Same component for a section and for one of its subsections, because a
// subsection is a section that happens to sit inside another one — the same reason
// `SectionBody` in ItemPage.js renders both.
//
// It holds its own copy of the section and hands it back on Save. Nothing it does touches the
// draft until then, which is what makes Cancel mean cancel.
//
// The words on screen are for a student editing a page, not for the person maintaining the
// site: what a field is for, in a sentence, and nothing about why the rules are the rules.
// The style guide is a page of its own (to be written), not the editor's hints.
import React, { useState } from 'react';
import { clone } from './draft';
import {
  newParaId, newBulletId, newFigureId, newTableId, newSubBulletId, newSectionId,
} from './ids';
import {
  Grow, Line, RefsPicker, RowTools, SlugList, EditorActions, useEscape, useFocusNew, move, BOLD_HINT,
} from './fields';
import { uploadFigure } from './figureUpload';
import { NWC_KINDS, NWC_LABELS, toEp, fromEp } from '../nwc';

// A figure's image comes from the upload and nowhere else: the browser converts it to WebP
// and the address it lands at is shown, never typed. The figures that shipped with the site
// under public/ keep the address they have.
//
// One image of a figure: its upload, file name and alt text, and in a gallery the words on
// its button and its place in the order.
function ImageSlot({ image, index, count, slug, gallery, onChange, onMove, onRemove }) {
  const [broken, setBroken] = useState(false);
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const set = (key, value) => onChange({ ...image, [key]: value });

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

  const fileName = image.src ? image.src.split('/').pop() : '';

  return (
    <div className={gallery ? 'discuss-editor-image discuss-editor-image--gallery' : 'discuss-editor-image'}>
      {gallery && (
        <div className="discuss-editor-blockhead">
          <span className="discuss-editor-marker">Image {index + 1}</span>
          <RowTools index={index} count={count} onMove={onMove} onRemove={onRemove} what="image" />
        </div>
      )}
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
      <p className="discuss-figure-src">
        {image.src ? <>Image: <code>{fileName}</code></> : 'No image yet. Choose a file to upload it.'}
      </p>
      <label className="discuss-editor-label">
        Alt text <span className="discuss-editor-req">required</span>
      </label>
      <p className="discuss-editor-hint">
        Describe what the image shows, for someone who cannot see it.
      </p>
      <Grow value={image.alt} onChange={(v) => set('alt', v)} />
      {gallery && (
        <>
          <label className="discuss-editor-label">Caption on the image</label>
          <p className="discuss-editor-hint">
            Shown over the foot of this image, such as Figure B-1 General Signals. The figure&apos;s own
            caption stays beneath the frame.
          </p>
          <Line value={image.label} onChange={(v) => set('label', v)} maxLength={80} />
        </>
      )}
      {image.src && (
        <div className="discuss-editor-preview">
          {broken ? (
            <p className="discuss-editor-warn">
              The image could not be loaded. Upload it again.
            </p>
          ) : (
            <img src={image.src} alt={image.alt || ''} onError={() => setBroken(true)} />
          )}
        </div>
      )}
    </div>
  );
}

// A figure with one image keeps it on the figure itself (`src`, `alt`); from the second
// image onward they live in `images`, shown on the page one at a time with a button each.
// The editor moves between the two shapes as images are added and removed, so a figure
// never carries both.
function FigureRow({ figure, index, count, references, onAddReference, slug, onChange, onMove, onRemove }) {
  const set = (key, value) => onChange({ ...figure, [key]: value });
  const gallery = Array.isArray(figure.images);
  const images = gallery ? figure.images : [{ src: figure.src, alt: figure.alt }];

  const setImages = (next) => {
    const out = { ...figure };
    if (next.length <= 1) {
      const one = next[0] || {};
      delete out.images;
      out.src = one.src || undefined;
      out.alt = one.alt || undefined;
    } else {
      delete out.src;
      delete out.alt;
      out.images = next;
    }
    onChange(out);
  };

  return (
    <div className="discuss-editor-block" data-block={figure.id}>
      <div className="discuss-editor-blockhead">
        <span className="discuss-editor-marker">Figure {index + 1}</span>
        <RefsPicker
          refs={figure.refs}
          references={references}
          onAddReference={onAddReference}
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
      {images.map((im, i) => (
        <ImageSlot
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          image={im}
          index={i}
          count={images.length}
          slug={slug}
          gallery={gallery}
          onChange={(next) => setImages(images.map((x, j) => (j === i ? next : x)))}
          onMove={(from, to) => setImages(move(images, from, to))}
          onRemove={(j) => setImages(images.filter((_, k) => k !== j))}
        />
      ))}
      <div className="discuss-editor-adds">
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() => setImages([...images, { src: '', alt: '' }])}
        >
          + image
        </button>
      </div>
      <p className="discuss-editor-hint">
        A figure with more than one image shows them one at a time, with arrows to move between
        them: for a chart too long for one image, or a set of near-identical ones.
      </p>
      <label className="discuss-editor-label">Caption</label>
      <p className="discuss-editor-hint">What the figure is and where it comes from.</p>
      <Grow value={figure.caption} onChange={(v) => set('caption', v)} />
    </div>
  );
}

// A table is edited as a grid, because a grid is what it is — editing `rows` as a list of
// arrays through anything else means counting commas. Adding or removing a column rewrites
// every row in the same operation, which is what keeps a row from going ragged: a short row
// renders with its columns silently shifted and nothing on the page says which cell went.
function TableRow({ table, index, count, references, onAddReference, onChange, onMove, onRemove }) {
  const cols = table.cols || [];
  const rows = table.rows || [];
  const set = (key, value) => onChange({ ...table, [key]: value });

  const setCell = (r, c, value) =>
    set('rows', rows.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? value : cell)) : row)));

  const addColumn = () =>
    onChange({ ...table, cols: [...cols, ''], rows: rows.map((r) => [...r, '']) });
  const removeColumn = (c) =>
    onChange({
      ...table,
      cols: cols.filter((_, j) => j !== c),
      rows: rows.map((r) => r.filter((_, j) => j !== c)),
    });

  return (
    <div className="discuss-editor-block" data-block={table.id}>
      <div className="discuss-editor-blockhead">
        <span className="discuss-editor-marker">Table {index + 1}</span>
        <RefsPicker refs={table.refs} references={references} onAddReference={onAddReference} onChange={(v) => set('refs', v)} />
        <label className="discuss-editor-check">
          <input
            type="checkbox"
            checked={!!table.numeric}
            onChange={(e) => set('numeric', e.target.checked || undefined)}
          />
          right-align numbers
        </label>
        <RowTools index={index} count={count} onMove={onMove} onRemove={onRemove} what="table" />
      </div>

      <label className="discuss-editor-label">
        Caption <span className="discuss-editor-req">required</span>
      </label>
      <Grow value={table.caption} onChange={(v) => set('caption', v)} />

      <p className="discuss-editor-hint">
        The top row holds the column headings. The first column names each row.
      </p>
      <div className="discuss-editor-grid-wrap">
        <table className="discuss-editor-grid">
          <thead>
            <tr>
              <th aria-label="Row controls" />
              {cols.map((c, j) => (
                // eslint-disable-next-line react/no-array-index-key
                <th key={j}>
                  <Line
                    value={c}
                    onChange={(v) => set('cols', cols.map((x, k) => (k === j ? v : x)))}
                    placeholder="Column heading"
                  />
                  <button
                    type="button"
                    className="discuss-editor-remove"
                    onClick={() => removeColumn(j)}
                    disabled={cols.length <= 2}
                    title={cols.length <= 2 ? 'A table needs at least two columns' : 'Remove column'}
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
    </div>
  );
}

// One list item, with its marker beside it the way the page will print it: a number for a
// numbered list, a bullet otherwise. Sub-items are always bulleted, as on the page.
//
// In an EP, `stepMarker` is the step's number, counted by the list because notes, warnings and
// cautions take none. A note, warning or caution shows its label as its marker and can be
// switched between the three; a step offers all three beneath it.
function BulletRow({
  bullet, index, count, references, onAddReference, sectionId, item, numbered, ep, stepMarker,
  onChange, onMove, onRemove, focusNew, depth = 0,
}) {
  const subs = bullet.sub || [];
  const setSubs = (next) => onChange({ ...bullet, sub: next.length ? next : undefined });
  const nwc = ep && bullet.kind;
  let marker = depth === 0 && numbered ? `${index + 1}.` : '•';
  if (ep && depth === 0) marker = stepMarker;
  if (nwc) marker = NWC_LABELS[bullet.kind];

  const addSub = (extra) => {
    const id = newSubBulletId(item, bullet);
    setSubs([...subs, { id, text: '', ...extra }]);
    if (focusNew) focusNew(id);
  };

  return (
    <div
      className={`discuss-editor-block${depth ? ' discuss-editor-block--sub' : ''}${nwc ? ` discuss-editor-nwc discuss-nwc--${bullet.kind}` : ''}`}
      data-block={bullet.id}
    >
      <div className="discuss-editor-blockhead">
        {nwc && (
          <select
            className="discuss-editor-select"
            value={bullet.kind}
            onChange={(e) => onChange({ ...bullet, kind: e.target.value })}
            aria-label="Warning, caution or note"
          >
            {NWC_KINDS.map((k) => <option key={k} value={k}>{NWC_LABELS[k].toLowerCase()}</option>)}
          </select>
        )}
        <RefsPicker
          refs={bullet.refs}
          references={references}
          onAddReference={onAddReference}
          onChange={(refs) => onChange({ ...bullet, refs })}
        />
        <RowTools
          index={index}
          count={count}
          onMove={onMove}
          onRemove={onRemove}
          what={nwc ? NWC_LABELS[bullet.kind].toLowerCase() : depth ? 'sub-item' : ep ? 'step' : 'list item'}
        />
      </div>
      <div className="discuss-editor-listrow">
        <span className={`discuss-editor-listmark${nwc ? ' discuss-editor-listmark--nwc' : ''}`} aria-hidden="true">{marker}</span>
        <Grow value={bullet.text} onChange={(v) => onChange({ ...bullet, text: v })} />
      </div>

      {subs.map((s, i) => (
        <BulletRow
          key={s.id}
          bullet={s}
          index={i}
          count={subs.length}
          references={references}
          onAddReference={onAddReference}
          sectionId={sectionId}
          item={item}
          ep={ep}
          focusNew={focusNew}
          depth={depth + 1}
          onChange={(next) => setSubs(subs.map((x, j) => (j === i ? next : x)))}
          onMove={(from, to) => setSubs(move(subs, from, to))}
          onRemove={(j) => setSubs(subs.filter((_, k) => k !== j))}
        />
      ))}

      {/* Two levels is the limit — an item page has no H4 and no third-level bullet. */}
      {depth === 0 && !nwc && (
        <div className="discuss-editor-adds discuss-editor-adds--sub">
          {ep && NWC_KINDS.map((k) => (
            <button key={k} type="button" className="discuss-editor-add" onClick={() => addSub({ kind: k })}>
              + {NWC_LABELS[k].toLowerCase()}
            </button>
          ))}
          <button type="button" className="discuss-editor-add" onClick={() => addSub()}>
            + sub-item
          </button>
        </div>
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
// `onAddReference` is the page form's, when embedded. On its own the editor keeps the sources
// added while it is open in `added`, numbered after the page's, and hands them up with the
// section on Save so the page's list grows in the same commit.
function SectionEditor({
  section, item, isSub, onSave, onCancel, onRemove, check, embedded, onChange, onAddReference,
}) {
  const [local, setLocal] = useState(() => clone(section));
  const [added, setAdded] = useState([]);
  useEscape(embedded ? null : onCancel);
  // Adding a paragraph, figure or table scrolls to the new block and puts the cursor in it.
  const focusNew = useFocusNew();

  const s = embedded ? section : local;
  const setS = embedded
    ? (next) => onChange(typeof next === 'function' ? next(section) : next)
    : setLocal;

  const problems = !embedded && check ? check(s, added) : { errors: [], warnings: [] };
  const refs = [...(item.references || []), ...(embedded ? [] : added)];
  const addRef = embedded
    ? onAddReference
    : (ref) => {
      const n = refs.length + 1;
      setAdded((prev) => [...prev, { n, ...ref }]);
      return n;
    };
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

  const addBlock = (key, block) => {
    set(key, [...(s[key] || []), block]);
    focusNew(block.id);
  };

  // A list is bulleted, numbered, or an EP. Turning one into an EP makes every entry and
  // paragraph that opens NOTE:, WARNING: or CAUTION: into one of those; turning it back puts the
  // label back into the text.
  const listStyle = s.ep ? 'ep' : s.numbered ? 'numbered' : 'bullets';
  const setListStyle = (next) => setS((prev) => {
    if (next === 'ep') return prev.ep ? prev : toEp(prev);
    return fromEp(prev, next === 'numbered');
  });
  let stepCount = 0;
  const stepMarkers = items.map((b) => (b.kind ? null : `${++stepCount}.`));

  return (
    <div
      className={embedded ? 'discuss-editor-embedded' : 'discuss-editor'}
      role="group"
      aria-label={`Editing ${section.title}`}
    >
      <div className="discuss-editor-field">
        <label className="discuss-editor-label">Heading</label>
        <Line value={s.title} onChange={setTitle} />
      </div>

      <div className="discuss-editor-field discuss-editor-field--inline">
        <RefsPicker
          refs={s.refs}
          references={refs}
          onAddReference={addRef}
          onChange={(v) => set('refs', v)}
          label="Source for the whole section"
        />
        {items.length > 0 && (
          <label className="discuss-editor-check">
            List
            <select className="discuss-editor-select" value={listStyle} onChange={(e) => setListStyle(e.target.value)}>
              <option value="bullets">bulleted</option>
              <option value="numbered">numbered</option>
              <option value="ep">emergency procedure</option>
            </select>
          </label>
        )}
      </div>
      <p className="discuss-editor-hint">
        A source chosen here is cited once, at the foot of the section, instead of on every
        paragraph. Number a list when its order matters. An emergency procedure numbers its steps
        and shows its notes, warnings and cautions the way the EPs page does.
      </p>

      <SlugList
        slugs={s.main}
        onChange={(v) => set('main', v)}
        label="Main page"
        hint="If this section's topic has a page of its own, link it here."
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
              onAddReference={addRef}
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
              onAddReference={addRef}
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
            <div className="discuss-editor-block" key={p.id} data-block={p.id}>
              <div className="discuss-editor-blockhead">
                <span className="discuss-editor-marker">Paragraph {i + 1}</span>
                <RefsPicker
                  refs={p.refs}
                  references={refs}
                  onAddReference={addRef}
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
          <h4>{s.ep ? 'Emergency procedure' : s.numbered ? 'Numbered list' : 'List'}</h4>
          <p className="discuss-editor-hint">{BOLD_HINT}</p>
          {items.map((b, i) => (
            <BulletRow
              key={b.id}
              bullet={b}
              index={i}
              count={items.length}
              references={refs}
              onAddReference={addRef}
              sectionId={s.id}
              item={item}
              numbered={!!s.numbered}
              ep={!!s.ep}
              stepMarker={stepMarkers[i]}
              focusNew={focusNew}
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
          onClick={() => addBlock('paras', { id: newParaId(item, s, s.id), text: '' })}
        >
          + paragraph
        </button>
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() => addBlock('items', { id: newBulletId(item, s, s.id), text: '' })}
        >
          {s.ep ? '+ step' : '+ list item'}
        </button>
        {items.length === 0 && (
          <button
            type="button"
            className="discuss-editor-add"
            onClick={() => {
              const block = { id: newBulletId(item, s, s.id), text: '' };
              setS((prev) => {
                const ep = toEp(prev);
                return { ...ep, items: [...(ep.items || []), block] };
              });
              focusNew(block.id);
            }}
          >
            + EP
          </button>
        )}
        {s.ep && NWC_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className="discuss-editor-add"
            title={`A ${NWC_LABELS[k].toLowerCase()} for the whole procedure`}
            onClick={() => addBlock('items', { id: newBulletId(item, s, s.id), kind: k, text: '' })}
          >
            + {NWC_LABELS[k].toLowerCase()}
          </button>
        ))}
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() => addBlock('figures', { id: newFigureId(item, s), src: '', alt: '', caption: '' })}
        >
          + figure
        </button>
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() =>
            addBlock('tables', {
              id: newTableId(item, s),
              caption: '',
              cols: ['', ''],
              rows: [['', ''], ['', '']],
            })
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
            onSave(out, added);
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
