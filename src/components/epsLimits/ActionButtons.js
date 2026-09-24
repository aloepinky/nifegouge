import React from 'react';
import { matches } from './controlMatch';

// The steps no control performs. Every checklist has them — Declare MAYDAY, Evacuate Aircraft,
// Land As Soon As Possible, Maintain Directional Control — and a poster has nowhere to put them,
// because there is nothing on the panel to point at. Primary's answer is a row of plain buttons
// beside its cockpit, and this is that, shared.
//
// It also takes a control the drawing genuinely does not show, which belongs here rather than as
// an invented box on the picture: a target pointing at a control that is not drawn teaches a
// panel the student will never sit behind.
//
// A control can be both. The C172's yokes are click targets AND buttons, because a student
// reaching for "turn towards the nearest suitable landing site" may think of it either as flying
// the aeroplane or as an item on a list.
//
// A record is the same shape a hotspot uses, minus the `box` — which is what decides which of
// the two it is. `label` is the caption, deliberately shorter than what gets written: the button
// reading MAYDAY fills in "Declare - MAYDAY". Pressing one answers the open step with that
// step's own text if it names this control, and marks it red if it does not — stepFlow.js, the
// same rule as a hotspot and the same rule as Primary.
//
// One column by default, because the two side slots are narrow and a two-column grid there makes
// every caption wrap. A school with a long list passes `columns={2}` and keeps one side.
//
// They wear Primary's own `.action-button`, so the two pages look like one site and a restyle of
// Primary carries here. `.epl-action` only overrides what a narrow column forces: the caption
// wraps instead of being clipped to an ellipsis, which in a 200px column would hide half of
// "Fire Extinguisher".

export default function ActionButtons({
  title = null, actions, columns = 1, fill, hint, aliases,
}) {
  return (
    <div className="epl-action-group">
      {title && <h4>{title}</h4>}
      <div className="epl-actions" style={{ '--epl-action-cols': columns }}>
        {actions.map((rec) => (
          <button
            key={rec.action}
            type="button"
            className={`action-button epl-action${matches(rec, hint, aliases) ? ' epl-hint' : ''}`}
            title={rec.action}
            onClick={() => fill(rec.action, rec.fills)}
          >
            {rec.label}
          </button>
        ))}
      </div>
    </div>
  );
}
