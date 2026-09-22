import React from 'react';
import C172Limits from './Flight/C172Limits';
import { C172LeftPanel, C172RightPanel } from './Flight/C172Panel';
import { C172_EPS } from './Flight/c172Data';
import EPDrill from './epsLimits/EPDrill';
import EPsLimitsShell from './epsLimits/EPsLimitsShell';

// NIFE's EPs/Limits page: the C172 EPs one at a time with the control panel beside them, and the
// limits table, in the shell Primary's page uses too. The TOLD card is on the Briefs/TOLD page,
// where Primary keeps its own.

const TABS = [
  { id: 'eps', label: 'EPs' },
  { id: 'limits', label: 'Limits' },
];

function C172EPs(game) {
  return (
    <EPDrill
      {...game}
      eps={C172_EPS}
      title="C172 EMERGENCY PROCEDURES"
      left={({ fill, hint, resetKey }) => <C172LeftPanel key={resetKey} fill={fill} hint={hint} />}
      right={({ fill, hint, resetKey }) => <C172RightPanel key={resetKey} fill={fill} hint={hint} />}
      footnote="* DENOTES CRITICAL MEMORY ITEMS"
    />
  );
}

function NIFEEPsLimits() {
  return (
    <EPsLimitsShell
      school="NIFE"
      basePath="/nife/eps-limits"
      tabs={TABS}
      epsTab="eps"
      limitsTab="limits"
      renderTab={(tab, game) => (tab === 'limits' ? <C172Limits {...game} /> : <C172EPs {...game} />)}
    />
  );
}

export default NIFEEPsLimits;
