// The T-44C's course rules for the Practice Flight: Course Rules Manual Chapter 3 (Advanced),
// cut into the pieces revealed one at a time. Pure data, no JSX. Each piece's words are the
// manual's (tools/practice-t44c-verify.js finds them); `fly` is what the piece puts on the
// readout. `leg` names a line in public/kml/t44c-routes.kml (the departure and the transitions
// take the runway after it, since each is drawn from that runway's beach crossing).
//
// Only routes the manual gives for that origin and destination are here. It gives the Cabaniss
// arrivals from North, Central and South Seagull, so Foxtrot and Cheetah recover to Navy Corpus.

const m = (loc, pages) => ({ work: 'Course Rules Manual', loc: `Ch. 3 — ${loc}`, pages });
const p = (t, fly) => ({ t, ...(fly ? { fly } : {}) });

// Blocks: the In Flight Guide's area pages (Seagull p. 14, Foxtrot p. 15, Cheetah p. 17).
export const AREAS = {
  'seagull-n': { family: 'seagull', name: 'North Seagull', word: 'north', poly: 'Seagull North', radial: '100', dme: '33', exitLeg: 'North/Central Seagull exit' },
  'seagull-c': { family: 'seagull', name: 'Central Seagull', word: 'central', poly: 'Seagull Central', radial: '100', dme: '33', exitLeg: 'North/Central Seagull exit' },
  'seagull-s': { family: 'seagull', name: 'South Seagull', word: 'south', poly: 'Seagull South', radial: '156', dme: '45', exitLeg: 'South Seagull exit' },
  'foxtrot-1': { family: 'foxtrot', name: 'Foxtrot 1', word: 'Foxtrot 1', poly: 'Foxtrot 1', exitLeg: 'Foxtrot to Shamrock' },
  'foxtrot-2': { family: 'foxtrot', name: 'Foxtrot 2', word: 'Foxtrot 2', poly: 'Foxtrot 2', exitLeg: 'Foxtrot to Shamrock' },
  'cheetah-n': { family: 'cheetah', name: 'North Cheetah', word: 'North Cheetah', poly: 'Cheetah North', exitLeg: 'Cheetah to Shamrock' },
  'cheetah-s': { family: 'cheetah', name: 'South Cheetah', word: 'South Cheetah', poly: 'Cheetah South', exitLeg: 'Cheetah to Shamrock' },
};

export const SEAGULL_BLOCKS = {
  2: { word: 'two', bottom: 4000, top: 6000 },
  3: { word: 'three', bottom: 7000, top: 9000 },
  4: { word: 'four', bottom: 10000, top: 12000 },
};
export const FOXTROT_LOW = { name: 'Low Block', bottom: 4000, top: 5999 };
export const CHEETAH_BLOCKS = {
  'cheetah-n': { A: { bottom: 6000, top: 7999 }, B: { bottom: 9000, top: 11000 } },
  'cheetah-s': { A: { bottom: 6000, top: 7999 }, B: { bottom: 9000, top: 10999 }, C: { bottom: 12000, top: 14000 } },
};

const BEACHLINE = m('Beachline Departures', 'p. 3-3');
export const BEACHLINE_REF = BEACHLINE;
export const BEACHLINE_FIRST = [p("Climb to 500' MSL on...", { alt: "500'" })];
export const BEACHLINE_RUNWAY = {
  '13L': [p('13L: HDG 125° until High Bridge. Thence...', { hdg: '125°' })],
  '13R': [p('13R: HDG 135° until High Bridge. Thence...', { hdg: '135°' })],
  '31L': [p('31L: HDG 305°. When cleared by tower...', { hdg: '305°' })],
  '31R': [p("31R: HDG 315°. Passing 300' AGL execute right turn HDG 105°. When clear of pattern...", { hdg: '315° then 105°' })],
  '04': [p('4, 36: RWY HDG. When clear of pattern', { hdg: 'RWY' })],
  36: [p('4, 36: RWY HDG. When clear of pattern', { hdg: 'RWY' })],
  18: [p('18, 22: RWY HDG until departure end of the runway. Thence...', { hdg: 'RWY' })],
  22: [p('18, 22: RWY HDG until departure end of the runway. Thence...', { hdg: 'RWY' })],
};
export const BEACHLINE_LAST = [
  p("Turn HDG 105° toward the beachline and climb to 2500' MSL.", { hdg: '105°', alt: "2,500'", kias: '150 climb' }),
];
export const BEACHLINE_CONTACT = [p('When directed, contact Corpus Departure CH 8.')];

const SEAGULL_ENTRY = m('Seagull Area Entry', 'p. 3-12');
const SEAGULL_ENTRY_CS = m('Seagull Area Entry', 'p. 3-13');
const TRANSITIONS = m('Beachline Transitions', 'p. 3-4');

export const ENTRY = {
  'seagull-n': {
    before: { ref: SEAGULL_ENTRY, leg: 'To North Seagull', pieces: [
      p("After crossing the beach line, proceed direct to the CRP 100/26 fix at 3500' MSL.", { alt: "3,500'", kias: '200 level' }),
      p('Crossing the CRP 100/26, fly HDG 040° to avoid opposite-direction aircraft descending out of the North Block.', { hdg: '040°' }),
    ] },
    after: { ref: SEAGULL_ENTRY, pieces: [
      p('During climb, stay greater than five miles east of the beach (east of MUSTANG Areas) and west of W-228A/SEAGULL.', { alt: 'Block {blockN}', kias: '150 climb' }),
      p('Passing the lowest altitude of the assigned block, turn eastbound into the assigned block.'),
    ] },
  },
  central: {
    before: { ref: SEAGULL_ENTRY_CS, leg: 'To Central/South Seagull', pieces: [
      p("After crossing the beach line, proceed to the CRP 130/026 fix at 2500' MSL.", { alt: "2,500'", kias: '200 level' }),
      p('From the CRP 130/26, climb on the CRP 130R to assigned block altitude.', { alt: 'Block {blockN}', kias: '150 climb', hdg: 'CRP 130R' }),
      p('Terminate with Corpus Approach and contact SEAGULL at 26 DME, no later than 33.8 DME.'),
    ] },
  },
  foxtrot: {
    before: { ref: TRANSITIONS, leg: 'To Foxtrot', pieces: [
      p("Crossing the beach line, commence turn north to parallel the beach and climb to 5500' MSL at half WTD.", { alt: "5,500'", kias: '150 climb', hdg: 'North, parallel the beach' }),
    ] },
    entry: { ref: m('Foxtrot Area Entry', 'p. 3-14'), pieces: [
      p('Approaching the southern boundary of the FOXTROT Training Area (Aransas Wildlife Airport), terminate with Corpus Approach and switch to FOXTROT Common UHF 337.8 for advisories and area coordination.'),
    ] },
  },
  cheetah: {
    before: { ref: TRANSITIONS, leg: 'To Cheetah', pieces: [
      p("Passing the beach line, turn right and proceed down the beach line at 2500' MSL.", { alt: "2,500'", kias: '200 level' }),
      p("When clear of the CRP 156R begin VFR climb no higher than 5500' MSL until abeam Baffin Bay (to remain clear of South MUSTANG Training Areas).", { alt: "5,500' max", kias: '150 climb' }),
      p('When clear of Baffin Bay, climb to VFR altitude to enter appropriate block.', { alt: 'Block {blockLetter}' }),
    ] },
    entry: { ref: m('Cheetah Area Entry', 'p. 3-17'), pieces: [
      p('Prior to entering CHEETAH, aircrew should make an advisory call on T-44 base frequency to coordinate block assignment and separation.'),
    ] },
  },
};

const SEAGULL_EXIT = m('Seagull Area Exit', 'p. 3-13');
const SOUTH_EXIT = m('Seagull Area Exit', 'p. 3-14');
const ARRIVALS = m('KNGP Arrivals', 'p. 3-36');

export const EXIT = {
  common: { ref: SEAGULL_EXIT, pieces: [p('All aircraft remain within assigned block altitude until established on appropriate descent radial.')] },
  northCentral: { ref: SEAGULL_EXIT, leg: 'North/Central Seagull exit', pieces: [
    p("Descend on the CRP 100R (280° Course) to cross the CRP 100/26 at 1000' MSL (Twin Rigs), then proceed to the water tower just north of Port Royal Resort ~260° turn towards PT SHAMROCK and join the Eastern Arrival.", { alt: "1,000'", hdg: '280°, then ~260°', kias: '200 level' }),
  ] },
  southHome: { ref: SOUTH_EXIT, leg: 'South Seagull exit', pieces: [
    p("Cross the CRP 156/45 at or below 5500' MSL to de-conflict with traffic in MUSTANG area 8.", { alt: "5,500' or below", hdg: '336°' }),
    p("Cross the CRP 156/38 at or below 4500' MSL and continue descent to 1000' MSL to join the Southern Arrival.", { alt: "1,000'" }),
  ] },
  southCabaniss: { ref: SOUTH_EXIT, leg: 'South Seagull to Cabaniss', pieces: [
    p("Cross the CRP 156/43 at 4500' MSL and then comply with Cabaniss arrival procedures", { alt: "4,500'", hdg: '336°' }),
  ] },
  foxtrot: { ref: m('Foxtrot Area Exit', 'p. 3-15'), leg: 'Foxtrot to Shamrock', pieces: [
    p('State area departing and intentions prior to vacating any FOXTROT block on FOXTROT Common UHF 337.8.'),
    p('remain feet wet over Intracoastal to SHAMROCK via the Northern Arrival, and contact Corpus Approach (CH 8) with current ATIS information and intentions no later than abeam Aransas County/Rockport Airport.', { kias: '200 level' }),
  ] },
  northern: { ref: ARRIVALS, pieces: [
    p("Establish the aircraft at 1500' MSL southbound over the intracoastal waterway abeam KRKP.", { alt: "1,500'", hdg: 'South' }),
    p("Descend to 1000' MSL by the Aransas Pass Causeway and proceed direct to PT SHAMROCK.", { alt: "1,000'" }),
  ] },
  cheetah: { ref: m('Cheetah Area Exit', 'p. 3-18'), leg: 'Cheetah to Shamrock', pieces: [
    p("Vacate assigned block and descend to 3,500' MSL, remain clear of any occupied blocks, then proceed north along the beachline.", { alt: "3,500'", hdg: 'North, along the beach' }),
    p("Descend to 1,000' MSL at the CRP 156 radial and proceed to join the Southern arrival.", { alt: "1,000'" }),
  ] },
  southernArrival: { ref: ARRIVALS, pieces: [
    p("Establish the aircraft at 1000' MSL, one WTD off the beach line northbound.", { alt: "1,000'", hdg: 'North, one WTD off the beach' }),
    p('Cross the beach line in the vicinity of Port Royal and proceed direct to PT SHAMROCK.', { hdg: 'Direct PT Shamrock' }),
  ] },
  easternArrival: { ref: ARRIVALS, pieces: [
    p("Cross the beach line in the vicinity of Port Royal at 1000'MSL, direct PT SHAMROCK", { alt: "1,000'", hdg: 'Direct PT Shamrock' }),
  ] },
};

const SHAMROCK = m('KNGP Arrivals', 'p. 3-38');
export const SHAMROCK_REF = SHAMROCK;
export const SHAMROCK_FIRST = [p('Upon reaching PT SHAMROCK, contact Navy Corpus Tower (CH 4), maintain 200 KIAS, state intentions', { kias: '200' })];
const WEST = p('fly towards the northwest corner of TAMUCC, ~255°.', { hdg: '~255°' });
const SOUTH_END = p('Fly towards the high bridge ~200°.', { hdg: '~200°' });
export const SHAMROCK_RUNWAY = {
  '13L': [WEST, p('RWY 13L/R. Report initial when crossing the extended centerline of RWY 18.')],
  '13R': [WEST, p('RWY 13L/R. Report initial when crossing the extended centerline of RWY 18.')],
  18: [WEST, p('RWY 18. Report initial when crossing the extended centerline of RWY 22.')],
  22: [WEST, p('Report initial upon reaching extended centerline of RWY 22 (no later than 3 NM).')],
  '04': [SOUTH_END, p('Report the initial abeam PT DIMMIT.'), p('RWY 04 & 36. Turn towards the low bridge and fly west over SPID to intercept a 1 NM final.')],
  36: [SOUTH_END, p('Report the initial abeam PT DIMMIT.'), p('RWY 04 & 36. Turn towards the low bridge and fly west over SPID to intercept a 1 NM final.')],
  '31L': [SOUTH_END, p('Report the initial abeam PT DIMMIT.'), p('Turn right and proceed direct to the runway numbers.')],
  '31R': [SOUTH_END, p('Report the initial abeam PT DIMMIT.'), p('Turn right and proceed direct to the runway numbers.')],
};
export const SHAMROCK_LAST = [p("The overhead maneuver is flown at 1000' MSL, 200 KIAS level flight, slightly offset", { alt: "1,000'", kias: '200' })];

const CAB = (pages) => m('Cabaniss', pages);
export const TO_SUNRISE = { ref: CAB('p. 3-25'), leg: 'Shamrock to PT Sunrise', pieces: [
  p("Make a normal home field entry (Chapter 3 paragraph 5) and request Sunrise Transition from Navy Corpus Tower."),
  p("When transition is approved by Tower, climb to 1500' MSL (or as assigned) and proceed to PT SUNRISE at 200 KIAS.", { alt: "1,500'", kias: '200', hdg: 'Direct PT Sunrise' }),
  p('Upon reaching PT SUNRISE contact Cabaniss Tower.'),
] };
export const SUNRISE_ENTRY = { ref: CAB('p. 3-26'), leg: 'PT Sunrise to Cabaniss', pieces: [
  p("Traffic pattern entry is normally made from an overhead approach via a 1500' MSL Wagon Wheel to intercept the initial for the active runway.", { alt: "1,500'" }),
  p("From the initial, descend to 1000' MSL for pattern sequencing as directed by tower.", { alt: "1,000'" }),
] };
export const SOUTHERN_ENTRY = { ref: CAB('p. 3-26'), leg: 'South Seagull to Cabaniss', pieces: [
  p('From the CRP 156/43 at 4500\' MSL proceed direct to PT PENSACOLA ~280°.', { alt: "4,500'", hdg: '~280°' }),
  p("At PT PENSACOLA, fly ~335°, descend to 1500' and fly to the CRP 178/28 known as the postage stamp.", { alt: "1,500'", hdg: '~335°' }),
  p('At the CRP 178/28 (Postage Stamp), fly ~010° to Chapman Ranch.', { hdg: '~010°' }),
  p('Terminate with Corpus Approach and contact Cabaniss Tower (CH 15) when the field is in sight.'),
] };
export const SOUTHERN_PATTERN = {
  13: [p("RWY 13/18. Enter the Wagon Wheel at 1500' MSL.", { alt: "1,500'" }), p("Start descent to 1000' MSL at the initial.", { alt: "1,000'" })],
  31: [p('RWY 31/36. Enter a left initial for RWY 31 or direct to the numbers for RWY 36.'), p("Start descent to 1000' MSL when 2 NM from the field.", { alt: "1,000'" })],
};
export const SOUTHERN_PATTERN_REF = CAB('p. 3-26');
export const CAB_INITIAL = {
  13: { ref: CAB('p. 3-27'), pieces: [p('RWY 13, 18. Initial is defined as the southwest corner of the landfill within 2 NM of the airfield')] },
  31: { ref: CAB('p. 3-27'), pieces: [p('RWY 31, 36. Initial is defined as 45 degrees or 2 NM from the active runway centerline.')] },
};
export const CAB_BREAK = { ref: CAB('p. 3-30'), pieces: [
  p("The break maneuver is flown at 1000' MSL, 200 KIAS level flight, slightly offset (100' -200') from the runway centerline towards the pattern side to maintain visual reference with pattern traffic.", { alt: "1,000'", kias: '200' }),
] };

// The pattern side and altitude (p. 3-30), added to the break's page. The map draws the pattern
// with its downwind 1 NM out (ME FTI p. 1-29, "1 mile abeam").
export const CAB_PATTERN = {
  13: p('RWY 13, 18: Left Hand Pattern.', { hdg: 'Left pattern' }),
  31: p('RWY 31, 36: Right Hand Pattern.', { hdg: 'Right pattern' }),
};
export const CAB_PATTERN_ALT = p("Pattern altitude is 800' MSL.", { alt: "800'" });

const CAB_OUT = m('Cabaniss Departures', 'p. 3-32');
export const SUNRISE_OUT = {
  high: { ref: CAB_OUT, leg: 'Cabaniss to PT Sunrise', pieces: [
    p("RWY 13/18/36. From the upwind turn towards PT Sunrise as depicted on the applicable plate, maintain 500' MSL until clear of the pattern, once clear, climb and maintain 1000', and accelerate to 200 KIAS.", { alt: "500' then 1,000'", kias: '200', hdg: 'PT Sunrise' }),
    p('Contact Navy Corpus Tower when directed and comply with the Sunrise Arrival.'),
  ] },
  31: { ref: CAB_OUT, leg: 'Cabaniss to PT Sunrise', pieces: [
    p("RWY 31. From normal pattern altitude (800'MSL) depart the right 180 and turn towards PT Sunrise and climb to 1000' MSL and accelerate to 200 KIAS.", { alt: "1,000'", kias: '200', hdg: 'PT Sunrise' }),
    p('Contact KNGP Tower when directed.'),
  ] },
};
export const SOUTHERN_OUT = {
  first: {
    13: p("RWY 13 and 18: From the upwind turn to 160° and climb to 1000' MSL unless directed lower by KNGW Tower, thence...", { hdg: '160°', alt: "1,000'" }),
    31: p("RWY 31: From the upwind turn left to 160° climb to 1000' MSL unless directed lower by KNGW Tower, thence...", { hdg: '160°', alt: "1,000'" }),
    36: p("RWY 36: From normal pattern altitude (800'MSL) depart the right 180 and turn to 160° climb to 1000' MSL unless directed lower by KNGW Tower, thence...", { hdg: '160°', alt: "1,000'" }),
  },
  rest: [
    p("When clear of Cabaniss airspace and established at 1000' MSL HDG 160°, contact Corpus Approach (CH 8)."),
    p("South of the Power Plant (at the bend in Farm Road 70) turn left to HDG 100°, climb and maintain 1500' MSL (clear of KCRP airspace).", { hdg: '100°', alt: "1,500'" }),
    p('Continue eastbound to pass south of the Shrimp Ponds (Outside of Waldron class D airspace), thence...'),
    p("Enroute to PT SHAMROCK. Upon reaching the eastern edge of the Intracoastal Waterway, descend to 1000' MSL and join the Southern Arrival.", { alt: "1,000'", hdg: 'North, then direct PT Shamrock' }),
  ],
  ref: CAB_OUT,
  leg: 'Cabaniss Southern Departure',
};

const SUNRISE_IN = m('Sunrise Arrival', 'p. 3-40');
export const SUNRISE_ARRIVAL = {
  ref: SUNRISE_IN,
  first: [p('Upon reaching PT Sunrise, contact Navy Corpus Tower (CH 4), state intentions, and proceed as follows...', { alt: "1,000'" })],
  leg: 'PT Sunrise to KNGP',
  runway: {
    '13L': [p('RWYs 13 L/R. Fly directly to the runway numbers or as directed by ATC.', { hdg: 'Numbers' })],
    '13R': [p('RWYs 13 L/R. Fly directly to the runway numbers or as directed by ATC.', { hdg: 'Numbers' })],
    18: [p('RWY 18, 22. Fly to the northwestern corner of TAMUCC, ~055°, then turn right for an overhead maneuver, straight in, or right base approach as directed by tower.', { hdg: '~055°' })],
    22: [p('RWY 18, 22. Fly to the northwestern corner of TAMUCC, ~055°, then turn right for an overhead maneuver, straight in, or right base approach as directed by tower.', { hdg: '~055°' })],
    '04': [p('RWY 04, 31 L/R, and 36. Fly southwest of SPID to the OSO Bridge, then turn left for an overhead maneuver, straight in or left base approach as directed by tower.')],
    '31L': [p('RWY 04, 31 L/R, and 36. Fly southwest of SPID to the OSO Bridge, then turn left for an overhead maneuver, straight in or left base approach as directed by tower.')],
    '31R': [p('RWY 04, 31 L/R, and 36. Fly southwest of SPID to the OSO Bridge, then turn left for an overhead maneuver, straight in or left base approach as directed by tower.')],
    36: [p('RWY 04, 31 L/R, and 36. Fly southwest of SPID to the OSO Bridge, then turn left for an overhead maneuver, straight in or left base approach as directed by tower.')],
  },
};

// Pattern direction. KNGP: Course Rules Manual Ch. 1, Touch-and-Go; Cabaniss: Ch. 3 p. 3-30.
export const KNGP_SIDE = { '13L': 'left', '31L': 'left', 36: 'left', '04': 'left', '13R': 'right', '31R': 'right', 18: 'right', 22: 'right' };
export const KNGW_SIDE = { 13: 'left', 18: 'left', 31: 'right', 36: 'right' };
export const KNGW_RUNWAYS = [{ rwy: '13', hdg: 130 }, { rwy: '18', hdg: 180 }, { rwy: '31', hdg: 310 }, { rwy: '36', hdg: 360 }];

// Every piece of every rule, for the check tool.
export function allRules() {
  const out = [];
  const add = (pieces, ref, where) => pieces.forEach((x, i) => out.push({ text: x.t, ref, where: `${where} ${i + 1}` }));
  add(BEACHLINE_FIRST, BEACHLINE, 'beachline first');
  Object.entries(BEACHLINE_RUNWAY).forEach(([k, v]) => add(v, BEACHLINE, `beachline ${k}`));
  add(BEACHLINE_LAST, BEACHLINE, 'beachline last');
  add(BEACHLINE_CONTACT, BEACHLINE, 'beachline contact');
  Object.entries(ENTRY).forEach(([k, e]) => Object.entries(e).forEach(([part, r]) => add(r.pieces, r.ref, `entry ${k} ${part}`)));
  Object.entries(EXIT).forEach(([k, r]) => add(r.pieces, r.ref, `exit ${k}`));
  add(SHAMROCK_FIRST, SHAMROCK, 'shamrock first');
  Object.entries(SHAMROCK_RUNWAY).forEach(([k, v]) => add(v, SHAMROCK, `shamrock ${k}`));
  add(SHAMROCK_LAST, SHAMROCK, 'shamrock last');
  [['to sunrise', TO_SUNRISE], ['sunrise entry', SUNRISE_ENTRY], ['southern entry', SOUTHERN_ENTRY], ['cab break', CAB_BREAK],
    ['cab initial 13', CAB_INITIAL[13]], ['cab initial 31', CAB_INITIAL[31]], ['sunrise out high', SUNRISE_OUT.high], ['sunrise out 31', SUNRISE_OUT[31]]]
    .forEach(([w, r]) => add(r.pieces, r.ref, w));
  add([CAB_PATTERN[13], CAB_PATTERN[31], CAB_PATTERN_ALT], CAB_BREAK.ref, 'cab pattern');
  Object.entries(SOUTHERN_PATTERN).forEach(([k, v]) => add(v, SOUTHERN_PATTERN_REF, `southern pattern ${k}`));
  Object.entries(SOUTHERN_OUT.first).forEach(([k, v]) => add([v], SOUTHERN_OUT.ref, `southern out ${k}`));
  add(SOUTHERN_OUT.rest, SOUTHERN_OUT.ref, 'southern out');
  add(SUNRISE_ARRIVAL.first, SUNRISE_ARRIVAL.ref, 'sunrise arrival first');
  Object.entries(SUNRISE_ARRIVAL.runway).forEach(([k, v]) => add(v, SUNRISE_ARRIVAL.ref, `sunrise arrival ${k}`));
  return out;
}
