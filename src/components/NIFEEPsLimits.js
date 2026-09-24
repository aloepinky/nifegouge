import React from 'react';
import C172Limits from './Flight/C172Limits';
import { C172_EPS } from './Flight/c172Data';
import { C172_POSTER, C172_ALIASES } from './Flight/c172Poster';
import ActionButtons from './epsLimits/ActionButtons';
import CockpitPoster from './epsLimits/CockpitPoster';
import EPDrill from './epsLimits/EPDrill';
import EPsLimitsShell from './epsLimits/EPsLimitsShell';

// NIFE's EPs/Limits page: the C172 EPs one at a time with the cockpit poster above them, and the
// limits table, in the shell Primary's page uses too. The TOLD card is on the Briefs/TOLD page,
// where Primary keeps its own.
//
// The poster goes in `top` rather than either side: Primary's side columns suit the T-6B's two
// tall console towers and nothing else. That leaves both side columns for the steps no control
// performs, a column of buttons either side of the EP card, which is also what puts Hint under
// the left and Skip under the right as on Primary.

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
      aliases={C172_ALIASES}
      scaleSides={false}
      top={(api) => <CockpitPoster poster={C172_POSTER} aliases={C172_ALIASES} {...api} />}
      left={(api) => <ActionButtons actions={C172_POSTER.actionColumns[0]} aliases={C172_ALIASES} {...api} />}
      right={(api) => <ActionButtons actions={C172_POSTER.actionColumns[1]} title="" aliases={C172_ALIASES} {...api} />}
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
