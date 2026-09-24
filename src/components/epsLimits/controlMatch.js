// Matching the control a student clicked against the control a step names.
//
// A checklist spells one physical control several ways. The T-44C prints `Condition Lever`,
// `Condition Levers` and `Condition Lever (Failed Engine)` for the one pedestal lever, and the
// C172's mags key writes `Mags` in six steps and `Cranking` in one. A poster carries one record
// per physical control, so the record lists the wordings it answers for in `also`, and
// everything here compares through that list.
//
// This is deliberately NOT a fuzzy matcher. Primary's is — `clickableControls` in TW4Cockpit.js
// is 130 keys of substring tokens — and the cost is that a token added for one control quietly
// starts matching another. Here a record says what it answers for and nothing else does.
//
// The step text itself is never edited to make a click work. It is the checklist's own wording,
// which the Instructions modal tells the student to type verbatim, so the site would be out of
// step with the publication. `fill` in EPDrill.js resolves the spelling at the point of use
// instead.

// A step's control is the text before " - ".
export const controlOf = (text) => String(text || '').split(' - ')[0].trim();

// Case and a trailing plural are a sheet's own inconsistency, not a different control:
// `Landing Gear`/`Landing gear`, `Firewall Valve`/`Firewall Valves`, `Fire Extinguisher(s)`.
// `(s)` is stripped before the bare plural so both forms land on the same key. Applied to both
// sides of every comparison, so it can only ever merge a pair, never mismatch one.
export const normControl = (s) => String(s || '')
  .toLowerCase()
  .trim()
  .replace(/\(s\)$/, '')
  .replace(/s$/, '');

// Wordings that are the same control but share no stem — the ones a plural rule cannot reach.
// A school overrides this with a map derived from its own poster data (`aliasesFrom`), so the
// C172 special case that used to be hard-coded here is now that aircraft's data.
export const DEFAULT_ALIASES = { cranking: 'mag' };

export const canon = (name, aliases = DEFAULT_ALIASES) => {
  const k = normControl(name);
  return (aliases && aliases[k]) || k;
};

export const sameControl = (a, b, aliases) =>
  canon(controlOf(a), aliases) === canon(controlOf(b), aliases);

// Every wording a record answers for. `also` is other spellings of the SAME control, which is
// what the alias map is built from. `actions` is different controls sharing one target — the
// C172's yokes both turn the aircraft towards a landing site and maintain directional control —
// and those must never become aliases of each other, because they are two different steps.
export const wordingsOf = (record) => [
  record.action,
  ...(record.also || []),
  ...(record.actions || []),
].filter(Boolean);

// Does this control record answer for `name`? Used to ring a hotspot or a button on Hint.
export const matches = (record, name, aliases) => {
  if (!record || !name) return false;
  const want = canon(name, aliases);
  return wordingsOf(record).some((a) => canon(a, aliases) === want);
};

// Which of a multi-action record's actions to write. A yoke carries two steps, so it fills
// whichever one the checklist is asking for next, and falls back to the first when it is asking
// for neither. A record with one action always answers with it.
export const actionFor = (record, next, aliases) => {
  const list = record.actions || [];
  if (!list.length) return record.action;
  return list.find((a) => canon(a, aliases) === canon(next, aliases)) || list[0];
};

// The settings a record can write for one of its controls, clicked through in order.
//
// `values` is normally a plain list, because a record is normally one control. A target standing
// for two controls needs a list for each, so it may instead be a map keyed by the control's own
// wording — the T-44C's attitude indicator answers `Pitch` with two attitudes and `Wings` with
// `Level`, and one shared list would offer a pitch setting to the wings step. The C172's yokes
// need neither, because their two steps carry no setting at all.
// A record field that is either written once for the record, or once per control it stands for —
// a map keyed by the control's own wording. `values` and `fills` both take this shape.
const perAction = (v, action, aliases) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'object' || Array.isArray(v)) return v;
  const want = canon(action, aliases);
  const key = Object.keys(v).find((k) => canon(k, aliases) === want);
  return key ? v[key] : undefined;
};

export const valuesFor = (record, action, aliases) =>
  perAction((record || {}).values, action, aliases) || [];

// The part of a step's answer this control supplies, for a step that takes more than one control.
// Undefined where a control answers the whole step, which is almost all of them: only the T-44C's
// Vx climb is split, between the airspeed tape and the terrain warning lights.
export const fillsFor = (record, action, aliases) =>
  perAction((record || {}).fills, action, aliases);

// The alias map a poster implies: every wording in a record's `also` points at that record's
// own action. Derived rather than written twice, so `also` stays the single source of truth for
// what counts as one control.
export const aliasesFrom = (poster) => {
  const out = {};
  const records = [
    ...(poster.regions || []).flatMap((r) => r.spots || []),
    ...(poster.actions || []),
  ];
  for (const rec of records) {
    for (const alt of rec.also || []) out[normControl(alt)] = normControl(rec.action);
  }
  return out;
};
