#!/usr/bin/env node
//
// The NIFE flight-stage syllabus document, from the Master Curriculum Guide (NASCINST 1542.1B,
// 11 Jul 2025), Chapter 4. Publishes it as `nife-flight`, the built-in syllabus of the
// /nife/discuss mount.
//
//   DISCUSS_ADMIN_TOKEN=... node tools/nife-syllabus.js --api=http://localhost:8787/discuss
//
//   --api=<url>   the API base (default: the production API Gateway stage)
//   --dry-run     print the document and publish nothing
//
// Three things about its shape:
//
//   - **No `flow`.** The MCG prints no course-flow figure worth tracing, and the flight stage
//     is six blocks and twenty events — a list reads better than a chart would, and
//     CourseFlow renders nothing when a syllabus carries none.
//   - **The flight stage only.** The MCG's other two stages, Administration and NIFE 1
//     (Academics), are classroom training with no discuss items, and an unbriefed block is not
//     drawn anywhere once there is no chart. Adding ~100 academic events would show nothing.
//   - **Item rows carry the MCG's own wording and no slug yet.** A `{ label }` row is an item
//     with no page, which is what the hub should say until one is written; a row is given its
//     `slug` as its page is published. Capitalized, per the Manual of Style: the label is the
//     name a list prints, not a lowercase fragment.

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : null;
};
const API = value('api') || 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod/discuss';
const TOKEN = process.env.DISCUSS_ADMIN_TOKEN || value('token');

const EPS = '/nife/eps-limits';

// Block skeleton. `briefed` is per block and is read off the MCG's own entry: only C21, C41,
// C42 and C43 carry a "d. Discuss Items" section.
const BLOCKS = [
  {
    id: 'C01',
    stage: 'C',
    media: 'Class',
    title: 'Ground School',
    blkName: 'GS',
    briefed: false,
    events: [
      { id: 'C0101', title: 'GS 1: NIFE Ground School Publications' },
      { id: 'C0102', title: 'GS 2: Crew Resource Management' },
      { id: 'C0103', title: 'GS 3: Naval Aviation Safety Program' },
      { id: 'C0104', title: 'GS 4: Operational Risk Management' },
      { id: 'C0105', title: 'GS 5: G-Tolerance Improvement' },
      { id: 'C0106', title: 'GS 6: Systems/Instruments' },
      { id: 'C0107', title: 'GS 7: Fundamentals of Flight (FTI)' },
      { id: 'C0108', title: 'GS 8: Comms/Flight Publications' },
      { id: 'C0190', title: 'Ground School Exam' },
      { id: 'C0109', title: 'Ground School Remediation' },
    ],
  },
  {
    id: 'C11',
    stage: 'C',
    media: 'Class',
    title: 'Flight Support',
    blkName: 'FS',
    briefed: false,
    events: [
      { id: 'C1101', title: 'CFI Flight Procedures Brief' },
      { id: 'C1102', title: 'Introduction to Preflight Procedures' },
    ],
  },
  {
    id: 'C21',
    stage: 'C',
    media: 'CPT',
    title: 'Cockpit Procedure Trainer',
    blkName: 'CPT',
    briefed: true,
    events: [
      { id: 'C2101', title: 'Introduction to Flows, Checklists, and Procedures' },
      { id: 'C2102', title: 'Flows, Checklists, and Procedures Mastery' },
    ],
  },
  {
    id: 'C41',
    stage: 'C',
    media: 'Single Engine Land Aircraft',
    title: 'Day Contact',
    blkName: 'DC1',
    briefed: true,
    events: ['C4101', 'C4102', 'C4103', 'C4104'].map((id) => ({ id })),
  },
  {
    id: 'C42',
    stage: 'C',
    media: 'Single Engine Land Aircraft',
    title: 'Day Contact',
    blkName: 'DC2',
    briefed: true,
    events: ['C4201', 'C4202'].map((id) => ({ id })),
  },
  {
    id: 'C43',
    stage: 'C',
    media: 'Single Engine Land Aircraft',
    title: 'Check Flight',
    blkName: 'CF',
    briefed: true,
    events: [{ id: 'C4390' }],
  },
];

// The discuss items each event briefs, in the MCG's order and wording.
const ITEMS = {
  C2101: [
    '"I\'M SAFE" checklist',
    'Aircraft documentation/airworthiness (AROW)',
    'Aircraft preflight inspection',
    'Runway incursion avoidance',
    'Engine run up procedures and limitations',
    'Takeoff brief',
  ],
  C2102: [
    'ORM',
    'CRM',
    'Turn pattern',
    'Level speed change',
    'Power off stall',
    'Power on stall',
    'Normal takeoff and climb',
    'Power, Attitude, Trim (PAT) Principle',
    'Traffic pattern',
    '4 "Ts"',
  ],
  C4101: [
    'See and avoid doctrine',
    'Scan pattern and sight picture',
    'Instrument usage during VFR flying',
    'Wake turbulence/windshear',
    'Standard operating procedures',
  ],
  C4102: [
    'Racetrack pattern procedures',
    'Towered ops vs. CTAF',
    'Waveoff',
    'Electrical fire in flight',
  ],
  C4103: [
    'Class "C" airspace',
    'Cloud clearances',
    'Engine fire during start',
    'Aborted takeoff',
  ],
  C4104: [
    'Loss communication',
    'ATC light gun signals',
    'Engine failure after takeoff',
  ],
  C4201: [
    'Crosswind landing',
    'Slip to land',
    'ELP profile',
    'Engine failure during flight',
  ],
  // The catch-alls. "Any aircraft limits" and "any EP" are the limits and EP tab rather than
  // pages of their own, the way Primary's EP wordings link to /tw4/eps-limits; SOP knowledge
  // is a page, and gets its slug when it is written.
  C4202: [
    { href: EPS, label: 'Any aircraft limits' },
    { href: EPS, label: 'Any EP (IP choice)' },
    'SOP knowledge',
  ],
  C4390: [
    'Any previously discussed items',
    'Any maneuver or procedure',
    { href: EPS, label: 'Any EP (IP choice)' },
    'Local area procedures',
  ],
};

const row = (x) => (typeof x === 'string' ? { label: x } : x);

const EVENTS = Object.entries(ITEMS).map(([id, items]) => ({ id, items: items.map(row) }));

const doc = {
  version: 1,
  aircraft: 'C172',
  school: 'NIFE',
  source: {
    citation: 'NIFE MCG',
    date: '11JUL25',
  },
  // One stage: the MCG's NIFE 2. See the header.
  stages: [{ id: 'C', label: 'Flight', graded: true }],
  blocks: BLOCKS,
  events: EVENTS,
};

async function main() {
  if (flag('dry-run')) {
    console.log(JSON.stringify(doc, null, 2));
    return;
  }
  if (!TOKEN) throw new Error('DISCUSS_ADMIN_TOKEN is not set');
  const res = await fetch(`${API}/import-syllabus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': TOKEN },
    body: JSON.stringify({ id: 'nife-flight', name: 'NIFE Syllabus', doc }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
  const events = EVENTS.length;
  const items = EVENTS.reduce((n, e) => n + e.items.length, 0);
  console.log(`nife-flight rev ${data.rev}: ${BLOCKS.length} blocks, ${BLOCKS.reduce((n, b) => n + b.events.length, 0)} events, ${events} with items, ${items} item rows`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
