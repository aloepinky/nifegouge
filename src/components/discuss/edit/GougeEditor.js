// The Random gouge list form: reorder, reword or remove the facts students have added.
//
// Adding a fact does not come through here. The page itself has a one-line box that publishes
// the fact at once (ItemPage.js, GougeBox); this editor is the slower path for everything else,
// and like every other editor it saves to the draft and publishes from the banner.
//
// `embedded` is how PageEditor hosts it: no state of its own, every change up through
// `onChange(rows)`, and no footer of its own.
import React, { useState } from 'react';
import { clone } from './draft';
import { newGougeId } from './ids';
import { Grow, RowTools, EditorActions, ConfirmButton, useEscape, move, BOLD_HINT } from './fields';

function GougeEditor({ item, onSave, onCancel, check, embedded, onChange }) {
  const [local, setLocal] = useState(() => clone(item.gouge || []));
  useEscape(embedded ? null : onCancel);

  const rows = embedded ? item.gouge || [] : local;
  const setRows = embedded ? onChange : setLocal;
  const problems = !embedded && check ? check(rows) : { errors: [], warnings: [] };
  const set = (i, text) => setRows(rows.map((r, j) => (j === i ? { ...r, text } : r)));

  return (
    <div
      className={embedded ? 'discuss-editor-embedded' : 'discuss-editor discuss-editor--gouge'}
      role="group"
      aria-label="Editing Random gouge"
    >
      <p className="discuss-editor-hint">
        Informal facts people were asked or heard in a brief. One per row, no sources needed. {BOLD_HINT}
      </p>

      {rows.map((g, i) => (
        <div className="discuss-editor-row" key={g.id}>
          <span className="discuss-editor-marker">{i + 1}</span>
          <Grow value={g.text} rows={1} onChange={(v) => set(i, v)} placeholder="The fact" />
          <RowTools
            index={i}
            count={rows.length}
            onMove={(from, to) => setRows(move(rows, from, to))}
            onRemove={(j) => setRows(rows.filter((_, k) => k !== j))}
            what="fact"
          />
        </div>
      ))}

      <div className="discuss-editor-adds">
        <button
          type="button"
          className="discuss-editor-add"
          onClick={() => setRows([...rows, { id: newGougeId({ ...item, gouge: rows }), text: '' }])}
        >
          + fact
        </button>
        {rows.length > 1 && (
          <ConfirmButton
            className="discuss-editor-remove-block"
            label="Remove all"
            question={`Remove all ${rows.length} facts?`}
            confirmLabel="Remove"
            onConfirm={() => setRows([])}
          />
        )}
      </div>

      {!embedded && (
        <EditorActions
          draft
          onSave={() => onSave(rows.length ? rows : undefined)}
          onCancel={onCancel}
          errors={problems.errors}
          warnings={problems.warnings}
        />
      )}
    </div>
  );
}

export default GougeEditor;
