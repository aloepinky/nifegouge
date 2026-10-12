import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// How the click targets on a cockpit poster get drawn. Development builds only, behind ?spots —
// CockpitPoster lazy-imports it, so the chunk is never even fetched on the live site.
//
// Drag a box over a control, name it, say what it writes, and take the whole data file to the
// clipboard. It exists because the alternative is typing a hundred percentage rectangles by
// hand and reloading after each one, which is how Primary's 133 were done and is not worth
// repeating twice more.
//
// Two rules it exists to enforce:
//   * a `box` is FRACTIONS of the region image, so re-cropping at another resolution keeps it;
//   * `action` and each of `values` must be spelt as the CHECKLIST spells them. `also` is where
//     the sheet's other wordings for the same physical control go. Clicking a control writes the
//     step's own text rather than anything typed here (epsLimits/stepFlow.js); `values` is the
//     record of what the EPs ask of this control, and what the coverage report checks against.
//
// The coverage report under the form is the acceptance test: it lists the steps in this
// aircraft's EPs that no spot and no action button answers for. A control nobody can click and
// nothing says is missing is the failure this catches.

const r4 = (n) => Math.round(n * 10000) / 10000;
const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const commas = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

const BLANK = { action: '', also: [], values: [], label: '', box: [0, 0, 0, 0] };

// The poster object, printed as the source of its own data file. Every field a record has is
// written back, not just the ones this form edits: a record can carry an `id` (one control drawn
// twice), `actions` and `fills` (one target answering two controls, or half a step), and
// `values` kept per control as an object. An earlier version wrote only five fields and a paste
// of its output silently dropped the rest. Comments cannot survive the round trip through an
// object; tools/merge-spot-boxes.js puts pasted boxes back into the committed file instead.
const FIRST = ['box', 'id', 'label', 'action', 'also', 'values'];
function serialise(poster, spotsByRegion) {
  const spot = (s) => {
    const keys = [...FIRST.filter((k) => k in s), ...Object.keys(s).filter((k) => !FIRST.includes(k))];
    const bits = keys
      .filter((k) => s[k] !== undefined && !(k !== 'box' && Array.isArray(s[k]) && !s[k].length))
      .map((k) => (k === 'box' ? `box: [${s.box.map(r4).join(', ')}]` : `${k}: ${JSON.stringify(s[k])}`));
    return `      { ${bits.join(', ')} },`;
  };
  const region = (rg) => [
    '    {',
    `      id: ${JSON.stringify(rg.id)},`,
    `      label: ${JSON.stringify(rg.label)},`,
    `      src: ${JSON.stringify(rg.src)},`,
    `      alt: ${JSON.stringify(rg.alt)},`,
    '      spots: [',
    ...(spotsByRegion[rg.id] || []).map(spot).map((l) => `  ${l}`),
    '      ],',
    '    },',
  ].join('\n');
  return [
    '  regions: [',
    (poster.regions || []).map(region).join('\n'),
    '  ],',
  ].join('\n');
}

export default function SpotEditor({ poster, region }) {
  const [byRegion, setByRegion] = useState(() => Object.fromEntries(
    (poster.regions || []).map((r) => [r.id, (r.spots || []).map((s) => ({ ...s }))]),
  ));
  const [sel, setSel] = useState(null);
  const [drag, setDrag] = useState(null);
  const [said, setSaid] = useState('');
  const surface = useRef(null);

  const spots = byRegion[region.id] || [];
  const current = sel != null ? spots[sel] : null;

  const put = (next) => setByRegion((b) => ({ ...b, [region.id]: next }));
  const edit = (patch) => put(spots.map((s, i) => (i === sel ? { ...s, ...patch } : s)));

  const at = (e) => {
    const r = surface.current.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  const down = (e) => {
    if (e.button !== 0) return;
    const [x, y] = at(e);
    setDrag({ x, y, x2: x, y2: y });
  };

  useEffect(() => {
    if (!drag) return undefined;
    const move = (e) => {
      const r = surface.current.getBoundingClientRect();
      setDrag((d) => d && { ...d, x2: (e.clientX - r.left) / r.width, y2: (e.clientY - r.top) / r.height });
    };
    const up = () => {
      setDrag((d) => {
        if (!d) return null;
        const box = [Math.min(d.x, d.x2), Math.min(d.y, d.y2), Math.abs(d.x2 - d.x), Math.abs(d.y2 - d.y)];
        // A click rather than a drag: too small to be a target, so treat it as a miss.
        if (box[2] > 0.004 && box[3] > 0.004) {
          put([...spots, { ...BLANK, box, label: '', action: '' }]);
          setSel(spots.length);
        }
        return null;
      });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [drag, spots]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Arrow keys nudge the selected box; Shift moves it five times as far. The last pixel of
  // alignment is much easier this way than by redrawing.
  useEffect(() => {
    const key = (e) => {
      if (sel == null || !current) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const step = (e.shiftKey ? 0.005 : 0.001);
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      const b = current.box;
      edit({ box: e.altKey ? [b[0], b[1], b[2] + d[0], b[3] + d[1]] : [b[0] + d[0], b[1] + d[1], b[2], b[3]] });
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const copy = () => {
    const text = serialise(poster, byRegion);
    navigator.clipboard.writeText(text).then(
      () => setSaid('copied: paste over the regions array, or run tools/merge-spot-boxes.js to keep the comments'),
      () => { console.log(text); setSaid('clipboard refused; written to the console'); },   // eslint-disable-line no-console
    );
    setTimeout(() => setSaid(''), 4000);
  };

  const pct = (b) => ({ left: `${b[0] * 100}%`, top: `${b[1] * 100}%`, width: `${b[2] * 100}%`, height: `${b[3] * 100}%` });
  const dragBox = drag && [Math.min(drag.x, drag.x2), Math.min(drag.y, drag.y2),
    Math.abs(drag.x2 - drag.x), Math.abs(drag.y2 - drag.y)];

  return (
    <>
      <div ref={surface} className="epl-spots-edit" onMouseDown={down}>
        {spots.map((s, i) => (
          <div
            key={i}                                      // eslint-disable-line react/no-array-index-key
            className={`epl-spot-box${i === sel ? ' sel' : ''}${s.action ? '' : ' unnamed'}`}
            style={pct(s.box)}
            onMouseDown={(e) => { e.stopPropagation(); setSel(i); }}
          >
            <span>{s.label || s.action || '?'}</span>
          </div>
        ))}
        {dragBox && <div className="epl-spot-box sel" style={pct(dragBox)} />}
      </div>

      {createPortal(
        <div className="epl-spot-form">
          <h4>Spots — {region.label} <small>{spots.length} on this region</small></h4>
          {current ? (
            <>
              <label>Name shown on hover
                <input value={current.label} onChange={(e) => edit({ label: e.target.value })} />
              </label>
              <label>Action, spelt as the checklist spells it
                <input value={current.action} onChange={(e) => edit({ action: e.target.value })} />
              </label>
              <label>Other wordings for the same control, comma separated
                <input value={(current.also || []).join(', ')} onChange={(e) => edit({ also: commas(e.target.value) })} />
              </label>
              {/* A target answering two controls keeps a settings list per control (the attitude
                  indicator: Pitch and Wings), which one list cannot show. The form leaves it alone
                  rather than flattening it; it is changed in the data file. */}
              {current.values && !Array.isArray(current.values) ? (
                <p className="box">Settings are kept per control for this spot
                  ({Object.keys(current.values).join(', ')}); change them in the data file.</p>
              ) : (
                <label>Every setting the EPs put this control to, one per line
                  <textarea rows={3} value={(current.values || []).join('\n')}
                    onChange={(e) => edit({ values: lines(e.target.value) })} />
                </label>
              )}
              <p className="box">box: [{current.box.map(r4).join(', ')}] — arrows nudge, with alt resize</p>
              <button type="button" onClick={() => { put(spots.filter((_, i) => i !== sel)); setSel(null); }}>
                Remove this spot
              </button>
            </>
          ) : <p>Drag a box over a control to add one, or click a box to change it.</p>}
          <hr />
          <button type="button" onClick={copy}>Copy data file</button>
          {said && <p className="said">{said}</p>}
        </div>,
        document.body,
      )}
    </>
  );
}
