// Taxi routes at Navy Corpus, out from the run-up to each runway and in from each runway to
// the line, as Ground might give them. Pure.
//
// They are read off the KNGP Diagram (TW-4 In Flight Guide, p. 22) and are made up for
// practice: no publication lists them, and on the day Ground gives the route. What fixes them:
// - South Flow (13L/R, 18, 22) runs up at Sierra and North Flow (04, 31L/R, 36) at Echo
//   (Course Rules Manual 2-1). From Sierra the way out is Charlie onto runway 4/22, holding
//   short of 13L/R and 18 on it (2-3); the study guide's 13L clearance is "via Sierra, Charlie,
//   RWY 22, cross RWY 18" (Checklist Study Guide, Encl 1).
// - From Echo: Yankee runs to the 31s' ends, crossing 31R to reach 31L, and Zulu from there to
//   36; Echo itself crosses 13L/31R, 18/36 and 13R/31L, in that order going west (NAS Corpus
//   Christi Air Operations Manual, NASCCINST 3710.13S, runway crossings). Yankee runs between
//   31R and 31L, so a taxi to 36 crosses both on Yankee and takes Zulu last.
// - Inbound in South Flow is by Yankee, not 4/22 (Course Rules Manual 2-1, (2)); Bravo leads
//   from Yankee to the line: Ground routes South Flow traffic back through Bravo. A North Flow landing rolls out towards 4/22 or
//   Charlie and comes back by them.
// A runway is named the way the flight is moving along it ("runway 22" heading southwest from
// Charlie, "runway 4" heading back), and a runway crossed by the flow in use ("cross 31R" in
// North Flow, "cross 13L" in South).

const NORTH = { '13L': '31R', '13R': '31L', 18: '36' };
const named = (rwy, north) => (north ? NORTH[rwy] || rwy : rwy);

const OUT = {
  '13L': ['Sierra', 'Charlie', 'runway 22', { cross: ['18'] }],
  '13R': ['Sierra', 'Charlie', 'runway 22', { cross: ['18', '13L'] }],
  18: ['Sierra', 'Charlie', 'runway 22'],
  22: ['Sierra', 'Charlie'],
  '31R': ['Echo', 'Yankee'],
  '31L': ['Echo', 'Yankee', { cross: ['13L'] }],
  36: ['Echo', 'Yankee', { cross: ['13L', '13R'] }, 'Zulu'],
  '04': ['Echo', { cross: ['13L', '18', '13R'] }],
};

// Where the landing rolls out and leaves the runway, and the way to the line from there.
const IN = {
  // Off the 13s at Echo, short of Yankee (the user's correction, 2026-10-25): Yankee isn't
  // reached from 13L's rollout.
  '13L': { exit: 'Echo', route: ['Echo', 'Yankee', 'Bravo'] },
  '13R': { exit: 'Echo', route: ['Echo', { cross: ['18', '13L'] }, 'Yankee', 'Bravo'] },
  18: { exit: 'Echo', route: ['Echo', { cross: ['13L'] }, 'Yankee', 'Bravo'] },
  22: { exit: 'Echo', route: ['Echo', { cross: ['13R', '18', '13L'] }, 'Yankee', 'Bravo'] },
  '31R': { exit: 'runway 4', route: ['runway 4', { cross: ['18'] }, 'Charlie'] },
  '31L': { exit: 'runway 4', route: ['runway 4', { cross: ['13L', '18'] }, 'Charlie'] },
  36: { exit: 'runway 4', route: ['runway 4', 'Charlie'] },
  '04': { exit: 'Charlie', route: ['Charlie'] },
};

const and = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0]);

// "via Sierra, Charlie, runway 22, cross 18 and 13L", and the runways crossed.
function said(route, north) {
  const crossed = [];
  const parts = route.map((p) => {
    // Taxiing on a runway clears it as a crossing does.
    if (typeof p === 'string') {
      const on = /^runway (\S+)$/.exec(p);
      if (on) crossed.push(on[1]);
      return p;
    }
    const rwys = p.cross.map((r) => named(r, north));
    crossed.push(...rwys);
    return `cross ${and(rwys)}`;
  });
  return { via: parts.join(', '), crossed };
}

const flowOf = (rwy) => ['04', '31L', '31R', '36'].includes(rwy);

export function taxiOut(rwy) {
  const route = OUT[rwy];
  if (!route) return null;
  return { runUp: flowOf(rwy) ? 'Echo' : 'Sierra', ...said(route, flowOf(rwy)) };
}

export function taxiIn(rwy) {
  const way = IN[rwy];
  if (!way) return null;
  return { exit: way.exit, ...said(way.route, flowOf(rwy)) };
}

export const TAXI_REF = { work: 'TW-4 In Flight Guide', loc: 'KNGP Diagram', pages: 'p. 22' };
