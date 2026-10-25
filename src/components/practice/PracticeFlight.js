// /primary/practice — a contact flight from the line to the line, said out step by step: every
// checklist response, intercom and radio call, the course rules legs picked as you fly, and a
// random emergency when you ask for one. The flight itself is engine.js; this is its page.

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { TYPED, canSkipTo, current, isCue, linesOf, options, situationsFor, start, switchesChannel } from './engine';
import { radioOf } from './figures';
import { labelOf, nameOf, shortName } from './legs';
import { firstLetters } from '../briefs/firstLetters';
import PracticeMap from './PracticeMap';
import { fetchCourseRules } from '../courserules/courseRulesApi';
import { readSquadron, writeSquadron } from '../discuss/units';
import { MANEUVERS, ft } from './highWork';
import { backable, begin, withHistory } from './history';
import { flightText } from './report';
import { DRAFT } from '../programs';

// Before a maneuver: where the last one left you, what this one does to your altitude, and
// the band the block allows.
function SetupPrompt({ s, step }) {
  const m = MANEUVERS[step.maneuver];
  const last = s.lastManeuver ? MANEUVERS[s.lastManeuver].label : null;
  return (
    <div className="pf-setup">
      <div className="pf-setup-alt">
        {last ? `The ${last.toLowerCase()} left you at ${ft(s.alt)}.`
          : `Level outside the block at ${ft(s.alt)}.`}
      </div>
      <div className="pf-when">Next: {m.label}</div>
    </div>
  );
}

// The stages in the order this flight flies them: low work first puts the outlying field's
// pattern before the working area.
const phasesFor = (order) => [
  'Preflight', 'Taxi', 'Takeoff', 'Departure',
  ...(order === 'low' ? ['Pattern', 'Transit', 'Working area'] : ['Working area', 'Transit', 'Pattern']),
  'Recovery', 'Landing', 'Taxi back',
];

const CALLS = {
  pins: 'At the aircraft',
  taxiOut: 'Taxiing out',
  atis: 'ATIS',
  clearanceDelivery: 'Clearance',
  channel3: 'Radios set',
  base: 'Base Call at Run-Ups',
  ground: 'Ground call',
  crossing: 'Crossing a runway',
  tower: 'Tower call',
  roll: 'Takeoff roll',
  afterTakeoff: 'After takeoff',
  departure: 'Departure check-in',
  nearest: 'After the Operations Check',
  gear: 'Before lowering the gear',
  fullStop: 'Landing call',
  shortFinal: 'Short final',
  taxiBack: 'Taxi back',
  leaving: 'Leaving the aircraft',
  controls: 'Change of controls',
  cua: 'CUA brief',
  leg: 'Course rules',
  fti: 'FTI numbers',
  rule: 'Course rules',
};

// The squadrons by call sign, and the unit Discussion Items stores for each.
const SQUADRON_UNIT = { Boomer: 'VT-27', Ranger: 'VT-28' };
const squadronFromStorage = () => Object.keys(SQUADRON_UNIT).find((k) => SQUADRON_UNIT[k] === readSquadron());

// A figure space: a blank as wide as a digit.
const FIG = String.fromCharCode(0x2007);

const WHO = { you: 'You', ip: 'IP', note: 'Note', choice: 'Picked', ep: 'Emergency', route: 'Flew' };
const whoOf = (w) => WHO[w] || w;

const refText = (ref) => (ref ? [ref.work, ref.loc, ref.pages].filter(Boolean).join(', ') : '');

const RESULT = { said: 'Said', correct: 'Correct', partial: 'Partly right', shown: 'Answer shown' };
const isReply = (step) => step && step.kind === 'reply';
const MARK = { said: '', correct: '✓', partial: '≈', shown: '?' };

// What comes after the step on screen, in a few words.
function nextOf(s) {
  const now = s.steps[s.at];
  const later = s.steps.slice(s.at + 1)
    .find((x) => x.kind !== 'auto' && !(now?.checklist && x.checklist === now.checklist)
      && !(now?.group && x.group === now.group));
  if (later?.kind === 'checklist') return 'A checklist';
  const seg = s.segments[0];
  if (later) return later.group ? CALLS[later.group] : later.kind === 'choose' ? 'Pick the next leg' : '';
  if (!seg) return '';
  if (seg.checklist) return 'A checklist';
  if (seg.calls) return CALLS[seg.calls] || '';
  if (seg.legCalls) return `Calls for ${labelOf(seg.legCalls)}`;
  if (seg.choose) return seg.choose === 'plan' ? 'Pick the working area' : 'Pick the next leg';
  if (seg.ask) return 'Climb Checklist?';
  return '';
}

// Tools not yet for everyone: on a local copy, or in a browser that has opened the page with
// ?dev (remembered; ?dev=off forgets it).
function devTools() {
  if (DRAFT) return true;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('dev') === 'off') window.localStorage.removeItem('practiceDev');
    else if (q.has('dev')) window.localStorage.setItem('practiceDev', '1');
    return window.localStorage.getItem('practiceDev') === '1';
  } catch (e) {
    return false;
  }
}

function StatusBar({ s, back, dispatch }) {
  const step = current(s);
  const phase = s.ep && !s.ep.situation ? 'Emergency' : step?.phase || 'Shutdown';
  const seen = new Set(s.log.map((l) => l.phase));
  const fits = situationsFor(s);
  // Until the ATIS is heard the runway isn't known, so neither is the departure.
  const where = s.atisHeard && s.route.length > 1 ? labelOf(s.node) : 'KNGP, on the line';
  const doing = s.ep ? s.ep.title : step?.kind === 'checklist' ? 'Calling for a checklist'
    : step?.group ? CALLS[step.group] : ['plan', 'area', 'block', 'order', 'olf'].includes(step?.choose) ? 'Briefing'
      : step?.choose === 'entryPlan' ? 'Planning the entry'
      : ['maneuver', 'altitude'].includes(step?.choose) ? 'High work' : step?.choose === 'cua' ? 'Unusual attitude'
        : step?.choose === 'checkout' ? 'Checking out' : step?.kind === 'choose' ? 'Picking a leg' : '';
  const next = s.ep ? (s.ep.done ? 'Back to the flight' : 'What you do') : nextOf(s);
  const epBlocked = s.done ? 'The flight is over' : s.ep ? 'Finish this first'
    : fits.length ? '' : 'Nothing that comes up here fits this moment';

  return (
    <div className="pf-status">
      <ol className="pf-phases" aria-label="Phases of the flight">
        {phasesFor(s.order).map((p) => {
          // A stage already begun takes the flight back to where it began (everything since is
          // dropped); one still ahead can be skipped to. The pattern and landing come round again.
          const behind = back.has(p) && !s.ep;
          const ahead = !behind && p !== phase && (!seen.has(p) || p === 'Pattern' || p === 'Landing') && canSkipTo(s, p) && !s.done && !s.ep;
          return (
            <li key={p} aria-current={p === phase ? 'step' : undefined}>
              <button
                type="button"
                className={p === phase ? 'pf-phase pf-phase--now' : seen.has(p) ? 'pf-phase pf-phase--done' : 'pf-phase'}
                onClick={() => dispatch(behind ? { type: 'backTo', phase: p } : { type: 'skipTo', phase: p })}
                disabled={!behind && !ahead}
                title={behind ? `Back to the start of ${p}` : ahead ? `Skip to ${p}` : !canSkipTo(s, p) && !s.done && !s.ep && p !== phase ? `No ${p.toLowerCase()} on this flight` : undefined}
              >
                {p}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="pf-status-row">
        <div className="pf-status-text">
          <div><span className="pf-status-label">Now</span> {doing || phase} <span className="pf-status-where">· {where}</span></div>
          {next && <div><span className="pf-status-label">Next</span> {next}</div>}
        </div>
        <div className="pf-status-buttons">
          {/* Something that goes wrong short of an emergency: Joker, Bingo, a wave-off…. Not on
              the live site yet: only here, or in a browser opened once with ?dev. */}
          {devTools() && (
          <button
            type="button"
            className="pf-btn"
            onClick={() => dispatch({ type: 'situation' })}
            disabled={!!epBlocked}
            title={epBlocked || `One of: ${fits.map((x) => x.title).join(', ')}`}
          >
            Something happens
          </button>
          )}
          <button
            type="button"
            className="pf-btn"
            onClick={() => dispatch({ type: 'skipPhase' })}
            disabled={s.done || !!s.ep}
            title={s.ep ? 'Finish this first' : `Run the rest of ${phase} and go on to the next stage`}
          >
            Skip stage
          </button>
          <button type="button" className="pf-btn" onClick={() => dispatch({ type: 'restart' })}>Restart</button>
          {/* The squadron is the one picked on Discussion Items (My squadron), and the other way. */}
          <select
            className="pf-select"
            value={s.card.squadron}
            aria-label="Squadron"
            onChange={(e) => {
              writeSquadron(SQUADRON_UNIT[e.target.value]);
              dispatch({ type: 'squadron', squadron: e.target.value });
            }}
          >
            <option value="Boomer">Boomer (VT-27)</option>
            <option value="Ranger">Ranger (VT-28)</option>
          </select>
        </div>
      </div>
      <Readout fly={s.fly || {}} />
      <FlightCard s={s} />
    </div>
  );
}

// What you should be flying right now: the altitude, heading and airspeed the last course rule
// (or the field, or the maneuver) gave, and the channel on each radio. Each says what set it.
const READOUT = [['alt', 'Altitude'], ['hdg', 'Heading'], ['kias', 'Airspeed'], ['uhf', 'UHF'], ['vhf', 'VHF']];
function Readout({ fly }) {
  return (
    <dl className="pf-readout" aria-label="What to fly now">
      {READOUT.map(([k, label]) => {
        const f = fly[k];
        return (
          <div key={k} className={f ? 'pf-readout-cell' : 'pf-readout-cell pf-readout-cell--empty'}>
            <dt>{label}</dt>
            <dd>
              <span className="pf-readout-value">{f ? f.v : '—'}</span>
              {f && (f.station || f.from) && <span className="pf-readout-from">{f.station || f.from}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

// What the student has been given for this flight: their call sign and squawk, the ATIS, and
// the working area once it is picked.
function FlightCard({ s }) {
  const c = s.card;
  return (
    <dl className="pf-flightcard">
      <div><dt>Call sign</dt><dd>{c.callSign}</dd></div>
      <div><dt>Squawk</dt><dd>{c.squawk}</dd></div>
      <div>
        <dt>ATIS</dt>
        <dd>{s.atisHeard ? `${c.atis}: wind ${c.windDir} at ${c.windSpeed}, altimeter ${c.altimeter}, runway ${c.rwy} (${c.north ? 'North' : 'South'} Flow)` : 'not yet copied'}</dd>
      </div>
      {s.plan && <div><dt>Area</dt><dd>{s.path ? nameOf(s.path[s.path.length - 1]) : s.plan}</dd></div>}
      {s.block && <div><dt>{s.block.name}</dt><dd>{ft(s.block.bottom)}-{ft(s.block.top)}</dd></div>}
    </dl>
  );
}

function Line({ entry }) {
  return (
    <div className={`pf-line pf-line--${entry.who === 'you' ? 'you' : 'other'}`}>
      <span className="pf-who">{entry.radio || whoOf(entry.who)}</span>
      <span className="pf-said pf-lines">{['note', 'choice', 'route'].includes(entry.who) || entry.kind === 'rule' || entry.plain ? entry.text : `“${entry.text}”`}</span>
    </div>
  );
}

// Choice buttons, with the runway legs gathered under their route ("Rusty Departures": 04 13L …).
function Choices({ opts, onChoose }) {
  const groups = [];
  opts.forEach((o) => {
    const m = /^(.*\S)\s+(\d{2}[LRC]?(?:\/\d{2}[LRC]?)?(?: pattern)?)$/.exec(o.label);
    const name = m ? m[1] : '';
    let g = groups.find((x) => x.name === name);
    if (!g) groups.push((g = { name, opts: [] }));
    g.opts.push({ ...o, short: m ? m[2] : o.label });
  });
  return (
    <div className="pf-choices">
      {groups.map((g) => (
        <div key={g.name || 'none'} className="pf-choice-group">
          {g.name && <div className="pf-choice-name">{g.name}</div>}
          <div className="pf-choice-buttons">
            {g.opts.map((o) => (
              <button key={o.id} type="button" className="pf-choice" onClick={() => onChoose(o.id)}>{o.short}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// A paragraph's figures, as the readout takes them.
function FlyLine({ figs }) {
  const parts = [figs.alt, figs.hdg, figs.kias, figs.ch && [figs.ch, figs.station].filter(Boolean).join(' ')].filter(Boolean);
  return parts.length ? <div className="pf-rule-fly">{parts.join(' · ')}</div> : null;
}

// A rule's text with its marked words blanked (a line as long as the word) or filled in.
function Words({ text, filled }) {
  return text.split(/\[\[([^[\]]+)\]\]/).map((part, j) => (j % 2
    ? <span key={j} className={filled ? 'pf-rule-word' : 'pf-rule-blank'}>{filled ? part : FIG.repeat(Math.max(3, part.length))}</span>
    : part.replace(/\*\*/g, '')));
}

// A course rule revealed a piece at a time (engine.js piecesOf): each sentence with a blank, so
// every change of altitude, airspeed, heading or channel is its own stop. A revealed piece shows
// what it says to fly.
function Rule({ step, upTo, shown }) {
  const pieces = (step.pieces || []).map((x, k) => ({ ...x, k }));
  const open = (k) => shown || k < upTo;
  return (
    <div className="pf-rule">
      {step.rule.map((p, i) => {
        if (p.heading) return <div key={i} className="pf-rule-heading"><Words text={p.text} filled /></div>;
        const mine = pieces.filter((x) => x.para === i);
        const next = !shown && mine.some((x) => x.k === upTo);
        return (
          <div key={i} className={next ? 'pf-rule-para pf-rule-para--next' : 'pf-rule-para'}>
            <p className={p.sub ? 'pf-rule-sub' : undefined}>
              {mine.length ? mine.map((x) => (
                <span key={x.k} className={!shown && x.k === upTo ? 'pf-rule-piece pf-rule-piece--next' : 'pf-rule-piece'}>
                  <Words text={p.text.slice(x.from, x.to)} filled={open(x.k)} />
                </span>
              )) : <Words text={p.text} filled />}
            </p>
            {p.cite && <span className="pf-rule-cite">{p.cite}</span>}
            {mine.filter((x) => open(x.k)).map((x) => <FlyLine key={x.k} figs={x.figs} />)}
          </div>
        );
      })}
    </div>
  );
}

// An FTI procedure's numbers, a line at a time; before a high work maneuver, the brief to the
// IP is the first line.
function Numbers({ step, upTo, shown }) {
  const lead = step.brief ? 1 : 0;
  const open = (i) => shown || i < upTo;
  // A row with no value is a reminder (the Before Landing Checklist): shown, never asked. The
  // rest are revealed in turn.
  let n = lead;
  const line = step.rows.map(([, value]) => (value === null ? null : n++));
  // Then the callouts, said in turn; a cue or reminder in brackets just shows.
  const callouts = step.callouts || [];
  const said = callouts.map((c) => (isCue(c) ? null : n++));
  return (
    <>
      {step.brief && (
        <div className={!shown && upTo === 0 ? 'pf-brief pf-brief--next' : 'pf-brief'}>
          <span className="pf-brief-label">Brief the IP</span>
          {/* The brief's words show; its airspeed is the blank, revealed first. */}
          <span className="pf-brief-text">
            “{step.entry && !open(0)
              ? step.brief.split(step.entry).flatMap((part, i) => (i ? [<span key={i} className="pf-rule-blank">{FIG.repeat(step.entry.length)}</span>, part] : [part]))
              : step.brief}”
          </span>
        </div>
      )}
      <table className="pf-numbers">
        <tbody>
          {step.rows.map(([label, value], i) => (line[i] === null ? (
            <tr key={i} className="pf-numbers-static"><th scope="row" colSpan={2}>{label}</th></tr>
          ) : (
            <tr key={i} className={!shown && line[i] === upTo ? 'pf-numbers-next' : undefined}>
              <th scope="row">{label}</th>
              <td>{open(line[i]) ? value : <span className="pf-rule-blank">{FIG.repeat(Math.max(4, value.length))}</span>}</td>
            </tr>
          )))}
        </tbody>
      </table>
      {callouts.length > 0 && (
        <div className="pf-callouts">
          <span className="pf-brief-label">Callouts</span>
          {callouts.map((c, i) => (said[i] === null ? (
            <span key={i} className="pf-callout pf-callout--cue">{c.replace(/^[[(]|[\])]\.?$/g, '')}</span>
          ) : (
            <span key={i} className={!shown && said[i] === upTo ? 'pf-callout pf-callout--next' : 'pf-callout'}>
              {open(said[i]) ? `“${c}”` : <span className="pf-rule-blank">{FIG.repeat(Math.min(24, c.length))}</span>}
            </span>
          )))}
        </div>
      )}
    </>
  );
}

// A setup altitude, typed: climb, descend or stay where you are.
function AltitudeBox({ s, dispatch }) {
  const set = (e) => {
    e.preventDefault();
    dispatch({ type: 'choose', id: s.cur.typed });
  };
  return (
    <form className="pf-answer" onSubmit={set}>
      <input
        className="pf-input"
        value={s.cur.typed}
        onChange={(e) => dispatch({ type: 'type', text: e.target.value })}
        placeholder="e.g. 17,500 or 17.5"
        aria-label="Setup altitude"
        inputMode="decimal"
        autoComplete="off"
        autoFocus
      />
      <button type="submit" className="pf-btn pf-btn--go">Set up</button>
      <button type="button" className="pf-btn" onClick={() => dispatch({ type: 'choose', id: String(s.alt) })}>Stay at {ft(s.alt)}</button>
    </form>
  );
}

function Prompt({ step, shown, from }) {
  if (step.kind === 'checklist') {
    return <div className="pf-prompt">Which checklist do you call for now?</div>;
  }
  if (step.kind === 'numbers') {
    return (
      <div className="pf-prompt">
        <span className="pf-challenge">{step.leg}</span>
      </div>
    );
  }
  if (step.kind === 'rule') {
    return (
      <div className="pf-prompt">
        <span className="pf-challenge">{step.leg}</span>
      </div>
    );
  }
  if (step.kind === 'response') {
    if (step.sim) {
      return (
        <div className="pf-prompt">
          <span className="pf-prompt-context">{step.checklist}, {step.item} of {step.of}</span>
          <span className="pf-challenge">{step.sim && step.item === 1 ? 'Immediate response (do)' : step.item === 1 ? 'Immediate response' : step.sim ? 'EP Memory items (say)' : 'EP Memory items'}</span>
        </div>
      );
    }
    if (step.memory) {
      return (
        <div className="pf-prompt">
          <strong>{step.checklist}</strong>, from memory: item {step.item} of {step.of}. Say the challenge and the response.
        </div>
      );
    }
    return (
      <div className="pf-prompt">
        <span className="pf-prompt-context">{step.checklist}, {step.item} of {step.of}</span>
        <span className="pf-challenge">“{step.challenge}”</span>
      </div>
    );
  }
  return (
    <div className="pf-prompt">
      <span className="pf-prompt-context">
        {step.checklist ? `${step.checklist}: ${step.challenge}` : step.leg ? `${CALLS.leg}: ${step.leg}` : CALLS[step.group] || 'Your call'}
      </span>
      {/* The channel is part of the call: say it first, and it shows once the call is
          revealed, with the channel you are switching from. */}
      <ChannelBox step={step} shown={shown} from={from} />
    </div>
  );
}

function ChannelBox({ step, shown, from }) {
  if (!step.radio) return <span className="pf-channel">Intercom</span>;
  // A radio named only by its band ("VHF") says nothing to ask or show.
  if (/^(UHF|VHF)$/.test(step.radio.trim())) return null;
  const ch = radioOf(step.radio);
  const change = from !== undefined && from !== ch;
  return (
    <span className={shown ? 'pf-channel pf-channel--radio pf-channel--shown' : 'pf-channel pf-channel--radio'}>
      <span className="pf-channel-label">{shown ? (change ? 'Switch to' : 'On') : 'Channel?'}</span>
      <span className="pf-channel-value">{shown ? ch : FIG.repeat(8)}</span>
      {shown && change && from && <span className="pf-channel-from">from {from}</span>}
    </span>
  );
}

// The page's arrow keys, shown faintly on the buttons they work (not on touch screens).
const Key = ({ k }) => <kbd className="pf-kbd" aria-hidden="true">{k}</kbd>;
const BackButton = ({ canBack, dispatch }) => (
  <button type="button" className="pf-btn" onClick={() => dispatch({ type: 'back' })} disabled={!canBack} title="Back a step">
    <Key k="←" /> Back
  </button>
);

function StepCard({ s, canBack, dispatch }) {
  const step = current(s);
  const input = useRef(null);
  const go = useRef(null);
  const ep = s.ep;
  const typed = step && TYPED.has(step.kind);
  const reply = isReply(step);

  // Enter (or Space) reveals, then goes on: the button keeps the focus from step to step.
  useEffect(() => {
    const el = step?.typed ? input.current : go.current;
    if ((typed || reply) && el) el.focus({ preventScroll: true });
  }, [step, typed, reply]);

  const recent = s.log.slice(-4);

  if (s.done) {
    const said = s.log.filter((l) => RESULT[l.result]);
    const count = (r) => said.filter((l) => l.result === r).length;
    return (
      <div className="pf-card">
        <h2 className="pf-card-title">{s.ended ? `Flight ended: ${s.ended}` : 'Engine shutdown complete'}</h2>
        <p className="pf-done">
          {said.length} steps said, {s.route.length - 1} legs flown.
          {said.length !== count('said') && ` Typed: ${count('correct')} right first time, ${count('partial')} partly right, ${count('shown')} looked up.`}
        </p>
        <button type="button" className="pf-btn pf-btn--go" onClick={() => dispatch({ type: 'restart' })}>Fly again</button>
      </div>
    );
  }

  if (ep?.done) {
    return (
      <div className="pf-card">
        <h2 className="pf-card-title">{ep.title}</h2>
        <p className="pf-done">Handled. Back to the flight.</p>
        <div className="pf-actions">
          <button type="button" className="pf-btn pf-btn--go" autoFocus onClick={() => dispatch({ type: 'resume' })}>Resume flight</button>
        </div>
      </div>
    );
  }

  // Other spellings are still accepted; the one shown is the first.
  const answer = Array.isArray(step.answer) ? step.answer[0] : step.answer;
  // A rule or a procedure's numbers is revealed line by line, in place.
  const lined = step.kind === 'rule' || step.kind === 'numbers';
  const onKey = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    dispatch({ type: s.cur.shown ? 'next' : 'check' });
  };

  return (
    <div className="pf-card">
      {ep && <h2 className="pf-card-title">{ep.title}</h2>}
      {s.skipped && (
        <div className="pf-skipped">
          <div className="pf-skipped-title">
            {s.skipped.to ? `Skipped to ${s.skipped.to}` : `Skipped ${s.skipped.phase}`}. On the way you were told:
          </div>
          {s.skipped.told.length ? s.skipped.told.map((l, i) => <Line key={i} entry={l} />) : <div className="pf-when">Nothing new.</div>}
        </div>
      )}
      {!ep && !s.skipped && recent.length > 0 && (
        <div className="pf-recent" aria-label="Just said">
          {recent.map((l, i) => <Line key={s.log.length - recent.length + i} entry={l} />)}
        </div>
      )}

      {(step.kind === 'choose' || step.kind === 'ask') && (
        <>
          {step.choose === 'altitude' && <SetupPrompt s={s} step={step} />}
          {step.choose === 'cua' && (
            <div className="pf-setup">
              <div className="pf-setup-alt">{step.attitude.text}.</div>
            </div>
          )}
          <div className="pf-prompt">
            {step.kind === 'ask' ? <span className="pf-when">{step.text}</span>
              : step.choose === 'cua' ? (step.part === 'pcl' ? 'Recover: the PCL?' : 'And the control stick?')
              : step.choose === 'area' ? (step.phase === 'Preflight' ? `Which ${s.plan} area?` : `Which ${s.plan} area are you claiming?`)
              : step.choose === 'block' ? 'High or low block?'
              : step.choose === 'altitude' ? `Where do you set up for the ${MANEUVERS[step.maneuver].label.toLowerCase()}?`
              : step.choose === 'maneuver' ? (s.hwFlown && s.hwFlown.length ? `The ${MANEUVERS[s.lastManeuver].label.toLowerCase()} left you at ${ft(s.alt)}. Which maneuver next?` : 'High work: which maneuver first?')
              : step.choose === 'checkout' ? `Checking out of ${nameOf(s.node).replace(/\s*\d+\s*$/, '')}: which checks?`
              : step.choose === 'order' ? 'High work or low work first?'
                : step.choose === 'plan' ? 'Which working area is being planned for?'
                  : step.choose === 'olf' ? 'Brief: where is the low work?'
                : step.choose === 'entry' ? `Entering the field off ${labelOf(step.leg)}: a break or a PEL?`
                  : step.choose === 'runway' ? `Which runway at ${shortName(step.field)}?`
                  : step.choose === 'entryPlan' ? `Before you leave the area, will you enter ${shortName(step.field)} through a break or a PEL?`
                  : step.choose === 'lap' ? 'This time round: a normal lap or a pattern PEL?'
                    : step.choose === 'field' ? `At ${nameOf(s.node)}. Pick what you do next.`
                  : `At ${nameOf(s.node)}. Pick the next leg below or on the map.`}
          </div>
          {step.choose === 'altitude' ? <AltitudeBox s={s} dispatch={dispatch} />
            : <Choices opts={options(s)} onChoose={(id) => dispatch({ type: 'choose', id })} />}
          {s.cur.problem && <p className="pf-feedback pf-feedback--wrong">{s.cur.problem}</p>}
          {step.choose === 'cua' && step.ref && <p className="pf-source">Source: {refText(step.ref)}</p>}
          {canBack && <div className="pf-actions"><BackButton canBack={canBack} dispatch={dispatch} /></div>}
        </>
      )}

      {reply && (
        <>
          <div className="pf-reply">
            <span className="pf-reply-who">{step.who === 'ip' ? 'IP' : step.who}{step.radio ? ` · ${step.radio}` : ''}</span>
            {/* A report (the altitude check) is not something said, so it has no quotes. */}
            <span className="pf-reply-text">{step.plain ? step.text : `“${step.text}”`}</span>
          </div>
          {step.generated && <p className="pf-when">Generated comms</p>}
          <div className="pf-actions">
            <BackButton canBack={canBack} dispatch={dispatch} />
            <button ref={go} type="button" className="pf-btn pf-btn--go" onClick={() => dispatch({ type: 'next' })}>Next <Key k="→" /></button>
          </div>
          {step.ref && <p className="pf-source">Source: {refText(step.ref)}</p>}
        </>
      )}

      {typed && (
        <>
          {/* A call's channel is its first line: shown once revealed, the call after. */}
          {/* Switching, the channel is asked first; already on it, it just shows. */}
          <Prompt
            step={step}
            shown={s.cur.shown || (s.cur.upTo || 0) >= 1 || (step.kind === 'call' && !s.cur.total && !switchesChannel(step, s.fly))}
            from={s.cur.chFrom}
          />
          {step.kind === 'rule' && <Rule step={step} upTo={s.cur.upTo || 0} shown={s.cur.shown} />}
          {step.kind === 'numbers' && <Numbers step={step} upTo={s.cur.upTo || 0} shown={s.cur.shown} />}
          {step.note && <p className="pf-when">{step.note}</p>}
          {step.example && <p className="pf-when">The study guide's example call.</p>}
          {step.generated && <p className="pf-when">Generated comms</p>}
          {step.typed && !s.cur.shown && (
          <div className="pf-answer">
            <input
              ref={input}
              className="pf-input"
              value={s.cur.typed}
              onChange={(e) => dispatch({ type: 'type', text: e.target.value })}
              onKeyDown={onKey}
              placeholder={step.kind === 'call' ? 'Type the call' : step.kind === 'checklist' ? 'Type the checklist' : 'Type the response'}
              aria-label={step.kind === 'call' ? 'Your call' : step.kind === 'checklist' ? 'The checklist' : 'Your response'}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className="pf-btn" onClick={() => dispatch({ type: 'check' })}>Check</button>
          </div>
          )}
          {s.cur.result === 'partial' && !s.cur.shown && <p className="pf-feedback pf-feedback--partial">Close: something is missing or extra.</p>}
          {s.cur.result === 'incorrect' && !s.cur.shown && <p className="pf-feedback pf-feedback--wrong">Not that. Try again, or ask for a hint.</p>}
          {s.cur.hint && !s.cur.shown && !lined && <p className="pf-hint">{firstLetters(answer)}</p>}
          {s.cur.shown && !lined && <p className="pf-shown pf-lines">“{answer}”</p>}
          <div className="pf-actions">
            <BackButton canBack={canBack} dispatch={dispatch} />
            <button ref={go} type="button" className="pf-btn pf-btn--go" onClick={() => dispatch({ type: s.cur.shown ? 'next' : 'reveal' })}>
              {s.cur.shown ? 'Next' : (s.cur.total || linesOf(step, s.fly)) > 1 ? 'Reveal next' : 'Reveal'} <Key k="→" />
            </button>
            {!s.cur.shown && (s.cur.total || linesOf(step, s.fly)) > 1 && (
              <button type="button" className="pf-btn" onClick={() => dispatch({ type: 'revealAll' })}>Reveal all</button>
            )}
          </div>
          {/* A checklist's source names it, so it waits until the answer is out. */}
          {step.ref && (step.kind !== 'checklist' || s.cur.shown) && <p className="pf-source">Source: {refText(step.ref)}</p>}
        </>
      )}
    </div>
  );
}

// The record of the flight, a fold per stage in the order flown.
// For testers: the flight as text, copied and put in the feedback form at the bottom.
function CopyFlight({ s }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="pf-btn pf-btn--small pf-log-copy"
      title="Copy this flight as text and put it in the feedback form at the bottom of the page"
      onClick={(e) => {
        // In the log's summary line: copying must not open or close the log.
        e.preventDefault();
        e.stopPropagation();
        const text = flightText(s, { url: window.location.href });
        try { navigator.clipboard.writeText(text).catch(() => {}); } catch (err) { /* the form still gets it */ }
        window.dispatchEvent(new CustomEvent('psm-feedback', { detail: { category: 'Bug', text: `What went wrong:\n\n\n${text}` } }));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? 'Copied' : 'Copy flight path'}
    </button>
  );
}

function FlightLog({ log, s }) {
  const end = useRef(null);
  const [open, setOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(min-width: 761px)').matches);
  useEffect(() => { if (open && end.current) end.current.scrollIntoView({ block: 'nearest' }); }, [log.length, open]);

  const groups = [];
  log.forEach((l, i) => {
    const last = groups[groups.length - 1];
    if (last && last.phase === l.phase) last.entries.push({ ...l, i });
    else groups.push({ phase: l.phase, entries: [{ ...l, i }] });
  });
  const said = log.filter((l) => RESULT[l.result]);

  return (
    <details className="pf-log" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Flight log <span className="pf-log-count">{said.length} steps</span><CopyFlight s={s} /></summary>
      <div className="pf-log-body">
        {/* One fold per stage flown: the stage you're in is open, and each one closes when the
            flight moves on (it can be opened again). */}
        {groups.map((g, gi) => {
          const said = g.entries.filter((l) => RESULT[l.result]).length;
          return (
            <details key={gi} className="pf-log-phase" open={gi === groups.length - 1}>
              <summary>
                {g.phase}
                {said > 0 && <span className="pf-log-count">{said} {said === 1 ? 'step' : 'steps'}</span>}
              </summary>
              <ol>
                {g.entries.map((l) => (
                  <li key={l.i} className={`pf-log-entry pf-log-entry--${l.result}`} title={RESULT[l.result] || undefined}>
                    <span className="pf-who">{l.radio || whoOf(l.who)}</span>
                    <span className="pf-said pf-lines">
                      {l.kind === 'response' && !l.ep && l.challenge ? `${l.challenge}: ` : ''}{l.text}
                    </span>
                    {RESULT[l.result] && <span className="pf-mark">{MARK[l.result]}</span>}
                  </li>
                ))}
              </ol>
            </details>
          );
        })}
        <div ref={end} />
      </div>
    </details>
  );
}

function PracticeFlight() {
  const [h, dispatch] = useReducer(withHistory, undefined, () => {
    const squadron = squadronFromStorage();
    return begin(start(null, squadron ? { card: { squadron } } : {}));
  });
  const s = h.now;

  // Right arrow: reveal, then on; left arrow: back a step. Not while typing in a box.
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'back' }); }
      if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'forward' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const step = current(s);
  // On the map a field's arrivals are drawn one by one; clicking any picks the field.
  const onChoose = useCallback((id) => {
    const field = options(h.now).find((o) => o.legs && o.legs.includes(id));
    dispatch({ type: 'choose', id: field ? field.id : id });
  }, [h.now]);

  // The legs' radio calls, from the course rules document. Until it arrives (or if it can't be
  // read) the flight uses the study guide's calls.
  useEffect(() => {
    fetchCourseRules().then((r) => r && r.doc && dispatch({ type: 'legs', legs: r.doc.legs || {}, fields: r.doc.airfields || {} }), () => {});
  }, []);

  // Only the choices that are legs go on the map; worked out once per step so the map does not
  // refit while typing.
  const mapOptions = useMemo(
    () => (s.ep || !s.airborne || !step || !['choose'].includes(step.kind) ? [] : options(s).flatMap((o) => o.legs || [o.id]).filter((id) => id.includes('-') && !id.startsWith('to:'))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, s.ep, s.airborne],
  );

  return (
    <div className="pf-page">
      <Notice />
      <StatusBar s={s} back={backable(h)} dispatch={dispatch} />
      <div className="pf-body">
        <div className="pf-main">
          <StepCard s={s} canBack={h.past.length > 0} dispatch={dispatch} />
          {/* The flight goes on the map once it is flying: until then, only home. */}
          <PracticeMap
            route={s.airborne ? s.route : [s.route[0]]}
            node={s.airborne ? s.node : s.route[0]}
            options={mapOptions}
            onChoose={onChoose}
          />
        </div>
        <FlightLog log={s.log} s={s} />
      </div>
    </div>
  );
}

// Shown once per browser: the page is new and needs the community to test it.
const NOTICE_KEY = 'practiceFlightNotice';
function Notice() {
  const [open, setOpen] = useState(() => {
    try { return !window.localStorage.getItem(NOTICE_KEY); } catch (e) { return false; }
  });
  if (!open) return null;
  const close = () => {
    try { window.localStorage.setItem(NOTICE_KEY, '1'); } catch (e) { /* shown again next time */ }
    setOpen(false);
  };
  return (
    <div className="game-modal-overlay" onClick={close}>
      <div className="game-modal pf-notice" role="dialog" aria-labelledby="pf-notice-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="game-modal-close" onClick={close} aria-label="Close">×</button>
        <h3 id="pf-notice-title" className="pf-notice-title">Practice Flight is new and in testing</h3>
        <p>It attempts to simulate all of a FAM flight&apos;s course rules, comms, checklists and general maneuver flow.</p>
        <p>There are too many possible flights for me to test them all, so it needs your help. If something is wrong, press <strong>Copy flight path</strong> and send it in the feedback form at the bottom of the page, along with a description of what&apos;s wrong.</p>
        <div className="pf-actions">
          <button type="button" className="pf-btn pf-btn--go" onClick={close} autoFocus>Continue</button>
        </div>
      </div>
    </div>
  );
}

// A fault in drawing the page shows what went wrong and a way on, not a blank page.
class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, run: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Practice Flight', error, info && info.componentStack);
  }

  render() {
    const { error, run } = this.state;
    if (!error) return <React.Fragment key={run}>{this.props.children}</React.Fragment>;
    return (
      <div className="pf-page">
        <div className="pf-card">
          <p className="pf-feedback pf-feedback--wrong">Something went wrong drawing this step.</p>
          <p className="pf-when">{String(error && error.message ? error.message : error)}</p>
          <div className="pf-actions">
            <button type="button" className="pf-btn pf-btn--go" onClick={() => this.setState({ error: null, run: run + 1 })}>Restart</button>
          </div>
        </div>
      </div>
    );
  }
}

export default function PracticeFlightPage() {
  return <Boundary><PracticeFlight /></Boundary>;
}
