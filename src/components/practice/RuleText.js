// A course rule on the page, shared by the T-6 and T-44C Practice Flights. Its marked words
// ([[2500']]) are styled when filled and a blank until revealed.

import React from 'react';

const FIG = String.fromCharCode(0x2007);

// A rule's text with its marked words blanked (a line as long as the word) or filled in.
export function Words({ text, filled }) {
  return text.split(/\[\[([^[\]]+)\]\]/).map((part, j) => (j % 2
    ? <span key={j} className={filled ? 'pf-rule-word' : 'pf-rule-blank'}>{filled ? part : FIG.repeat(Math.max(3, part.length))}</span>
    : part.replace(/\*\*/g, '')));
}

// A course rule revealed a piece at a time (engine.js piecesOf): each sentence with a blank, so
// every change of altitude, airspeed, heading or channel is its own stop.
export function Rule({ step, upTo, shown }) {
  const pieces = (step.pieces || []).map((x, k) => ({ ...x, k }));
  const open = (k) => shown || k < upTo;
  return (
    <div className="pf-rule">
      {step.rule.map((p, i) => {
        if (p.heading) return <div key={i} className="pf-rule-heading"><Words text={p.text} filled /></div>;
        const mine = pieces.filter((x) => x.para === i);
        const next = !shown && mine.some((x) => x.k === upTo);
        return (
          <div key={i} className={next ? 'pf-rule-para pf-rule-para--next' : 'pf-rule-para'}>
            <p className={p.sub ? 'pf-rule-sub' : undefined}>
              {mine.length ? mine.map((x) => (
                <span key={x.k} className={!shown && x.k === upTo ? 'pf-rule-piece pf-rule-piece--next' : 'pf-rule-piece'}>
                  <Words text={p.text.slice(x.from, x.to)} filled={open(x.k)} />
                </span>
              )) : <Words text={p.text} filled />}
            </p>
            {p.cite && <span className="pf-rule-cite">{p.cite}</span>}
          </div>
        );
      })}
    </div>
  );
}
