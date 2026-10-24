// The course rules route graph as the Practice Flight flies it. The graph (each leg's
// `nextNode` and its landmarks) is the Course Rules page's CourseRulesFeatures.js; a leg's radio
// calls are in the course rules document on the server (courserules/tw4.json), read by the page
// and handed in as `legs`. Nothing here changes either. Pure, so the tests can walk it.

import { crFeatures } from '../CourseRulesFeatures';

export const HOME = 'Point-default-95';

const AIRFIELD = /^K[A-Z]{3}$/;

export const feature = (id) => crFeatures[id];
export const nameOf = (id) => crFeatures[id]?.name || id;
export const isAirfield = (id) => id.startsWith('Point-') && AIRFIELD.test(crFeatures[id]?.name || '');
export const isArea = (id) => id.startsWith('Working Areas-');
export const isPattern = (id) => id.startsWith('Routes-Traffic Patterns-');
// The Maintenance Area is for maintenance and check flights, never a student's, so no leg leads
// there and it is no plan.
const NOT_FLOWN = new Set(['Working Areas-Mustang Maintenance-196']);
const nextOf = (id) => (crFeatures[id]?.nextNode || []).filter((n) => crFeatures[n] && !NOT_FLOWN.has(n));

// The field a leg belongs to: the first part of its folder, "(KNGP) Corpus Christi NAS".
export const fieldOf = (id) => {
  const m = /^\((K[A-Z]{3})\)/.exec(crFeatures[id]?.folderPath || '');
  return m ? m[1] : null;
};

// A working area's group, the name it is filed and flown by ("KINGS 4" for Kings 4 MOA 3).
export function groupOf(id) {
  const name = crFeatures[id]?.name || '';
  if (!isArea(id)) return null;
  if (/^Kings 4/i.test(name)) return 'KINGS 4';
  if (/^Mustang North/i.test(name)) return 'MUSTANG North';
  if (/^Mustang South/i.test(name)) return 'MUSTANG South';
  if (/^Foxtrot/i.test(name)) return 'FOXTROT';
  return name;
}

// An airfield by name and code, "Goliad NOLF (KNGT)", from its folder "(KNGT) Goliad NOLF".
export function fieldLabel(code) {
  const id = Object.keys(crFeatures).find((k) => isAirfield(k) && crFeatures[k].name === code);
  const m = /^\(K[A-Z]{3}\)\s*(.*)$/.exec(crFeatures[id]?.folderPath || '');
  return m && m[1] ? `${m[1]} (${code})` : code;
}

const RUNWAY_NAME = /^\d{2}[LRC]?(\/\d{2}[LRC]?)?$/;

// Where a leg takes you, said the way a pilot would: a working area by its group, a field by
// its name, a runway leg by the field it lands at.
function whereTo(id) {
  if (isArea(id)) return groupOf(id);
  if (isAirfield(id)) return fieldLabel(crFeatures[id].name);
  if (RUNWAY_NAME.test(crFeatures[id]?.name || '') && fieldOf(id)) return fieldLabel(fieldOf(id));
  return crFeatures[id]?.name || id;
}

// What a leg is called on a button. Runway legs are named only by their runway, so they carry
// their field and folder ("KNGP Rusty Departures 13L"); a leg named for how it starts ("Rusty
// Entry", "From PT Rusty") also says where it goes ("Rusty Entry → KINGS 4").
export function labelOf(id) {
  const f = crFeatures[id];
  if (!f) return id;
  if (isAirfield(id)) return fieldLabel(f.name);
  const parts = (f.folderPath || '').split(' > ');
  const field = fieldOf(id);
  const folder = parts.length > 1 ? parts[parts.length - 1] : '';
  if (RUNWAY_NAME.test(f.name)) {
    if (isPattern(id)) return `${f.name} pattern`;
    return [field, folder, f.name].filter(Boolean).join(' ');
  }
  if (isArea(id)) return f.name;
  // A point is named with where it leads ("Camel Humps → Waldron NOLF (KNWL)").
  if (id.startsWith('Point-')) {
    const ahead = [...new Set(nextOf(id).map(whereTo))];
    return ahead.length && ahead.length <= 2 ? `${f.name} → ${ahead.join(' / ')}` : f.name;
  }
  const dests = [...new Set(nextOf(id).map(whereTo))];
  return dests.length && dests.length <= 2 ? `${f.name} → ${dests.join(' / ')}` : f.name;
}

// Every node from which home can still be reached. A choice outside it would strand the
// flight: the Portland departures end at PT Silver and the Nueces ones at PT Sunrise, which
// the route graph takes no further.
export const CAN_GET_HOME = (() => {
  const back = {};
  for (const id of Object.keys(crFeatures)) {
    for (const n of nextOf(id)) (back[n] = back[n] || []).push(id);
  }
  const ok = new Set([HOME]);
  const queue = [HOME];
  while (queue.length) {
    for (const p of back[queue.shift()] || []) {
      if (!ok.has(p)) { ok.add(p); queue.push(p); }
    }
  }
  return ok;
})();

// The choices from a node. Leaving an airfield offers its departures (legs that go somewhere
// other than straight back to the field) and its patterns; elsewhere, whatever comes next.
export function choicesFrom(id) {
  const next = nextOf(id).filter((n) => CAN_GET_HOME.has(n) && n !== id);
  if (!isAirfield(id)) return next;
  return next.filter((n) => isPattern(n) || nextOf(n).some((m) => m !== id));
}

// Departures from the home field.
export const departures = () => choicesFrom(HOME).filter((n) => !isPattern(n));

// How many legs each node is from `target`, for heading there when a stage is skipped.
export function distancesTo(target) {
  const back = {};
  for (const id of Object.keys(crFeatures)) {
    for (const n of nextOf(id)) (back[n] = back[n] || []).push(id);
  }
  const dist = { [target]: 0 };
  const queue = [target];
  while (queue.length) {
    const at = queue.shift();
    for (const p of back[at] || []) {
      if (!(p in dist)) { dist[p] = dist[at] + 1; queue.push(p); }
    }
  }
  return dist;
}

export const TO_HOME = distancesTo(HOME);

// The working areas a flight can be filed to, each with the areas in it.
export const PLANS = (() => {
  const plans = {};
  Object.keys(crFeatures).filter(isArea).filter((id) => CAN_GET_HOME.has(id) && !NOT_FLOWN.has(id)).forEach((id) => {
    const g = groupOf(id);
    (plans[g] = plans[g] || []).push(id);
  });
  return Object.entries(plans).map(([name, areas]) => ({ id: name, label: name, areas }));
})();

// The course rules route from the home field to a plan's working area, leaving on `rwy`:
// the departure leg first, the working area last. It never comes back through the field.
// The shortest course rules route from any of `starts` to a node `isTarget` accepts, never
// passing through an airfield or a working area on the way (the target may be either).
function search(starts, isTarget) {
  const prev = {};
  const queue = [];
  starts.forEach((d) => { prev[d] = null; queue.push(d); });
  while (queue.length) {
    const at = queue.shift();
    if (isTarget(at)) {
      const path = [];
      for (let x = at; x; x = prev[x]) path.unshift(x);
      return path;
    }
    if (prev[at] !== null && (isAirfield(at) || isArea(at))) continue;
    for (const n of choicesFrom(at)) {
      if (n in prev) continue;
      prev[n] = at;
      queue.push(n);
    }
  }
  return null;
}

// The airfields a leg leads on to, before any other airfield or working area: KNGP alone for
// an arrival to PT Shamrock, Goliad alone for a KNGT arrival, none for a leg into an area.
export function fieldsAhead(id) {
  const seen = new Set([id]);
  const queue = [id];
  const found = new Set();
  while (queue.length) {
    for (const n of choicesFrom(queue.shift())) {
      if (seen.has(n)) continue;
      seen.add(n);
      if (isAirfield(n)) found.add(n);
      else if (!isArea(n)) queue.push(n);
    }
  }
  return [...found];
}

// The areas a plan's flight is filed to; `pick` (0 to 1) chooses which, so a flight is not
// always filed to area 1.
export function areaOf(plan, pick = 0) {
  const all = (PLANS.find((p) => p.id === plan) || {}).areas || [];
  return all.length ? all[Math.min(all.length - 1, Math.floor(pick * all.length))] : null;
}

// Leaving the home field off `rwy`, the route to the plan's area: departure first, area last.
export function routeTo(plan, rwy, pick = 0) {
  const area = areaOf(plan, pick);
  return area ? search(departures().filter((d) => runwayOf(d) === rwy), (n) => n === area) : null;
}

// Leaving the home field off `rwy`, the route to an outlying field (for low work first).
export function routeToField(field, rwy) {
  return search(departures().filter((d) => runwayOf(d) === rwy), (n) => n === field);
}

// From an outlying field, the route on to the plan's area: one of its departures first.
export function routeFromField(field, area) {
  return search(choicesFrom(field).filter((n) => !isPattern(n)), (n) => n === area);
}

// The outlying fields a flight can do its low work at before its area: reachable off the
// runway, with a course rules route on from them to the area.
export function fieldsFor(plan, rwy, pick = 0) {
  const area = areaOf(plan, pick);
  return Object.keys(crFeatures)
    .filter((id) => isAirfield(id) && id !== HOME)
    .filter((id) => routeToField(id, rwy) && routeFromField(id, area));
}

// A field's everyday name: "Goliad" for "(KNGT) Goliad NOLF".
export function shortName(id) {
  const m = /^\(K[A-Z]{3}\)\s*(\S+)/.exec(crFeatures[id]?.folderPath || '');
  return m ? m[1] : crFeatures[id]?.name || id;
}

// The names a leg leads to, for picking the right one of a call's alternatives.
export const destinationsOf = (id) => nextOf(id).map(whereTo);

// The runway a departure or pattern leg is flown from ("13L", or "13L" from "13L/31R").
export const runwayOf = (id) => {
  const m = /^(\d{2}[LRC]?)/.exec(crFeatures[id]?.name || '');
  return m ? m[1] : null;
};

// A leg's calls, split by who makes them: a call with no `who`, or `who: 'AIRCRAFT'`, is the
// pilot's; any other `who` is a station answering. A ground call (Channel 3, Navy Corpus
// Ground) is made on the ground, before the leg is flown.
export function legCalls(id, legs) {
  const comms = (legs && legs[id] && legs[id].comms) || [];
  const mine = (c) => !c.who || c.who === 'AIRCRAFT';
  const ground = (c) => mine(c) && (/^CH 3 UHF/.test(c.radio || '') || /^Navy Corpus Ground/.test(c.text));
  const shape = (c) => ({ who: mine(c) ? 'you' : c.who, text: c.text, radio: c.radio, when: c.when, after: c.after });
  return {
    ground: comms.filter(ground).map(shape),
    air: comms.filter((c) => !ground(c)).map(shape),
  };
}
