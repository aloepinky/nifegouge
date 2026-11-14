// /t44c/practice — a T-44C contact flight from the line to the line, said out step by step:
// the radio calls, the course rules, the numbers to be on, and the checklists by name. The
// flight itself is flight.js; this is its page, on the T-6 Practice Flight's .pf-* styles.

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { PHASES, PROFILES, canBackTo, current, describe, epsFor, nextOf, isPropRow, reduce, start, totalOf, withHistory } from './flight';
import { NORTH_FLOW, RUNWAYS } from '../card';
import T44CMap from './T44CMap';
import { AREAS, ENTRY } from './routes';
import { Rule } from '../RuleText';

const FIG = String.fromCharCode(0x2007);
const blank = (n) => <span className="pf-rule-blank">{FIG.repeat(Math.max(4, Math.min(30, n)))}</span>;
const refText = (r) => (r ? [r.work, r.loc, r.pages].filter(Boolean).join(', ') : '');
// A V speed is written with its letters below the line: V and a subscript R.
const withSubs = (text) => String(text).split(/\b(V(?:XSE|YSE|SSE|R|X|Y))\b/).map((part, i) => (i % 2 ? <React.Fragment key={i}>V<sub>{part.slice(1)}</sub></React.Fragment> : part));

const Key = ({ k }) => <kbd className="pf-kbd" aria-hidden="true">{k}</kbd>;

const READOUT = [['alt', 'Altitude'], ['kias', 'Airspeed'], ['hdg', 'Heading'], ['props', 'Prop levers'], ['radio', 'Radio']];

function StatusBar({ s, h, canBack, dispatch, quiz, setQuiz }) {
  const step = current(s);
  const phase = step ? step.phase : 'Taxi';
  const seen = new Set(s.log.map((l) => l.phase));
  const c = s.card;
  const at = PHASES.indexOf(phase);
  const doing = s.done ? 'Flight complete' : `${phase}: ${describe(step)}`;
  const next = nextOf(s);
  // As Primary's: folded to Now and Next until opened, and the page keeps its place on a phone.
  const [expanded, setExpanded] = useState(false);
  const scrollPosition = useRef(null);
  useLayoutEffect(() => {
    if (scrollPosition.current === null) return;
    window.scrollTo({ top: scrollPosition.current, behavior: 'instant' });
    scrollPosition.current = null;
  }, [expanded]);
  return (
    <div className={expanded ? 'pf-status pf-status--expanded' : 'pf-status'}>
      <button type="button" className="pf-status-toggle" aria-expanded={expanded} aria-controls="pf-status-details"
        onClick={() => {
          if (window.matchMedia('(max-width: 760px)').matches) scrollPosition.current = window.scrollY;
          setExpanded(!expanded);
        }}>
        <span>Settings and info</span>
        <span>{expanded ? 'Collapse ▴' : 'Expand ▾'}</span>
      </button>
      {!expanded && (
        <div className="pf-status-compact">
          <div><span className="pf-status-label">Now</span> {doing}</div>
          {next && <div><span className="pf-status-label">Next</span> {next}</div>}
        </div>
      )}
      <div id="pf-status-details" className="pf-status-details">
        <ol className="pf-phases" aria-label="Phases of the flight">
          {PHASES.map((p, i) => {
            // As Primary's: a stage already begun goes back to where it began; one ahead is skipped to.
            const behind = p !== phase && canBackTo(h, p);
            const ahead = !s.done && i > at && step?.kind !== 'ep';
            return (
              <li key={p} aria-current={p === phase ? 'step' : undefined}>
                <button
                  type="button"
                  className={p === phase ? 'pf-phase pf-phase--now' : seen.has(p) ? 'pf-phase pf-phase--done' : 'pf-phase'}
                  onClick={() => dispatch(behind ? { type: 'backTo', phase: p } : { type: 'skipTo', phase: p })}
                  disabled={!behind && !ahead}
                  title={behind ? `Back to the start of ${p}` : ahead ? `Skip to ${p}` : undefined}
                >
                  {p}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="pf-status-row">
          <div className="pf-status-text">
            <div><span className="pf-status-label">Now</span> {doing}</div>
            {next && <div><span className="pf-status-label">Next</span> {next}</div>}
          </div>
          <div className="pf-status-buttons">
            <button type="button" className="pf-btn" disabled={s.done || !step || step.kind === 'ep' || !epsFor(step.phase).length}
              title={step && !epsFor(step.phase).length ? 'Nothing fits this moment' : undefined}
              onClick={() => dispatch({ type: 'ep' })}>Emergency</button>
            <button type="button" className="pf-btn" disabled={s.done} onClick={() => dispatch({ type: 'skipPhase' })}>Skip stage</button>
            <button type="button" className="pf-btn" disabled={!canBack} onClick={() => dispatch({ type: 'back' })}>Back</button>
            <button type="button" className="pf-btn" onClick={() => dispatch({ type: 'restart' })}>Restart</button>
            <select className="pf-select" aria-label="Flight mode" value={quiz ? 'quiz' : 'practice'} onChange={(e) => setQuiz(e.target.value === 'quiz')}>
              <option value="practice">Practice Mode</option>
              <option value="quiz">Quiz Mode</option>
            </select>
          </div>
        </div>
        <dl className="pf-readout" aria-label="What to fly now">
          {READOUT.map(([k, label]) => (
            <div key={k} className={s.fly[k] ? 'pf-readout-cell' : 'pf-readout-cell pf-readout-cell--empty'}>
              <dt>{label}</dt>
              <dd>
                <span className="pf-readout-value">{s.fly[k] || '—'}</span>
                {s.fly[k] && s.flyFrom?.[k] && <span className="pf-readout-from">{s.flyFrom[k]}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <dl className="pf-flightcard">
          <div><dt>Call sign</dt><dd>{c.callSign}</dd></div>
          <div><dt>ATIS</dt><dd>{s.heardAtis ? `${s.heardAtis.atis}: wind ${s.heardAtis.windDir} at ${s.heardAtis.windSpeed}, altimeter ${s.heardAtis.altimeter}, runway ${s.heardAtis.rwy}` : 'not yet copied'}</dd></div>
          {s.block && <div><dt>{s.block.label}</dt><dd>{s.block.bottom.toLocaleString('en-US')}-{s.block.top.toLocaleString('en-US')}&apos;</dd></div>}
        </dl>
      </div>
    </div>
  );
}

// Primary's wind choices, in Preflight: random for every ATIS, random once, or a KNGP runway's
// (within 20 degrees of it). Each pick and New wind draws afresh; the direction can be typed over.
const WIND_HELP = {
  every: 'Wind is randomly generated for every ATIS.',
  once: 'Wind is randomly generated once at the start of the flight.',
};
function WindSetup({ s, dispatch }) {
  const c = s.card;
  const [typed, setTyped] = useState(null);
  return (
    <div className="pf-weather">
      <label className="pf-weather-field">
        Wind
        <select className="pf-select" value={s.windPick} onChange={(e) => { setTyped(null); dispatch({ type: 'wind', pick: e.target.value }); }}>
          <option value="every">Random every time</option>
          <option value="once">Random once</option>
          {[true, false].map((north) => (
            <optgroup key={String(north)} label={north ? 'North Flow' : 'South Flow'}>
              {RUNWAYS.filter(({ rwy }) => NORTH_FLOW.includes(rwy) === north).map(({ rwy }) => (
                <option key={rwy} value={rwy}>Runway {rwy}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="pf-weather-field">
        Wind direction
        <input className="pf-input" type="number" min="0" max="360" step="10" placeholder="001 to 360"
          value={typed === null ? c.windDir : typed}
          onChange={(e) => {
            setTyped(e.target.value);
            if (/^\d{1,3}$/.test(e.target.value)) dispatch({ type: 'wind', windDir: e.target.value });
          }} />
      </label>
      <button type="button" className="pf-btn" onClick={() => { setTyped(null); dispatch({ type: 'wind' }); }}>New wind</button>
      <p className="pf-when">{WIND_HELP[s.windPick] || 'Wind is kept constant for the whole flight.'}</p>
      <p className="pf-weather-preview">Wind {c.windDir} at {c.windSpeed} knots, runway {c.rwy} at Navy Corpus, runway {c.cabRwy} at Cabaniss.</p>
    </div>
  );
}

function Step({ s, dispatch, quiz }) {
  const step = current(s);
  const go = useRef(null);
  useEffect(() => { if (go.current) go.current.focus({ preventScroll: true }); }, [step]);

  if (s.done) {
    return (
      <div className="pf-card">
        <h2 className="pf-card-title">Flight complete</h2>
        <p className="pf-done">Back on the line. {s.flown.length} {s.flown.length === 1 ? 'maneuver' : 'maneuvers'} flown.</p>
        <button type="button" className="pf-btn pf-btn--go" onClick={() => dispatch({ type: 'restart' })}>Fly again</button>
      </div>
    );
  }

  const total = totalOf(step);
  const { upTo } = s.cur;
  // Practice Mode shows everything at once; Quiz Mode holds it back until revealed.
  const shown = !quiz || s.cur.shown;
  const recent = s.log.slice(-3);
  const button = () => (
    <div className="pf-actions">
      <button ref={go} type="button" className="pf-btn pf-btn--go" onClick={() => dispatch({ type: quiz ? 'next' : 'readNext' })}>
        {shown || total === 0 ? 'Next' : total > 1 ? 'Reveal next' : 'Reveal'} <Key k="→" />
      </button>
      {!shown && total > 1 && <button type="button" className="pf-btn" onClick={() => dispatch({ type: 'revealAll' })}>Reveal all</button>}
    </div>
  );

  return (
    <div className="pf-card">
      {recent.length > 0 && (
        <div className="pf-recent" aria-label="Just said">
          {recent.map((l, i) => (
            <div key={i} className={`pf-line pf-line--${l.other ? 'other' : 'you'}`}>
              <span className="pf-who">{l.radio || l.who}</span>
              <span className="pf-said pf-lines">{l.plain ? l.text : `“${l.text}”`}</span>
            </div>
          ))}
        </div>
      )}

      {step.mnemonic && (
        <p className="pf-mnemonic" aria-label={`${step.mnemonic.letters}, step ${step.mnemonic.at + 1}`}>
          {[...step.mnemonic.letters].map((l, i) => (
            <span key={i} className={i === step.mnemonic.at ? 'pf-mnemonic-now' : undefined}>{l}</span>
          ))}
        </p>
      )}

      {step.kind === 'choose' && (
        <>
          {step.on === 'area' && <WindSetup s={s} dispatch={dispatch} />}
          {step.on === 'area' && (
            <label className="pf-weather-field">
              High work profile
              <select className="pf-select" value={s.profile} onChange={(e) => dispatch({ type: 'profile', id: e.target.value })}>
                <option value="">None</option>
                {Object.keys(PROFILES).map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
            </label>
          )}
          <div className="pf-prompt">{step.prompt}</div>
          <div className="pf-choices">
            <div className="pf-choice-group">
              <div className="pf-choice-buttons">
                {step.options.map((o) => <button key={o.id} type="button" className="pf-choice" onClick={() => dispatch({ type: 'choose', id: o.id })}>{o.label}</button>)}
              </div>
            </div>
          </div>
        </>
      )}

      {step.kind === 'auto' && (
        <>
          <div className="pf-reply">
            <span className="pf-reply-who">{step.who} {step.radio}</span>
            <span className="pf-reply-text">{step.text}</span>
          </div>
          {step.note && <p className="pf-when">{step.note}</p>}
          <p className="pf-when">Generated comms</p>
          {button()}
        </>
      )}

      {step.kind === 'checklist' && (
        <>
          {quiz && !shown && <div className="pf-prompt">Which checklist now?</div>}
          {shown && <p className="pf-worked-answer">{step.name}</p>}
          {button()}
        </>
      )}

      {step.kind === 'call' && (
        <>
          {step.when && <p className="pf-when">{step.when}</p>}
          {quiz && !shown && step.lead.length === 0 && <div className="pf-prompt">{step.who}{step.radio ? ` on ${step.radio}` : ''}: what do you say?</div>}
          {(shown || step.lead.length > 0) && (
            <section className="pf-exchange" aria-label="Voice exchange">
              <div className="pf-exchange-lines">
                {[...step.lead, ...(shown ? [{ who: step.who, radio: step.radio, text: step.text, generated: step.generated }, ...step.replies] : [])].map((line, i) => (
                  <div key={i} className={line.who === 'PF' ? 'pf-exchange-line pf-exchange-line--pf' : line.who === 'PM' ? 'pf-exchange-line pf-exchange-line--pm' : 'pf-exchange-line'}>
                    <span className="pf-exchange-speaker">{line.who}{line.radio ? ` ${line.radio}` : ''}</span>
                    <div className="pf-exchange-body"><p className="pf-lines">{withSubs(line.text)}</p>{line.generated && <span className="pf-when">Generated comms</span>}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {step.note && shown && <p className="pf-when">{step.note}</p>}
          {button()}
        </>
      )}

      {step.kind === 'rule' && (
        <>
          <div className="pf-prompt"><span className="pf-challenge">{step.title}</span></div>
          <Rule step={step} upTo={upTo} shown={shown} />
          {button()}
        </>
      )}

      {step.kind === 'numbers' && (
        <section className="pf-procedure" aria-label={step.title}>
          <div className="pf-prompt">{step.title}</div>
          <table className="pf-numbers">
            <tbody>
              {step.rows.map(([label, value], i) => (
                <tr key={i} className={[!shown && i === upTo ? 'pf-numbers-next' : '', isPropRow(label) ? 'pf-numbers-prop' : ''].join(' ').trim() || undefined}>
                  <th scope="row">{withSubs(label)}</th>
                  <td>{i < upTo || shown ? withSubs(value) : blank(String(value).length)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {button()}
        </section>
      )}

      {step.kind === 'ep' && (
        <section className="pf-procedure" aria-label={step.title}>
          <h2 className="pf-card-title">{step.title}</h2>
          <div className="pf-rule">
            {(() => {
              let n = -1;
              return step.rows.map((r, i) => {
                if (!r.text) return <div key={i} className="pf-rule-heading">{r.decision || r.note}</div>;
                n += 1;
                const open = n < upTo || shown;
                return <div key={i} className={!shown && n === upTo ? 'pf-rule-para pf-rule-para--next' : 'pf-rule-para'}><p>{open ? r.text : blank(r.text.length)}</p></div>;
              });
            })()}
          </div>
          {button()}
        </section>
      )}

      {step.ref && (step.kind !== 'checklist' || shown) && <p className="pf-source">Source: {refText(step.ref)}</p>}
    </div>
  );
}

function FlightLog({ log }) {
  const groups = [];
  log.forEach((l) => {
    const last = groups[groups.length - 1];
    if (last && last.phase === l.phase) last.entries.push(l);
    else groups.push({ phase: l.phase, entries: [l] });
  });
  return (
    <details className="pf-log" open>
      <summary>Flight log</summary>
      <div className="pf-log-body">
        {groups.map((g, gi) => (
          <details key={gi} className="pf-log-phase" open={gi === groups.length - 1}>
            <summary>{g.phase}</summary>
            <ol>
              {g.entries.map((l, i) => (
                <li key={i} className="pf-log-entry">
                  <span className="pf-who">{l.radio || l.who}</span>
                  <span className="pf-said pf-lines">{l.text}</span>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </details>
  );
}

const ENTRY_LEGS = Object.values(ENTRY).map((e) => e.before.leg);

// What the map frames when there is no choice on it: Navy Corpus until a departure is drawn (the
// area picked in Preflight is on the route, but the flight is still on the ground), the working
// area during high work, else the leg being flown.
function frameOf(s) {
  if (!s.area) return null;
  const last = s.route[s.route.length - 1];
  // In the area until the departure from it is drawn: high work, and the exit's calls and
  // checklists (A-B-C, A-C-A-S-A) before the course rule out of the area.
  if (s.stage === 'highWork' || (s.stage === 'exit' && (last === AREAS[s.area].poly || ENTRY_LEGS.some((leg) => last.startsWith(`${leg} `))))) return AREAS[s.area].poly;
  if (last === AREAS[s.area].poly) return 'KNGP';
  return null;
}

export default function T44CPractice() {
  const [h, dispatch] = useReducer((state, action) => withHistory(state, action, Math.random), undefined, () => ({ past: [], now: start() }));
  const [quiz, setQuiz] = useState(false);
  const s = h.now;
  const step = current(s);

  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'back' }); }
      if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: quiz ? 'next' : 'readNext' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quiz]);

  const options = useMemo(() => (step?.kind === 'choose' ? step.options.filter((o) => o.legs) : []), [step]);
  const onChoose = useCallback((id) => dispatch({ type: 'choose', id }), []);

  return (
    <div className="pf-page">
      <StatusBar s={quiz ? s : reduce(s, { type: 'revealAll' })} h={h} canBack={h.past.length > 0} dispatch={dispatch} quiz={quiz} setQuiz={setQuiz} />
      <div className="pf-body">
        <div className="pf-main">
          <Step s={s} dispatch={dispatch} quiz={quiz} />
          <T44CMap route={s.route} options={options} onChoose={onChoose} frame={frameOf(s)} />
        </div>
        <FlightLog log={s.log} />
      </div>
    </div>
  );
}
