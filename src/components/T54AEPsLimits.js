import React from 'react';
import T54ALimits from './T54A/T54ALimits';
import { T54A_EPS } from './T54A/t54aData';
import { T54A_POSTER, T54A_ALIASES, t54aRegion } from './T54A/t54aPoster';
import ActionButtons from './epsLimits/ActionButtons';
import { PosterRegion, usePoster } from './epsLimits/CockpitPoster';
import EPDrill from './epsLimits/EPDrill';
import EPsLimitsShell from './epsLimits/EPsLimitsShell';

// The T-54A's EPs/Limits page: the critical action memory items one at a time, and the operating
// limits sheet, laid out as the T-44C's is (see T44CEPsLimits.js). A draft (T54A-DRAFT): routed
// and built only outside production.
//
// The main instrument panel runs across the top. Down the left are the fuel panel, which is on
// that side of the cockpit, and the pilot's control wheel, with the steps no panel performs as
// buttons beneath; down the right, the pedestal and then the circuit breaker panel.
//
// No NWCs: the T-54A's are in its NATOPS, which is CUI and is not used on this site.

const TABS = [
  { id: 'eps', label: 'EPs' },
  { id: 'limits', label: 'Limits' },
];

const MAIN = t54aRegion('main');
const LEFT = ['fuel', 'yoke'].map(t54aRegion);
const RIGHT = ['pedestal', 'cb'].map(t54aRegion);

// Each slot is its own component, so the hook is not called inline in a slot that comes and goes
// with the Simple/Full switch (see T44CEPsLimits.js).
const useT54APoster = (api) => usePoster({ poster: T54A_POSTER, aliases: T54A_ALIASES, ...api });

function MainPanel(api) {
  return <PosterRegion region={MAIN} view={useT54APoster(api)} className="epl-band-frame--fluid" />;
}

function LeftSide(api) {
  const view = useT54APoster(api);
  return (
    <div className="t44c-console">
      {LEFT.map((region) => (
        <PosterRegion key={region.id} region={region} view={view} className="epl-band-frame--fluid" />
      ))}
      <ActionButtons actions={T54A_POSTER.actions} aliases={T54A_ALIASES} {...api} />
    </div>
  );
}

function RightSide(api) {
  const view = useT54APoster(api);
  return (
    <div className="t44c-console">
      {RIGHT.map((region) => (
        <PosterRegion key={region.id} region={region} view={view} className="epl-band-frame--fluid" />
      ))}
      <p className="epl-credit">{T54A_POSTER.credit}</p>
    </div>
  );
}

function T54AEPs(game) {
  return (
    <EPDrill
      {...game}
      eps={T54A_EPS}
      title="T-54A EMERGENCY PROCEDURES"
      aliases={T54A_ALIASES}
      sideWidth={[300, 300]}
      top={(api) => <MainPanel {...api} />}
      left={(api) => <LeftSide {...api} />}
      right={(api) => <RightSide {...api} />}
      footnote="* DENOTES CRITICAL ACTION MEMORY ITEMS · † REQUIRES CONCURRENCE OF BOTH PILOTS"
    />
  );
}

function T54AEPsLimits() {
  return (
    <EPsLimitsShell
      school="T-54A"
      basePath="/t54a/eps-limits"
      tabs={TABS}
      epsTab="eps"
      limitsTab="limits"
      renderTab={(tab, game) => (tab === 'limits' ? <T54ALimits {...game} /> : <T54AEPs {...game} />)}
    />
  );
}

export default T54AEPsLimits;
