// /t44c/pattern — a T-44C flying the VFR landing pattern round a 5,000 ft runway in real time,
// with the crew's calls and the FTI's procedures popping up as they happen. The model is
// patternModel.js; this is its page: the pattern type, the flight's numbers in one line, the
// PF, PM and radio boxes, and the pattern drawn from above.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ABEAM, CALL_SIGN, FIELDS, GEOMETRY, RUNWAY, SCENARIOS, buildPass, siteOf } from './patternModel';

const SPEEDS = [1, 2, 4];
const { GROOVE_X, R, TURN_X } = GEOMETRY;

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

// ---- The pattern from above. Feet, landing direction to the right, the pattern above.
const PAD = 800;
const LEFT = GROOVE_X - R - PAD - 1300; // room for a name left of the approach turn
// Case 2's wings-level pause carries the crosswind turn out a little further.
const VIEW = { x: LEFT, y: -(ABEAM + PAD), w: TURN_X + R + 1500 - LEFT, h: ABEAM + 2 * PAD + 200 };
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
};

// Where a mark's name goes. An engine failure falls anywhere, so its name goes to the open
// side: above the runway, above and short of the downwind mark, outside the approach turn,
// else to the right.
function labelAt(m) {
  if (m.key !== 'fail') return LABEL_AT[m.key] || [0, -300, 'middle'];
  if (m.y < 100) return [0, -300, 'middle'];
  if (m.y > ABEAM - 100) return [-400, -300, 'end'];
  if (m.x < 0) return [-200, 90, 'end'];
  return [200, 90, 'start'];
}

// The notes from the user's pattern sketch, where the sketch puts them (its bank angles left
// off while they are in dispute).
const NOTE_LINE = 300;
const NOTES = [
  { x: 4300, y: 2300, anchor: 'start', lines: ['Upwind and crosswind', '300 ft: props 1900', '400 ft: “Clear left, going left”', '500 ft: turn', { text: '600 ft: “Speed check, flaps approach,', noflap: '600 ft: “Landing Checklist”' }, { text: '     Landing Checklist”', noflap: 'Flaps stay up' }] },
  { x: 4000, y: 5500, anchor: 'middle', lines: ['Downwind: happy time', 'Landing Checklist, spacing, trim'] },
  { x: 300, y: 6380, anchor: 'middle', lines: ['3 BIG potatoes'] },
  { x: -1100, y: 5450, anchor: 'start', lines: ['The 180', 'Power, pitch, trim, turn, talk', '4 sec up trim, stare at the PFD', { text: '~250 ft-lbs', torque: true }] },
  { x: -2300, y: 2600, anchor: 'start', lines: ['The 90, 500 ft', '“Down and locked”', 'Look at the runway now'] },
  { x: -2300, y: 1450, anchor: 'start', lines: ['300-200 ft', '“Props full forward…”'] },
  { x: -800, y: -720, anchor: 'middle', lines: ['~2 football fields'] },
];

// A line `{ text, torque: true }` is shown only where the torques apply; `noflap` is its
// wording on the no-flap pattern.
function Notes({ torques, noflap }) {
  return (
    <g className="ptw-notes">
      {NOTES.map((n) => (
        <text key={n.lines[0]} x={n.x} y={-n.y} textAnchor={n.anchor}>
          {n.lines.filter((l) => torques || !l.torque).map((l, i) => {
            const text = (noflap && l.noflap) || l.text || l;
            return <tspan key={text} x={n.x} dy={i ? NOTE_LINE : 0} className={i === 0 ? 'ptw-note-head' : undefined}>{text}</tspan>;
          })}
        </text>
      ))}
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

function PatternMap({ pass, s, onJump, single, satellite }) {
  const path = useMemo(() => pass.track.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(0)} ${(-y).toFixed(0)}`).join(' '), [pass]);
  const rot = -(s.psi * 180) / Math.PI;
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
          <rect className="ptw-runway" x={0} y={-RUNWAY.width / 2} width={RUNWAY.length} height={RUNWAY.width} />
          <line className="ptw-centerline" x1={300} y1={0} x2={RUNWAY.length - 300} y2={0} />
          <text className="ptw-rwy-number" x={150} y={0} transform="rotate(90 150 0)">{pass.field.number}</text>
          <text className="ptw-rwy-number" x={RUNWAY.length - 150} y={0} transform={`rotate(-90 ${RUNWAY.length - 150} 0)`}>{pass.field.reciprocal}</text>
        </>
      )}
      {/* On the picture a dark band under the dashes keeps them readable. */}
      {satellite && <path className="ptw-track-under" d={path} />}
      <path className="ptw-track" d={path} />
      <g className="ptw-dim">
        {satellite && <line className="ptw-dim-under" x1={1600} y1={-RUNWAY.width} x2={1600} y2={-ABEAM + 150} />}
        <line x1={1600} y1={-RUNWAY.width} x2={1600} y2={-ABEAM + 150} />
        <text x={1760} y={-ABEAM / 2}>1 nm</text>
      </g>
      <Notes torques={pass.torques} noflap={pass.id === 'noflap'} />
      {pass.marks.map((m) => {
        const [dx, dy, anchor] = labelAt(m);
        return (
          <g key={`${m.key}-${m.t}`} className={`ptw-mark${s.t >= m.t ? ' ptw-mark--passed' : ''}${m.key === 'fail' ? ' ptw-mark--fail' : ''}`}
            role="button" tabIndex={0} aria-label={`Go to ${m.label}`}
            onClick={() => onJump(m.t)}
            onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onJump(m.t); } }}>
            <title>{`Go to ${m.label}`}</title>
            <circle className="ptw-mark-hit" cx={m.x} cy={-m.y} r={320} />
            <circle className="ptw-mark-dot" cx={m.x} cy={-m.y} r={80} />
            <text x={m.x + dx} y={-m.y + dy} textAnchor={anchor}>{m.label}</text>
            <Tag m={m} pass={pass} single={single} x={m.x + dx} y={-m.y + dy} anchor={anchor} away={dy < 0 ? -260 : 260} />
          </g>
        );
      })}
      <g className="ptw-ac-shadow" transform={`translate(${s.x + lift * 220} ${-s.y + lift * 380}) rotate(${rot}) scale(${AC_SCALE})`}>
        <path d={SILHOUETTE} transform={`scale(1 ${squash})`} />
      </g>
      <g transform={`translate(${s.x} ${-s.y}) rotate(${rot}) scale(${AC_SCALE * (1 + lift * 0.18)})`}>
        <T44C aob={s.aob} dead={dead} />
      </g>
    </svg>
  );
}

// ---- Satellite: the USGS National Map's aerial imagery under the drawing (Esri's World
// Imagery had cloud over Navy Corpus), turned so runway 13 runs left to right
// as it does in the drawing, and scaled so a foot on the picture is a foot of the drawing. The
// map is a still picture: no dragging or zooming, the drawing on top takes the clicks.
const SAT_URL = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';
const SAT_CREDIT = 'Imagery: USGS The National Map';
const placeOf = (fieldId) => {
  const site = siteOf(fieldId);
  return {
    center: site.toLatLng(VIEW.x + VIEW.w / 2, -(VIEW.y + VIEW.h / 2)),
    turn: -(site.bearingDeg - 90), // the runway's true bearing to the right of the page
    mPerPxZ0: 156543.03392 * Math.cos((site.lat * Math.PI) / 180),
  };
};

function Fit({ width, place }) {
  const map = useMap();
  useEffect(() => {
    if (!width) return;
    map.invalidateSize();
    const metresPerPx = (VIEW.w * 0.3048) / width;
    map.setView(place.center, Math.log2(place.mPerPxZ0 / metresPerPx), { animate: false });
  }, [map, width, place]);
  return null;
}

function Satellite({ width, height, fieldId }) {
  const place = useMemo(() => placeOf(fieldId), [fieldId]);
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
function PatternView({ satellite, setView, ...props }) {
  const box = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setSize({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <div className="ptw-mapwrap" ref={box}>
        {satellite && size.width > 0 && <Satellite width={size.width} height={size.height} fieldId={props.pass.field.id} />}
        <PatternMap {...props} satellite={satellite} />
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
  const live = pass.events.filter((e) => e.kind === 'say' && now >= e.t && now < e.t + holdOf(e) * speed);
  const last2 = (xs) => xs.slice(-2);
  const radio = last2(live.filter((e) => e.radio).map((e) => ({ ...e, from: e.who === 'Tower' ? `${pass.field.name} Tower` : CALL_SIGN })));
  const pf = last2(live.filter((e) => !e.radio && e.who === 'PF'));
  const pm = last2(live.filter((e) => !e.radio && e.who === 'PM'));
  return (
    <div className="ptw-comms" aria-live="polite">
      <div className="ptw-comms-pf"><Box lines={pf} now={now} cls="ptw-box--pf" label="PF" speed={speed} /></div>
      <div className="ptw-comms-pm"><Box lines={pm} now={now} cls="ptw-box--pm" label="PM" speed={speed} /></div>
      {radio.length > 0 && <div className="ptw-comms-radio"><Box lines={radio} now={now} cls="ptw-box--radio" label="Tower" speed={speed} /></div>}
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

export default function PatternWork() {
  const [scenario, setScenario] = useState('approach');
  const [engine, setEngine] = useState('left');
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState('drawing');
  const [fieldId, setFieldId] = useState('kngw');
  const model = useMemo(() => buildPass(scenario, engine, fieldId), [scenario, engine, fieldId]);
  const live = useRef({ t: 0 });
  live.current.speed = speed;
  live.current.duration = model.duration;

  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const v = live.current;
      v.t += (Math.min(250, now - last) / 1000) * v.speed;
      last = now;
      if (v.t >= v.duration) v.t = 0; // round again
      setT(v.t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // A circle on the drawing puts the aircraft there; the pass carries on if it was flying.
  const jump = (to) => { live.current.t = Math.min(to, model.duration - 0.01); setT(live.current.t); };
  // A new pattern starts from its beginning.
  useEffect(() => { live.current.t = 0; setT(0); }, [scenario, engine, fieldId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== ' ' || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return;
      e.preventDefault();
      setPlaying((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const s = model.stateAt(t);
  const single = scenario === 'sse' || scenario.startsWith('case');

  return (
    <div className="ptw-page">
      <div className="ptw-controls">
        <label className="ptw-field">
          <span>Pattern</span>
          <select className="ptw-select" value={scenario} onChange={(e) => setScenario(e.target.value)}>
            {SCENARIOS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
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
        <button type="button" className="ptw-btn ptw-btn--go" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : t > 0 ? 'Resume' : 'Fly'}</button>
        <label className="ptw-field">
          <span>Field</span>
          <select className="ptw-select" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
            {Object.values(FIELDS).map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <label className="ptw-field">
          <span>Speed</span>
          <select className="ptw-select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {SPEEDS.map((x) => <option key={x} value={x}>{x}×</option>)}
          </select>
        </label>
      </div>
      <Comms pass={model} now={t} speed={speed} />
      <Procedures pass={model} now={t} />
      <div className="ptw-card">
        <Gauges s={s} />
        <PatternView pass={model} s={s} onJump={jump} single={single} satellite={view === 'satellite'} setView={setView} />
      </div>
      <p className="ptw-foot">
        Runway {model.field.number} at {model.field.name}, 5,000 ft, left traffic, no wind. ME FTI §106 Pattern Work, Figures 1-3, 1-4 and 1-6. AOB and nose attitude are estimated.
      </p>
    </div>
  );
}
