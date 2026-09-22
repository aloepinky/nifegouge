import React from 'react';
import TW4Cockpit from './TW4Cockpit';
import TW4Limits from './TW4Limits';
import EPsLimitsShell from './epsLimits/EPsLimitsShell';

// Primary's EPs/Limits page: the cockpit and the T-6B limits table inside the shared shell,
// which owns the game, the timer and the leaderboard.

const TABS = [
  { id: 'cockpit', label: 'EPs/Cockpit' },
  { id: 'limits', label: 'Limits' },
];

function TW4EPsLimits() {
  return (
    <EPsLimitsShell
      school="Primary"
      basePath="/tw4/eps-limits"
      tabs={TABS}
      epsTab="cockpit"
      limitsTab="limits"
      renderTab={(tab, game) => (tab === 'limits' ? <TW4Limits {...game} /> : <TW4Cockpit {...game} />)}
    />
  );
}

export default TW4EPsLimits;
