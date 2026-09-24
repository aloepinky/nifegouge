import React, { Suspense, useMemo, useRef, useState } from 'react';
import { DRAFT } from '../programs';
import { actionFor, aliasesFrom, fillsFor, matches } from './controlMatch';

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

// Loaded only in a development build, and only when asked for. See SpotEditor.js: it is how the
// boxes below were drawn in the first place, and it is not something to ship.
const SpotEditor = React.lazy(() => import('./SpotEditor'));

// Everything a poster does that is not markup. A page calls this once with EPDrill's slot api and
// hands the result to every PosterRegion it draws, so a click behaves the same however the page
// is laid out.
export function usePoster({ poster, aliases, fill, hint, next }) {
  const alias = useMemo(() => aliases || aliasesFrom(poster), [aliases, poster]);

  // `actionFor` is what a target standing for two controls needs: it answers with whichever of
  // them the checklist is asking for next. A plain target answers with its own. `fillsFor` is the
  // other way round — the step that takes two controls, where this one supplies only its piece.
  const press = (spot) => {
    const action = actionFor(spot, next, alias);
    fill(action, fillsFor(spot, action, alias));
  };

  // Two development-only views, and they are not the same thing. `?spots` swaps the targets for
  // the editor's own drag surface, so the page stops filling steps; on a page drawing several
  // regions at once, `?spots=<region id>` says which one to edit and the rest keep working.
  // `?boxes` only outlines the live targets, so you can see where every one sits while still
  // clicking them normally — which is what you want when nudging coordinates by hand. It draws no
  // captions: they cluster on one switch row and the tags covered the controls being checked.
  // Hovering a box still names it, through the `title` every target already carries.
  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const editing = DRAFT && params.has('spots') ? (params.get('spots') || '') : null;
  const showBoxes = DRAFT && params.has('boxes');

  return { poster, alias, press, hint, next, editing, showBoxes };
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
  return (
    <div
      className={`epl-band-frame${view.showBoxes ? ' epl-band-frame--boxes' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      <img src={region.src} alt={region.alt} />
      {!edit && (region.spots || []).map((spot) => {
        const [l, t, w, h] = spot.box;
        const tip = tipFor(spot, actionFor(spot, view.next, view.alias));
        return (
          <button
            key={spot.id || spot.action}
            type="button"
            className={`epl-spot${matches(spot, view.hint, view.alias) ? ' epl-hint' : ''}`}
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
export default function CockpitPoster({ poster, fill, hint, reveal, next, aliases }) {
  const regions = poster.regions || [];
  const view = usePoster({ poster, aliases, fill, hint, next });

  const [regionId, setRegionId] = useState(regions[0] && regions[0].id);
  const seen = useRef(0);

  // Hint and Skip bring up the panel the control is on. This is done DURING RENDER, not in an
  // effect, and the difference is not cosmetic: child effects run before parent effects, so a
  // setState here in an effect would leave EPDrill's hint-scroll effect querying for `.epl-hint`
  // in a commit where the ringed spot is still on the hidden region, finding nothing, and
  // silently not scrolling. Adjusting state during render puts the ring in the same commit.
  if (reveal && reveal.at !== seen.current) {
    seen.current = reveal.at;
    const found = regions.find((r) => (r.spots || []).some((s) => matches(s, reveal.control, view.alias)));
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
