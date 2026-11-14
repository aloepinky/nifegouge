// /primary/practice/forms — the formation flight, for trying out before it joins the Practice
// Flight tab. Two students sit side by side on the same code, one as Lead and one as Wing, and
// click through together: the flight is the same on both screens, click for click (flight.js).
// "Both" shows the two cockpits next to each other, driven by one set of buttons. There is no
// Reveal all: every line is one click for each student, or the two would fall out of step.

import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { beatOf, begin, buildFlight, decodeCode, isDone, isShown, phasesOf, position, randomCode, readout, reduce, view } from './flight';
import { PROFILES } from './profiles';

const FIG = String.fromCharCode(0x2007);
const blank = (n) => <span className="pf-rule-blank">{FIG.repeat(Math.max(3, Math.min(28, n)))}</span>;
const refText = (ref) => (ref ? [ref.work, ref.loc, ref.pages].filter(Boolean).join(', ') : '');

const SEATS = { lead: '11', wing: '12' };

function readUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    const code = q.get('code');
    return { code: code && decodeCode(code) ? code.toUpperCase() : null, seat: ['lead', 'wing', 'both'].includes(q.get('seat')) ? q.get('seat') : 'lead' };
  } catch (e) {
    return { code: null, seat: 'lead' };
  }
}

function writeUrl(code, seat) {
  try {
    const q = new URLSearchParams(window.location.search);
    q.set('code', code);
    q.set('seat', seat);
    window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
  } catch (e) { /* the page works without it */ }
}

function pageReducer(s, action) {
  if (action.type === 'load') return begin(buildFlight(action.code));
  return reduce(s, action);
}

// A course rule's words with its marked figures blanked until it is out.
function Words({ text, filled }) {
  return String(text).split(/\[\[([^[\]]+)\]\]/).map((part, j) => (j % 2
    ? <span key={j} className={filled ? 'pf-rule-word' : 'pf-rule-blank'}>{filled ? part : FIG.repeat(Math.max(3, part.length))}</span>
    : part));
}

function Rows({ rows, role }) {
  const leadIs = rows[0].leadIs;
  const youLead = leadIs === role;
  const other = leadIs === '11' ? '12' : '11';
  const cell = (l, which) => {
    const v = l[which];
    if (v === null || v === undefined) return <span className="pff-none">—</span>;
    return l.shown ? v : blank(String(v).length);
  };
  return (
    <table className="pf-numbers pff-rows">
      <thead>
        <tr>
          <th scope="col" aria-label="Item" />
          <th scope="col" className={youLead ? 'pff-mine' : undefined}>Lead ({leadIs}){youLead ? ', you' : ''}</th>
          <th scope="col" className={!youLead ? 'pff-mine' : undefined}>Wing ({other}){!youLead ? ', you' : ''}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((l, i) => (
          <tr key={i} className={l.next ? 'pf-numbers-next' : undefined}>
            <th scope="row">{l.text}</th>
            {l.lead === l.wing ? (
              <td colSpan={2}>{cell(l, 'lead')}</td>
            ) : (
              <>
                <td className={youLead ? 'pff-mine' : undefined}>{cell(l, 'lead')}</td>
                <td className={!youLead ? 'pff-mine' : undefined}>{cell(l, 'wing')}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Line({ l }) {
  const cls = ['pff-line', l.mine && l.counts ? 'pff-line--mine' : '', l.next ? 'pff-line--next' : '', l.counts ? '' : 'pff-line--heard'].filter(Boolean).join(' ');
  let body;
  if (l.kind === 'signal') {
    body = l.shown ? (
      <>
        <span className="pff-signal">{l.text}</span>
        {l.how && <span className="pff-how">{l.how}</span>}
        {l.ics && l.mine && <span className="pff-ics">ICS: “{l.ics}”</span>}
      </>
    ) : <>{l.mine ? 'Your signal?' : 'Signal?'} {blank(l.text.length)}</>;
  } else if (l.kind === 'switch') {
    body = l.shown ? <><strong>{l.radio}</strong> → {l.to}{l.station ? <span className="pff-station"> · {l.station}</span> : null}</>
      : <>Switch <strong>{l.radio}</strong> to {blank(8)}</>;
  } else if (l.kind === 'checklist') {
    body = l.shown ? <strong>{l.text}</strong> : <>Which checklist? {blank(l.text.length)}</>;
  } else if (l.kind === 'rule') {
    body = <Words text={l.text} filled={l.shown} />;
  } else if (l.kind === 'note') {
    body = l.shown ? <em>{l.text}</em> : null;
  } else {
    body = l.shown ? `“${l.text}”` : blank(l.text.length);
  }
  if (!l.shown && !l.counts) return null;
  return (
    <div className={cls} title={refText(l.ref)}>
      <span className="pf-who">{l.kind === 'rule' ? 'Course rules' : l.who}</span>
      <span className="pf-said">
        {body}
        {l.shown && l.note && <span className="pff-note">{l.note}</span>}
        {l.shown && l.generated && <span className="pff-note">Generated comms</span>}
      </span>
    </div>
  );
}

// One beat as one cockpit sees it.
function Beat({ s, role }) {
  const v = view(s, role);
  if (!v) return null;
  const blocks = [];
  v.lines.forEach((l) => {
    const last = blocks[blocks.length - 1];
    if (l.kind === 'row') {
      if (last && last.rows) last.rows.push(l);
      else blocks.push({ rows: [l] });
    } else blocks.push({ line: l });
  });
  const lastShown = [...v.lines].reverse().find((l) => l.shown && l.ref);
  return (
    <div className="pf-card">
      <h2 className="pf-card-title">{v.title}</h2>
      {v.note && <p className="pf-when">{v.note}</p>}
      <div className="pff-lines">
        {blocks.map((b, i) => (b.rows ? <Rows key={i} rows={b.rows} role={role} /> : <Line key={i} l={b.line} />))}
      </div>
      {lastShown && <p className="pf-source">Source: {refText(lastShown.ref)}</p>}
    </div>
  );
}

function Readout({ s, role }) {
  const r = readout(s, role);
  const cells = [
    ['PRI (UHF)', r.pri ? r.pri.v : '—', r.pri && r.pri.station],
    ['AUX (VHF)', r.aux ? r.aux.v : '—', r.aux && r.aux.station],
    ['Lead', r.youLead ? 'You' : `Aircraft ${r.lead}`, `you are ${role}`],
  ];
  return (
    <dl className="pf-readout" aria-label="Radios and position">
      {cells.map(([label, value, from]) => (
        <div key={label} className="pf-readout-cell">
          <dt>{label}</dt>
          <dd>
            <span className="pf-readout-value">{value}</span>
            {from && <span className="pf-readout-from">{from}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Brief({ flight, seat, onStart }) {
  const c = flight.card;
  const rows = [
    ['Profile', `${c.profileLabel} (${c.event})`],
    ['ATC call sign', `${c.atc}, flight of two`],
    ['Tactical call sign', `${c.tac}: 11 is the Designated Flight Lead's aircraft, 12 the other`],
    ['Squawk', `${c.squawk}: Lead active, Wing standby`],
    ['Side numbers', `11: ${c.side11}, 12: ${c.side12}`],
    ['Runway', `${c.rwy} (${c.north ? 'North' : 'South'} Flow), ${c.breakDir} traffic`],
    ['Working area', `Central, ${c.alt.toLocaleString('en-US')}'`],
    ['Fuel plan', `900 entering Central, then ${c.fuelPlan.join('/')}`],
    ['First lead', `11 leads, 12 joins on the ${c.wingSide.toLowerCase()}`],
    ...(PROFILES[c.profile].low ? [['Low work', `Practice PEL at McCampbell-Porter, simulated ${c.ep}`]] : []),
  ];
  return (
    <div className="pf-card">
      <h2 className="pf-card-title">Brief: {flight.code}</h2>
      <p className="pf-when">
        Both students use this code. {seat === 'both' ? 'Both cockpits are shown.' : `You fly ${seat === 'lead' ? 'aircraft 11 (Lead first)' : 'aircraft 12 (Wing first)'}.`} The
        aircraft swap the lead at each lead change. Every line either aircraft says or does is one click for both of you, so you stay together.
      </p>
      <table className="pf-numbers">
        <tbody>
          {rows.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
        </tbody>
      </table>
      <div className="pf-actions">
        <button type="button" className="pf-btn pf-btn--go" autoFocus onClick={onStart}>Start <kbd className="pf-kbd" aria-hidden="true">→</kbd></button>
      </div>
    </div>
  );
}

function Setup({ flight, seat, onCode, onSeat }) {
  const [typed, setTyped] = useState('');
  const bad = typed && !decodeCode(typed);
  return (
    <div className="pf-card pff-setup">
      <div className="pff-setup-row">
        <span className="pf-status-label">New flight</span>
        {Object.values(PROFILES).map((p) => (
          <button key={p.key} type="button" className={flight.profile.key === p.key ? 'pf-choice pff-on' : 'pf-choice'} onClick={() => onCode(randomCode(p.key))}>{p.label}</button>
        ))}
      </div>
      <form className="pff-setup-row" onSubmit={(e) => { e.preventDefault(); if (decodeCode(typed)) { onCode(typed.toUpperCase()); setTyped(''); } }}>
        <label className="pf-status-label" htmlFor="pff-code">Partner's code</label>
        <input id="pff-code" className="pf-input pff-code" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="e.g. H7K2Q" autoComplete="off" spellCheck={false} />
        <button type="submit" className="pf-btn" disabled={!decodeCode(typed)}>Fly it</button>
        {bad && <span className="pf-feedback pf-feedback--wrong">Not a code</span>}
      </form>
      <div className="pff-setup-row" role="radiogroup" aria-label="Seat">
        <span className="pf-status-label">Seat</span>
        {[['lead', 'Lead (11)'], ['wing', 'Wing (12)'], ['both', 'Both']].map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={seat === k} className={seat === k ? 'pf-choice pff-on' : 'pf-choice'} onClick={() => onSeat(k)}>{label}</button>
        ))}
      </div>
    </div>
  );
}

export default function FormsPreview() {
  const first = useMemo(readUrl, []);
  const [seat, setSeat] = useState(first.seat);
  const [s, dispatch] = useReducer(pageReducer, undefined, () => begin(buildFlight(first.code || randomCode('F'))));

  useEffect(() => { writeUrl(s.flight.code, seat); }, [s.flight.code, seat]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'back' }); }
      if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'forward' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const b = beatOf(s);
  const pos = position(s);
  const roles = seat === 'both' ? ['11', '12'] : [SEATS[seat]];
  const phases = phasesOf(s.flight);

  return (
    <div className="pf-page">
      <div className="pf-status">
        <ol className="pf-phases" aria-label="Phases of the flight">
          {phases.map((p) => (
            <li key={p} aria-current={b && b.phase === p ? 'step' : undefined}>
              <button type="button" className={b && b.phase === p ? 'pf-phase pf-phase--now' : 'pf-phase'} onClick={() => dispatch({ type: 'skipTo', phase: p })} title={`Go to ${p}`}>{p}</button>
            </li>
          ))}
        </ol>
        <div className="pf-status-row">
          <div className="pf-status-text">
            <div>
              <span className="pf-status-label">Code</span> <strong className="pff-codeshow">{s.flight.code}</strong>
              <span className="pf-status-where"> · {s.flight.profile.label}</span>
            </div>
            <div>
              <span className="pf-status-label">Step</span>
              {s.at < 0 ? ' Brief' : isDone(s) ? ' Done' : ` Beat ${pos.beat} of ${pos.of}, line ${pos.line} of ${pos.lines}`}
              <span className="pf-status-where"> · check your partner's screen says the same</span>
            </div>
          </div>
          <div className="pf-status-buttons">
            <button type="button" className="pf-btn" onClick={() => dispatch({ type: 'restart' })}>Restart</button>
          </div>
        </div>
      </div>

      <Setup flight={s.flight} seat={seat} onCode={(code) => dispatch({ type: 'load', code })} onSeat={setSeat} />

      {s.at < 0 && <Brief flight={s.flight} seat={seat} onStart={() => dispatch({ type: 'next' })} />}

      {isDone(s) && (
        <div className="pf-card">
          <h2 className="pf-card-title">Flight complete</h2>
          <p className="pf-done">{s.flight.beats.length} beats flown.</p>
          <button type="button" className="pf-btn pf-btn--go" onClick={() => dispatch({ type: 'restart' })}>Fly it again</button>
        </div>
      )}

      {b && (
        <>
          <div className={roles.length > 1 ? 'pff-both' : undefined}>
            {roles.map((role) => (
              <div key={role} className="pff-cockpit">
                {roles.length > 1 && <div className="pff-cockpit-title">Aircraft {role} ({role === '11' ? 'Lead' : 'Wing'} first)</div>}
                <Readout s={s} role={role} />
                <Beat s={s} role={role} />
              </div>
            ))}
          </div>
          <div className="pf-actions pff-actions">
            <button type="button" className="pf-btn" onClick={() => dispatch({ type: 'back' })}><kbd className="pf-kbd" aria-hidden="true">←</kbd> Back</button>
            <button type="button" className="pf-btn pf-btn--go" onClick={() => dispatch({ type: 'forward' })}>
              {isShown(s) ? 'Next' : pos.lines - pos.line > 1 ? 'Reveal next' : 'Reveal'} <kbd className="pf-kbd" aria-hidden="true">→</kbd>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
