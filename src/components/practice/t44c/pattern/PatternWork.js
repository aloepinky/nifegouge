// /t44c/pattern — a T-44C flying the VFR landing pattern round a 5,000 ft runway in real time,
// with the crew's calls and the FTI's procedures popping up as they happen. The model is
// patternModel.js; this is its page: the pattern type, the flight's numbers in one line, the
// PF, PM and radio boxes, and the pattern drawn from above.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ABEAM, CALL_SIGN, DEFAULT_RUNWAY, FIELDS, GEOMETRY, RUNWAY, RUNWAYS, RUNWAY_LIMITS, SCENARIOS, buildBreak, buildPass, drawCase, feet, geometryOf, siteOf, singleEngine, waveoffOf } from './patternModel';

const SPEEDS = [1, 2, 4];
const { GROOVE_X, R } = GEOMETRY;

// ---- The T-44C from above, in feet, nose to the right, after the Navy trainer's paint (the
// user's pictures, 2026-11-19, the last a satellite photo from straight above): white, the
// orange of each outer wing beginning at the trailing edge behind the nacelle and slanting out
// to the leading edge near the tip, the star on the left wing, black de-ice boots on the
// leading edges, orange nose and stabilizer, long nacelles reaching well behind the wing.
// Straight, tapered wings with square tips.
const f1 = (n) => n.toFixed(2);
const mirror = (pts) => [...pts, ...pts.slice().reverse().map(([x, y]) => [x, -y])];
const poly = (pts) => `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z`;
const SPAN = 25.1;
const ROOT = 2.6;
const xLE = (y) => 3.2 - (1.6 * (y - ROOT)) / (SPAN - ROOT);
const xTE = (y) => -4.6 + (2.6 * (y - ROOT)) / (SPAN - ROOT);
// Inboard of the nacelle the leading edge sweeps forward to meet the fuselage beside the
// cockpit (the photo from above).
const STRAKE = [6.4, 9.6]; // its x at the root, and the y where it meets the straight edge
const wingSide = (k) => [[STRAKE[0], k * ROOT], [xLE(STRAKE[1]), k * STRAKE[1]], [xLE(SPAN), k * SPAN], [xTE(SPAN), k * SPAN], [xTE(ROOT), k * ROOT]];
const WING = `${poly(wingSide(1))}${poly(wingSide(-1))}`;
const tip = (k) => poly([[xLE(21.5), k * 21.5], [xLE(SPAN), k * SPAN], [xTE(SPAN), k * SPAN], [xTE(10.6), k * 10.6]]);
const TIPS = `${tip(1)}${tip(-1)}`;
const boot = (a, b) => [1, -1].map((k) => `M${f1(xLE(a))} ${f1(k * a)}L${f1(xLE(b))} ${f1(k * b)}`).join('');
const BOOTS = boot(10, SPAN - 0.1);
// A tapered nose, widening to the cabin at the windshield.
// A long pointed nose, the cabin widest over the wing, and a long taper to the tail.
const FUSELAGE = 'M17.8 0C17.8-0.55 17.3-1.25 16.2-1.75C14.8-2.3 13-2.6 10.5-2.75L2-2.85C-3-2.8-8-2.4-12-1.6C-15-1.05-17-0.7-18.6-0.45L-18.6 0.45C-17 0.7-15 1.05-12 1.6C-8 2.4-3 2.8 2 2.85L10.5 2.75C13 2.6 14.8 2.3 16.2 1.75C17.3 1.25 17.8 0.55 17.8 0Z';
// The orange tip of the nose, and behind it the black anti-glare panel to the windshield.
const NOSE = 'M17.8 0C17.8-0.55 17.3-1.25 16.2-1.75L15.9-1.85Q15.5 0 15.9 1.85L16.2 1.75C17.3 1.25 17.8 0.55 17.8 0Z';
const ANTIGLARE = 'M15.7 0Q15.6-1.1 14.9-1.65L12.9-2.05Q12.6 0 12.9 2.05L14.9 1.65Q15.6 1.1 15.7 0Z';
// A black panel on top of each nacelle, ahead of the wing.
const nacellePanel = (y) => `M9.6 ${y}Q9.5 ${y - 0.85} 8.6 ${y - 0.95}L4.6 ${y - 0.95}Q4.1 ${y} 4.6 ${y + 0.95}L8.6 ${y + 0.95}Q9.5 ${y + 0.85} 9.6 ${y}Z`;
const TAILCONE = 'M-12.5-1.95C-15-1.3-16.8-0.9-18.6-0.5L-18.6 0.5C-16.8 0.9-15 1.3-12.5 1.95Z';
// Two panes wrapping the cockpit, narrower than the fuselage, split down the middle.
const WINDSHIELD = 'M12.5 0Q12.4-1.2 11.7-2.05L10.3-2.3Q10.75-1.2 10.8 0Q10.75 1.2 10.3 2.3L11.7 2.05Q12.4 1.2 12.5 0Z';
const WINDSHIELD_POST = 'M12.5 0L10.8 0';
// The side windows, seen just over the curve of the fuselage: the cockpit's, three round
// cabin windows, and one aft.
const sideWindows = () => [1, -1].map((k) => {
  const y = k * 2.42;
  const pane = (x, w) => `M${f1(x + w / 2)} ${f1(y)}a${f1(w / 2)} 0.2 0 1 0 ${f1(-w)} 0a${f1(w / 2)} 0.2 0 1 0 ${f1(w)} 0Z`;
  return pane(9.4, 1.4) + pane(6.4, 0.75) + pane(5.0, 0.75) + pane(3.6, 0.75) + pane(-2.6, 0.7);
}).join('');
const SIDE_WINDOWS = sideWindows();
const STAB = poly(mirror([[-13.6, 0.7], [-15.6, 8.6], [-17.8, 8.6], [-18.1, 0.7]]));
const STAB_BOOTS = [1, -1].map((k) => `M${f1(-13.7)} ${f1(k * 1.1)}L${f1(-15.5)} ${f1(k * 8.4)}`).join('');
const FIN = 'M-10.8 0L-13.2-0.5L-18.9-0.32L-18.9 0.32L-13.2 0.5Z';
const nacelle = (y) => `M11 ${y}C11 ${y - 1.2} 10.2 ${y - 1.7} 9 ${y - 1.7}L-2 ${y - 1.7}C-6 ${y - 1.5}-8.5 ${y - 0.9}-10 ${y - 0.4}L-10 ${y + 0.4}C-8.5 ${y + 0.9}-6 ${y + 1.5}-2 ${y + 1.7}L9 ${y + 1.7}C10.2 ${y + 1.7} 11 ${y + 1.2} 11 ${y}Z`;
// The orange flash along each nacelle's outboard side.
const flash = (y, k) => `M8.5 ${f1(y + k * 1.7)}L-3 ${f1(y + k * 1.7)}L-3 ${f1(y + k * 1.15)}L8.5 ${f1(y + k * 1.25)}Z`;
const SILHOUETTE = `${WING} ${STAB} ${FUSELAGE} ${nacelle(-8.2)} ${nacelle(8.2)}`;

// A prop turning (a blur), or stopped where an engine is out.
function Prop({ y, stopped }) {
  return (
    <>
      {stopped
        ? <line className="ptw-ac-blade" x1={11.3} y1={y - 3.9} x2={11.3} y2={y + 3.9} />
        : <ellipse className="ptw-ac-disc" cx={11.3} cy={y} rx={0.5} ry={3.9} />}
      <ellipse className="ptw-ac-spinner" cx={11.2} cy={y} rx={0.7} ry={0.6} />
    </>
  );
}

// The national star and bars, on the top of the left wing near its tip.
const STAR = (() => {
  const pts = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 ? 0.42 : 1.05;
    const a = (i * Math.PI) / 5; // point 0 toward the nose
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return poly(pts);
})();

function Insignia({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="ptw-ac-insignia-bar" x={-0.42} y={-2.3} width={0.84} height={4.6} />
      <rect className="ptw-ac-insignia-red" x={-0.12} y={-2.3} width={0.24} height={4.6} />
      <circle className="ptw-ac-insignia-blue" r={1.15} />
      <path className="ptw-ac-insignia-star" d={STAR} />
    </g>
  );
}

function T44C({ aob, dead }) {
  // Seen from above, a banked wing is foreshortened.
  const k = Math.cos((aob * Math.PI) / 180);
  return (
    <g transform={`scale(1 ${k.toFixed(3)})`}>
      <path className="ptw-ac-white" d={WING} />
      <path className="ptw-ac-orange" d={TIPS} />
      <path className="ptw-ac-boot" d={BOOTS} />
      <Insignia x={-0.2} y={-20.5} />
      <path className="ptw-ac-orange" d={STAB} />
      <path className="ptw-ac-boot" d={STAB_BOOTS} />
      <path className="ptw-ac-white" d={nacelle(-8.2)} />
      <path className="ptw-ac-white" d={nacelle(8.2)} />
      <path className="ptw-ac-orange ptw-ac-flat" d={`${flash(-8.2, -1)}${flash(8.2, 1)}`} />
      <path className="ptw-ac-white" d={FUSELAGE} />
      <path className="ptw-ac-orange" d={NOSE} />
      <path className="ptw-ac-black" d={ANTIGLARE} />
      <path className="ptw-ac-black" d={`${nacellePanel(-8.2)}${nacellePanel(8.2)}`} />
      <path className="ptw-ac-orange" d={TAILCONE} />
      <path className="ptw-ac-orange" d={FIN} />
      <path className="ptw-ac-glass" d={WINDSHIELD} />
      <path className="ptw-ac-post" d={WINDSHIELD_POST} />
      <path className="ptw-ac-glass" d={SIDE_WINDOWS} />
      {/* The left engine is -y here: up the page when heading right. */}
      <Prop y={-8.2} stopped={dead === 'left'} />
      <Prop y={8.2} stopped={dead === 'right'} />
    </g>
  );
}

// ---- The pattern from above. Feet, landing direction to the right, the pattern above for
// left traffic and below for right: a right-hand pattern is the left-hand one in a mirror, so
// its lines and circles are mirrored, and its words placed where the mirror puts them but read
// the right way round.
const PAD = 800;
const LEFT = GROOVE_X - R - PAD - 1300; // room for a name left of the approach turn
const MARK_TEXT = 200; // about the height of a circle's name, and of a note's line
// `reach` and `back`: how far the pass goes past the departure end and short of the
// threshold; `ext`, how far its 180 was delayed, which the approach notes follow.
function frameOf(runway, { reach = 0, reachBack = 0, dwExt = 0 } = {}) {
  const left = Math.min(LEFT, reachBack - PAD - 1300);
  const k = runway.side === 'left' ? 1 : -1;
  const turnAt = geometryOf(runway.length).TURN_X;
  // Case 2's wings-level pause, and Case 1's turn held for the prop, carry the crosswind out.
  const w = Math.max(turnAt + R, reach) + 1500 - left;
  const h = ABEAM + 2 * PAD + 200;
  return {
    k, length: runway.length, side: runway.side, ext: dwExt, pa: runway.pa, ba: runway.ba, tower: runway.tower,
    view: { x: left, y: k === 1 ? -(ABEAM + PAD) : -(PAD + 200), w, h },
    Y: (y) => -k * y, // a point's y on the page
    dy: (d) => (k === 1 ? d : MARK_TEXT - d), // a name's offset from its circle
  };
}
const AC_SCALE = 26;
const LABEL_AT = {
  touchdown: [0, 380, 'middle'],
  rotate: [130, 380, 'start'],
  p300: [0, 380, 'middle'],
  crosswind: [300, 0, 'start'],
  downwind: [0, -300, 'middle'],
  the180: [0, -300, 'middle'],
  the90: [260, 90, 'start'],
  groove: [-150, -300, 'end'],
  threshold: [0, -300, 'middle'],
  fail: [0, -300, 'middle'],
  fullstop: [-150, -300, 'end'],
  waveoff: [0, 380, 'middle'],
  entry: [0, 380, 'middle'],
};

// Where a mark's name goes. An engine failure falls anywhere, so its name goes to the open
// side: above the runway, inside the downwind, outside the approach turn,
// else to the right.
function labelAt(m) {
  if (m.key !== 'fail') return LABEL_AT[m.key] || [0, -300, 'middle'];
  if (m.y < 100) return [0, -300, 'middle'];
  if (m.y > ABEAM - 100) return [250, 420, 'start']; // inside the turn, clear of Downwind and its note
  if (m.x < 0) return [-200, 90, 'end'];
  return [200, 90, 'start'];
}

// The notes from the user's pattern sketch, where the sketch puts them (its bank angles left
// off while they are in dispute).
const NOTE_LINE = 300;
const NOTES = [
  { x: 4300, fromEnd: true, y: 2300, anchor: 'start', lines: ['Upwind and crosswind', '300 ft: props 1900', '400 ft: “Clear {side}, going {side}”', '500 ft: turn', { text: '600 ft: “Speed check, flaps approach,', noflap: '600 ft: “Landing Checklist”' }, { text: '     Landing Checklist”', noflap: 'Flaps stay up' }] },
  { x: 4000, y: 5500, anchor: 'middle', lines: ['Downwind: happy time', 'Landing Checklist, spacing, trim'] },
  { x: 300, y: 6380, anchor: 'middle', moves: true, lines: ['3 BIG potatoes'] },
  { x: -1100, y: 5450, anchor: 'start', moves: true, lines: ['The 180', 'Power, pitch, trim, turn, talk', '4 sec up trim, stare at the PFD', { text: '~250 ft-lbs', torque: true }] },
  { x: -2300, y: 2600, anchor: 'start', moves: true, lines: ['The 90, 500 ft', '“Down and locked”', 'Look at the runway now'] },
  { x: -2300, y: 1450, anchor: 'start', moves: true, lines: ['300-200 ft', '“Props full forward…”'] },
  { x: -800, y: -720, anchor: 'middle', lines: ['~2 football fields'] },
];

// The break's notes (ME FTI §106 p. 1-29), shown in place of the pattern's while it is flown.
const BREAK_NOTES = [
  { x: -5800, y: 1500, anchor: 'start', lines: ['Break entry', '{ba}, 200 KIAS, wings level', { text: '“Numbers for the break”', ctaf: 'CTAF: “Numbers”, then “{side} overhead”' }] },
  { x: 2500, y: 4100, anchor: 'start', lines: ['The break', 'Power idle', { text: 'Below 174 KIAS: flaps approach', noflap: null }, 'Below 155 KIAS: gear down', 'Landing Checklist'] },
  { x: 2000, y: 5500, anchor: 'start', lines: ['Roll out about a mile abeam', 'Slow to 120 KIAS, then descend to {pa}'] },
];

// A line `{ text, torque: true }` is shown only where the torques apply; `noflap` is its
// wording on the no-flap pattern (null: none).
function Notes({ notes, torques, noflap, fr }) {
  return (
    <g className="ptw-notes">
      {notes.map((n) => {
        const lines = n.lines.filter((l) => (torques || !l.torque) && !(noflap && l.noflap === null));
        // The approach turn's notes go with a delayed 180.
        const x = (n.fromEnd ? n.x + fr.length - RUNWAY.length : n.x) - (n.moves ? fr.ext : 0);
        // Mirrored, the block keeps its lines in order, its top where its bottom was.
        const y = fr.k === 1 ? -n.y : n.y - (lines.length - 1) * NOTE_LINE + MARK_TEXT * 0.85;
        return (
          <text key={n.lines[0]} x={x} y={y} textAnchor={n.anchor}>
            {lines.map((l, i) => {
              const text = ((!fr.tower && l.ctaf) || (noflap && l.noflap) || l.text || l)
                .replace(/\{side\}/g, fr.side).replace('{pa}', feet(fr.pa)).replace('{ba}', feet(fr.ba));
              return <tspan key={text} x={x} dy={i ? NOTE_LINE : 0} className={i === 0 ? 'ptw-note-head' : undefined}>{text}</tspan>;
            })}
          </text>
        );
      })}
    </g>
  );
}

// The torque the user sets at those marks: two engines, approach flaps only.
const TORQUE = { crosswind: '1000 ft-lbs', downwind: '600 ft-lbs' };

// Under each mark's name, a line further from the track: the speed to be on there (lit where
// this pattern's differs from the approach-flap pattern's, since the speeds are what must be
// memorized), and the torque.
function Tag({ m, pass, single, x, y, anchor, away }) {
  const sp = pass.speeds[m.key];
  const torque = !single && pass.torques && TORQUE[m.key];
  if (!sp && !torque) return null;
  return (
    <text x={x} y={y + away} textAnchor={anchor} className="ptw-mark-tag">
      {sp && <tspan className={sp.differs ? 'ptw-mark-speed ptw-mark-speed--differs' : 'ptw-mark-speed'}>{sp.kias} KIAS</tspan>}
      {torque && <tspan className="ptw-mark-torque">{sp ? ' · ' : ''}{torque}</tspan>}
      {sp && sp.note && <tspan x={x} dy={away} className="ptw-mark-speed ptw-mark-speed--differs">{sp.note}</tspan>}
    </text>
  );
}

const toPath = (pts, fr) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(0)} ${fr.Y(y).toFixed(0)}`).join(' ');
// The break's line, from `from` feet along it to its end.
const lengths = (track) => track.reduce((acc, p, i) => [...acc, i ? acc[i - 1] + Math.hypot(p[0] - track[i - 1][0], p[1] - track[i - 1][1]) : 0], []);
function lineFrom(track, cum, from) {
  const i = cum.findIndex((d) => d > from);
  if (i < 1) return i === 0 ? track : [];
  const k = (from - cum[i - 1]) / (cum[i] - cum[i - 1]);
  const a = track[i - 1];
  const b = track[i];
  return [[a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], ...track.slice(i)];
}
// Once on the downwind the break's line goes, rubbed out from its start after the aircraft,
// over this many seconds; then the pattern's notes come up.
const ERASE = 6;

// `entry`: the break, when Break is the pattern chosen; `inBreak`, while it is being flown.
function PatternMap({ pass, entry, inBreak, s, onJump, onBreak, single, satellite, fr }) {
  const VIEW = fr.view;
  const { Y } = fr;
  const path = useMemo(() => toPath(pass.track, fr), [pass, fr]);
  const cum = useMemo(() => (entry ? lengths(entry.track) : [0]), [entry]);
  const erased = entry && inBreak ? Math.min(1, Math.max(0, (s.t - entry.rolloutT) / ERASE)) : 1;
  const left = erased < 1 ? lineFrom(entry.track, cum, erased * cum[cum.length - 1]) : [];
  const breakPath = left.length > 1 ? toPath(left, fr) : '';
  // While the break is flown, a pattern circle it passes is reached in it.
  const inEntry = (key) => (inBreak ? entry.marks.find((m) => m.key === key) : null);
  const marks = entry ? [...pass.marks, { ...entry.marks.find((m) => m.key === 'entry'), entry: true }] : pass.marks;
  const rot = -(fr.k * s.psi * 180) / Math.PI;
  const lift = Math.min(1, s.alt / 800);
  const dead = /simulated feather|failed/.test(s.engines) ? pass.engine : null;
  const squash = Math.cos((s.aob * Math.PI) / 180).toFixed(3);
  return (
    <svg className={satellite ? 'ptw-map ptw-map--sat' : 'ptw-map'} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} role="img"
      aria-label={`The pattern from above. ${s.phase}, ${Math.round(s.alt)} feet, ${Math.round(s.kias)} knots`}>
      {/* Over the satellite picture the real runway shows, so none is drawn. */}
      {!satellite && (
        <>
          <rect className="ptw-ground" x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} />
          <rect className="ptw-runway" x={0} y={-RUNWAY.width / 2} width={fr.length} height={RUNWAY.width} />
          <line className="ptw-centerline" x1={300} y1={0} x2={fr.length - 300} y2={0} />
          <text className="ptw-rwy-number" x={150} y={0} transform="rotate(90 150 0)">{pass.field.number}</text>
          <text className="ptw-rwy-number" x={fr.length - 150} y={0} transform={`rotate(-90 ${fr.length - 150} 0)`}>{pass.field.reciprocal}</text>
        </>
      )}
      {/* On the picture a dark band under the dashes keeps them readable. */}
      {satellite && <path className="ptw-track-under" d={path} />}
      <path className="ptw-track" d={path} />
      {breakPath && satellite && <path className="ptw-track-under" d={breakPath} />}
      {breakPath && <path className="ptw-track" d={breakPath} />}
      <g className="ptw-dim">
        {satellite && <line className="ptw-dim-under" x1={1600} y1={Y(RUNWAY.width)} x2={1600} y2={Y(ABEAM - 150)} />}
        <line x1={1600} y1={Y(RUNWAY.width)} x2={1600} y2={Y(ABEAM - 150)} />
        <text x={1760} y={Y(ABEAM / 2)}>1 nm</text>
      </g>
      <Notes notes={erased < 1 ? BREAK_NOTES : NOTES} torques={pass.torques} noflap={pass.id === 'noflap'} fr={fr} />
      {marks.map((m) => {
        const [dx, dy0, anchor] = labelAt(m);
        const dy = fr.dy(dy0);
        const there = m.entry ? null : entry && inEntry(m.key);
        const passed = m.entry ? inBreak && s.t >= m.t : there ? s.t >= there.t : !inBreak && s.t >= m.t;
        // The break entry's circle flies the break again.
        const go = () => (m.entry ? onBreak(0) : there ? onBreak(there.t) : onJump(m.t));
        const name = m.entry ? 'Fly the break' : `Go to ${m.label}`;
        return (
          <g key={`${m.key}-${m.t}`} className={`ptw-mark${passed ? ' ptw-mark--passed' : ''}${m.key === 'fail' ? ' ptw-mark--fail' : ''}`}
            role="button" tabIndex={0} aria-label={name}
            onClick={go}
            onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } }}>
            <title>{name}</title>
            <circle className="ptw-mark-hit" cx={m.x} cy={Y(m.y)} r={320} />
            <circle className="ptw-mark-dot" cx={m.x} cy={Y(m.y)} r={80} />
            <text x={m.x + dx} y={Y(m.y) + dy} textAnchor={anchor}>{m.label}</text>
            <Tag m={m} pass={m.entry ? entry : pass} single={single} x={m.x + dx} y={Y(m.y) + dy} anchor={anchor} away={dy < 0 ? -260 : 260} />
          </g>
        );
      })}
      <g className="ptw-ac-shadow" transform={`translate(${s.x + lift * 220} ${Y(s.y) + lift * 380}) rotate(${rot}) scale(${AC_SCALE})`}>
        <path d={SILHOUETTE} transform={`scale(1 ${squash})`} />
      </g>
      <g transform={`translate(${s.x} ${Y(s.y)}) rotate(${rot}) scale(${AC_SCALE * (1 + lift * 0.18)})`}>
        <T44C aob={s.aob} dead={dead} />
      </g>
    </svg>
  );
}

// ---- Satellite: the USGS National Map's aerial imagery under the drawing (Esri's World
// Imagery had cloud over Navy Corpus), turned so the runway runs left to right
// as it does in the drawing, and scaled so a foot on the picture is a foot of the drawing. The
// map is a still picture: no dragging or zooming, the drawing on top takes the clicks.
const SAT_URL = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';
const SAT_CREDIT = 'Imagery: USGS The National Map';
const placeOf = (runwayId, fr) => {
  const site = siteOf(runwayId);
  const { view } = fr;
  return {
    view,
    center: site.toLatLng(view.x + view.w / 2, -fr.k * (view.y + view.h / 2)),
    turn: -(site.bearingDeg - 90), // the runway's true bearing to the right of the page
    mPerPxZ0: 156543.03392 * Math.cos((site.lat * Math.PI) / 180),
  };
};

function Fit({ width, place }) {
  const map = useMap();
  useEffect(() => {
    if (!width) return;
    map.invalidateSize();
    const metresPerPx = (place.view.w * 0.3048) / width;
    map.setView(place.center, Math.log2(place.mPerPxZ0 / metresPerPx), { animate: false });
  }, [map, width, place]);
  return null;
}

function Satellite({ width, height, runwayId, fr }) {
  const place = useMemo(() => placeOf(runwayId, fr), [runwayId, fr]);
  // A square as wide as the box's diagonal, so the turned picture still fills the corners.
  const side = Math.ceil(Math.hypot(width, height));
  return (
    <div className="ptw-sat" aria-hidden="true">
      <div className="ptw-sat-turn" style={{ width: side, height: side, left: (width - side) / 2, top: (height - side) / 2, transform: `rotate(${place.turn}deg)` }}>
        <MapContainer
          center={place.center} zoom={14} zoomSnap={0} attributionControl={false} zoomControl={false}
          dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} keyboard={false} boxZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Tiles a level finer than the scale needs, at half size: sharper. */}
          <TileLayer url={SAT_URL} maxZoom={16} maxNativeZoom={16} tileSize={128} zoomOffset={1} />
          <Fit width={width} place={place} />
        </MapContainer>
      </div>
    </div>
  );
}

// The drawing, and under it the satellite picture when that view is on.
// On a phone the drawing keeps a readable size and scrolls sideways in its own box, following
// the aircraft while it flies; paused, it can be dragged to look around.
function PatternView({ satellite, setView, following, ...props }) {
  const box = useRef(null);
  const scroller = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { s, fr } = props;
  useEffect(() => {
    const el = scroller.current;
    if (!following || !el || el.scrollWidth <= el.clientWidth + 1) return;
    const px = ((s.x - fr.view.x) / fr.view.w) * el.scrollWidth;
    el.scrollLeft = px - el.clientWidth / 2;
  }, [following, s.x, fr]);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setSize({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <div className="ptw-mapwrap">
        <div className="ptw-mapscroll" ref={scroller}>
          <div className="ptw-mapinner" ref={box}>
            {satellite && size.width > 0 && <Satellite width={size.width} height={size.height} runwayId={props.pass.field.id} fr={fr} />}
            <PatternMap {...props} satellite={satellite} />
          </div>
        </div>
        {/* The map's own switch, in its corner, as on a web map. */}
        <button type="button" className="ptw-view-switch" aria-pressed={satellite}
          onClick={() => setView(satellite ? 'drawing' : 'satellite')}>
          {satellite ? 'Drawing' : 'Satellite'}
        </button>
      </div>
      {satellite && <p className="ptw-sat-credit">{SAT_CREDIT}</p>}
    </>
  );
}

// ---- The flight's numbers, a box each.
function Gauges({ s }) {
  // In scan order: power, attitude, then airspeed and altitude.
  const cells = [
    ['Power', s.power, ''],
    ['AOB', `${Math.round(s.aob)}°`, ''],
    ['Nose', `${s.pitch >= 0.5 ? '+' : ''}${Math.round(s.pitch)}°`, ''],
    ['Airspeed', Math.round(s.kias), 'KIAS'],
    ['Altitude', Math.max(0, Math.round(s.alt / 10) * 10), 'ft AGL'],
    ['Heading', String(Math.round(s.hdg) || 360).padStart(3, '0'), ''],
    ['Flaps', s.flaps, ''],
    ['Gear', s.gear, ''],
    ['Prop levers', s.props, ''],
  ];
  return (
    <dl className="ptw-gauges">
      {cells.map(([k, v, unit]) => (
        <div key={k} className="ptw-gauge">
          <dt>{k}</dt>
          <dd><span className="ptw-gauge-value">{v}</span>{unit && <span className="ptw-gauge-unit"> {unit}</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---- The boxes. A line shows for as long as it takes to read, a box only while it has one.
const holdOf = (e) => e.hold || (e.kind === 'say'
  ? Math.min(6, Math.max(2.2, 1.4 + e.text.length * 0.055))
  : Math.min(6, Math.max(3, 2.2 + e.text.length * 0.03)));
const LEAVE = 0.3;

function Box({ lines, now, cls, label, speed }) {
  if (!lines.length) return null;
  return (
    <div className={`ptw-box ${cls}`}>
      <span className="ptw-box-who">{label}</span>
      {lines.map((e) => {
        const leaving = now > e.t + (holdOf(e) - LEAVE) * speed;
        return (
          <p key={`${e.t}-${e.text}`} className={`ptw-box-line${e.kind === 'do' ? ' ptw-box-line--do' : ''}${leaving ? ' ptw-box-line--leaving' : ''}`}>
            {e.from && <span className="ptw-box-from">{e.from}: </span>}
            {e.kind === 'say' ? `“${e.text}”` : e.text}
            {e.note && <span className="ptw-box-note"> {e.note}</span>}
            {e.technique && <span className="ptw-box-tag">Technique</span>}
            {e.generated && <span className="ptw-box-tag">Generated comms</span>}
          </p>
        );
      })}
    </div>
  );
}

// The crew's words and the radio. Tower's box sits over the crew's: no one in the cockpit
// talks while the radio does.
function Comms({ pass, now, speed }) {
  // A line's time on screen is in wall seconds, so it reads as long at 4×.
  // A line that `yields` goes as soon as anyone speaks after it.
  const nextSay = (e) => (pass.events.find((x) => x.kind === 'say' && x.t > e.t) || { t: Infinity }).t;
  const live = pass.events.filter((e) => e.kind === 'say' && now >= e.t && now < e.t + holdOf(e) * speed && !(e.yields && now >= nextSay(e)));
  const last2 = (xs) => xs.slice(-2);
  const radio = last2(live.filter((e) => e.radio).map((e) => ({ ...e, from: e.who === 'Tower' ? pass.field.tower : pass.callSign || CALL_SIGN })));
  const pf = last2(live.filter((e) => !e.radio && e.who === 'PF'));
  const pm = last2(live.filter((e) => !e.radio && e.who === 'PM'));
  return (
    <div className="ptw-comms" aria-live="polite">
      <div className="ptw-comms-pf"><Box lines={pf} now={now} cls="ptw-box--pf" label="PF" speed={speed} /></div>
      <div className="ptw-comms-pm"><Box lines={pm} now={now} cls="ptw-box--pm" label="PM" speed={speed} /></div>
      {radio.length > 0 && <div className="ptw-comms-radio"><Box lines={radio} now={now} cls="ptw-box--radio" label={pass.field.tower ? 'Tower' : 'CTAF'} speed={speed} /></div>}
    </div>
  );
}

// The FTI's procedure being flown, always on: the newest step and the one before it.
const refText = (r) => [r.work, r.loc, r.pages].filter(Boolean).join(', ');
function Procedures({ pass, now }) {
  const done = pass.events.filter((e) => e.kind === 'do' && e.t <= now);
  const shown = done.length ? done.slice(-2) : pass.events.filter((e) => e.kind === 'do').slice(0, 1);
  return (
    <div className="ptw-fti" aria-live="polite">
      <span className="ptw-box-who">FTI procedures</span>
      {shown.map((e, i) => (
        <p key={`${e.t}-${e.text}`} className={i === shown.length - 1 ? 'ptw-fti-line ptw-fti-line--now' : 'ptw-fti-line'}>
          <span className="ptw-fti-who">{e.who}</span>
          <span className="ptw-fti-text">{e.text}</span>
          {e.ref && <span className="ptw-fti-ref">{refText(e.ref)}</span>}
        </p>
      ))}
    </div>
  );
}

const dims = ({ length, width }) => `${length.toLocaleString('en-US')} × ${width} ft`;

// The student calls the wave-off: dimmed but for the groove to the touchdown, every pattern.
const waveoffOpen = (pass, t) => !!pass.waveoffWindow && t >= pass.waveoffWindow[0] && t < pass.waveoffWindow[1];
function WaveoffButton({ pass, t, onWaveoff }) {
  const open = waveoffOpen(pass, t);
  return (
    <button type="button" className="ptw-btn ptw-btn--waveoff" disabled={!open} onClick={() => onWaveoff(t)}
      title={open ? 'Wave off now' : 'Open from the groove to the touchdown'}>
      Wave off
    </button>
  );
}

// ---- The runway picker: a field each, its runways folded under it. Every field opens folded,
// the one flown marked; choosing a runway closes the list.
function RunwayMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [unfolded, setUnfolded] = useState(() => new Set());
  const box = useRef(null);
  const current = RUNWAYS.find((r) => r.id === value);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const toggle = () => {
    if (!open) setUnfolded(new Set());
    setOpen(!open);
  };
  const fold = (id) => setUnfolded((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return (
    <div className="ptw-menu" ref={box}>
      <button type="button" className="ptw-select ptw-menu-button" aria-haspopup="true" aria-expanded={open} aria-labelledby="ptw-runway-label ptw-runway-now" onClick={toggle}>
        <span id="ptw-runway-now">{`${current.label} (${current.side})`}</span>
      </button>
      {open && (
        <div className="ptw-menu-list">
          {FIELDS.map((f) => {
            const shown = unfolded.has(f.id);
            const here = current.field === f.id;
            return (
              <div key={f.id} className="ptw-menu-field">
                <button type="button" className={here ? 'ptw-menu-head ptw-menu-head--here' : 'ptw-menu-head'} aria-expanded={shown} onClick={() => fold(f.id)}>
                  <span className="ptw-menu-caret" aria-hidden="true">{shown ? '▾' : '▸'}</span>
                  {f.name}
                  <span className="ptw-menu-ident">{f.ident}</span>
                </button>
                {shown && RUNWAYS.filter((r) => r.field === f.id).map((r) => (
                  <button key={r.id} type="button" className={r.id === value ? 'ptw-menu-runway ptw-menu-runway--here' : 'ptw-menu-runway'}
                    onClick={() => { onChange(r.id); setOpen(false); }}>
                    {`Runway ${r.number} (${r.side})`}
                    <span className="ptw-menu-ident">{`${r.length.toLocaleString('en-US')} × ${r.width} ft${r.sseFullStop ? '' : ', no SSE full stop'}`}</span>
                  </button>
                ))}
              </div>
            );
          })}
          <p className="ptw-menu-note">
            {`Touch and go: ${dims(RUNWAY_LIMITS.touchAndGo)} or larger.`}<br />
            {`SSE full stop: ${dims(RUNWAY_LIMITS.sseFullStop)} or larger.`}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PatternWork() {
  const [scenario, setScenario] = useState('approach');
  const [engine, setEngine] = useState('left');
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [view, setView] = useState('satellite');
  const [runwayId, setRunwayId] = useState(DEFAULT_RUNWAY);
  const runway = RUNWAYS.find((r) => r.id === runwayId);
  // On a runway too small for an SSE full stop, that pattern goes back to the approach-flap one
  // (IFG p. 57).
  const pickRunway = (id) => {
    setRunwayId(id);
    if (scenario === 'ssefs' && !RUNWAYS.find((r) => r.id === id).sseFullStop) setScenario('approach');
  };
  // Every pattern starts at the touchdown; Break opens on the break, then goes round the
  // approach-flap pattern. On every pattern the break entry's circle flies a break into it. A
  // case's prop and fire questions are answered afresh each pass.
  const [draw, setDraw] = useState(() => drawCase());
  const isBreak = scenario === 'break';
  // After the student's wave-off, the pass it begins, flown to its touchdown; then the chosen
  // pattern again.
  const [wave, setWave] = useState(null);
  const model = useMemo(() => (wave
    ? buildPass(wave.id, engine, runwayId, draw, wave.from)
    : buildPass(isBreak ? 'approach' : scenario, engine, runwayId, draw)), [wave, isBreak, scenario, engine, runwayId, draw]);
  const entry = useMemo(() => buildBreak(isBreak ? 'approach' : scenario, engine, runwayId), [isBreak, scenario, engine, runwayId]);
  const [inBreak, setInBreak] = useState(false);
  const pass = inBreak && entry ? entry : model;
  const fr = useMemo(() => frameOf(runway, model), [runway, model]);
  const live = useRef({ t: 0 });
  live.current.speed = speed;
  live.current.duration = pass.duration;
  live.current.inBreak = inBreak && !!entry;
  live.current.wave = !!wave;

  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const v = live.current;
      v.t += (Math.min(250, now - last) / 1000) * v.speed;
      last = now;
      if (v.t >= v.duration) {
        // Off the break into the pattern, or round the pattern again (from its own start after a
        // wave-off's pass).
        v.t = 0;
        if (v.inBreak) { v.inBreak = false; setInBreak(false); } else {
          if (v.wave) { v.wave = false; setWave(null); }
          setDraw(drawCase());
        }
      }
      setT(v.t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // A circle on the drawing puts the aircraft there; the pass carries on if it was flying.
  const jump = (to) => {
    live.current.inBreak = false;
    setInBreak(false);
    live.current.t = Math.min(to, model.duration - 0.01);
    setT(live.current.t);
  };
  const jumpBreak = (to) => {
    live.current.inBreak = true;
    setInBreak(true);
    live.current.t = Math.min(to, entry.duration - 0.01);
    setT(live.current.t);
  };
  // The wave-off: the pass it begins takes over from where the aircraft is, flying on.
  const waveoff = (at) => {
    setWave(waveoffOf(pass, at));
    live.current.inBreak = false;
    live.current.wave = true;
    setInBreak(false);
    live.current.t = 0;
    setT(0);
  };
  // A new pattern starts from its beginning: the break's, or the touchdown.
  useEffect(() => {
    setWave(null);
    live.current.t = 0;
    live.current.inBreak = scenario === 'break';
    setInBreak(scenario === 'break');
    setT(0);
    setDraw(drawCase());
  }, [scenario, engine, runwayId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== ' ' || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return;
      e.preventDefault();
      setPlaying((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const s = pass.stateAt(t);
  const single = singleEngine(scenario);

  return (
    <div className="ptw-page">
      <div className="ptw-controls">
        <button type="button" className="ptw-btn ptw-btn--go" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
        <WaveoffButton pass={pass} t={t} onWaveoff={waveoff} />
        <div className="ptw-field">
          <span id="ptw-runway-label">Runway</span>
          <RunwayMenu value={runwayId} onChange={pickRunway} />
        </div>
        <label className="ptw-field">
          <span>Pattern</span>
          <select className="ptw-select" value={scenario} onChange={(e) => setScenario(e.target.value)}>
            {SCENARIOS.map((x) => {
              const shut = x.id === 'ssefs' && !runway.sseFullStop;
              return <option key={x.id} value={x.id} disabled={shut} title={shut ? `An SSE full stop needs ${dims(RUNWAY_LIMITS.sseFullStop)}` : undefined}>{x.label}</option>;
            })}
          </select>
        </label>
        {single && (
          <label className="ptw-field">
            <span>Engine</span>
            <select className="ptw-select" value={engine} onChange={(e) => setEngine(e.target.value)}>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
        )}
        <label className="ptw-field">
          <span>Speed</span>
          <select className="ptw-select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {SPEEDS.map((x) => <option key={x} value={x}>{x}×</option>)}
          </select>
        </label>
      </div>
      <Comms pass={pass} now={t} speed={speed} />
      <Procedures pass={pass} now={t} />
      <div className="ptw-card">
        <Gauges s={s} />
        <PatternView pass={model} entry={entry} inBreak={inBreak && !!entry} s={s} onJump={jump} onBreak={jumpBreak} fr={fr} single={singleEngine(model.id)} satellite={view === 'satellite'} setView={setView} following={playing} />
      </div>
      <p className="ptw-foot">
        Runway {runway.number} at {runway.name}, drawn {runway.length.toLocaleString('en-US')} ft, {runway.side} traffic, pattern {feet(runway.pa)} AGL, {runway.tower || 'no tower (CTAF calls)'}, no wind. ME FTI §106 Pattern Work, Figures 1-3, 1-4 and 1-6. AOB and nose attitude are estimated.
      </p>
    </div>
  );
}

// Shared with the Practice Flight's pattern (practice/t44c/PatternFlight.js).
export { Comms, Gauges, PatternView, Procedures, WaveoffButton, frameOf };
