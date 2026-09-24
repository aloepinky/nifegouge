import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gradeAnswer } from '../../utils/answerUtils';
import { controlOf, sameControl, DEFAULT_ALIASES } from './controlMatch';
import { openStep, clickOutcome, FILL } from './stepFlow';

// One EP at a time, from a plain list (see Flight/c172Data.js for the shape), laid out and
// styled as Primary's cockpit page is: Instructions, the title and the Simple/Full Mode switch
// across the top; in Full Mode the aircraft's controls either side of the EP card, Hint under
// the left and Skip under the right; the order and answer buttons under Previous/Next. Every future
// aircraft's EPs page is this component, so the look is one set of `.epl-*` classes in
// style.css, copied from Primary's inline styles (EPDivsData.js, TW4Cockpit.js). Change them
// together.
//
// A step is one box, answered as the checklist prints it ("Mixture - IDLE CUTOFF"), the way
// Primary's are. It carries the markers its publication prints beside the step number, and
// nothing about them is one school's: `critical` is the asterisk (a memory item) and `concur`
// the dagger (NATOPS §12.1, "requires concurrence of both pilots").
//
// The controls come in through `top`, `left` and `right`, render functions given
// `{ fill, hint, reveal, resetKey }`:
//   fill(action, part)   writes the open step's own answer, as the checklist prints it, if that
//                        step names this control; otherwise writes nothing and marks the box
//                        red. Primary's rule, and the same code - see stepFlow.js. A control
//                        does NOT choose the setting: clicking the right one hands over the
//                        whole step. `part` is for the rare step that takes SEVERAL controls: it
//                        is the piece of the step's text this one supplies, and the box stays
//                        yellow until every piece is in.
//   hint                 the action of the next unanswered step once Hint is pressed, else null;
//                        a panel rings the control that does it
//   reveal               `{ control, at }` each time Hint or Skip names a step, `at` counting
//                        up so the same control twice still registers; a poster uses it to
//                        bring the panel holding that control to the front. Null otherwise.
//   next                 the control of the step the checklist is asking for next, always. A
//                        target that stands for more than one step reads it to decide which to
//                        fill; it never moves the poster.
//   resetKey             changes when the EP or its answers reset. Nothing keys on it today —
//                        a click carries no state now that it does not choose the setting — but
//                        a panel that draws switches in their positions would need it.
//
// `sideWidth` is one number for both columns, or `[left, right]` where a bespoke layout wants
// them different.
//
// `top` is a full-width band above the three-column row, for an aircraft whose poster is one
// wide panel (the C172) or an atlas of separate ones (the T-44C) rather than the two tall
// console towers Primary's `left`/`right` were shaped for. The band sizes itself.

//
// `left` and `right` are each drawn at `panelWidth` and scaled to their column, so a narrow
// screen shrinks a fixed-width drawing rather than stacking it. `scaleSides={false}` turns that
// off, which is right whenever a side holds something fluid: a column of buttons wants the
// column's own width, and scaling it only makes the captions unreadable.
//
// `fill` writes the spelling the target step's own checklist uses rather than the caller's,
// once the click has established which control it is. A sheet spells one control several ways
// (the T-44C prints "Condition Lever" and "Condition Levers") and a control can only carry one
// of them; `normalizeAnswer` does not singularise, so the spelling has to be resolved here or a
// correct click grades red. The step text is never edited to suit a control — it is the
// checklist's own wording, which the Instructions modal tells the student to type verbatim.
//
// `aliases` is how a school says two unlike wordings are one control (the C172's mags key
// writes "Cranking" at START). See controlMatch.js; a poster derives its own with
// `aliasesFrom`, so the pairing is that aircraft's data rather than code in here.
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

// Within one step, warnings come first, then cautions, then notes. That is the order of
// severity rather than the order the page prints them in, and it is the order Primary's modal
// has always used.
// A step's answer is shown at whatever size makes it fit the box, never below this. See the
// measurement in EPDrill: the box is a fixed width and the text gives way, which is Primary's
// rule for a 73-character step in a 350px card.
const MIN_STEP_FONT = 6;

const NWC_KINDS = [
  ['warnings', 'warning', 'Warning'],
  ['cautions', 'caution', 'Caution'],
  ['notes', 'note', 'Note'],
];

// Every NWC in one procedure, numbered straight through: the ones printed before the steps
// first (keyed by the EP's own id), then each step's in order. The numbering is the point — a
// student learns that Aborting Takeoff has four, not that this step has two — so it counts the
// whole procedure even when one step was clicked.
function nwcItems(group, nwc, hints) {
  const items = [];
  let seq = 0;
  for (const { key } of group) {
    const data = nwc[key];
    if (!data) continue;
    for (const [field, category] of NWC_KINDS) {
      const texts = data[field] || [];
      for (let i = 0; i < texts.length; i += 1) {
        seq += 1;
        items.push({ seq, key, category, text: texts[i], hint: hints && hints[key] && (hints[key][field] || [])[i] });
      }
    }
  }
  return items;
}

function nwcCounts(keys, nwc) {
  const out = { notes: 0, warnings: 0, cautions: 0 };
  for (const key of keys) {
    const data = nwc[key];
    if (!data) continue;
    out.notes += (data.notes || []).length;
    out.warnings += (data.warnings || []).length;
    out.cautions += (data.cautions || []).length;
  }
  return out;
}

// The whole procedure's NWCs, collapsed to their number and category. Opening one is the recall
// exercise: you are told there are three and which kind each is, and you say what it says before
// you look. The ones belonging to the step you clicked are ringed so you can find them again.
function NWCModal({ group, current, nwc, hints, onClose }) {
  const [open, setOpen] = useState({});
  const [shown, setShown] = useState({});
  const [allHints, setAllHints] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items = nwcItems(group, nwc, hints);
  const epCounts = nwcCounts(group.map((g) => g.key), nwc);
  const stepCounts = nwcCounts([current], nwc);
  const heading = (group.find((g) => g.key === current) || {}).heading || '';
  // The toggle only appears once there is a hint to reveal, so it is never a control that can
  // do nothing. Write hints and it shows up on its own.
  const anyHints = items.some((i) => i.hint);

  return createPortal(
    <div className="epl-modal-overlay" onClick={onClose}>
      <div className="epl-modal epl-nwc-modal" role="dialog" aria-label={`Notes, warnings and cautions for ${heading}`}
        onClick={(e) => e.stopPropagation()}>
        <button type="button" className="epl-modal-close" onClick={onClose} aria-label="Close">&times;</button>

        <div className="epl-nwc-counts">
          {[['N', 'notes'], ['W', 'warnings'], ['C', 'cautions']].map(([letter, cat]) => (
            <div key={cat} className="epl-nwc-count">
              <div className="epl-nwc-count-letter">{letter}</div>
              <div className="epl-nwc-count-ep">{epCounts[cat]}</div>
              <div className="epl-nwc-count-step">{stepCounts[cat]}</div>
            </div>
          ))}
        </div>

        <div className="epl-nwc-head">
          <h2 className="epl-nwc-heading">{heading}</h2>
          {anyHints && (
            <button type="button" className={`epl-nwc-allhints${allHints ? ' active' : ''}`}
              aria-pressed={allHints} onClick={() => setAllHints((v) => !v)}>
              All Hints
            </button>
          )}
        </div>

        <div className="epl-nwc-list">
          {items.map((item) => {
            const ring = item.key === current ? ' epl-nwc--current' : '';
            const toggle = () => setOpen((p) => ({ ...p, [item.seq]: !p[item.seq] }));
            const label = NWC_KINDS.find(([, c]) => c === item.category)[2];
            if (open[item.seq]) {
              return (
                <button type="button" key={item.seq} onClick={toggle}
                  className={`epl-nwc epl-nwc--${item.category}${ring} epl-nwc-item epl-nwc-item--open`}>
                  <strong>{item.seq}. {label.toUpperCase()}:</strong> {item.text}
                </button>
              );
            }
            return (
              <button type="button" key={item.seq} onClick={toggle}
                className={`epl-nwc epl-nwc--${item.category}${ring} epl-nwc-item`}>
                <span>{item.seq}. {label}</span>
                {item.hint && (allHints || shown[item.seq]
                  ? <span className="epl-nwc-hint">{item.hint}</span>
                  : (
                    <span className="epl-nwc-hint-link" role="button" tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setShown((p) => ({ ...p, [item.seq]: true })); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setShown((p) => ({ ...p, [item.seq]: true })); } }}>
                      Hint
                    </span>
                  ))}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Instructions({ hasPanel, hasBand, hasLeft, hasNWC, onClose }) {
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
          {hasBand && <li>The cockpit poster is drawn above and beside the EP. Hint and Skip ring the control a step names and scroll it into view; where the poster shows one panel at a time, they bring up the panel it is on</li>}
          <li>Clicking on the ## of ## indicator will display a dropdown from which a specific EP can be selected</li>
          <li>A <span className="epl-swatch epl-swatch--red">red</span> box is wrong</li>
          <li>A <span className="epl-swatch epl-swatch--yellow">yellow</span> box has only part of the answer</li>
          <li>A <span className="epl-swatch epl-swatch--green">green</span> box is correct</li>
          {hasNWC && <li>An <strong>NWC</strong> button beside a step or the EP title opens the notes, warnings and cautions the publication prints there. A step with nothing printed against it has no button</li>}
        </ul>
        <h3>Buttons &amp; Controls</h3>
        <ul>
          {hasPanel && <li><strong>Simple/Full Mode:</strong> Toggle to remove/add the controls either side of the EP</li>}
          {hasPanel && <li><strong>Hint:</strong> Highlights the control for the next step. Found {hasLeft ? 'under the left panel' : 'in the button row'}</li>}
          <li><strong>Skip:</strong> Fills the next unanswered step. Found under the right panel (bottom row in Simple Mode)</li>
          <li><strong>All Answers:</strong> Completes all remaining steps</li>
          <li><strong>Check:</strong> Validates your answers. Enter in any box does the same</li>
          <li><strong>Reset:</strong> Clears all answers and feedback</li>
          <li><strong>Random/Sequential Order:</strong> Toggle between a shuffled order and the checklist's own</li>
          {hasNWC && <li><strong>Auto NWC:</strong> Opens a step's notes, warnings and cautions as soon as you get that step right</li>}
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
  eps, title, subtitle, footnote, top, left, right, panelWidth = 300, sideWidth = 200,
  scaleSides = true,
  aliases = DEFAULT_ALIASES,
  nwc, nwcHints, isGameActive = false, onGameComplete,
}) {
  // One number sets both columns; a pair sets them separately, which a bespoke layout needs —
  // Advanced hangs a column of buttons on the left and a stack of three panels on the right.
  const [leftWidth, rightWidth] = Array.isArray(sideWidth) ? sideWidth : [sideWidth, sideWidth];
  const hasPanel = !!(top || left || right);
  const [full, setFull] = useState(() => hasPanel && window.innerWidth >= 750);
  const [showHelp, setShowHelp] = useState(false);
  const [reveal, setReveal] = useState(null);
  const aimSeq = useRef(0);
  const [random, setRandom] = useState(true);
  const [order, setOrder] = useState(() => shuffled(eps.length));
  const [pos, setPos] = useState(0);
  const [data, setData] = useState({});
  const [results, setResults] = useState({});
  const [resetKey, setResetKey] = useState(0);
  const [hint, setHint] = useState(null);
  const [showList, setShowList] = useState(false);
  const [autoNWC, setAutoNWC] = useState(false);
  const [openNWC, setOpenNWC] = useState(null);
  const listRef = useRef(null);
  const pageRef = useRef(null);
  const sizerRef = useRef(null);
  const parts = useRef({});
  const rulerRef = useRef(null);
  const [cardMin, setCardMin] = useState(0);
  const [fit, setFit] = useState({});
  const wasCorrect = useRef({});

  const ep = eps[order[pos]];
  const steps = useMemo(() => ep.rows.filter((r) => r.id), [ep]);
  const answers = useMemo(() => Object.fromEntries(steps.map((s) => [s.id, s.text])), [steps]);
  const fields = Object.keys(answers);
  const showTools = !isGameActive;

  // The NWCs for a step or, keyed by the EP's own id, the ones the publication prints before
  // the procedure. A record with nothing in it opens nothing.
  const nwcAt = (key) => {
    const found = nwc && nwc[key];
    if (!found) return null;
    const { warnings = [], cautions = [], notes = [] } = found;
    return warnings.length + cautions.length + notes.length ? found : null;
  };
  const hasNWC = !!nwc;

  // The procedure's NWC anchors in publication order: what is printed before the steps, then
  // each step that has something. This is derived rather than listed, because the EP already
  // knows its own order — Primary keeps a hand-written EP_NWC_GROUPS only because its data is
  // not shaped this way.
  const nwcGroup = [{ key: ep.id, heading: ep.title }, ...steps.map((s2) => ({ key: s2.id, heading: s2.text }))]
    .filter((g) => nwcAt(g.key));

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

  // Auto NWC: when a step turns out right, show what the publication prints beside it. It
  // follows the marking rather than the typing, so the NWC arrives with the green box.
  //
  // It is the first newly-correct step *that has something to show* rather than simply the first
  // newly-correct one: a check marks several steps at once and All Answers marks the lot, and
  // most steps carry no NWC, so keying on the first of them shows nothing almost every time.
  useEffect(() => {
    if (!autoNWC) return undefined;
    const opened = steps.find((s2) => results[s2.id] === 'correct' && !wasCorrect.current[s2.id] && nwcAt(s2.id));
    wasCorrect.current = Object.fromEntries(steps.map((s2) => [s2.id, results[s2.id] === 'correct']));
    if (!opened) return undefined;
    const at = setTimeout(() => setOpenNWC(opened.id), 600);
    return () => clearTimeout(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, autoNWC, steps]);

  const go = (nextPos) => {
    setPos(nextPos);
    setResults({});
    setHint(null);
    setReveal(null);
    setShowList(false);
    setOpenNWC(null);
    wasCorrect.current = {};
    parts.current = {};
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

  // A click fills the open step's own answer, or marks it red and writes nothing. stepFlow.js
  // holds both halves of that rule and Primary asks the same file, which is the whole point of
  // there being a file: the two had drifted, and a poster click was landing on a step past the
  // one the page was actually on.
  //
  // A step the click does answer is written out as the CHECKLIST prints it, never as the control
  // spells it. A sheet spells one control several ways - the T-44C prints both "Condition Lever"
  // and "Condition Levers" - and a target can only carry one of them; `normalizeAnswer` does not
  // singularise, so without this a correct click grades red.
  const fill = (action, fragment) => {
    setHint(null);
    const step = nextOpen();
    if (!step) return;
    const target = step.id;
    const answer = answers[target];

    const names = sameControl(answer, action, aliases);
    if (clickOutcome(names ? 1 : 0, 1) !== FILL) {
      setResults((r) => ({ ...r, [target]: 'incorrect' }));
      return;
    }

    // A step that takes more than one control is answered a piece at a time: each control says
    // which part of the step's own text it supplies, and the pieces in hand are written in the
    // order the checklist prints them. Primary does this with answers that are arrays of
    // fragments; here the answer is one string and the fragments are cut out of it, which comes
    // to the same thing and needs no second copy of the wording. `gradeAnswer` then marks the box
    // yellow until the last piece arrives — the third outcome in stepFlow.js, which until now
    // only Primary could reach.
    const piece = fragment && answer.includes(fragment) ? fragment : null;
    if (piece) parts.current[target] = [...new Set([...(parts.current[target] || []), piece])];
    const line = piece
      ? parts.current[target].slice().sort((a, b) => answer.indexOf(a) - answer.indexOf(b)).join(' ')
      : answer;

    const next = { ...data, [target]: line };
    setData(next);
    const mark = gradeAnswer(line, answer);
    // Completing the last step checks the whole EP, as Primary does and as Skip does here. A
    // half-answered last step must NOT check it, or the pieces still to come are marked wrong.
    if (mark === 'correct' && target === steps[steps.length - 1].id) check(next);
    else setResults((r) => ({ ...r, [target]: mark }));
  };

  // The step a click, Hint and Skip all act on. See stepFlow.js.
  const nextOpen = () => {
    const id = openStep(fields, {
      value: (f) => data[f],
      result: (f) => results[f],
      answer: (f) => answers[f],
    });
    return steps.find((s) => s.id === id);
  };

  // Hint and Skip are the two affordances that say where a control is, so they are the two that
  // move a poster's band to the panel holding it. `at` counts rather than compares, so hinting
  // the same control twice still fires; a bare `hint` string would not, and `skip` clears it.
  // Nothing else moves the band: which panel the crossfeed is on is itself the lesson, and a
  // band that walks you there unasked removes it.
  const aim = (step) => {
    aimSeq.current += 1;
    setReveal(step ? { control: controlOf(step.text), at: aimSeq.current } : null);
  };

  const pressHint = () => {
    const open = nextOpen();
    aim(open);
    setHint(open ? controlOf(open.text) : null);
  };

  const skip = () => {
    const open = nextOpen();
    if (!open) return;
    aim(open);
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
    setReveal(null);
    setOpenNWC(null);
    wasCorrect.current = {};
    parts.current = {};
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
  // The control the checklist is asking for next, every render rather than only on Hint. A
  // target carrying more than one step reads it to pick which one to fill; nothing uses it to
  // move the poster, which stays the job of `reveal`.
  const api = { fill, hint, reveal, next: controlOf((nextOpen() || {}).text), resetKey };

  // The NWC affordance: a step or a title only grows one when the publication prints something
  // against it, so its presence is itself information.
  const nwcButton = (key, className = 'epl-nwc-btn') => {
    if (!nwcAt(key)) return null;
    return (
      <button type="button" className={className} title="Notes, warnings and cautions"
        onClick={() => setOpenNWC(key)}>
        NWC
      </button>
    );
  };

  // Every EP's card, rendered once, hidden, and measured — see the sizer in the middle column
  // below. It carries no state at all, so it reconciles once and never again while you type, and
  // it is real markup rather than an estimate: a decision line that wraps to two lines on a
  // narrow screen is two lines here too.
  //
  // EVERY ELEMENT HERE HAS TO BE THE ELEMENT THE REAL CARD USES. The NWC chip was a `span` here
  // against a `button` there, which is 0.29px shorter per row — two rows of Aborting Takeoff, one
  // rounded pixel of card, and the navigation row it is supposed to hold still moved.
  const sizerCards = useMemo(() => eps.map((e) => {
    let k = 0;
    const has = (key) => {
      const found = nwc && nwc[key];
      if (!found) return false;
      const { warnings = [], cautions = [], notes = [] } = found;
      return !!(warnings.length + cautions.length + notes.length);
    };
    return (
      <div className="epl-card" key={e.id}>
        <div className="epl-card-title">
          {e.title}
          {has(e.id) && <button type="button" className="epl-nwc-btn epl-nwc-btn--title" tabIndex={-1}>NWC</button>}
        </div>
        {e.rows.map((row, i) => {
          if (row.decision) return <div key={i} className="epl-decision">{row.decision}</div>;
          if (row.note) return <div key={i} className="epl-note">{row.note}</div>;
          k += 1;
          return (
            <div key={row.id} className="epl-step">
              <span className="epl-num">{row.concur ? '†' : ''}{row.critical ? '*' : ''}{k}.</span>
              <input type="text" className="epl-input" readOnly tabIndex={-1} defaultValue="" />
              {has(row.id) && <button type="button" className="epl-nwc-btn" tabIndex={-1}>NWC</button>}
            </div>
          );
        })}
      </div>
    );
  }), [eps, nwc]);

  // Two measurements off the sizer, both re-run whenever the column changes width.
  // `useLayoutEffect` so they are in place before the browser paints rather than a frame later.
  useLayoutEffect(() => {
    const el = sizerRef.current;
    if (!el) return undefined;
    const measure = () => {
      // The tallest card, which is what the slot around the real one reserves. Measured off the
      // rects rather than offsetHeight, which rounds to a whole pixel and can therefore report a
      // card as shorter than it is; `scale` undoes the container's transform, since a min-height
      // is in layout pixels and a rect is in painted ones. Then round UP, because reserving a
      // sub-pixel too little is exactly the bug this whole sizer exists to prevent.
      const scale = el.getBoundingClientRect().width / el.offsetWidth || 1;
      let max = 0;
      for (const child of el.children) max = Math.max(max, child.getBoundingClientRect().height / scale);
      setCardMin(Math.ceil(max));

      // And the font each step needs to show its whole answer inside a box that never widens.
      // Primary does this by hand — `renderStepContent('ege7', { fontSize: '7px' })` in
      // EPDivsData.js, a size picked by eye per step — and hand-picked sizes go stale the moment
      // a checklist is reissued with a longer wording. Measuring the real font against the real
      // box costs one canvas and cannot go stale.
      const input = el.querySelector('.epl-input');
      if (!input) return;
      const css = window.getComputedStyle(input);
      const base = parseFloat(css.fontSize);
      const room = input.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
      if (!(room > 0) || !(base > 0)) return;
      if (!rulerRef.current) rulerRef.current = document.createElement('canvas');
      const pen = rulerRef.current.getContext('2d');
      pen.font = `${css.fontStyle} ${css.fontWeight} ${base}px ${css.fontFamily}`;
      const sized = {};
      for (const e of eps) {
        for (const row of e.rows) {
          if (!row.id) continue;
          const wide = pen.measureText(row.text).width;
          // MIN_STEP_FONT is a floor, not a target: below it the answer is unreadable and a
          // scrolling box is the better failure.
          if (wide > room) sized[row.id] = Math.max(MIN_STEP_FONT, (base * room) / wide);
        }
      }
      setFit(sized);
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [sizerCards, eps, full]);

  let n = 0;
  const card = (
    <div className="epl-card">
      <div className="epl-card-title">
        {ep.title}
        {nwcButton(ep.id, 'epl-nwc-btn epl-nwc-btn--title')}
      </div>
      {ep.rows.map((row, i) => {
        if (row.decision) return <div key={i} className="epl-decision">{row.decision}</div>;
        if (row.note) return <div key={i} className="epl-note">{row.note}</div>;
        n += 1;
        return (
          <div key={row.id} className="epl-step">
            <span className="epl-num">{row.concur ? '†' : ''}{row.critical ? '*' : ''}{n}.</span>
            <input type="text" aria-label={`Step ${n}`} className={cls(row.id)}
              style={fit[row.id] ? { fontSize: `${fit[row.id]}px` } : undefined}
              value={data[row.id] || ''} onChange={(e) => change(row.id, e.target.value)} onKeyDown={onKeyDown} />
            {nwcButton(row.id)}
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
      {showHelp && <Instructions hasPanel={hasPanel} hasBand={!!top} hasLeft={!!left} hasNWC={hasNWC} onClose={() => setShowHelp(false)} />}
      {openNWC && (
        <NWCModal key={openNWC} group={nwcGroup} current={openNWC} nwc={nwc} hints={nwcHints}
          onClose={() => setOpenNWC(null)} />
      )}

      <div className="eps-page">
        {full && top && <div className="epl-band">{top(api)}</div>}
        <div className="epl-row">
          {full && left && (
            <div className="epl-side" style={{ width: leftWidth }}>
              {scaleSides ? <ScaleToFit width={panelWidth}>{left(api)}</ScaleToFit> : left(api)}
              {showTools && (
                <div className="cockpit-side-actions">
                  <button type="button" onClick={pressHint}>Hint</button>
                </div>
              )}
            </div>
          )}

          <div className={`epl-center${full ? '' : ' epl-center--simple'}`}>
            {/* Hidden, inert, and out of the accessibility tree. It exists only so the card
                below can be as tall as the longest EP on every EP, which keeps Previous/Next —
                and the control row beneath them — from walking up and down the page as you
                move between a four-step procedure and an eleven-step one. */}
            <div className="epl-card-sizer" ref={sizerRef} aria-hidden="true">{sizerCards}</div>
            {/* The card hugs its own steps — a four-step EP is a four-step box. The RESERVATION
                is the slot around it, which is always as tall as the longest EP, so everything
                below sits at the same place whichever procedure is showing. */}
            <div className="epl-card-slot" style={cardMin ? { minHeight: cardMin } : undefined}>
              {card}
            </div>
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
            {/* Random Order, All Answers, Check, Reset and Auto NWC, under Previous/Next rather
                than adrift at the foot of the page. The card slot above holds a fixed height, so
                this row does not move as you page between a four-step EP and an eleven-step
                one. */}
            <div className="button-row epl-controls" style={{ justifyContent: 'center', marginTop: 0 }}>
              {showTools && (
                <button type="button" style={{ minWidth: '147px' }} onClick={toggleOrder}>
                  {random ? 'Random' : 'Sequential'} Order
                </button>
              )}
              {/* Hint lives under the left panel. A school with a band and no left slot would
                  have no way to reach it at all, so it falls back to here beside Skip. */}
              {showTools && full && top && !left && <button type="button" onClick={pressHint}>Hint</button>}
              {showTools && (!full || !right) && <button type="button" onClick={skip}>Skip</button>}
              {showTools && <button type="button" onClick={allAnswers}>All Answers</button>}
              <button type="button" onClick={() => check()}>Check</button>
              {showTools && <button type="button" onClick={reset}>Reset</button>}
              {showTools && hasNWC && (
                <button type="button" className={`epl-auto-nwc${autoNWC ? ' active' : ''}`} aria-pressed={autoNWC}
                  onClick={() => setAutoNWC((v) => !v)}>
                  Auto NWC
                </button>
              )}
            </div>
          </div>

          {full && right && (
            <div className="epl-side" style={{ width: rightWidth }}>
              {scaleSides ? <ScaleToFit width={panelWidth}>{right(api)}</ScaleToFit> : right(api)}
              {showTools && (
                <div className="cockpit-side-actions">
                  <button type="button" onClick={skip}>Skip</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {footnote && <p className="epl-footnote">{footnote}</p>}
    </div>
  );
}

export default EPDrill;
