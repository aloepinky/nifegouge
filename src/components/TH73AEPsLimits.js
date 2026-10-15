import React from 'react';
import TH73ALimits from './TH73A/TH73ALimits';
import { TH73A_EPS, TH73A_EP_NWC } from './TH73A/th73aData';
import { TH73A_POSTER, TH73A_ALIASES, th73aRegion } from './TH73A/th73aPoster';
import ActionButtons from './epsLimits/ActionButtons';
import { PosterRegion, usePoster } from './epsLimits/CockpitPoster';
import EPDrill from './epsLimits/EPDrill';
import EPsLimitsShell from './epsLimits/EPsLimitsShell';

// The TH-73A's EPs/Limits page: the NATOPS memory items one procedure at a time, and the
// operating limits sheet, laid out as the T-54A's is (see T54AEPsLimits.js).
//
// The instrument panel runs across the top. Down the left is the overhead panel, which hangs
// over the pilot's head and has nowhere truer to go on a flat page, with the steps no panel
// performs as buttons beneath it; down the right, the pedestal with the collective rising out of
// it, and the pilot's cyclic below.
//
// `nwc` gives the page its NWC buttons and Auto NWC toggle, from the NATOPS (th73aData.js).

const TABS = [
  { id: 'eps', label: 'EPs' },
  { id: 'limits', label: 'Limits' },
];

const PANEL = th73aRegion('panel');
const OVERHEAD = th73aRegion('overhead');
const RIGHT = ['pedestal', 'cyclic'].map(th73aRegion);

// Each slot is its own component, so the hook is not called inline in a slot that comes and goes
// with the Simple/Full switch (see T44CEPsLimits.js).
const useTH73APoster = (api) => usePoster({ poster: TH73A_POSTER, aliases: TH73A_ALIASES, ...api });

function MainPanel(api) {
  return <PosterRegion region={PANEL} view={useTH73APoster(api)} className="epl-band-frame--fluid" />;
}

function LeftSide(api) {
  return (
    <div className="t44c-console">
      <PosterRegion region={OVERHEAD} view={useTH73APoster(api)} className="epl-band-frame--fluid" />
      <ActionButtons actions={TH73A_POSTER.actions} aliases={TH73A_ALIASES} {...api} />
    </div>
  );
}

function RightSide(api) {
  const view = useTH73APoster(api);
  return (
    <div className="t44c-console">
      {RIGHT.map((region) => (
        <PosterRegion key={region.id} region={region} view={view} className="epl-band-frame--fluid" />
      ))}
    </div>
  );
}

function TH73AEPs(game) {
  return (
    <EPDrill
      {...game}
      eps={TH73A_EPS}
      nwc={TH73A_EP_NWC}
      title="TH-73A EMERGENCY PROCEDURES"
      aliases={TH73A_ALIASES}
      sideWidth={[300, 300]}
      top={(api) => <MainPanel {...api} />}
      left={(api) => <LeftSide {...api} />}
      right={(api) => <RightSide {...api} />}
      footnote="* DENOTES MEMORY ITEMS (NATOPS §12.1.1)"
    />
  );
}

function TH73AEPsLimits() {
  return (
    <EPsLimitsShell
      school="TH-73A"
      basePath="/th73a/eps-limits"
      tabs={TABS}
      epsTab="eps"
      limitsTab="limits"
      renderTab={(tab, game) => (tab === 'limits' ? <TH73ALimits {...game} /> : <TH73AEPs {...game} />)}
    />
  );
}

export default TH73AEPsLimits;
