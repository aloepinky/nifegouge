import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gradeAnswer } from '../../utils/answerUtils';
import { canon, controlOf, sameControl, settingOk, DEFAULT_ALIASES } from './controlMatch';
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
// the dagger (NATOPS §12.1, "requires concurrence of both pilots"). A normal checklist adds the
// pound sign (`abbrev`, an abbreviated-checklist item) and `who`, the crewmember the card prints
// against the reply, shown beside the box and never typed. `num` prints a number the publication
// gives in place of the running count, and a procedure's `start` is its first step's number.
//
// `sets` turns the page into Primary's EPs / Quadfold switch: several lists of procedures,
// `[{ id, label, eps, title, footnote, nwc, normal, read, sequential, extra }]`, chosen by the
// Checklists dropdown under the title. `normal` draws the card as a normal checklist (black title, as the
// checklist card prints it). `read` is the Quadfold's way of working: the steps are printed, not
// typed; clicking one opens its `action` and `replies`, and a step is done by clicking its
// control or by Skip. A game always runs the first set, the EPs, and the dropdown is hidden for it.
//
// The controls come in through `top`, `left` and `right`, render functions given
// `{ fill, hint, shown, reveal, resetKey }`:
//   fill(action, part)   writes the open step's own answer, as the checklist prints it, if that
//                        step names this control; otherwise writes nothing and marks the box
//                        red. Primary's rule, and the same code - see stepFlow.js. A control
//                        does NOT choose the setting: clicking the right one hands over the
//                        whole step. `part` is for the rare step that takes SEVERAL controls: it
//                        is the piece of the step's text this one supplies, and the box stays
//                        yellow until every piece is in. `wordings` is every control the clicked
//                        target answers for, which a step's `watch` list is matched against.
//   hint                 the action of the next unanswered step once Hint is pressed, else null;
//                        a panel rings the control that does it
//   shown                the gauges and lights the last click moved (the step's `shows`), as
//                        poster wordings, or `{ w, blink }` for a light a `sim` frame flashes;
//                        a panel rings them as it rings a hint. Empty otherwise.
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

// A random order that keeps bundles together. A procedure with `after: '<id>'` is the second
// half of the one with that id (the T-44C start: left engine after right), so it always comes
// straight after it, random or not. The bundles are shuffled as units, then flattened.
function shuffledEps(eps) {
  const at = Object.fromEntries(eps.map((e, i) => [e.id, i]));
  const units = [];
  const placed = new Set();
  eps.forEach((e, i) => {
    if (placed.has(i) || (e.after && at[e.after] !== undefined)) return;
    const unit = [i];
    placed.add(i);
    // Follow the chain: whatever comes after this one, and after that.
    for (let k = 0; k < unit.length; k += 1) {
      eps.forEach((f, j) => {
        if (!placed.has(j) && f.after === eps[unit[k]].id) { unit.push(j); placed.add(j); }
      });
    }
    units.push(unit);
  });
  return shuffled(units.length).flatMap((u) => units[u]);
}

// Whether a step advances the running count: a lettered sub-step does not, and nor does a step
// printed with a number of its own.
const counts = (row) => !row.sub && !row.num;

const stepLabel = (row, n) => (
  `${row.concur ? '†' : ''}${row.critical ? '*' : ''}${row.abbrev ? '#' : ''}${row.sub || row.num || n}.`
);

// The NWCs for a step or, keyed by the EP's own id, the ones the publication prints before
// the procedure. A record with nothing in it opens nothing.
function nwcFor(nwc, key) {
  const found = nwc && nwc[key];
  if (!found) return null;
  const { warnings = [], cautions = [], notes = [] } = found;
  return warnings.length + cautions.length + notes.length ? found : null;
}

// Within one step, warnings come first, then cautions, then notes. That is the order of
// severity rather than the order the page prints them in, and it is the order Primary's modal
// has always used.
// A step's answer is shown at whatever size makes it fit the box, never below this. See the
// measurement in EPDrill: the box is a fixed width and the text gives way, which is Primary's
// rule for a 73-character step in a 350px card.
const MIN_STEP_FONT = 6;

// The piece of a `watch` step that is the step's own control rather than an instrument.
const CONTROL = '(control)';

// Where a step's `sequence` stands, given the sequence pieces clicked so far in the order they
// came: the pieces any one of which may come next, and every piece still to come. An entry that
// is a list is a group whose members come in any order (both boost pumps).
const seqNext = (seq, done) => {
  let at = 0;
  for (let i = 0; i < seq.length; i += 1) {
    const group = Array.isArray(seq[i]) ? seq[i] : [seq[i]];
    const got = [];
    while (at < done.length && got.length < group.length && group.includes(done[at]) && !got.includes(done[at])) {
      got.push(done[at]);
      at += 1;
    }
    if (got.length < group.length) {
      const left = group.filter((m) => !got.includes(m));
      return { next: left, rest: [...left, ...seq.slice(i + 1).flat()] };
    }
  }
  return { next: [], rest: [] };
};

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

function Instructions({ hasPanel, hasBand, hasLeft, hasNWC, hasModes, hasWatch, hasShows, read, calls, extraLabel, onClose }) {
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
          {read ? (
            <>
              <li>One checklist is shown at a time, printed as on the checklist card, with who replies beside each step. <strong>*</strong> is done from memory, <strong>#</strong> is an abbreviated checklist item</li>
              <li>Click a step to see what the FTI says to do and say for it. What you say is in bold; what the instructor says is highlighted</li>
              {hasPanel && <li>In Full Mode, click the control each step names, in order. A step with no control on the poster is passed with Skip</li>}
              {hasPanel && hasWatch && (hasShows
                ? <li>A step that takes more than one control needs each of them clicked, in any order. It stays yellow until the last one is in</li>
                : <li>A step you check gauges or lights for also needs each of them clicked, in any order. It stays yellow until the last one is in</li>)}
              {hasPanel && hasShows && <li>The gauges and lights a step checks are ringed when you click its control. Look at them; they are not clicked</li>}
            </>
          ) : (
            <li>One EP is shown at a time. Type each step exactly as the checklist prints it, item and setting together: "Mixture - IDLE CUTOFF". EPs are verbatim!</li>
          )}
          {calls && <li>Once a step is in, what is said for it shows under the card. Say your call before you look. What you say is in bold; click it, or a step's <strong>EXP</strong> button, for the expanded action and response</li>}
          {hasPanel && <li>In Full Mode you can click the matching control instead of typing. A click fills the next empty step with that step's whole answer</li>}
          {hasPanel && hasWatch && !read && <li>A normal procedure step you check gauges or lights for also needs each of them clicked, in any order. It stays yellow until the last one is in</li>}
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
          {!read && <li><strong>Check:</strong> Validates your answers. Enter in any box does the same</li>}
          {read && <li><strong>Auto Expanded:</strong> Opens a step's action and response as soon as that step is done</li>}
          {extraLabel && <li><strong>{extraLabel}:</strong> Adds the normal procedures done from memory (engine start, the full anti-ice/deice check, waveoff, pre-stall checks) to the EPs, typed the same way. Game Mode leaves them out</li>}
          <li><strong>Reset:</strong> Clears all answers and feedback</li>
          <li><strong>Random/Sequential Order:</strong> Toggle between a shuffled order and the checklist's own</li>
          {hasNWC && <li><strong>Auto NWC:</strong> Opens a step's notes, warnings and cautions as soon as you get that step right</li>}
        </ul>
        <h3>Navigation</h3>
        <ul>
          <li>Use <strong>Previous/Next</strong> to move between EPs</li>
          <li><strong>Game Mode</strong>, in the bar above, times you through every EP; each one moves on when it is all correct</li>
          {hasModes && <li>Switch between the EPs and the normal checklists with the Checklists dropdown under the title. Game Mode always runs the EPs</li>}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

// Primary's switch between its EP lists and the Quadfold: a line with a dot per set, the
// chosen one filled. Styled as `.epl-modes`, copied from TW4Cockpit.js's inline styles.
// The switch between a page's lists (EPs, Hollywood, SSE Cases): a dropdown under the page's
// title. It was a row of dots under the buttons, and students missed it (the user, 2026-11-03).
function ModeSelect({ sets, current, onPick }) {
  return (
    <label className="epl-modes-select">
      <span className="epl-modes-select-label">Checklists</span>
      <select value={current} onChange={(e) => onPick(e.target.value)}>
        {sets.map((set) => <option key={set.id} value={set.id}>{set.label}</option>)}
      </select>
    </label>
  );
}

// With `sets`, the drill is remounted on each switch (keyed by the set), so the order, the
// answers and the card sizing all start again for the new list, as Primary's switch resets them.
// Simple/Full Mode is the one choice that carries across.
//
// A set's `extra` (`{ label, eps, footnote? }`) is a button beside Auto NWC that adds more
// procedures to the set's own: the T-44C's "All Memory Procedures", the normal procedures done
// from memory, and the T-54A's "Include Flows". Its `footnote`, if any, replaces the set's while
// the button is on, for an asterisk that means something else on the added cards. A game leaves
// them out, so every leaderboard time is the same EPs.
//
// An EP's `practice` is the id of another set; its card then carries a button that switches to
// that set ("Practice SSE Cases"). Hidden in a game, like every other way off the EPs.
function EPDrill({ sets, isGameActive = false, ...props }) {
  const [current, setCurrent] = useState(sets ? sets[0].id : null);
  const [full, setFull] = useState(null);
  const [withExtra, setWithExtra] = useState(false);
  if (!sets) return <Drill {...props} isGameActive={isGameActive} />;
  const set = isGameActive ? sets[0] : sets.find((s) => s.id === current) || sets[0];
  const { id, label, extra, ...overrides } = set;
  const adding = !!extra && withExtra && !isGameActive;
  return (
    <Drill key={`${id}${adding ? '+' : ''}`} {...props} {...overrides} isGameActive={isGameActive}
      eps={adding ? [...overrides.eps, ...extra.eps] : overrides.eps}
      footnote={adding && extra.footnote ? extra.footnote : overrides.footnote}
      initialFull={full} onFull={setFull}
      extraToggle={extra && !isGameActive ? { label: extra.label, on: withExtra, toggle: () => setWithExtra((v) => !v) } : null}
      practice={isGameActive ? null : {
        open: setCurrent,
        labelOf: (setId) => `Practice ${(sets.find((s) => s.id === setId) || {}).label || ''}`,
      }}
      modes={isGameActive ? null : <ModeSelect sets={sets} current={set.id} onPick={setCurrent} />} />
  );
}

// A challenge may break after a slash. "AUTOFEATHER/AUTOIGNITION" is otherwise one word too long
// for the card's column, and its reply was pushed out over the crewmember beside it.
const breakSlashes = (text) => String(text).split('/').flatMap((part, i) => (i ? ['/', <wbr key={i} />, part] : [part]));

// A step's line as the checklist card prints it: challenge, a leader, reply.
function ReadLine({ row }) {
  return (
    <span className="epl-read-line">
      <span className="epl-read-challenge">{breakSlashes(row.challenge)}</span>
      <span className="epl-read-dots" />
      <span className="epl-read-reply">{row.reply}</span>
    </span>
  );
}

// The height `.epl-call` takes under a `calls` card, its margin included (style.css), which
// the card slot reserves on top of the tallest card.
const CALL_ROOM = 72;

const hasAction = (row) => !!((row.action && row.action.length) || (row.replies && row.replies.length));

const NWC_WORDS = { note: 'NOTE', caution: 'CAUTION', warning: 'WARNING' };

// A normal checklist step expanded, as Primary's Quadfold opens one over the card: the FTI's
// ACTION column, then its RESPONSE column, then the step itself, marked as it stands. What the
// student says is bold, what the instructor says is highlighted, as the FTI prints them.
function ActionPanel({ row, label, mark, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="epl-expand-overlay" onClick={onClose}>
      <div className="epl-expand" role="dialog" aria-label={`${row.challenge}: action and response`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="epl-expand-close" onClick={onClose} aria-label="Close">&times;</button>
        {row.action && row.action.length > 0 && (
          <div className="epl-expand-bubble">
            {row.action.map((line, i) => {
              if (typeof line === 'string') return <p key={i}>{line}</p>;
              const kind = Object.keys(NWC_WORDS).find((k) => line[k]);
              return (
                <div key={i} className="epl-expand-nwc">
                  <div className="epl-expand-nwc-label">{NWC_WORDS[kind]}</div>
                  <p>{line[kind]}</p>
                </div>
              );
            })}
          </div>
        )}
        {row.replies && row.replies.length > 0 && (
          <div className="epl-expand-bubble epl-expand-replies">
            {row.replies.map((reply, i) => (
              <p key={i} className={reply.act ? 'epl-say--act' : reply.ip ? 'epl-say--ip' : 'epl-say'}>
                {reply.act ? reply.text : <span>&ldquo;{reply.text}&rdquo;</span>}
                {reply.who ? ` (${reply.who})` : ''}
              </p>
            ))}
          </div>
        )}
        <div className="epl-expand-step">
          <span className={`epl-read ${mark}`}>{label} <ReadLine row={row} /></span>
        </div>
      </div>
    </div>
  );
}

function Drill({
  eps, title, footnote, top, above, left, right, sideWidth = 200,
  aliases = DEFAULT_ALIASES, normal = false, read = false, calls = false, crew = false, sequential = false, modes = null, extraToggle = null,
  practice = null, initialFull = null, onFull,
  nwc, nwcHints, isGameActive = false, onGameComplete, engine = null, detours = [],
}) {
  // One number sets both columns; a pair sets them separately, which a bespoke layout needs —
  // Advanced hangs a column of buttons on the left and a stack of three panels on the right.
  const [leftWidth, rightWidth] = Array.isArray(sideWidth) ? sideWidth : [sideWidth, sideWidth];
  const hasPanel = !!(top || above || left || right);
  const [full, setFull] = useState(() => hasPanel && (initialFull ?? window.innerWidth >= 750));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onFull?.(full); }, [full]);
  // A normal checklist's card takes the black title, and so does a normal procedure added to
  // the EPs (`e.normal`), so it is never mistaken for an EP.
  // A detour (Abnormal Start opened from the Hollywood checklists) is an EP, red as on the EPs.
  const cardClassFor = (e) => `epl-card${(normal && !detours.includes(e)) || e.normal ? ' epl-card--normal' : ''}`;
  const [showHelp, setShowHelp] = useState(false);
  const [reveal, setReveal] = useState(null);
  const aimSeq = useRef(0);
  // A set of normal checklists opens in the order they are run, as Primary's Quadfold does.
  const [random, setRandom] = useState(!sequential);
  const [order, setOrder] = useState(() => (sequential ? eps.map((_, i) => i) : shuffledEps(eps)));
  const [pos, setPos] = useState(0);
  const [data, setData] = useState({});
  const [results, setResults] = useState({});
  const [resetKey, setResetKey] = useState(0);
  const [hint, setHint] = useState(null);
  // The gauges and lights the last click moved (a step's `shows`), ringed as Hint rings until the
  // next click; see showsOf.
  const [shown, setShownNow] = useState([]);
  // A step's `sim` plays its lights in sequence (Engine Runup 8's autofeather test); these are its
  // pending frames, and any new lighting cancels them.
  const simTimers = useRef([]);
  const setShown = (list) => {
    simTimers.current.forEach(clearTimeout);
    simTimers.current = [];
    setShownNow(list);
  };
  const play = (sim) => {
    setShown([]);
    simTimers.current = [
      ...sim.frames.map((f) => setTimeout(() => setShownNow([
        ...(f.lit || []),
        ...(f.blink || []).map((w) => ({ w, blink: true })),
      ]), f.at)),
      setTimeout(() => setShownNow([]), sim.end),
    ];
  };
  useEffect(() => () => simTimers.current.forEach(clearTimeout), []);
  const [showList, setShowList] = useState(false);
  const [autoNWC, setAutoNWC] = useState(false);
  const [openNWC, setOpenNWC] = useState(null);
  const listRef = useRef(null);
  const pageRef = useRef(null);
  const sizerRef = useRef(null);
  const parts = useRef({});
  // The pieces of a `watch` step clicked so far, by step id; see watchClick.
  const watched = useRef({});
  const rulerRef = useRef(null);
  const [cardMin, setCardMin] = useState(0);
  const [fit, setFit] = useState({});
  const wasCorrect = useRef({});
  const advanceRef = useRef(null);
  // `read`: the step whose action is open, and Auto Expanded, which opens a step's action once
  // the step is done, the way Auto NWC opens its NWCs.
  const [openAction, setOpenAction] = useState(null);
  const [autoExpand, setAutoExpand] = useState(false);
  const wasDone = useRef({});

  // `detours`: procedures the drill may be sent to that are not in its own list (the T-44C's
  // Abnormal Start, opened by aborting a start in the Hollywood checklists). One is shown in
  // place of the list's card until Previous or Next, which go back into the list.
  const [detour, setDetour] = useState(null);
  const ep = (detour && detours.find((d) => d.id === detour)) || eps[order[pos]];
  const steps = useMemo(() => ep.rows.filter((r) => r.id), [ep]);

  // `engine`: a model of the engines the poster draws live (the T-44C's starts,
  // T44C/t44cEngineStore.js). It hears which procedure is open, refuses a step's control while
  // the gauges say it is too early (`engineNote` says why), and is told each control that goes
  // in. Everything else about a step is as without it.
  const [engineNote, setEngineNote] = useState(null);
  useEffect(() => {
    if (!engine) return;
    // The note first: leaving a card with a fault in sight is a miss, said on the next card.
    setEngineNote(null);
    engine.open(isGameActive ? null : ep.id);
  }, [engine, ep.id, isGameActive]);
  // Chaos (T44C/t44cFaults.js): a fault the student went past is marked wrong on its step, and
  // what it was and what could cause it are said. `missedRef` holds those steps, so a look step
  // passed by the same click that went past it is not then marked right.
  const missedRef = useRef(new Set());
  const say = (lead, told) => `${lead} ${told.what} Possible causes: ${told.causes.join(' ')}`;
  useEffect(() => {
    if (!engine || !engine.onMiss) return undefined;
    return engine.onMiss((told) => {
      missedRef.current.add(told.stepId);
      setResults((r) => ({ ...r, [told.stepId]: 'incorrect' }));
      // Several gone past at once (a click past two steps' faults) are all said.
      setEngineNote((n) => (n && n.startsWith('Missed:') ? `${n} ${say('Missed:', told)}` : say('Missed:', told)));
    });
  }, [engine]);
  // The Discrepancy button: right when a fault is showing (it is put right, and its causes
  // said), wrong on the open step when nothing is.
  const discrepancy = () => {
    if (!engine || isGameActive) return;
    const found = engine.discrepancy();
    if (found) {
      const list = Array.isArray(found) ? found : [found];
      setEngineNote(list.map((f) => say('Malfunction found:', f)).join(' '));
      return;
    }
    const open = nextOpen();
    if (open) setResults((r) => ({ ...r, [open.id]: 'incorrect' }));
    setEngineNote('No malfunction: everything is reading as it should.');
  };
  // A refused click: marked wrong, and the reason shown.
  const tooEarly = (step, piece) => {
    const why = engine && !isGameActive ? engine.gate(step.id, piece) : null;
    if (!why) return false;
    setResults((r) => ({ ...r, [step.id]: 'incorrect' }));
    setEngineNote(why);
    return true;
  };
  // A step's control went in (no `suffix`), one of its watched pieces (`:<piece>`), or the nth
  // piece of its `sequence` (`#<n>`).
  const fire = (step, suffix = '') => {
    if (engine && !isGameActive) engine.fire(`${step.id}${suffix}`);
  };
  const answers = useMemo(() => Object.fromEntries(steps.map((s) => [s.id, s.text])), [steps]);
  const fields = Object.keys(answers);
  const showTools = !isGameActive;

  const nwcAt = (key) => nwcFor(nwc, key);
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
  //
  // What was already green is recorded with Auto NWC off too, so switching it on part way through
  // an EP does not pop the NWC of a step answered before it.
  useEffect(() => {
    const before = wasCorrect.current;
    wasCorrect.current = Object.fromEntries(steps.map((s2) => [s2.id, results[s2.id] === 'correct']));
    if (!autoNWC) return undefined;
    const opened = steps.find((s2) => results[s2.id] === 'correct' && !before[s2.id] && nwcAt(s2.id));
    if (!opened) return undefined;
    const at = setTimeout(() => setOpenNWC(opened.id), 600);
    return () => clearTimeout(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, autoNWC, steps]);

  // Auto Expanded: as Auto NWC, keyed on a step being done (right, or skipped) rather than on the
  // next one to do, so the action is read after the step is recalled, not before.
  useEffect(() => {
    const before = wasDone.current;
    const isDone = (s2) => results[s2.id] === 'correct' || (!!data[s2.id] && !results[s2.id]);
    wasDone.current = Object.fromEntries(steps.map((s2) => [s2.id, isDone(s2)]));
    if (!read || !autoExpand) return undefined;
    const opened = steps.find((s2) => isDone(s2) && !before[s2.id] && hasAction(s2));
    if (!opened) return undefined;
    const at = setTimeout(() => setOpenAction(opened.id), 600);
    return () => clearTimeout(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, data, autoExpand, steps]);

  // The move to the next EP in a game waits a moment after the last Check. Exit, or anything
  // else that ends the game, cancels it, or it would page on and clear the answers afterwards.
  useEffect(() => () => clearTimeout(advanceRef.current), [isGameActive]);

  // A read checklist starts clean each time it is opened: what was skipped or clicked on one is
  // not carried to the next (the user, 2026-10-30). A typed EP keeps its boxes, as Primary's do.
  const go = (nextPos, detourId = null) => {
    if (read) setData({});
    setPos(nextPos);
    setDetour(detourId);
    setResults({});
    setHint(null);
    setShown([]);
    setReveal(null);
    setShowList(false);
    setOpenNWC(null);
    setOpenAction(null);
    wasCorrect.current = {};
    parts.current = {};
    watched.current = {};
    missedRef.current = new Set();
    setResetKey((k) => k + 1);
  };

  const change = (field, value) => {
    delete watched.current[field];
    setData((d) => ({ ...d, [field]: value }));
    setResults((r) => ({ ...r, [field]: '' }));
    setHint(null);
    setShown([]);
  };

  const check = (current = data) => {
    const out = {};
    for (const f of fields) out[f] = gradeAnswer(current[f], answers[f]);
    setResults(out);
    setHint(null);
    if (isGameActive && steps.every((s) => out[s.id] === 'correct')) {
      if (pos < order.length - 1) {
        clearTimeout(advanceRef.current);
        advanceRef.current = setTimeout(() => {
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
  //
  // `values` is the settings the clicked record lists for this control. Two targets can share a
  // control and divide its settings between them (the T-44C's CABIN PRESS switch and cabin
  // pressure controller are both "Pressurization"), so a click on one that does not list the
  // step's setting is the wrong control, not a near miss - controlMatch.js `settingOk`.
  // Steps that only look at an instrument (`look`, or a step with its control in and only
  // instruments left, `glances`) need not be clicked one by one: a click on a later step's
  // control, with nothing but such steps between, does them too, the way the eye
  // has already been over the gauges by the time the hand moves on. From Condition Lever - LOW
  // IDLE straight to Starter - OFF does Fuel Flow and ITT and N1. Returns the step the click
  // answers and the look steps it passes, or null. A look step the click itself belongs to (its
  // own gauge, a watched piece) is not passed.
  const lookAhead = (open, action, values, said) => {
    const belongs = (s) => (sameControl(answers[s.id], action, aliases) && settingOk(values, answers[s.id]))
      || (s.watch && s.watch.some((w) => said.includes(canon(w, aliases))));
    if (!passable(open) || belongs(open)) return null;
    const passed = [];
    for (let i = steps.indexOf(open); i < steps.length; i += 1) {
      const s = steps[i];
      if (s !== open && belongs(s)) return { step: s, passed };
      if (!passable(s)) return null;
      passed.push(s);
    }
    return null;
  };
  // A look step, or a step whose own control is in and which is missing only instruments
  // (`glances`): Condition Lever - LOW IDLE with its battery-voltage check not clicked.
  const passable = (s) => {
    if (s.look) return true;
    const missing = missingOf(s);
    return missing.length > 0 && missing.every((p) => (s.glances || []).includes(p));
  };

  // The engine model may take a click as an abort: the T-44C's condition lever pressed again
  // during a start. The fuel is already cut on the gauges; the drill opens the procedure that
  // click begins with its step done, or where the list has no such procedure, says so.
  const abortedBy = (wordings) => {
    if (!engine || isGameActive || !engine.abortByLever) return false;
    const hit = engine.abortByLever(wordings);
    if (!hit) return false;
    const target = eps.find((e) => e.id === hit.epId) || detours.find((d) => d.id === hit.epId);
    const row = target && target.rows.find((r) => r.id === hit.stepId);
    if (!row) {
      setEngineNote('Condition lever to FUEL CUTOFF: the start is aborted.');
      return true;
    }
    openEp(hit.epId);
    setData((d) => ({ ...d, [row.id]: row.text }));
    setResults({ [row.id]: 'correct' });
    return true;
  };

  const fill = (action, fragment, values, wordings) => {
    setHint(null);
    setShown([]);
    if (abortedBy(wordings || [action])) return;
    let step = nextOpen();
    if (!step) return;
    setEngineNote(null);

    // The click may be for a step past the look steps in front of it (lookAhead). If the gauges
    // say that step is too early, nothing is passed; otherwise the passed steps are done as the
    // checklist prints them, and the click goes on as though that step were the open one.
    let base = data;
    let passed = {};
    const ahead = lookAhead(step, action, values, (wordings || [action]).map((w) => canon(w, aliases)));
    if (ahead) {
      const control = sameControl(answers[ahead.step.id], action, aliases);
      if (control && tooEarly(ahead.step, fragment)) return;
      base = { ...data };
      for (const s of ahead.passed) {
        base[s.id] = answers[s.id];
        passed[s.id] = 'correct';
      }
      step = ahead.step;
    }
    // Marked once the click is taken, never before: a refused click passes nothing.
    const pass = () => {
      for (const id of Object.keys(passed)) {
        delete parts.current[id];
        delete watched.current[id];
      }
      // A copy: the updater runs at render, after `passed` is emptied below.
      const marks = Object.fromEntries(Object.entries(passed)
        .map(([id, m]) => [id, missedRef.current.has(id) ? 'incorrect' : m]));
      if (Object.keys(marks).length) setResults((r) => ({ ...r, ...marks }));
      passed = {};
    };
    const target = step.id;
    const answer = answers[target];

    const names = sameControl(answer, action, aliases) && settingOk(values, answer);
    if (step.watch) {
      watchClick(step, names, wordings || [action], base, pass);
      return;
    }
    if (clickOutcome(names ? 1 : 0, 1) !== FILL) {
      setResults((r) => ({ ...r, [target]: 'incorrect' }));
      return;
    }
    if (tooEarly(step, fragment)) return;
    pass();
    fire(step);
    setShown(showsOf(step, (wordings || [action]).map((w) => canon(w, aliases)), true));

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

    const next = { ...base, [target]: line };
    setData(next);
    const mark = gradeAnswer(line, answer);
    // Completing the last step checks the whole EP, as Primary does and as Skip does here. A
    // half-answered last step must NOT check it, or the pieces still to come are marked wrong.
    if (mark === 'correct' && target === steps[steps.length - 1].id) check(next);
    else setResults((r) => ({ ...r, [target]: mark }));
  };

  // A normal checklist step also names what it is checked against: the FTI's action column for
  // Right Starter is to see the RH IGN IND light come on and N1 rise, and `watch` lists those
  // gauges and lights. The step is the control plus every one of them, clicked in any order, and
  // stays yellow until the last arrives, as Primary's Engine Start - MONITOR does. The box shows
  // the control's name once it is in (gradeAnswer reads a bare control as partial, so Check
  // agrees) and the checklist's whole line at the end. A click that adds nothing marks it red and
  // keeps what is already in. The T-44C's `watch` lists only what the student operates (an ice
  // vane, the elapsed time key); its gauges and lights are rung by `shows` instead (showsOf).
  // A step with `watchOnly` is its watch list alone: the T-44C's Lights steps, where the
  // switches are the step and clicking any light switch must not count as one of them.
  // A step's `sequence` holds the pieces that must come in that order, the control as
  // '(control)', a piece as often as it is moved (After Start 7's crossfeed and boost pumps), a
  // list for pieces that may come in either order. What is not in it may come at any time.
  const missingOf = (step) => {
    if (!step || !step.watch) return [];
    const have = watched.current[step.id] || [];
    const all = [...(step.watchOnly ? [] : [CONTROL]), ...step.watch];
    if (!step.sequence) return all.filter((p) => !have.includes(p));
    const inSeq = new Set(step.sequence.flat());
    const { rest } = seqNext(step.sequence, have.filter((p) => inSeq.has(p)));
    return [...rest, ...all.filter((p) => !inSeq.has(p) && !have.includes(p))];
  };

  // What a click on a step lights up: a `shows` list when the click is the step's control, or
  // from a `shows` map whatever the clicked wordings key, so each of Before Start 8's boost pumps
  // rings the battery ammeter. Shown, never required: the student clicks only what they operate.
  const showsOf = (step, said, isControl) => {
    const s = step.shows;
    if (!s) return [];
    if (Array.isArray(s)) return isControl ? s : [];
    return Object.entries(s).filter(([k]) => said.includes(canon(k, aliases))).flatMap(([, v]) => v);
  };

  const watchClick = (step, names, wordings, base = data, pass = () => {}) => {
    const target = step.id;
    const answer = answers[target];
    const said = wordings.map((w) => canon(w, aliases));
    const have = watched.current[target] || [];
    // With `controlApart`, a click that is one of the watched pieces counts as that piece only,
    // not also as the step's control: the T-44C's Before Start 7 takes an anti-ice switch AND
    // both ice vanes, and the vanes answer the anti-ice steps too. Without it a gauge is both,
    // as every instrument check needs.
    const pieces = step.watch.filter((w) => said.includes(canon(w, aliases)));
    const named = [
      ...(names && !step.watchOnly && !(step.controlApart && pieces.length) ? [CONTROL] : []),
      ...pieces,
    ];
    // With a `sequence`, the click must be its next piece, or one of the pieces outside it; a
    // piece of the sequence out of its turn is wrong (Engine Runup 8: the condition levers to LOW
    // IDLE first, the power levers last). `turn` is the place in the sequence this click takes.
    const inSeq = new Set((step.sequence || []).flat());
    const doneSeq = have.filter((p) => inSeq.has(p));
    const turn = doneSeq.length;
    const where = step.sequence ? seqNext(step.sequence, doneSeq) : { next: [], rest: [] };
    const due = where.next;
    const hit = named.filter((p) => due.includes(p)).slice(0, 1);
    const got = step.sequence
      ? [...hit, ...named.filter((p) => !inSeq.has(p) && !have.includes(p))]
      : named.filter((p) => !have.includes(p));
    // Only a piece still to come can be out of turn: a gauge that also answers for a control
    // already in (Engine Runup 3's instruments) is just the gauge.
    const outOfTurn = !!step.sequence && !hit.length && named.some((p) => where.rest.includes(p));
    // `last` is a piece that must come after every other (Engine Runup 8's power lever, which
    // runs the test the switches set up): clicked early, it is wrong. `inOrder` holds every piece
    // to the order listed, the control first (Before Takeoff 1: engage, disconnect at the wheel,
    // the disconnect bar, then FD).
    const missing = missingOf(step);
    const early = step.last && got.includes(step.last)
      && missing.some((p) => p !== step.last && !got.includes(p));
    const outOfOrder = step.inOrder && got.some((p, i) => p !== missing[i]);
    if (!got.length || early || outOfOrder || outOfTurn) {
      setResults((r) => ({ ...r, [target]: 'incorrect' }));
      return;
    }
    if (got.includes(CONTROL)) {
      if (tooEarly(step, null)) return;
      fire(step);
    }
    got.filter((p) => p !== CONTROL).forEach((p) => fire(step, `:${p}`));
    // The sequence's place too, for a piece that does something different each time it is moved.
    if (hit.length) fire(step, `#${turn + 1}`);
    pass();
    if (step.sim && got.includes(step.sim.after)) play(step.sim);
    else setShown(showsOf(step, said, got.includes(CONTROL)));
    watched.current[target] = [...have, ...got];
    const done = !missingOf(step).length;
    const line = done ? answer : (step.watchOnly || watched.current[target].includes(CONTROL) ? controlOf(answer) : '');
    const next = { ...base, [target]: line };
    setData(next);
    if (done) delete watched.current[target];
    if (done && target === steps[steps.length - 1].id) check(next);
    else setResults((r) => ({ ...r, [target]: done ? gradeAnswer(line, answer) : 'partial' }));
  };

  // The step a click, Hint and Skip all act on. See stepFlow.js. A step still missing a watched
  // instrument, or holding only some of its pieces (ITT and N1), stays open even after a wrong
  // click has marked it red: a red step is not done, and the next click must come back to it.
  const nextOpen = () => {
    const id = openStep(fields, {
      value: (f) => data[f],
      result: (f) => (watched.current[f] || (parts.current[f] && data[f] !== answers[f]) ? 'partial' : results[f]),
      answer: (f) => answers[f],
    });
    return steps.find((s) => s.id === id);
  };

  // What Hint points at: the step itself, or for a step with a `watch` list the first piece not
  // yet clicked, the control before the instruments.
  const hintFor = (step) => {
    const missing = missingOf(step);
    if (!missing.length || missing[0] === CONTROL) return step.text;
    return missing[0];
  };

  // Hint and Skip are the two affordances that say where a control is, so they are the two that
  // move a poster's band to the panel holding it. `at` counts rather than compares, so hinting
  // the same control twice still fires; a bare `hint` string would not, and `skip` clears it.
  // Nothing else moves the band: which panel the crossfeed is on is itself the lesson, and a
  // band that walks you there unasked removes it.
  //
  // Both carry the whole step, setting and all, because a control shared by two targets is told
  // apart by its setting (controlMatch.js `matches`): Hint on "Pressurization - DUMP" rings the
  // CABIN PRESS switch and not the controller beside it.
  const aim = (text) => {
    aimSeq.current += 1;
    setReveal(text ? { step: text, at: aimSeq.current } : null);
  };

  const pressHint = () => {
    const open = nextOpen();
    const text = open ? hintFor(open) : null;
    aim(text);
    setHint(text);
    setShown([]);
  };

  const skip = () => {
    const open = nextOpen();
    if (!open) return;
    aim(open.text);
    // A skipped step still does what it does, every control of it not yet in, and the engines
    // jump on to where the next step finds them.
    if (engine && !isGameActive) {
      const after = steps[steps.indexOf(open) + 1];
      engine.skip(skipKeys(open), after ? after.id : null);
    }
    delete watched.current[open.id];
    setEngineNote(null);
    const next = { ...data, [open.id]: open.text };
    setData(next);
    setHint(null);
    setShown([]);
    // Primary leaves a skipped step uncoloured until the last one, which checks the whole EP.
    if (open === steps[steps.length - 1]) check(next);
    else setResults((r) => ({ ...r, [open.id]: '' }));
  };

  // The events a step's pieces not yet clicked would have fired, in order (see `fire`).
  const skipKeys = (step) => {
    if (!step.watch) return [step.id];
    const have = watched.current[step.id] || [];
    const keyOf = (p) => (p === CONTROL ? step.id : `${step.id}:${p}`);
    if (!step.sequence) return missingOf(step).map(keyOf);
    const inSeq = new Set(step.sequence.flat());
    const done = have.filter((p) => inSeq.has(p)).length;
    const { rest } = seqNext(step.sequence, have.filter((p) => inSeq.has(p)));
    return [
      ...rest.flatMap((p, i) => [keyOf(p), `${step.id}#${done + i + 1}`]),
      ...missingOf(step).slice(rest.length).map(keyOf),
    ];
  };

  const allAnswers = () => {
    watched.current = {};
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
    setShown([]);
    setReveal(null);
    setOpenNWC(null);
    setOpenAction(null);
    wasCorrect.current = {};
    parts.current = {};
    watched.current = {};
    missedRef.current = new Set();
    setResetKey((k) => k + 1);
    if (engine && !isGameActive) engine.open(ep.id, true);
    setEngineNote(null);
  };

  const toggleOrder = () => {
    const nextRandom = !random;
    setRandom(nextRandom);
    setOrder(nextRandom ? shuffledEps(eps) : eps.map((_, i) => i));
    setData({});
    go(0);
  };

  const jump = (i) => {
    setRandom(false);
    setOrder(eps.map((_, k) => k));
    go(i);
  };

  // Another procedure by id: the list's own, or a detour shown over the current card.
  const openEp = (id) => {
    const i = eps.findIndex((e) => e.id === id);
    if (i >= 0) jump(i);
    else if (detours.some((d) => d.id === id)) go(pos, id);
  };

  const cls = (f) => {
    const r = results[f];
    const mark = r === 'correct' ? ' correct-answer' : r === 'partial' ? ' partial-answer' : r === 'incorrect' ? ' incorrect-answer' : '';
    return `epl-input${mark}`;
  };

  // A read step is marked like a typed box, and a skipped one, filled but not yet checked, is
  // shown as done so the place in the checklist is never lost.
  const readMark = (f) => {
    const r = results[f];
    if (r === 'correct') return 'correct-answer';
    if (r === 'partial') return 'partial-answer';
    if (r === 'incorrect') return 'incorrect-answer';
    return data[f] ? 'epl-read--done' : '';
  };

  const onKeyDown = (e) => { if (e.key === 'Enter') check(); };
  // Chaos: each step may draw a fault as it comes up (the engine draws once a run).
  const openId = (nextOpen() || {}).id || null;
  useEffect(() => {
    if (engine && !isGameActive && engine.arm) engine.arm(openId, fields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, isGameActive, openId, ep.id, resetKey]);
  // The control the checklist is asking for next, every render rather than only on Hint. A
  // target carrying more than one step reads it to pick which one to fill; nothing uses it to
  // move the poster, which stays the job of `reveal`.
  // `normalProcedure` says the card is a normal checklist rather than an EP, so a poster can
  // show the buttons only normal checklists use (T-44C's `normal` actions) and keep them off the
  // EPs, which never name them.
  const api = { fill, hint, shown, reveal, next: controlOf((nextOpen() || {}).text), resetKey, normalProcedure: normal || !!ep.normal,
    // Chaos: the Discrepancy button, for a page that draws one beside its engine controls.
    discrepancy,
    // With the set's `extra` procedures added, a page can show both kinds of button on every card,
    // so the column does not change (and give the procedure away) as the cards go by.
    mixed: !!(extraToggle && extraToggle.on),
    // The engine model, the reason its last refusal gave, Reset, and a way to open another of
    // the list's procedures by id (a start's Abnormal Start), or null where it is not listed.
    engine: isGameActive ? null : engine, engineNote, reset,
    openEp,
    hasEp: (id) => eps.some((e) => e.id === id) || detours.some((d) => d.id === id),
    epId: ep.id };

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

  // `calls`: a step is in once it is right or skipped. Its EXP button, where a set has no NWCs,
  // opens what the FTI says to do and say; it waits for the step, since the panel shows the step.
  const isIn = (row) => results[row.id] === 'correct' || data[row.id] === answers[row.id];
  const expButton = (row) => {
    if (!calls || !hasAction(row)) return null;
    const ready = isIn(row);
    return (
      <button type="button" className="epl-nwc-btn epl-exp-btn" disabled={!ready}
        title={ready ? 'Show the expanded action and response' : 'Opens once the step is in'}
        onClick={() => setOpenAction(row.id)}>
        EXP
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
    let k = (e.start || 1) - 1;
    const has = (key) => !!nwcFor(nwc, key);
    return (
      <div className={cardClassFor(e)} key={e.id}>
        <div className="epl-card-title">
          {e.title}
          {has(e.id) && <button type="button" className="epl-nwc-btn epl-nwc-btn--title" tabIndex={-1}>NWC</button>}
        </div>
        {e.rows.map((row, i) => {
          if (row.decision) return <div key={i} className="epl-decision">{row.decision}</div>;
          if (row.note) return <div key={i} className="epl-note">{row.note}</div>;
          if (counts(row)) k += 1;
          if (read) {
            return (
              <div key={row.id} className="epl-step epl-step--read">
                <span className="epl-num">{stepLabel(row, k)}</span>
                <span className="epl-read"><ReadLine row={row} /></span>
                {row.who && <span className="epl-who">{row.who}</span>}
              </div>
            );
          }
          return (
            <div key={row.id} className="epl-step">
              <span className="epl-num">{stepLabel(row, k)}</span>
              <input type="text" className="epl-input" readOnly tabIndex={-1} defaultValue="" data-step={row.id} />
              {row.who && <span className="epl-who">{row.who}</span>}
              {has(row.id) && <button type="button" className="epl-nwc-btn" tabIndex={-1}>NWC</button>}
              {calls && hasAction(row) && <button type="button" className="epl-nwc-btn epl-exp-btn" tabIndex={-1}>EXP</button>}
            </div>
          );
        })}
        {e.done && <div className="epl-done">{e.done}</div>}
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [eps, nwc, normal, read, calls]);

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
      // Each step against ITS OWN box. A row with an NWC button, or a crewmember beside it, has a
      // narrower box than a bare one; measuring one box and applying its width to every step
      // left those rows overflowing (Unscheduled Electric Trim Activation, whose one step carries
      // an NWC). The sizer draws every row with its own buttons, so its inputs are the real widths.
      const boxes = el.querySelectorAll('.epl-input[data-step]');
      if (!boxes.length) return;
      const css = window.getComputedStyle(boxes[0]);
      const base = parseFloat(css.fontSize);
      if (!(base > 0)) return;
      const pad = parseFloat(css.paddingLeft) + parseFloat(css.paddingRight);
      if (!rulerRef.current) rulerRef.current = document.createElement('canvas');
      const pen = rulerRef.current.getContext('2d');
      pen.font = `${css.fontStyle} ${css.fontWeight} ${base}px ${css.fontFamily}`;
      const textOf = {};
      for (const e of eps) for (const row of e.rows) if (row.id) textOf[row.id] = row.text;
      const sized = {};
      boxes.forEach((box) => {
        const id = box.dataset.step;
        const room = box.clientWidth - pad;
        if (!(room > 0) || !textOf[id]) return;
        const wide = pen.measureText(textOf[id]).width;
        // MIN_STEP_FONT is a floor, not a target: below it the answer is unreadable and a
        // scrolling box is the better failure.
        if (wide > room) sized[id] = Math.max(MIN_STEP_FONT, (base * room) / wide);
      });
      setFit(sized);
    };
    measure();
    const watch = new ResizeObserver(measure);
    // The sizer itself is clipped to no height, so a card that grows without the page
    // widening (a late font) is only seen by watching the cards.
    watch.observe(el);
    for (const child of el.children) watch.observe(child);
    return () => watch.disconnect();
  }, [sizerCards, eps, full]);

  // `crew` (the T-44C's Hollywood checklists): a box the card's height on its left while the open
  // step is the left seat's or the pilot flying's, on its right for the right seat's or the pilot
  // monitoring's, and one under the card for the observer's (the user, 2026-11-11). Drawn outside
  // the card's own box, so nothing on the page moves.
  const crewStep = crew && read ? nextOpen() : null;
  const crewWho = crewStep ? (crewStep.who || '').split(/[,/]/).map((w) => w.trim()) : [];
  const crewLeft = crewWho.filter((w) => w === 'LS' || w === 'PF');
  const crewRight = crewWho.filter((w) => w === 'RS' || w === 'PM');
  const crewObs = crewWho.includes('OBS');

  let n = (ep.start || 1) - 1;
  const card = (
    <div className={cardClassFor(ep)}>
      <div className="epl-card-title">
        {ep.title}
        {nwcButton(ep.id, 'epl-nwc-btn epl-nwc-btn--title')}
      </div>
      {ep.rows.map((row, i) => {
        if (row.decision) return <div key={i} className="epl-decision">{row.decision}</div>;
        if (row.note) return <div key={i} className="epl-note">{row.note}</div>;
        // A lettered sub-step ({ sub: 'a' }) is numbered with its letter and does not advance
        // the count, as the T-54A sheet prints "† a." under step 4.
        if (counts(row)) n += 1;
        if (read) {
          const label = stepLabel(row, n);
          const open = hasAction(row) ? () => setOpenAction(row.id) : null;
          return (
            <div key={row.id} className={`epl-step epl-step--read${open ? ' epl-step--open' : ''}`}
              role={open ? 'button' : undefined} tabIndex={open ? 0 : undefined}
              title={open ? 'Show the action and response' : undefined}
              onClick={open || undefined}
              onKeyDown={open ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } } : undefined}>
              <span className="epl-num">{label}</span>
              <span className={`epl-read ${readMark(row.id)}`}><ReadLine row={row} /></span>
              {row.who && <span className="epl-who">{row.who}</span>}
            </div>
          );
        }
        return (
          <div key={row.id} className="epl-step">
            <span className="epl-num">{stepLabel(row, n)}</span>
            <input type="text" aria-label={`Step ${row.num || n}${row.sub || ''}`} className={cls(row.id)}
              style={fit[row.id] ? { fontSize: `${fit[row.id]}px` } : undefined}
              value={data[row.id] || ''} onChange={(e) => change(row.id, e.target.value)} onKeyDown={onKeyDown} />
            {row.who && <span className="epl-who" title="Who replies">{row.who}</span>}
            {nwcButton(row.id)}
            {expButton(row)}
          </div>
        );
      })}
      {ep.done && <div className="epl-done">{ep.done}</div>}
    </div>
  );

  // `calls`: a typed set whose steps carry what is said (the T-44C's cases). The call shows under
  // the card once its step is in, right or skipped, never before, so the step is still recalled
  // and not read. It is the latest step in, since the steps go in in order; a step with nothing
  // said but something to do reads "Expanded", which opens it.
  const lastIn = calls
    ? [...steps].reverse().find(isIn)
    : null;
  const callRow = lastIn && hasAction(lastIn) ? lastIn : null;

  // The open action: the clicked step's, or the one Auto Expanded opened. A typed set opens one
  // only from its call or its EXP button.
  const actionId = read || calls ? openAction : null;
  const actionRow = actionId ? steps.find((s2) => s2.id === actionId && hasAction(s2)) : null;
  const actionLabel = (() => {
    if (!actionRow) return '';
    let k = (ep.start || 1) - 1;
    for (const row of steps) {
      if (counts(row)) k += 1;
      if (row === actionRow) return stepLabel(row, k);
    }
    return '';
  })();

  return (
    <div className="limits-eps-container epl-page" ref={pageRef}>
      <div className="epl-header">
        <button type="button" onClick={() => setShowHelp(true)}>Instructions</button>
        <div className="epl-title">
          <h1>{title}</h1>
          {modes}
        </div>
        {hasPanel ? (
          <button type="button" className={`epl-mode${full ? '' : ' epl-mode--simple'}`} onClick={() => setFull((f) => !f)}>
            {full ? 'Simple Mode' : 'Full Mode'}
          </button>
        ) : <span className="epl-mode-spacer" />}
      </div>
      {showHelp && <Instructions hasPanel={hasPanel} hasBand={!!top} hasLeft={!!left} hasNWC={hasNWC} hasModes={!!modes}
        hasWatch={eps.some((e) => e.rows.some((r) => r.watch))}
        hasShows={eps.some((e) => e.rows.some((r) => r.shows))} read={read} calls={calls}
        extraLabel={extraToggle && extraToggle.label} onClose={() => setShowHelp(false)} />}
      {openNWC && (
        <NWCModal key={openNWC} group={nwcGroup} current={openNWC} nwc={nwc} hints={nwcHints}
          onClose={() => setOpenNWC(null)} />
      )}

      <div className="eps-page">
        {full && top && <div className="epl-band">{top(api)}</div>}
        <div className="epl-row">
          {full && left && (
            <div className="epl-side" style={{ width: leftWidth }}>
              {left(api)}
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
            {/* `above`: a control drawn over the card, in Full Mode, the way Primary puts the
                stick between its two button groups — the T-54A's control wheel. */}
            {full && above && <div className="epl-above">{above(api)}</div>}
            {/* The card hugs its own steps — a four-step EP is a four-step box. The RESERVATION
                is the slot around it, which is always as tall as the longest EP, so everything
                below sits at the same place whichever procedure is showing. */}
            <div className="epl-card-slot" style={cardMin ? { minHeight: cardMin + (calls ? CALL_ROOM : 0) } : undefined}>
              {crew ? (
                <div className="epl-crew">
                  {card}
                  {crewLeft.length > 0 && (
                    <span className="epl-crew-box epl-crew-box--left" title="Left seat / pilot flying">{crewLeft.join('/')}</span>
                  )}
                  {crewRight.length > 0 && (
                    <span className="epl-crew-box epl-crew-box--right" title="Right seat / pilot monitoring">{crewRight.join('/')}</span>
                  )}
                  {crewObs && (
                    <span className="epl-crew-box epl-crew-box--obs" title="Observer">OBS</span>
                  )}
                </div>
              ) : card}
              {/* An EP with `practice` names another set that drills it in context (the T-44C's
                  single-engine cases under Engine Failure After Takeoff); the button opens it. */}
              {showTools && practice && ep.practice && (
                <button type="button" className="epl-practice" onClick={() => practice.open(ep.practice)}>
                  {practice.labelOf(ep.practice)}
                </button>
              )}
              {/* Always drawn on a `calls` set, one height on every card, so Previous/Next still
                  hold still. */}
              {calls && (
                <div className="epl-call" aria-live="polite">
                  {callRow ? (
                    <button type="button" className="epl-call-say" title="Show what the FTI says to do"
                      onClick={() => setOpenAction(callRow.id)}>
                      {!(callRow.replies && callRow.replies.length) && <span>Expanded</span>}
                      {(callRow.replies || []).map((reply, i) => (
                        <span key={i} className={reply.act ? 'epl-say--act' : reply.ip ? 'epl-say--ip' : 'epl-say'}>
                          {reply.act ? reply.text : <span>&ldquo;{reply.text}&rdquo;</span>}
                          {reply.who ? ` (${reply.who})` : ''}
                        </span>
                      ))}
                    </button>
                  ) : <span className="epl-call-empty">{lastIn ? '' : 'The call shows here once its step is in'}</span>}
                </div>
              )}
              {actionRow && (
                <ActionPanel row={actionRow} label={actionLabel} mark={readMark(actionRow.id)}
                  onClose={() => setOpenAction(null)} />
              )}
            </div>
            {showTools && (
              <div className="navigation-buttons">
                <button type="button" onClick={() => go(detour ? pos : pos - 1)} disabled={!detour && pos === 0}>Previous</button>
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
              {!read && <button type="button" onClick={() => check()}>Check</button>}
              {showTools && <button type="button" onClick={reset}>Reset</button>}
              {showTools && read && (
                <button type="button" className={`epl-auto-nwc${autoExpand ? ' active' : ''}`} aria-pressed={autoExpand}
                  onClick={() => { setOpenAction(null); setAutoExpand((v) => !v); }}>
                  Auto Expanded
                </button>
              )}
              {showTools && extraToggle && (
                <button type="button" className={`epl-auto-nwc${extraToggle.on ? ' active' : ''}`} aria-pressed={extraToggle.on}
                  onClick={extraToggle.toggle}>
                  {extraToggle.label}
                </button>
              )}
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
              {right(api)}
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
