import React from 'react';

// The Random-mode progress line and the button row under a limits table, for any school whose
// table runs on useLimitsDrill. The table itself stays bespoke to its exam sheet; this is only
// the part every one of them shares. The buttons are hidden for a game, as on the EPs page.
export default function LimitsControls({ drill, isGameActive }) {
  return (
    <>
      {drill.queue && (
        <div className="epl-limits-progress">Random Mode: Limit {drill.at + 1} of {drill.queue.length}</div>
      )}
      {!isGameActive && (
        <div className="button-row epl-limits-controls">
          <button type="button" onClick={drill.next}>Next Answer</button>
          <button type="button" onClick={drill.all}>All Answers</button>
          <button type="button" onClick={drill.check}>Check Answers</button>
          <button type="button" onClick={drill.reset}>Reset</button>
          <button type="button" className={`epl-random${drill.queue ? ' active' : ''}`} aria-pressed={!!drill.queue}
            onClick={drill.toggleRandom}>
            Random Mode
          </button>
        </div>
      )}
    </>
  );
}
