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

function NumbersEditor({ item, onSave, onCancel, check, embedded, onChange, saving, saveError }) {
  const [local, setLocal] = useState(() => clone(item.numbers || []));
  useEscape(embedded ? null : onCancel);

  const rows = embedded ? item.numbers || [] : local;
  const setRows = embedded ? onChange : setLocal;

  const problems = !embedded && check ? check(rows) : { errors: [], warnings: [] };
  const set = (i, key, value) => setRows(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

  return (
    <div
      className={embedded ? 'discuss-editor-embedded' : 'discuss-editor discuss-editor--numbers'}
      role="group"
      aria-label="Editing Numbers"
    >
      <p className="discuss-editor-hint">
        Figures a student has to have cold — pure recall. A row is a label and a value, never a
        sentence: if the value has no digits it belongs in prose. Spell the unit as it is
        spoken (<code>210 knots GS</code>, not <code>210 KGS</code>). Consecutive rows sharing a
        label print the label once.
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
          <span className="discuss-editor-id">{n.id}</span>
          <Line value={n.label} onChange={(v) => set(i, 'label', v)} placeholder="Label" />
          <Line value={n.value} onChange={(v) => set(i, 'value', v)} placeholder="Value" />
          <RefsPicker
            refs={n.refs}
            references={item.references}
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
          publish
          saving={saving}
          saveError={saveError}
          onSave={(meta) => onSave(rows.length ? rows : undefined, meta)}
          onCancel={onCancel}
          errors={problems.errors}
          warnings={problems.warnings}
        />
      )}
    </div>
  );
}

export default NumbersEditor;
