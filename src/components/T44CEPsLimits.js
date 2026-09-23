import React from 'react';
import T44CLimits from './T44C/T44CLimits';
import { T44C_EPS } from './T44C/t44cData';
import EPDrill from './epsLimits/EPDrill';
import EPsLimitsShell from './epsLimits/EPsLimitsShell';

// Advanced's EPs/Limits page: the T-44C critical action memory items one at a time, and the
// operating limits sheet, in the shell the other two schools use.
//
// `EPDrill` is given no `left` or `right`, so the page runs in Simple Mode: no Simple/Full
// switch, no Hint, and Skip sits in the button row. Adding the cockpit poster later is a matter
// of passing those two render props and changing nothing else.

const TABS = [
  { id: 'eps', label: 'EPs' },
  { id: 'limits', label: 'Limits' },
];

function T44CEPs(game) {
  return (
    <EPDrill
      {...game}
      eps={T44C_EPS}
      title="T-44C EMERGENCY PROCEDURES"
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
