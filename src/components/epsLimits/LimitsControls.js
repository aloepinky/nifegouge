import React from 'react';

// The Random-mode progress line and the button row under a limits table, for any school whose
// table runs on useLimitsDrill. The table itself stays bespoke to its exam sheet; this is only
// the part every one of them shares. The buttons are hidden for a game, as on the EPs page.
// With Single Mode on (`single`, useSingleMode.js), the buttons work on the card: Reveal Answers
// (in place of Next Answer and All Answers) fills its blanks without moving on, and Random Mode
// shuffles the cards.
export default function LimitsControls({ drill, isGameActive, single }) {
  const card = single?.on;
  const random = card ? single.random : !!drill.queue;
  return (
    <>
      {drill.queue && !card && (
        <div className="epl-limits-progress">Random Mode: Limit {drill.at + 1} of {drill.queue.length}</div>
      )}
      {!isGameActive && (
        <div className="button-row epl-limits-controls">
          {card ? <button type="button" onClick={single.reveal}>Reveal Answers</button> : (
            <>
              <button type="button" onClick={drill.next}>Next Answer</button>
              <button type="button" onClick={drill.all}>All Answers</button>
            </>
          )}
          <button type="button" onClick={card ? () => single.after(drill.check()) : drill.check}>Check Answers</button>
          <button type="button" onClick={drill.reset}>Reset</button>
          <button type="button" className={`epl-random${random ? ' active' : ''}`} aria-pressed={random}
            onClick={card ? single.toggleRandom : drill.toggleRandom}>
            Random Mode
          </button>
        </div>
      )}
    </>
  );
}
