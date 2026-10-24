// High work in a working area: the FAM FTI's stalls, spin and unusual attitudes in the order
// the flight flies them, each set up at an altitude the student picks. Pure.
//
// The altitude is worked out as the flight goes: after each maneuver the student is told
// where it left them and decides where to set up the next, and is held to the block: never
// within 500 feet of its floor or its ceiling, before or after a maneuver. A setup that would
// break that (or the spin's own entry and recovery altitudes) is refused, with the reason.
//
// What each maneuver gains or loses is the FTI's figure where it gives one:
// - Power-on stall: "An entry speed of 150 KIAS results in about 1500-2000 feet altitude gain"
//   (§518, p. 5-25).
// - ELP stall: 500-1500 feet in all (the user's figure, 2026-10-24; the FTI's "at least 800
//   feet during the recovery", §519, p. 5-28, is for the recovery alone).
// - Spin: 700-800 feet gained slowing to the stall before the spin begins, then, from there,
//   "approximately 2-3 seconds per turn with altitude loss of 400-500 feet per turn" (§522,
//   p. 5-33), 2000-3000 feet with the recovery (the user's figures, 2026-10-23 and -24). The
//   altitude the spin begins at is the one held to the 13,500 feet entry minimum.
// - G-Warm: the nose is let "drop slightly below the horizon (no more than 10 degrees)" for
//   4-5 breathing cycles (§905, p. 9-5); 0-500 feet is this page's estimate.
// - Landing pattern stall: "recover with minimal altitude loss" (§520); 200-700 feet (the
//   user's figure, 2026-10-24).
// - Contact unusual attitudes: taken as neutral.
// The spin is entered no lower than 13,500 feet and recovered before 10,000 feet (§522: "below
// 22,000 feet pressure altitude, and recovered before 10,000 feet pressure altitude. Minimum
// entry altitude is 13,500 feet AGL"); the working areas' ground is near sea level, so the
// altitudes here are MSL and AGL alike.

//
// `entry` is the airspeed the maneuver is begun at, said in the maneuver brief: the G-Warm's
// "200-220 KIAS" (§905), the power-on stall's 150 KIAS entry (§518), the spin's slow cruise
// "150 KIAS" (§522), the ELP stall's "150 KIAS" (§519) and the landing pattern stall's downwind
// "120 KIAS" (§520). The FTI gives none for contact unusual attitudes, which the IP sets up.
export const MANEUVERS = {
  gWarm: { label: 'G-Warm', brief: 'a G-ex', entry: '200-220 KIAS', change: [-500, 0], estimate: true },
  powerOnStall: { label: 'Power-on stall', brief: 'a power-on stall', entry: '150 KIAS', change: [1500, 2000] },
  // From the setup: up 700-800 to the spin's start, then down 2000-3000.
  spin: { label: 'Spin', brief: 'a spin', entry: '150 KIAS', climbFirst: [700, 800], change: [700 - 3000, 800 - 2000], minEntry: 13500, recoverAbove: 10000 },
  elpStall: { label: 'ELP stall', brief: 'an ELP stall', entry: '150 KIAS', change: [-1500, -500] },
  landingPatternStall: { label: 'Landing pattern stall', brief: 'a landing pattern stall', entry: '120 KIAS', change: [-700, -200] },
  cuas: { label: 'Contact unusual attitudes', brief: 'contact unusual attitudes', change: [0, 0] },
};

// Always the G-Warm first. Then the high block's order climbs (the power-on stall) and spends
// altitude after; the low block spins first, the only place in it high enough to.
export const ORDERS = {
  high: ['gWarm', 'powerOnStall', 'spin', 'elpStall', 'landingPatternStall', 'cuas'],
  low: ['gWarm', 'spin', 'elpStall', 'powerOnStall', 'landingPatternStall', 'cuas'],
};

const BUFFER = 500;

// The block a flight works in (Course Rules Manual: KINGS 4 MOA, 2-24; MUSTANG working
// altitudes), the altitude it arrives at, and the maneuvers' order. Null where there is no
// high work (FOXTROT's middle block is too low to spin in).
export function blockFor(group, which) {
  if (group === 'KINGS 4') {
    // Entered on the transition layer: "Maintain 14,500' MSL until within the lateral confines".
    return which === 'low'
      ? { name: 'Low block', bottom: 9000, top: 14000, arrive: 14500, order: ORDERS.low }
      : { name: 'High block', bottom: 15000, top: 22000, arrive: 14500, order: ORDERS.high };
  }
  if (/^MUSTANG|^Mustang/.test(group || '')) {
    // "Working altitudes are 6500' MSL to 15,000' MSL"; arriving at the transition's 5,500.
    return { name: 'Working altitudes', bottom: 6500, top: 15000, arrive: 5500, order: ORDERS.high };
  }
  return null;
}

const ft = (n) => `${Math.round(n).toLocaleString('en-US')}'`;
export const limits = (block) => ({ floor: block.bottom + BUFFER, ceiling: block.top - BUFFER });

// Why setting up `maneuver` at `alt` would break the block or the maneuver, or null if it won't.
export function problemWith(maneuver, alt, block) {
  const m = MANEUVERS[maneuver];
  const { floor, ceiling } = limits(block);
  const [lo, hi] = m.change;
  if (alt < floor) return `${ft(alt)} is below ${ft(floor)}, 500 feet above the bottom of the block.`;
  if (alt > ceiling) return `${ft(alt)} is above ${ft(ceiling)}, 500 feet below the top of the block.`;
  if (alt + lo < floor) return `${m.label} can lose ${ft(-lo)}: from ${ft(alt)} that is ${ft(alt + lo)}, below ${ft(floor)}.`;
  if (alt + hi > ceiling) return `${m.label} can gain ${ft(hi)}: from ${ft(alt)} that is ${ft(alt + hi)}, above ${ft(ceiling)}.`;
  // A spin climbs before it starts: that peak stays in the block (its top, not 500 feet under
  // it, or the low block could never hold a spin begun at 13,500), and the start is the altitude
  // held to the entry minimum.
  const [up, top] = m.climbFirst || [0, 0];
  if (alt + top > block.top) return `${m.label} climbs about ${ft(top)} before it starts: from ${ft(alt)} that is ${ft(alt + top)}, above the top of the block, ${ft(block.top)}.`;
  if (m.minEntry && alt + up < m.minEntry) return `A spin is entered no lower than ${ft(m.minEntry)}: from ${ft(alt)} it starts about ${ft(alt + up)}.`;
  if (m.recoverAbove && alt + lo < m.recoverAbove) return `A spin is recovered before ${ft(m.recoverAbove)}: from ${ft(alt)} it could end at ${ft(alt + lo)}.`;
  return null;
}

// The altitudes a maneuver can be set up at without breaking the block or the maneuver.
export function setupWindow(maneuver, block) {
  const m = MANEUVERS[maneuver];
  const { floor, ceiling } = limits(block);
  const [lo, hi] = m.change;
  return {
    lo: Math.max(floor, floor - lo, m.minEntry ? m.minEntry - (m.climbFirst || [0])[0] : 0, m.recoverAbove ? m.recoverAbove - lo : 0),
    hi: Math.min(ceiling, ceiling - hi, block.top - (m.climbFirst || [0, 0])[1]),
  };
}

// The altitude spent getting to each setup, against the least it could have been. `flown` is
// [{ maneuver, at, alt }]: where each was set up and where it left the aircraft, in order, from
// `arrive`. The least is over every order the maneuvers could have been flown in (the G-Warm
// first, contact unusual attitudes last), each gaining or losing what it did when flown. For an
// order, the least moves no further than into each maneuver's window from where the last one
// left the aircraft: moving further inside a window saves at most what it costs.
const spentIn = (order, block, arrive) => {
  let ideal = arrive;
  let best = 0;
  order.forEach(({ maneuver, at, alt }) => {
    const w = setupWindow(maneuver, block);
    const to = Math.min(w.hi, Math.max(w.lo, ideal));
    best += Math.abs(to - ideal);
    ideal = to + (alt - at);
  });
  return best;
};
// Every order of a list, each distinct one once (a power-on stall flown twice is one way, not
// two), and no more than `cap` of them: a flight that repeats a maneuver many times is judged
// on the first orders found.
function orders(list, cap = 5040) {
  const out = [];
  const walk = (left, done) => {
    if (out.length >= cap) return;
    if (!left.length) { out.push(done); return; }
    const seen = new Set();
    left.forEach((x, i) => {
      if (seen.has(x.maneuver)) return;
      seen.add(x.maneuver);
      walk([...left.slice(0, i), ...left.slice(i + 1)], [...done, x]);
    });
  };
  walk(list, []);
  return out;
}

export function transit(flown, block, arrive) {
  let was = arrive;
  let climbed = 0;
  let descended = 0;
  flown.forEach(({ at, alt }) => {
    if (at > was) climbed += at - was;
    else descended += was - at;
    was = alt;
  });
  const first = flown.filter((f) => f.maneuver === 'gWarm');
  const last = flown.filter((f) => f.maneuver === 'cuas');
  const middle = flown.filter((f) => f.maneuver !== 'gWarm' && f.maneuver !== 'cuas');
  let best = Infinity;
  let order = flown;
  orders(middle).forEach((o) => {
    const all = [...first, ...o, ...last];
    const spent = spentIn(all, block, arrive);
    if (spent < best) { best = spent; order = all; }
  });
  return { climbed, descended, spent: climbed + descended, best: flown.length ? best : 0, order: order.map((f) => f.maneuver) };
}

// The altitudes offered to set up at: every thousand feet inside the block's limits, its limits
// themselves, and where the aircraft is now.
export function setups(alt, block) {
  const { floor, ceiling } = limits(block);
  const set = new Set([floor, ceiling]);
  for (let a = Math.ceil(floor / 1000) * 1000; a <= ceiling; a += 1000) set.add(a);
  if (alt >= floor && alt <= ceiling) set.add(alt);
  return [...set].sort((a, b) => b - a);
}

export const describe = (maneuver) => {
  const m = MANEUVERS[maneuver];
  const [lo, hi] = m.change;
  if (!lo && !hi) return 'about level';
  const est = m.estimate ? ' (estimate)' : '';
  return hi > 0 ? `gains about ${ft(lo)}-${ft(hi)}` : `loses about ${ft(-hi)}-${ft(-lo)}${est}`;
};

// Where a maneuver leaves the aircraft: somewhere in its range, the same for the same flight
// and maneuver, to the nearest 50 feet.
export function after(maneuver, alt, chance) {
  const [lo, hi] = MANEUVERS[maneuver].change;
  return Math.round((alt + lo + (hi - lo) * chance) / 50) * 50;
}

export const label = (target, alt) => (target === alt ? `Set up here, ${ft(alt)}` : `${target > alt ? 'Climb' : 'Descend'} to ${ft(target)}`);
export { ft };
