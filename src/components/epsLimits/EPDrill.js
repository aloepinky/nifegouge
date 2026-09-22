import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gradeAnswer } from '../../utils/answerUtils';

// One EP at a time, from a plain list (see Flight/c172Data.js for the shape), laid out and
// styled as Primary's cockpit page is: Instructions, the title and the Simple/Full Mode switch
// across the top; in Full Mode the aircraft's controls either side of the EP card, Hint under
// the left and Skip under the right; the order and answer buttons beneath. Every future
// aircraft's EPs page is this component, so the look is one set of `.epl-*` classes in
// style.css, copied from Primary's inline styles (EPDivsData.js, TW4Cockpit.js). Change them
// together.
//
// A step is one box, answered as the checklist prints it ("Mixture - IDLE CUTOFF"), the way
// Primary's are.
//
// The controls come in through `left` and `right`, render functions given
// `{ fill, hint, resetKey }`:
//   fill(action, value)  writes "action - value" into the next empty step; the same control
//                        again rewrites the step it just wrote
//   hint                 the action of the next unanswered step once Hint is pressed, else null;
//                        a panel rings the control that does it
//   resetKey             changes when the EP or its answers reset; key the panel on it
// Each side is drawn at `panelWidth` and scaled to its column, the way Primary's poster images
// shrink, so a narrow screen shrinks the panels rather than stacking them.
//
// In a game, Check on an all-correct EP moves to the next after a moment, and the last calls
// `onGameComplete`. Navigation and the answer buttons are hidden for the whole game, in a
// development build too: a button that hands over the answers is not a thing to leave lying
// about in a timed run.

function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A step's control is the text before " - ". The mags key's START position writes "Cranking";
// the two are one control.
const controlOf = (text) => String(text || '').split(' - ')[0].trim();
const control = (a) => (/^cranking$/i.test(a || '') ? 'mags' : String(a || '').toLowerCase());
const sameControl = (a, b) => control(controlOf(a)) === control(controlOf(b));
const lineOf = (action, value) => (value ? `${action} - ${value}` : action);

// Draws its child at `width` and scales it down to fit the column, holding the column's height
// to the scaled height.
function ScaleToFit({ width, children }) {
  const outer = useRef(null);
  const inner = useRef(null);
  useLayoutEffect(() => {
    const fit = () => {
      const o = outer.current;
      const i = inner.current;
      if (!o || !i) return;
      const s = Math.min(1, o.clientWidth / width);
      i.style.transform = s < 1 ? `scale(${s})` : '';
      o.style.height = `${i.offsetHeight * s}px`;
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(outer.current);
    watch.observe(inner.current);
    return () => watch.disconnect();
  }, [width]);
  return (
    <div ref={outer} className="epl-scale">
      <div ref={inner} className="epl-scale-inner" style={{ width }}>{children}</div>
    </div>
  );
}

function Instructions({ hasPanel, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="epl-modal-overlay" onClick={onClose}>
      <div className="epl-modal" role="dialog" aria-label="How to use the EPs page" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="epl-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <h2>How to Use the EPs Page</h2>
        <h3>How It Works</h3>
        <ul>
          <li>One EP is shown at a time. Type each step exactly as the checklist prints it, item and setting together: "Mixture - IDLE CUTOFF". EPs are verbatim!</li>
          {hasPanel && <li>In Full Mode you can click the matching control instead of typing. A click fills the next empty step; clicking the same control again changes the setting it just wrote</li>}
          <li>Clicking on the ## of ## indicator will display a dropdown from which a specific EP can be selected</li>
          <li>A <span className="epl-swatch epl-swatch--red">red</span> box is wrong</li>
          <li>A <span className="epl-swatch epl-swatch--yellow">yellow</span> box has only part of the answer</li>
          <li>A <span className="epl-swatch epl-swatch--green">green</span> box is correct</li>
        </ul>
        <h3>Buttons &amp; Controls</h3>
        <ul>
          {hasPanel && <li><strong>Simple/Full Mode:</strong> Toggle to remove/add the controls either side of the EP</li>}
          {hasPanel && <li><strong>Hint:</strong> Highlights the control for the next step. Found under the left panel</li>}
          <li><strong>Skip:</strong> Fills the next unanswered step. Found under the right panel (bottom row in Simple Mode)</li>
          <li><strong>All Answers:</strong> Completes all remaining steps</li>
          <li><strong>Check:</strong> Validates your answers. Enter in any box does the same</li>
          <li><strong>Reset:</strong> Clears all answers and feedback</li>
          <li><strong>Random/Sequential Order:</strong> Toggle between a shuffled order and the checklist's own</li>
        </ul>
        <h3>Navigation</h3>
        <ul>
          <li>Use <strong>Previous/Next</strong> to move between EPs</li>
          <li><strong>Game Mode</strong>, in the bar above, times you through every EP; each one moves on when it is all correct</li>
        </ul>
      </div>
    </div>,
    document.body,
  );
}

function EPDrill({
  eps, title, subtitle, footnote, left, right, panelWidth = 300, sideWidth = 200,
  isGameActive = false, onGameComplete,
}) {
  const hasPanel = !!(left || right);
  const [full, setFull] = useState(() => hasPanel && window.innerWidth >= 750);
  const [showHelp, setShowHelp] = useState(false);
  const [random, setRandom] = useState(true);
  const [order, setOrder] = useState(() => shuffled(eps.length));
  const [pos, setPos] = useState(0);
  const [data, setData] = useState({});
  const [results, setResults] = useState({});
  const [resetKey, setResetKey] = useState(0);
  const [hint, setHint] = useState(null);
  const [showList, setShowList] = useState(false);
  const listRef = useRef(null);
  const pageRef = useRef(null);

  const ep = eps[order[pos]];
  const steps = useMemo(() => ep.rows.filter((r) => r.id), [ep]);
  const answers = useMemo(() => Object.fromEntries(steps.map((s) => [s.id, s.text])), [steps]);
  const fields = Object.keys(answers);
  const showTools = !isGameActive;

  useEffect(() => {
    if (!showList) return undefined;
    const close = (e) => { if (listRef.current && !listRef.current.contains(e.target)) setShowList(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showList]);

  // Hint scrolls to the ringed control if it is off screen, as Primary's does.
  useEffect(() => {
    if (!hint || !pageRef.current) return;
    const el = pageRef.current.querySelector('.epl-hint');
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [hint]);

  const go = (nextPos) => {
    setPos(nextPos);
    setResults({});
    setHint(null);
    setShowList(false);
    setResetKey((k) => k + 1);
  };

  const change = (field, value) => {
    setData((d) => ({ ...d, [field]: value }));
    setResults((r) => ({ ...r, [field]: '' }));
    setHint(null);
  };

  const check = (current = data) => {
    const out = {};
    for (const f of fields) out[f] = gradeAnswer(current[f], answers[f]);
    setResults(out);
    setHint(null);
    if (isGameActive && steps.every((s) => out[s.id] === 'correct')) {
      if (pos < order.length - 1) {
        setTimeout(() => {
          setData({});
          go(pos + 1);
        }, 600);
      } else {
        onGameComplete?.();
      }
    }
  };

  const fill = (action, value = '') => {
    setHint(null);
    const line = lineOf(action, value);
    const last = [...fields].reverse().find((f) => data[f]);
    const target = last && sameControl(data[last], action) ? last : (steps.find((s) => !data[s.id]) || {}).id;
    if (!target) return;
    setData((d) => ({ ...d, [target]: line }));
    setResults((r) => ({ ...r, [target]: '' }));
  };

  // The step Hint points at and Skip fills: the first empty box, or one holding only part of
  // its answer, as Primary's does. A box with a wrong answer already in it is left alone.
  const nextOpen = () => steps.find((s) => !data[s.id] || results[s.id] === 'partial');

  const pressHint = () => {
    const open = nextOpen();
    setHint(open ? controlOf(open.text) : null);
  };

  const skip = () => {
    const open = nextOpen();
    if (!open) return;
    const next = { ...data, [open.id]: open.text };
    setData(next);
    setHint(null);
    // Primary leaves a skipped step uncoloured until the last one, which checks the whole EP.
    if (open === steps[steps.length - 1]) check(next);
    else setResults((r) => ({ ...r, [open.id]: '' }));
  };

  const allAnswers = () => {
    const next = { ...data, ...answers };
    setData(next);
    check(next);
  };

  const reset = () => {
    const next = { ...data };
    for (const f of fields) delete next[f];
    setData(next);
    setResults({});
    setHint(null);
    setResetKey((k) => k + 1);
  };

  const toggleOrder = () => {
    const nextRandom = !random;
    setRandom(nextRandom);
    setOrder(nextRandom ? shuffled(eps.length) : eps.map((_, i) => i));
    setData({});
    go(0);
  };

  const jump = (i) => {
    setRandom(false);
    setOrder(eps.map((_, k) => k));
    go(i);
  };

  const cls = (f) => {
    const r = results[f];
    const mark = r === 'correct' ? ' correct-answer' : r === 'partial' ? ' partial-answer' : r === 'incorrect' ? ' incorrect-answer' : '';
    return `epl-input${mark}`;
  };

  const onKeyDown = (e) => { if (e.key === 'Enter') check(); };
  const api = { fill, hint, resetKey };

  let n = 0;
  const card = (
    <div className="epl-card">
      <div className="epl-card-title">{ep.title}</div>
      {ep.rows.map((row, i) => {
        if (row.decision) return <div key={i} className="epl-decision">{row.decision}</div>;
        if (row.note) return <div key={i} className="epl-note">{row.note}</div>;
        n += 1;
        return (
          <div key={row.id} className="epl-step">
            <span className="epl-num">{row.critical ? '*' : ''}{n}.</span>
            <input type="text" aria-label={`Step ${n}`} className={cls(row.id)}
              value={data[row.id] || ''} onChange={(e) => change(row.id, e.target.value)} onKeyDown={onKeyDown} />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="limits-eps-container epl-page" ref={pageRef}>
      <div className="epl-header">
        <button type="button" onClick={() => setShowHelp(true)}>Instructions</button>
        <h1>{title}</h1>
        {hasPanel ? (
          <button type="button" className={`epl-mode${full ? '' : ' epl-mode--simple'}`} onClick={() => setFull((f) => !f)}>
            {full ? 'Simple Mode' : 'Full Mode'}
          </button>
        ) : <span className="epl-mode-spacer" />}
      </div>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
      {showHelp && <Instructions hasPanel={hasPanel} onClose={() => setShowHelp(false)} />}

      <div className="eps-page">
        <div className="epl-row">
          {full && left && (
            <div className="epl-side" style={{ width: sideWidth }}>
              <ScaleToFit width={panelWidth}>{left(api)}</ScaleToFit>
              {showTools && (
                <div className="cockpit-side-actions">
                  <button type="button" onClick={pressHint}>Hint</button>
                </div>
              )}
            </div>
          )}

          <div className={`epl-center${full ? '' : ' epl-center--simple'}`}>
            {card}
            {showTools && (
              <div className="navigation-buttons">
                <button type="button" onClick={() => go(pos - 1)} disabled={pos === 0}>Previous</button>
                <span className="epl-counter" ref={listRef}>
                  <button type="button" className="epl-count" aria-haspopup="listbox" aria-expanded={showList}
                    onClick={() => setShowList((v) => !v)}>
                    {pos + 1} of {order.length}
                  </button>
                  {showList && (
                    <ul className="epl-list" role="listbox" aria-label="Emergency procedures">
                      {eps.map((e, i) => (
                        <li key={e.id} role="option" aria-selected={order[pos] === i}>
                          <button type="button" className={order[pos] === i ? 'active' : ''} onClick={() => jump(i)}>
                            {i + 1}. {e.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </span>
                <button type="button" onClick={() => go(pos + 1)} disabled={pos === order.length - 1}>Next</button>
              </div>
            )}
          </div>

          {full && right && (
            <div className="epl-side" style={{ width: sideWidth }}>
              <ScaleToFit width={panelWidth}>{right(api)}</ScaleToFit>
              {showTools && (
                <div className="cockpit-side-actions">
                  <button type="button" onClick={skip}>Skip</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="button-row" style={{ justifyContent: 'center', marginTop: 0 }}>
        {showTools && (
          <button type="button" style={{ minWidth: '147px' }} onClick={toggleOrder}>
            {random ? 'Random' : 'Sequential'} Order
          </button>
        )}
        {showTools && (!full || !right) && <button type="button" onClick={skip}>Skip</button>}
        {showTools && <button type="button" onClick={allAnswers}>All Answers</button>}
        <button type="button" onClick={() => check()}>Check</button>
        {showTools && <button type="button" onClick={reset}>Reset</button>}
      </div>
      {footnote && <p className="epl-footnote">{footnote}</p>}
    </div>
  );
}

export default EPDrill;
