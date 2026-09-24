import React from 'react';
import T44CLimits from './T44C/T44CLimits';
import { T44C_EPS, T44C_EP_NWC } from './T44C/t44cData';
import { T44C_POSTER, T44C_ALIASES, t44cRegion } from './T44C/t44cPoster';
import ActionButtons from './epsLimits/ActionButtons';
import { PosterRegion, usePoster } from './epsLimits/CockpitPoster';
import EPDrill from './epsLimits/EPDrill';
import EPsLimitsShell from './epsLimits/EPsLimitsShell';

// Advanced's EPs/Limits page: the T-44C critical action memory items one at a time, and the
// operating limits sheet, in the shell the other two schools use.
//
// The poster layout is bespoke, the way Primary's is, because the T-44C's publication is one
// 36x24" sheet of six separate sub-panels and none of them is the shape of a side column. Each
// panel is drawn WHOLE — a crop that took half a schematic would teach a panel that does not
// exist — so they are arranged the way they sit in the aeroplane instead:
//
//   * the main instrument panel across the full width of the page, above everything. It is
//     2.16:1 and the densest thing on the sheet, so it gets every pixel the page has;
//   * the fuel control panel down the LEFT, because that is the side of the cockpit it is on,
//     with the steps no panel performs as buttons beneath it;
//   * the power quadrant and the start/electrical stack down the right, in that order, which is
//     the centre console read front to back.
//
// Hint therefore sits under the left column and Skip under the right, as on Primary.
//
// NIFE keeps the shared `CockpitPoster` band, because one drawing of one cockpit needs no
// arrangement. Both schools share `usePoster` and `PosterRegion`, so a click behaves identically
// on all three pages whatever shape the page is.
//
// `nwc` is what gives this page its NWC buttons and its Auto NWC toggle, the way Primary has
// them. A school with no NWC data passes nothing and simply has neither.

const TABS = [
  { id: 'eps', label: 'EPs' },
  { id: 'limits', label: 'Limits' },
];

const MAIN = t44cRegion('main');
const FUEL = t44cRegion('fuel');
const CONSOLE = ['quadrant', 'elec'].map(t44cRegion);

// Each slot is its own component, not a call inside one render function: EPDrill renders a slot
// only in Full Mode, so a hook called inline in a slot function would come and go with the
// Simple/Full switch. They hold no state between them — a click reads the open step and writes
// it (epsLimits/stepFlow.js), so three copies of `usePoster` cannot disagree about anything.
const useT44CPoster = (api) => usePoster({ poster: T44C_POSTER, aliases: T44C_ALIASES, ...api });

function MainPanel(api) {
  return <PosterRegion region={MAIN} view={useT44CPoster(api)} className="epl-band-frame--fluid" />;
}

function Console(api) {
  const view = useT44CPoster(api);
  return (
    <div className="t44c-console">
      {CONSOLE.map((region) => (
        <PosterRegion key={region.id} region={region} view={view} className="epl-band-frame--fluid" />
      ))}
      <p className="epl-credit">{T44C_POSTER.credit}</p>
    </div>
  );
}

function LeftSide(api) {
  return (
    <div className="t44c-console">
      <PosterRegion region={FUEL} view={useT44CPoster(api)} className="epl-band-frame--fluid" />
      <ActionButtons actions={T44C_POSTER.actions} aliases={T44C_ALIASES} {...api} />
    </div>
  );
}

function T44CEPs(game) {
  return (
    <EPDrill
      {...game}
      eps={T44C_EPS}
      nwc={T44C_EP_NWC}
      title="T-44C EMERGENCY PROCEDURES"
      aliases={T44C_ALIASES}
      scaleSides={false}
      sideWidth={[300, 300]}
      top={(api) => <MainPanel {...api} />}
      left={(api) => <LeftSide {...api} />}
      right={(api) => <Console {...api} />}
      footnote="* DENOTES CRITICAL ACTION MEMORY ITEMS · † REQUIRES CONCURRENCE OF BOTH PILOTS"
    />
  );
}

function T44CEPsLimits() {
  return (
    <EPsLimitsShell
      school="Advanced"
      basePath="/t44c/eps-limits"
      tabs={TABS}
      epsTab="eps"
      limitsTab="limits"
      renderTab={(tab, game) => (tab === 'limits' ? <T44CLimits {...game} /> : <T44CEPs {...game} />)}
    />
  );
}

export default T44CEPsLimits;
