import React, { useEffect } from 'react';
import useSingleMode from './useSingleMode';

// Single Mode's markup, shared by every limits page that has it (useSingleMode.js has the walk).
//
// A card is { title, fields, body, notes }: the box's name (none where the box's own words name
// it; never the heading of the table it sits in), its blanks, the box itself as `body(inp)`, and
// the numbers of the notes shown under it, looked up in `notes` ({ n: { fields, body(inp) } }).
// `inp(field, size)` draws one blank; sizes are s (a number), m (a range or a word or two), l (a
// phrase), full (a prohibited maneuver).

export const cardFieldsIn = (notes) => (card) => [...card.fields, ...card.notes.flatMap((n) => notes[n].fields)];

export function LimitCard({ card, notes, inp }) {
  const body = card.body(inp);
  return (
    <div className="epl-single-card">
      {card.title && <div className="epl-single-title">{card.title}</div>}
      {body && <div className="epl-single-body">{body}</div>}
      {card.notes.map((n) => (
        <div key={n} className="epl-single-note">
          <span className="epl-single-note-n">Note {n}:</span> {notes[n].body(inp)}
        </div>
      ))}
    </div>
  );
}

// One blank on a card, drawn the same on every page.
export const singleInput = (value, onChange, markClass) => (field, size = 's') => (
  <input
    type="text"
    className={`epl-single-input epl-single-input--${size} ${markClass(field)}`}
    value={value(field)}
    onChange={(e) => onChange(field, e.target.value)}
  />
);

// The card with Previous and Next above it and the count of limits right below it.
export function SingleView({ single, notes, inp }) {
  return (
    <div className="epl-single">
      <div className="epl-single-nav">
        <button type="button" onClick={single.prev} disabled={single.at === 0}>Previous</button>
        <button type="button" onClick={single.next} disabled={single.at + 1 >= single.count}>Next</button>
      </div>
      <LimitCard card={single.card} notes={notes} inp={inp} />
      <div className="epl-single-count">{single.correct} of {single.total} limits</div>
    </div>
  );
}

// Top right of the page, where the EPs page keeps Simple Mode. A game is played on the table, so
// during one the button is only its space.
export function SingleModeButton({ single, isGameActive }) {
  if (isGameActive) return <span className="epl-mode-spacer" />;
  return (
    <button type="button" className={`epl-mode${single.on ? ' epl-mode--simple' : ''}`} onClick={single.toggle}>
      {single.on ? 'Table Mode' : 'Single Mode'}
    </button>
  );
}

// The page heading with the Single Mode button at its right, for a sheet on useLimitsDrill.
export function SingleHeader({ title, single, isGameActive }) {
  return (
    <div className="epl-header">
      <span className="epl-mode-spacer" />
      <h1>{title}</h1>
      <SingleModeButton single={single} isGameActive={isGameActive} />
    </div>
  );
}

// Single Mode for a sheet on useLimitsDrill: the cards share the drill's answers. A right answer
// turns green as it is typed and Enter checks, as on the sheet; a game is played on the table,
// and the table's Random Mode stops when the cards come up. `onKeyDown` replaces the drill's.
export function useDrillSingle(drill, cards, fieldsOf, isGameActive) {
  const single = useSingleMode(cards, { fieldsOf, results: drill.results, fill: drill.fill });
  useEffect(() => {
    if (isGameActive) single.exit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameActive]);
  useEffect(() => {
    if (single.on) drill.stopRandom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single.on]);

  const onChange = (key, value) => {
    const marks = drill.onChange(key, value, single.owns(key));
    if (marks) single.after(marks);
  };
  const onKeyDown = (e) => {
    if (single.on && e.key === 'Enter' && e.target.tagName === 'INPUT') {
      single.after(drill.check());
      return;
    }
    drill.onKeyDown(e);
  };
  return { single, inp: singleInput(drill.value, onChange, drill.inputClass), onKeyDown };
}
