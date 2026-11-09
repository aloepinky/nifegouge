import React, { Suspense, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { DRAFT } from '../programs';
import { actionFor, aliasesFrom, canon, fillsFor, matches, settingsFor, wordingsOf } from './controlMatch';

// The cockpit poster: a photograph or a panel diagram with a click target on every control the
// EPs name. Clicking one fills the step, the way Primary's poster does.
//
// Three pieces, because the three schools want the same behaviour in three different shapes:
//
//   usePoster      the behaviour — which wordings are one control, and what a click writes.
//                  One per page.
//   PosterRegion   one panel image and its targets, drawn wherever the page puts it.
//   CockpitPoster  the default arrangement: a band of one region at a time, with a row of
//                  buttons to change region when there is more than one. NIFE uses it.
//
// Primary's page is bespoke because the T-6B happens to decompose into two 1:6 console towers,
// which fit the narrow columns either side of the EP card. Nothing else does, so the C172's one
// wide drawing hangs in EPDrill's `top` slot as a band. Advanced is bespoke again: its four
// panels are whole sub-panels off a 36x24" sheet, and T44CEPsLimits.js puts the main instrument
// panel across the top and stacks the other three in a column beside the EP, the way they run
// down the centre console in the aeroplane.
//
// A spot's `box` is FRACTIONS of its own region image, never pixels, so re-cropping the asset at
// a different resolution (tools/crop-posters.py) leaves every box where it was.
//
// Where a panel draws one control in two places — the T-44C's left and right firewall valves are
// one checklist step, one at each end of the fuel panel — that is two spots carrying the same
// `action` and a distinct `id`. Either one answers the step; the `id` is only there to tell the
// two targets apart.

// A target standing for more than one step says which one it is about to fill; a plain one has
// nothing to disambiguate and shows its own name. Neither says what it will WRITE: clicking the
// control a step names hands over that step's whole answer (stepFlow.js), so a tooltip listing
// settings would be telling you the answer before you clicked.
const tipFor = (spot, action) => (spot.actions ? `${spot.label}: ${action}` : spot.label);

// Loaded only when asked for, and only in a development build unless the poster says
// `publicSpots`. See SpotEditor.js: it is how the boxes below were drawn in the first place.
const SpotEditor = React.lazy(() => import('./SpotEditor'));

// Everything a poster does that is not markup. A page calls this once with EPDrill's slot api and
// hands the result to every PosterRegion it draws, so a click behaves the same however the page
// is laid out.
export function usePoster({ poster, aliases, fill, hint, shown, next, engine }) {
  const alias = useMemo(() => aliases || aliasesFrom(poster), [aliases, poster]);

  // `actionFor` is what a target standing for two controls needs: it answers with whichever of
  // them the checklist is asking for next. A plain target answers with its own. `fillsFor` is the
  // other way round — the step that takes two controls, where this one supplies only its piece.
  // `settingsFor` is the settings this target lists for that control, which is how two targets
  // sharing a control divide its steps between them (the T-44C's two Pressurization controls).
  // `wordingsOf` is everything the target answers for, which a step's `watch` list of gauges and
  // lights is matched against: the left fuel gauge is `Fuel Quantity` and `Left Fuel Quantity`.
  const press = (spot) => {
    const action = actionFor(spot, next, alias);
    // An elapsed time key runs the engine model's clock whatever step it answers, as the real one
    // starts and stops whenever it is pressed.
    if (engine && wordingsOf(spot).some((w) => /elapsed time clock/i.test(w))) engine.toggleClock();
    // So does a control with an `engineInput`, such as a PRESS FOR VOLTS button.
    if (engine && spot.engineInput && engine.poke) engine.poke(spot.engineInput);
    // A `free` control (the T-44C's annunciator DIM knob) is worked whenever the student likes:
    // it fills a step only when the open step names it, and is never marked wrong.
    if (spot.free && canon(next, alias) !== canon(action, alias)) return;
    fill(action, fillsFor(spot, action, alias), settingsFor(spot, action, alias), wordingsOf(spot));
  };

  // Two development-only views, and they are not the same thing. `?spots` swaps the targets for
  // the editor's own drag surface, so the page stops filling steps; on a page drawing several
  // regions at once, `?spots=<region id>` says which one to edit and the rest keep working.
  // `?boxes` only outlines the live targets, so you can see where every one sits while still
  // clicking them normally — which is what you want when nudging coordinates by hand. It draws no
  // captions: they cluster on one switch row and the tags covered the controls being checked.
  // Hovering a box still names it, through the `title` every target already carries.
  //
  // A poster flagged `publicSpots` opens both on the live site too, so a tester with the link
  // can tune a new aircraft's boxes without a checkout: the TH-73A's while it is unlisted.
  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const open = DRAFT || !!poster.publicSpots;
  const editing = open && params.has('spots') ? (params.get('spots') || '') : null;
  const showBoxes = open && params.has('boxes');

  return { poster, alias, press, hint, shown: shown || [], next, editing, showBoxes, engine: engine || null };
}

// A live engine model (EPDrill's `engine`, T44C/t44cEngineStore.js), read through
// useSyncExternalStore so a tick re-renders only what reads it. `useEngineOn` re-renders only
// when the model switches on or off.
const NO_ENGINE = { subscribe: () => () => {}, getSnapshot: () => null };
const useEngine = (engine) => {
  const e = engine || NO_ENGINE;
  return useSyncExternalStore(e.subscribe, e.getSnapshot);
};
const useEngineOn = (engine) => {
  const e = engine || NO_ENGINE;
  return useSyncExternalStore(e.subscribe, () => !!(e.getSnapshot() || {}).active);
};
// The gauges a scripted check is ringing, as one string so a tick re-renders only on a change;
// null when the click's own rings stand.
const useEngineRings = (engine) => {
  const e = engine || NO_ENGINE;
  const key = useSyncExternalStore(e.subscribe, () => {
    const snap = e.getSnapshot() || {};
    return snap.active && Array.isArray(snap.highlight) ? snap.highlight.join('|') : null;
  });
  return key === null ? null : key.split('|').filter(Boolean);
};

// The stopwatch: an iPad on a stand beside the pilot's PFD, running the Clock app's stopwatch.
// Its big figures are the elapsed time clock as the student runs it, and the whole iPad is a
// target that answers for the clock (the steps that start and stop it), as the PFD's elapsed
// time keys do. Under the figures, small and red, the time the starter has actually been on,
// so the two can be compared. The buttons only show whether the clock is running.
const clock = (t) => {
  const cs = Math.floor(t * 100);
  const mm = String(Math.floor(cs / 6000)).padStart(2, '0');
  const ss = String(Math.floor(cs / 100) % 60).padStart(2, '0');
  return `${mm}:${ss}.${String(cs % 100).padStart(2, '0')}`;
};

const IPAD_TARGET = { id: 'ipad-stopwatch', action: 'Elapsed Time Clock', also: ['ET'], label: 'Stopwatch' };

function Stopwatch({ box, watch, limit, view }) {
  const [l, t, w, h] = box;
  const { clock: ck, starter } = watch;
  const over = starter && limit && starter.t > limit;
  const label = `Stopwatch, ${clock(ck.t)}${ck.running ? ', running' : ''}. Press to ${ck.running ? 'stop' : 'start'} the clock`;
  return (
    <button type="button" className={`epl-ipad${ck.running ? ' epl-ipad--running' : ''}`}
      title="Stopwatch: the elapsed time clock" aria-label={label}
      style={{ left: `${l * 100}%`, top: `${t * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
      onClick={() => view.press(IPAD_TARGET)}>
      <span className="epl-ipad-body">
        <span className="epl-ipad-screen">
          <span className="epl-ipad-title">Stopwatch</span>
          <span className="epl-ipad-time" role="timer">{clock(ck.t)}</span>
          <span className={`epl-ipad-starter${over ? ' epl-ipad-starter--over' : ''}`}>
            {starter ? `${starter.side === 'L' ? 'L' : 'R'} STARTER ${clock(starter.t)}` : 'STARTER --:--.--'}
          </span>
          <span className="epl-ipad-buttons">
            <span className="epl-ipad-btn">{ck.running ? 'Lap' : 'Reset'}</span>
            <span className="epl-ipad-btn epl-ipad-btn--go">{ck.running ? 'Stop' : 'Start'}</span>
          </span>
        </span>
      </span>
      <span className="epl-ipad-stand" aria-hidden="true" />
    </button>
  );
}

// What the model shows on one region: each gauge's digital window (a region's `readouts`,
// `{ key: 'L.itt', box }`, box in the region's fractions like a spot's), drawn as the gauge's
// own green digits; and each annunciator the model drives lit in place, by brightening the
// legend the drawing already carries in its own colour. Under the targets, and never clicked.
function EngineLayer({ engine, region, alias, view }) {
  const snap = useEngine(engine);
  if (!snap || !snap.active) return null;
  const lit = (region.spots || []).filter((spot) => spot.box
    && snap.lights.some((w) => matches(spot, w, alias)));
  // The DIM knob's check fades the lit lights (t44cEngine.js annLevel).
  const level = snap.annLevel ?? 1;
  return (
    <>
      {(region.readouts || []).map(({ key, box }) => {
        const [side, gauge] = key.split('.');
        const text = ((snap.readouts || {})[side] || {})[gauge];
        if (text === undefined) return null;
        const [l, t, w, h] = box;
        // `--chars` lets the digits fill the box's height unless they would overrun its width.
        return (
          <span key={key} className="epl-readout" aria-hidden="true"
            style={{ left: `${l * 100}%`, top: `${t * 100}%`, width: `${w * 100}%`, height: `${h * 100}%`, '--chars': Math.max(3, text.length) }}>
            <span>{text}</span>
          </span>
        );
      })}
      {region.stopwatch && snap.stopwatch && <Stopwatch box={region.stopwatch} watch={snap.stopwatch} limit={snap.starterLimit} view={view} />}
      {/* The lamp test: every cell of the panel (a region's `lampTest` boxes), but a dead bulb. */}
      {region.lampTest && snap.lampTest && region.lampTest.map(([l, t, w, h], i) => (i === snap.lampTest.dark ? null : (
        <span key={`lamp-${l}-${t}`} aria-hidden="true" className="epl-ann-lit"
          style={{ left: `${l * 100}%`, top: `${t * 100}%`, width: `${w * 100}%`, height: `${h * 100}%`, '--ann-level': level }} />
      )))}
      {lit.map((spot) => {
        const [l, t, w, h] = spot.box;
        return (
          <span key={spot.id || spot.action} aria-hidden="true"
            className={`epl-ann-lit${(snap.blinking || []).some((w) => matches(spot, w, alias)) ? ' epl-ann-lit--blink' : ''}`}
            style={{ left: `${l * 100}%`, top: `${t * 100}%`, width: `${w * 100}%`, height: `${h * 100}%`, '--ann-level': level }} />
        );
      })}
    </>
  );
}

// One panel image with its targets over it. `view` is what usePoster returned; `className` is how
// the page says whether the frame is capped to the band height or fills its column.
export function PosterRegion({ region, view, className = '', style }) {
  // Exactly one region gets the editor, even on a page drawing four at once: each SpotEditor
  // holds its own copy of the whole poster, so two of them open at the same time would each copy
  // a data file missing the other's edits. `?spots` takes the poster's first region and
  // `?spots=<region id>` takes that one.
  const first = ((view.poster.regions || [])[0] || {}).id;
  const edit = view.editing !== null
    && (view.editing === region.id || (view.editing === '' && region.id === first));
  // While the model runs, the lights it drives are lit by it, so a click does not ring them too.
  const engineOn = useEngineOn(view.engine);
  const driven = engineOn ? (view.engine.getSnapshot().drives || []) : [];
  const rings = useEngineRings(view.engine);
  const shown = rings || view.shown;
  return (
    <div
      className={`epl-band-frame${view.showBoxes ? ' epl-band-frame--boxes' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      <img src={region.src} alt={region.alt} />
      {!edit && view.engine && <EngineLayer engine={view.engine} region={region} alias={view.alias} view={view} />}
      {!edit && (region.spots || []).map((spot) => {
        const [l, t, w, h] = spot.box;
        const tip = tipFor(spot, actionFor(spot, view.next, view.alias));
        // A hinted control takes `.epl-hint`, which EPDrill scrolls to; a gauge or light the last
        // click moved takes `.epl-react`, the same ring without the scroll.
        const hinted = matches(spot, view.hint, view.alias);
        // A `{ w, blink }` entry is a light a step's `sim` is flashing. Read as an object only: a
        // plain string has a `blink` too, the browser's old String.prototype.blink().
        const lit = hinted ? null : shown
          .map((e) => (typeof e === 'string' ? { w: e } : e))
          .filter((e) => !driven.includes(e.w))
          .find((e) => matches(spot, e.w, view.alias));
        return (
          <button
            key={spot.id || spot.action}
            type="button"
            className={`epl-spot${hinted ? ' epl-hint' : ''}${lit ? ` epl-react${lit.blink ? ' epl-react--blink' : ''}` : ''}`}
            style={{ left: `${l * 100}%`, top: `${t * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
            title={tip}
            aria-label={tip}
            onClick={() => view.press(spot)}
          />
        );
      })}
      {edit && (
        <Suspense fallback={null}>
          <SpotEditor poster={view.poster} region={region} />
        </Suspense>
      )}
    </div>
  );
}

// The default arrangement: a fixed-height band showing one region, with a row of buttons to
// change region where an aircraft has more than one. Every region is contained in the same box
// whatever its aspect, so the page does not jump when the region changes.
export default function CockpitPoster({ poster, fill, hint, shown, reveal, next, aliases }) {
  const regions = poster.regions || [];
  const view = usePoster({ poster, aliases, fill, hint, shown, next });

  const [regionId, setRegionId] = useState(regions[0] && regions[0].id);
  const seen = useRef(0);

  // Hint and Skip bring up the panel the control is on. This is done DURING RENDER, not in an
  // effect, and the difference is not cosmetic: child effects run before parent effects, so a
  // setState here in an effect would leave EPDrill's hint-scroll effect querying for `.epl-hint`
  // in a commit where the ringed spot is still on the hidden region, finding nothing, and
  // silently not scrolling. Adjusting state during render puts the ring in the same commit.
  if (reveal && reveal.at !== seen.current) {
    seen.current = reveal.at;
    const found = regions.find((r) => (r.spots || []).some((s) => matches(s, reveal.step, view.alias)));
    if (found && found.id !== regionId) setRegionId(found.id);
  }

  const region = regions.find((r) => r.id === regionId) || regions[0];
  if (!region) return null;

  return (
    <>
      <PosterRegion
        region={region}
        view={view}
        style={poster.bandHeight ? { '--epl-band-h': `${poster.bandHeight}px` } : undefined}
      />

      {regions.length > 1 && (
        <div className="epl-band-tabs">
          {regions.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`epl-band-tab${r.id === region.id ? ' active' : ''}`}
              aria-pressed={r.id === region.id}
              onClick={() => setRegionId(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {poster.credit && <p className="epl-credit">{poster.credit}</p>}
    </>
  );
}
