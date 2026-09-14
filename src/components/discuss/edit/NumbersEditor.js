// The Numbers infobox form.
//
// It renders the live infobox above the rows so the "consecutive rows sharing a label print
// it once" behaviour is visible while you are editing — that rule lives in the renderer
// (ItemPage.js), and an author who cannot see it applying will write the label out twice and
// wonder why the page swallowed one.
//
// `embedded` is how PageEditor hosts it: no state of its own, every change up through
// `onChange(rows)`, and no footer of its own.
import React, { useState } from 'react';
import { clone } from './draft';
import { newNumberId } from './ids';
import { Line, RefsPicker, RowTools, EditorActions, ConfirmButton, useEscape, move } from './fields';

function NumbersEditor({ item, onSave, onCancel, check, embedded, onChange, onAddReference }) {
  const [local, setLocal] = useState(() => clone(item.numbers || []));
  // Sources added while the box is edited on its own, handed up with the rows on Save.
  const [added, setAdded] = useState([]);
  useEscape(embedded ? null : onCancel);

  const rows = embedded ? item.numbers || [] : local;
  const setRows = embedded ? onChange : setLocal;

  const problems = !embedded && check ? check(rows, added) : { errors: [], warnings: [] };
  const refs = [...(item.references || []), ...(embedded ? [] : added)];
  const addRef = embedded
    ? onAddReference
    : (ref) => {
      const n = refs.length + 1;
      setAdded((prev) => [...prev, { n, ...ref }]);
      return n;
    };
  const set = (i, key, value) => setRows(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

  return (
    <div
      className={embedded ? 'discuss-editor-embedded' : 'discuss-editor discuss-editor--numbers'}
      role="group"
      aria-label="Editing Numbers"
    >
      <p className="discuss-editor-hint">
        The numbers a student has to know cold. Each row is a short label and a value, such as
        <code>Max crosswind</code> and <code>25 knots</code>. Rows in a row with the same label
        show it once.
      </p>

      {rows.length > 0 && (
        <aside className="discuss-infobox discuss-infobox--preview" aria-label="Numbers preview">
          <div className="discuss-infobox-head">Numbers</div>
          <table>
            <tbody>
              {rows.map((n, i) => (
                <tr key={n.id}>
                  <th scope="row">{i > 0 && rows[i - 1].label === n.label ? '' : n.label}</th>
                  <td>{n.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      )}

      {rows.map((n, i) => (
        <div className="discuss-editor-row" key={n.id}>
          <span className="discuss-editor-marker">{i + 1}</span>
          <Line value={n.label} onChange={(v) => set(i, 'label', v)} placeholder="Label" />
          <Line value={n.value} onChange={(v) => set(i, 'value', v)} placeholder="Value" />
          <RefsPicker
            refs={n.refs}
            references={refs}
            onAddReference={addRef}
            onChange={(v) => set(i, 'refs', v)}
          />
          <RowTools
            index={i}
            count={rows.length}
            onMove={(from, to) => setRows(move(rows, from, to))}
            onRemove={(j) => setRows(rows.filter((_, k) => k !== j))}
            what="row"
          />
        </div>
      ))}

      <div className="discuss-editor-adds">
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() =>
            setRows([...rows, { id: newNumberId({ ...item, numbers: rows }), label: '', value: '' }])
          }
        >
          + row
        </button>
        {rows.length > 0 && (
          <ConfirmButton
            className="discuss-editor-remove-block"
            label="Remove the box"
            question={`Remove all ${rows.length} rows and the box with them?`}
            confirmLabel="Remove"
            onConfirm={() => setRows([])}
          />
        )}
      </div>

      {!embedded && (
        <EditorActions
          draft
          onSave={() => onSave(rows.length ? rows : undefined, added)}
          onCancel={onCancel}
          errors={problems.errors}
          warnings={problems.warnings}
        />
      )}
    </div>
  );
}

export default NumbersEditor;
