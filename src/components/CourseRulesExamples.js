// Example comms for Flight Path Builder. The first set is the TW-4 Primary comms practice
// script (10/7/20), page in `page`. The second set, below it, covers legs the script doesn't
// fly: the pilot's calls are the Course Rules Manual's (page in `from`) with the leg's names
// filled in, set out the way the script runs an exchange; the controller's side uses only the
// script's own phrases. The page shows both alike, as a worked example, not a TW-4
// publication, after the manual's own calls (`comms` in CourseRulesFeatures.js).
//
// Each leg gets blocks of { title, page, lines }. A line is { radio, who, text } like a manual
// call, { note } for the script's stage directions, or { label } for this site's own caption.
// `who` is the speaker: the pilot's lines carry their channel; ATC, RDO and BASE are the
// replies. `was` keeps the script's wording where it was corrected: a typo, a wrong facility,
// or a name. A line the manual contradicts stays as the script has it, followed by a `manual`
// note giving the manual's version and page.

import { crFeatures } from './CourseRulesFeatures.js';

const r = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);

const LEAVING_THE_LINE = { // p. 2
  title: 'Leaving the line (KINGS 4 flight, runway 13L)', page: 2, lines: [
    { radio: 'UHF CH2', text: 'Clearance delivery, Ranger 837, zombie one on request, ready to copy' },
    { who: 'ATC', text: 'Ranger 837, clearance delivery, for VFR flight following squawk 2143' },
    { radio: 'UHF CH2', text: 'Ranger 837, squawk 2143' },
    { who: 'ATC', text: 'Ranger 837, read back correct' },
    { radio: 'UHF CH3', text: 'Navy Corpus ground, Ranger 837, delta line, taxi with information alpha, kings 4 VFR' },
    { who: 'ATC', text: 'Ranger 837, taxi to the run-up via Charlie, Sierra' },
    { radio: 'UHF CH3', text: 'Ranger 837, taxi via Charlie, Sierra' },
    { label: 'Squadron base' },
    { radio: 'UHF CH19', text: 'Ranger base, 169, (instructor), (student), outbound', was: 'Ranger base, 169, LCDR Stephenson, Ens Smith, outbound' },
    { who: 'BASE', text: 'Ranger 169, base has you outbound' },
    { radio: 'UHF CH3', text: 'Ground, Ranger 837, further taxi' },
    { who: 'ATC', text: 'Ranger 837, taxi to runway 13L via Sierra, Charlie, runway 22, cross 18' },
    { radio: 'UHF CH3', text: 'Ranger 837, taxi to runway 13L via Sierra, Charlie, 22, cross 18' },
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, ready for departure' },
    { who: 'ATC', text: 'Ranger 837, wind 130 at 15, runway 13L, cleared for takeoff' },
    { radio: 'UHF CH4', text: 'Ranger 837, cleared for takeoff 13L' }
  ]
};

const BACK_TO_THE_LINE = { // p. 7
  title: 'Back to the line (after landing 13L)', page: 7, lines: [
    { who: 'ATC', text: 'Ranger 837, Navy Corpus Tower, left off on delta, contact ground once clear of the active' },
    { radio: 'UHF CH4', text: 'Ranger 837, left delta, ground once clear of the active' },
    { radio: 'UHF CH3', text: 'Navy Corpus Ground, Ranger 837, clear of the active on delta, taxi to my line' },
    { who: 'ATC', text: 'Ranger 837, Navy Corpus Ground, taxi to the line via yankee, bravo, charlie' },
    { radio: 'UHF CH3', text: 'Ranger 837, taxi to the line via yankee, bravo, charlie' },
    { label: 'Squadron base' },
    { radio: 'UHF CH29', text: 'Texan Base, 169 is back, aircraft up, done for the day, looking for parking' },
    { who: 'BASE', text: '169, park on delta' },
    { radio: 'UHF CH29', text: '169, park on delta' },
    { radio: 'UHF CH19', text: 'Ranger Base, 169 is back, complete' },
    { who: 'BASE', text: '169, Ranger Base, welcome back' }
  ]
};

const RUSTY_DEPARTURE = { // p. 3
  title: 'Runway 13L to KINGS 4', page: 3, lines: [
    { who: 'ATC', text: 'Ranger 837, Navy Corpus Tower, contact departure' },
    { radio: 'UHF CH4', text: 'Ranger 837, contact departure' },
    { radio: 'UHF CH12', text: 'Corpus Departure, Ranger 837, 500 feet off Navy Corpus, Kings 4' },
    { who: 'ATC', text: 'Ranger 837, Corpus Departure, ident' },
    { note: '...press IDENT but say nothing...' },
    { who: 'ATC', text: 'Ranger 837, Corpus Departure, radar contact, proceed course rules to Kings 4' },
    { radio: 'UHF CH12', text: 'Ranger 837, wilco, Kings 4' }
  ]
};

const PT_RUSTY_TO_KINGS = { // p. 3
  title: 'At PT Rusty, for KINGS 4', page: 3, lines: [
    { who: 'ATC', text: 'Ranger 837, contact Corpus Approach local channel 6' },
    { radio: 'UHF CH12', text: 'Ranger 837, approach on channel 6' },
    { radio: 'UHF CH6', text: 'Corpus Approach, Ranger 837, 5500 over Point Rusty' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, Corpus Christi altimeter 3002, proceed course rules to the kings 4' },
    { radio: 'UHF CH6', text: 'Ranger 837, course rules kings 4' }
  ]
};

const KINGS_ENTRY = { // p. 3
  title: 'Into KINGS 4 (area 9 low)', page: 3, lines: [
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, contact Houston Center 135.05' },
    { radio: 'UHF CH6', text: 'Ranger 837, contact Houston Center 135.05' },
    { note: '(Switch UHF CH20 and VHF CH22)' },
    { radio: 'VHF CH22', text: 'Houston Center, Ranger 837, 12000 climbing 14,500, course rules kings 4' },
    { who: 'ATC', text: 'Ranger 837, Houston Center, cleared Kings 4' },
    { radio: 'VHF CH22', text: 'Ranger 837, cleared Kings 4' },
    { radio: 'UHF CH20', text: '99 Kings 4, anyone working area 9 low' },
    { note: '...' },
    { radio: 'UHF CH20', text: '99 Kings 4, Ranger 837 claims area 9 low' }
  ]
};

const KINGS_TO_GOLIAD = { // p. 4
  title: 'Complete in KINGS 4, VFR to Goliad', page: 4, lines: [
    { radio: 'VHF CH22', text: 'Houston Center, Ranger 837, complete Kings 4, VFR to Goliad, negative flight following' },
    { who: 'ATC', text: 'Ranger 837, Houston Center, proceed as requested, terminate, frequency change approved, squawk appropriate code' },
    { radio: 'VHF CH22', text: 'Ranger 837, terminate' },
    { radio: 'UHF CH20', text: '99 Kings 4, Ranger 837, complete area 9 low, direct Goliad' }
  ]
};

const GOLIAD_ARRIVAL = { // p. 4
  title: 'Into Goliad (runway 11)', page: 4, lines: [
    { radio: 'UHF CH15', text: 'Goliad Landing' },
    { who: 'RDO', text: 'Goliad landing runway 11, 2 in the pattern, no solos' },
    { radio: 'VHF CH15', text: 'Goliad traffic, Ranger 837, departing 9 low for the initial runway 11, Goliad' },
    { radio: 'UHF CH15', text: 'Goliad RDO, Ranger 837, initial runway 11' },
    { who: 'RDO', text: 'Ranger 837, you are number one for the break, number three when you get here' },
    { radio: 'UHF CH15', text: 'Ranger 837, one for three' },
    { radio: 'UHF CH15', text: 'Ranger 837, numbers runway 11' },
    { radio: 'UHF CH15', text: 'Goliad RDO, Ranger 837, crosswind break' }
  ]
};

const GOLIAD_PATTERN = { // p. 4
  title: 'Goliad pattern (runway 11)', page: 4, lines: [
    { radio: 'UHF CH15', text: '837, 180, gear down' },
    { radio: 'UHF CH15', text: '837, crosswind, touch and go' }
  ]
};

const GOLIAD_DEPARTURE = { // p. 5
  title: 'Leaving Goliad', page: 5, lines: [
    { radio: 'UHF CH15', text: 'Goliad RDO, Ranger 837, departing' },
    { who: 'RDO', text: 'Ranger 837, RDO, roger' }
  ]
};

const GOLIAD_ARRIVAL_TO_SHAMROCK = { // p. 5
  title: 'Goliad to SHAMROCK', page: 5, lines: [
    { radio: 'UHF CH6', text: 'Corpus Approach, Ranger 837, Woodsboro, 2500, course rules Shamrock with information bravo' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, ident' },
    { note: '...press IDENT but say nothing...' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, radar contact, proceed course rules Shamrock' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, change to approach local channel 8' },
    { radio: 'UHF CH6', text: 'Ranger 837, change to approach channel 8' },
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, 1500, course rules Shamrock' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, proceed course rules Shamrock' },
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, terminate Shamrock' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, terminate, frequency change approved' }
  ]
};

const TERMINATE_SHAMROCK = { // p. 12
  title: 'Approaching SHAMROCK', page: 12, lines: [
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, terminate Shamrock' },
    { who: 'ATC', text: 'Ranger 837, terminate' }
  ]
};

const SHAMROCK = { // p. 6
  title: 'At SHAMROCK (runway 13L)', page: 6, lines: [
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, Shamrock, full stop' },
    { who: 'ATC', text: 'Ranger 837, Navy Corpus Tower, report the initial runway 13L' },
    { radio: 'UHF CH4', text: 'Ranger 837, report the initial runway 13L' }
  ]
};

const KNGP_OVERHEAD = { // p. 6
  title: 'Initial to landing (runway 13L)', page: 6, lines: [
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, initial, runway 13L' },
    { who: 'ATC', text: 'Ranger 837, Navy Corpus Tower, report the numbers runway 13L' },
    { radio: 'UHF CH4', text: 'Ranger 837, report the numbers runway 13L' },
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, numbers 13L' },
    { who: 'ATC', text: 'Ranger 837, Navy Corpus Tower, left break approved' },
    { radio: 'UHF CH4', text: 'Ranger 837, left break approved' },
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, 180, gear down, full stop' },
    { who: 'ATC', text: 'Ranger 837, Navy Corpus Tower, wind 130 at 15, runway 13L, cleared to land' },
    { radio: 'UHF CH4', text: 'Ranger 837, cleared to land, runway 13L' }
  ]
};

const BEACH_LINE_TO_MUSTANG = { // p. 10
  title: 'Runway 13L to MUSTANG 1', page: 10, lines: [
    { who: 'ATC', text: 'Ranger 837, Navy Corpus Tower, contact departure' },
    { radio: 'UHF CH4', text: 'Ranger 837, contact departure' },
    { radio: 'UHF CH8', text: 'Corpus Departure, Ranger 837, 500 feet off Navy Corpus, Request Mustang 1' },
    { who: 'ATC', text: 'Ranger 837, Corpus Departure, ident' },
    { note: '...press IDENT but say nothing...' },
    { who: 'ATC', text: 'Ranger 837, Corpus Departure, radar contact, proceed course rules to Mustang Area 1' },
    { radio: 'UHF CH8', text: 'Ranger 837, course rules to Mustang 1' }
  ]
};

const MUSTANG_CH17 = (area, page) => ({
  title: `To MUSTANG ${area}`, page, lines: [
    { who: 'ATC', text: 'Ranger 837, change to my frequency local channel 17' },
    { radio: 'UHF CH8', text: 'Ranger 837, switching 17' },
    { radio: 'UHF CH17', text: 'Corpus Approach, Ranger 837, channel 17' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, loud and clear' },
    { manual: 'Radio check-in with Corpus Approach CH 17 UHF is not required.', page: '2-15' }
  ]
});

const MUSTANG_EXIT_MANUAL = {
  manual: 'Contact Corpus Approach on CH 17 UHF. Advise complete in the working area and state intentions.', page: '2-16'
};

const MUSTANG_1_TO_ARANSAS = { // p. 11
  title: 'Complete in MUSTANG 1, VFR to Aransas County', page: 11, lines: [
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, complete Mustang 1, VFR to Aransas County with current weather' },
    MUSTANG_EXIT_MANUAL,
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, proceed as requested' },
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, terminate Aransas County' },
    { who: 'ATC', text: 'Ranger 837, terminate' }
  ]
};

const MUSTANG_3_TO_WALDRON = { // p. 18
  title: 'Complete in MUSTANG 3, course rules to Waldron', page: 18, lines: [
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, complete Mustang 3, course rules to Waldron', was: 'Corpus Approach, Ranger 837, complete Mustang 1, course rules to Waldron' },
    MUSTANG_EXIT_MANUAL,
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, Waldron landing runway 13, proceed as requested', was: 'Ranger 837, Corpus Approach, Waldron landing run way 13, proceed as requested' },
    { radio: 'UHF CH8', text: 'Ranger 837, Waldron landing 13' }
  ]
};

const ARANSAS_ARRIVAL = { // p. 11
  title: 'Into Aransas County from MUSTANG 1 (runway 14)', page: 11, lines: [
    { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, 10 miles north at 2500, inbound for a left overhead runway 14, Aransas County', was: 'Aransas Country Traffic, Ranger 837, 10 miles north at 2500, inbound for a left overhead runway 14, Aransas County' },
    { radio: 'UHF CH21', text: 'Any Texans working Aransas County?' },
    { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, 2 mile initial runway 14 for a left overhead, Aransas County', was: 'Aransas Country Traffic, Ranger 837, 2 mile initial runway 14 for a left overhead, Aransas County' },
    { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, numbers runway 14 for a left overhead, Aransas County', was: 'Aransas Country Traffic, Ranger 837, numbers runway 14 for a left overhead, Aransas County' },
    { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, left overhead break, runway 14, Aransas County', was: 'Aransas Country Traffic, Ranger 837, left overhead break, runway 14, Aransas County' }
  ]
};

const ARANSAS_PATTERN = { // p. 11
  title: 'Aransas County pattern (runway 14)', page: 11, lines: [
    { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, left base, runway 14, touch and go, Aransas County', was: 'Aransas Country Traffic, Ranger 837, left base, runway 14, touch and go, Aransas County' }
  ]
};

const ARANSAS_DEPARTURE = { // pp. 11, 12
  title: 'Leaving Aransas County (runway 14)', page: 11, lines: [
    { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, number one downwind, departing to the east, Aransas County', was: 'Aransas Country Traffic, Ranger 837, number one downwind, departing to the east, Aransas County' },
    { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, clear to the south, last call, Aransas County', was: 'Aransas Country Traffic, Ranger 837, clear to the south, last call, Aransas County' },
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, 1500 feet off Aransas County, course rules Shamrock with information bravo' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, ident', was: 'Ranger 837, Corpus Departure, ident' },
    { note: '...press IDENT but say nothing...' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, radar contact, proceed course rules Shamrock', was: 'Ranger 837, Corpus Departure, radar contact, proceed course rules Shamrock' },
    { radio: 'UHF CH8', text: 'Ranger 837, proceed course rules Shamrock' }
  ]
};

const WALDRON_ARRIVAL = { // p. 18
  title: 'Into Waldron (runway 13)', page: 18, lines: [
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, Camel Humps, terminate' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, terminate' },
    { radio: 'UHF CH30', text: 'Waldron Tower, Ranger 837, Camel Humps for touch and goes' },
    { who: 'ATC', text: 'Ranger 837, Waldron Tower, wind 150 at 14, altimeter 3001, landing runway 13, report the initial runway 13' },
    { radio: 'UHF CH30', text: 'Ranger 837, report the initial runway 13' },
    { radio: 'UHF CH30', text: 'Waldron Tower, Ranger 837, initial 13' },
    { who: 'ATC', text: 'Ranger 837, Waldron Tower, report the numbers runway 13' },
    { radio: 'UHF CH30', text: 'Waldron Tower, Ranger 837, will report the numbers runway 13' },
    { radio: 'UHF CH30', text: 'Waldron Tower, Ranger 837, numbers 13' },
    { who: 'ATC', text: 'Ranger 837, Waldron Tower, right break approved' },
    { radio: 'UHF CH30', text: 'Waldron Tower, Ranger 837, right break approved' }
  ]
};

const WALDRON_PATTERN = { // p. 19
  title: 'Waldron pattern (runway 13)', page: 19, lines: [
    { radio: 'UHF CH30', text: 'Waldron Tower, Ranger 837, 180, gear, touch and go' },
    { who: 'ATC', text: 'Ranger 837, Waldron Tower, wind 140 at 12, runway 13, cleared touch and go' },
    { radio: 'UHF CH30', text: 'Ranger 837, cleared touch and go, runway 13' },
    { who: 'ATC', text: 'Ranger 837, Waldron Tower, cleared right downwind' },
    { radio: 'UHF CH30', text: 'Ranger 837, cleared right downwind' }
  ]
};

const WALDRON_EAST_DEPARTURE = { // p. 19
  title: 'Leaving Waldron for SHAMROCK (runway 13)', page: 19, lines: [
    { radio: 'UHF CH30', text: 'Waldron Tower, Ranger 837, number one downwind, departing' },
    { who: 'ATC', text: 'Ranger 837, Waldron Tower, contact Corpus Approach' },
    { radio: 'UHF CH30', text: 'Ranger 837, contact Corpus Approach' },
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, 500 off Waldron, course rules Shamrock with information bravo' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, ident', was: 'Ranger 837, Corpus Departure, ident' },
    { note: '...press IDENT but say nothing...' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, radar contact, proceed course rules Shamrock', was: 'Ranger 837, Corpus Departure, radar contact, proceed course rules Shamrock' },
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, proceed course rules Shamrock' }
  ]
};

const add = (map, ids, block) => ids.forEach(id => { (map[id] = map[id] || []).push(block); });

export const crExamples = {};
add(crExamples, ['Point-default-95'], LEAVING_THE_LINE);
add(crExamples, ['Point-default-95'], BACK_TO_THE_LINE);
add(crExamples, r('Routes-Departures-', 161, 168), RUSTY_DEPARTURE);
add(crExamples, ['Point-Departures-160'], PT_RUSTY_TO_KINGS);
add(crExamples, ['Routes-Transitions-201'], KINGS_ENTRY);
add(crExamples, r('Working Areas-King-', 203, 211), KINGS_TO_GOLIAD);
add(crExamples, r('Routes-Arrivals-', 42, 45), GOLIAD_ARRIVAL);
add(crExamples, ['Routes-Traffic Patterns-39', 'Routes-Traffic Patterns-40'], GOLIAD_PATTERN);
add(crExamples, r('Routes-Departures-', 46, 49), GOLIAD_DEPARTURE);
add(crExamples, ['Routes-Arrivals-112'], GOLIAD_ARRIVAL_TO_SHAMROCK);
add(crExamples, ['Routes-Arrivals-104', 'Routes-Arrivals-108'], TERMINATE_SHAMROCK);
add(crExamples, ['Point-Arrivals-113'], SHAMROCK);
add(crExamples, ['Routes-Arrivals-115', 'Routes-Arrivals-116', 'Routes-Arrivals-117', 'Routes-Arrivals-118',
  'Routes-Arrivals-122', 'Routes-Arrivals-123', 'Routes-Arrivals-124', 'Routes-Arrivals-125'], KNGP_OVERHEAD);
add(crExamples, r('Routes-Departures-', 145, 152), BEACH_LINE_TO_MUSTANG);
add(crExamples, ['Routes-Transitions-153'], MUSTANG_CH17(1, 10));
add(crExamples, ['Routes-Transitions-154'], MUSTANG_CH17(3, 17));
add(crExamples, r('Working Areas-Mustang-', 191, 194), MUSTANG_1_TO_ARANSAS);
add(crExamples, r('Working Areas-Mustang-', 197, 200), MUSTANG_3_TO_WALDRON);
add(crExamples, r('Routes-Arrivals-', 25, 28), ARANSAS_ARRIVAL);
add(crExamples, ['Routes-Traffic Patterns-23', 'Routes-Traffic Patterns-24'], ARANSAS_PATTERN);
add(crExamples, r('Routes-Departures-', 32, 35), ARANSAS_DEPARTURE);
add(crExamples, r('Routes-Arrivals-', 86, 89), WALDRON_ARRIVAL);
add(crExamples, ['Routes-Traffic Patterns-52', 'Routes-Traffic Patterns-53'], WALDRON_PATTERN);
add(crExamples, r('Routes-Departures-', 91, 94), WALDRON_EAST_DEPARTURE);

// ---------------------------------------------------------------------------------------------
// Legs the script doesn't fly. Pilot calls: the manual's, page in `from`. Controller replies:
// only the script's phrases (ident, radar contact, proceed, contact, terminate, report).

// A runway leg's runway, from its name ("13L"; a pattern's "04/22" gives "04")
const rwy = (id) => crFeatures[id].name.split('/')[0];
const perRunway = (ids, make) => ids.forEach(id => add(crExamples, [id], make(rwy(id))));

const IDENT = (facility, then) => [
  { who: 'ATC', text: `Ranger 837, Corpus ${facility}, ident` },
  { note: '...press IDENT but say nothing...' },
  { who: 'ATC', text: `Ranger 837, Corpus ${facility}, radar contact, ${then}` }
];

const TOWER_TO = (facility) => [
  { who: 'ATC', text: `Ranger 837, Navy Corpus Tower, contact ${facility}` },
  { radio: 'UHF CH4', text: `Ranger 837, contact ${facility}` }
];

// KNGP departures by name, taxi to check-in (2-7, 2-9, 2-13)
perRunway(r('Routes-Departures-', 179, 186), n => ({
  title: `Runway ${n}, Portland Low`, from: '2-7', lines: [
    { radio: 'UHF CH3', text: 'Navy Corpus Ground, Ranger 837, delta line, request taxi with information alpha, Portland Low' },
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, ready for departure, Portland Low departure' },
    ...TOWER_TO('departure'),
    { radio: 'UHF CH8', text: 'Corpus Departure, Ranger 837, 500 feet off Navy Corpus, Portland Low followed by (VFR intentions)' },
    ...IDENT('Departure', 'proceed as requested'),
    { radio: 'UHF CH8', text: 'Ranger 837, wilco' },
    { manual: 'State intentions with Departure, monitor McCampbell-Porter CTAF on VHF 122.7.', page: '2-7' }
  ]
}));

perRunway(r('Routes-Arrivals-', 170, 177), n => ({
  title: `Runway ${n}, Nueces Transition`, from: '2-9', lines: [
    { radio: 'UHF CH3', text: 'Navy Corpus Ground, Ranger 837, delta line, request taxi with information alpha, Nueces Transition' },
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, ready for departure, Nueces Transition' },
    ...TOWER_TO('Cabaniss Tower'),
    { radio: 'UHF CH27', text: 'Cabaniss Tower, Ranger 837, Nueces transition' },
    { manual: '(Switch Corpus Christi Tower when directed by Cabaniss Tower)', page: '2-9' }
  ]
}));

perRunway(r('Routes-Arrivals-', 127, 134), n => ({
  title: `Runway ${n}, Oso Transition to Waldron`, from: '2-13', lines: [
    { radio: 'UHF CH3', text: 'Navy Corpus Ground, Ranger 837, delta line, request taxi with information alfa, Oso Transition' },
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, ready for departure, Oso Transition' },
    ...TOWER_TO('Waldron Tower'),
    { radio: 'UHF CH30', text: 'Waldron Tower, Ranger 837, Oso transition' },
    { who: 'ATC', text: 'Ranger 837, Waldron Tower, runway 13 is in use, no aircraft in the pattern, altimeter 29.92, report the numbers for runway 13' }
  ]
}));

// Beach Line transitions after the check-in (2-5, 2-15, 2-17, 2-40)
add(crExamples, ['Routes-Departures-156'], {
  title: 'Beach Line to Waldron', from: '2-40', lines: [
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, course rules to Waldron' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, Waldron landing runway 13, proceed as requested' },
    { radio: 'UHF CH8', text: 'Ranger 837, Waldron landing 13' }
  ]
});

add(crExamples, ['Routes-Departures-158'], {
  title: 'Beach Line, SHAMROCK re-entry', from: '2-5', lines: [
    { radio: 'UHF CH8', text: 'Corpus Departure, Ranger 837, 500 feet off Navy Corpus, Shamrock re-entry' },
    ...IDENT('Departure', 'proceed course rules Shamrock'),
    { radio: 'UHF CH8', text: 'Ranger 837, course rules Shamrock' },
    ...TERMINATE_SHAMROCK.lines
  ]
});

add(crExamples, ['Working Areas-Mustang Maintenance-195'], {
  title: 'MUSTANG Central, in and out', from: '2-15', lines: [
    { radio: 'UHF CH18', text: '99 Central, Ranger 837, working 7,500' },
    { label: 'Leaving the area:' },
    { radio: 'UHF CH18', text: '99 Central, Ranger 837, complete, departing for Shamrock' },
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, complete Mustang Central, course rules Shamrock with information bravo' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, proceed course rules Shamrock' },
    { radio: 'UHF CH8', text: 'Ranger 837, course rules Shamrock' }
  ]
});

add(crExamples, ['Working Areas-Mustang Maintenance-196'], {
  title: 'Leaving the Maintenance Area', from: '2-17', lines: [
    { radio: 'UHF CH17', text: 'Corpus Approach, Ranger 837, complete, request direct to Point Shamrock' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, proceed as requested' },
    { radio: 'UHF CH17', text: 'Ranger 837, direct Point Shamrock' }
  ]
});

// MUSTANG exits to the manual's other destinations (2-16, 2-17, 2-60)
const MUSTANG_TO_SHAMROCK = (area) => ({
  title: `Complete in MUSTANG ${area}, course rules SHAMROCK`, from: '2-16', lines: [
    { radio: 'UHF CH17', text: `Corpus Approach, Ranger 837, complete in Mustang ${area}, course rules Shamrock with information bravo` },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, change to approach local channel 8' },
    { radio: 'UHF CH17', text: 'Ranger 837, change to approach channel 8' },
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, course rules Shamrock' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, proceed course rules Shamrock' }
  ]
});

add(crExamples, r('Working Areas-Mustang-', 191, 194), MUSTANG_TO_SHAMROCK(1));
add(crExamples, r('Working Areas-Mustang-', 191, 194), {
  title: 'Complete in MUSTANG 1, North to South transition to Waldron', from: '2-16', lines: [
    { radio: 'UHF CH17', text: 'Corpus Approach, Ranger 837, complete in Mustang 1, North to South transition, course rules to Waldron' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, proceed as requested' },
    { radio: 'UHF CH17', text: 'Ranger 837, North to South transition, Waldron' }
  ]
});
add(crExamples, r('Working Areas-Mustang-', 197, 200), MUSTANG_TO_SHAMROCK(3));
add(crExamples, r('Working Areas-Mustang-', 197, 200), {
  title: 'Complete in MUSTANG 3, South to North transition to Aransas County', from: '2-17', lines: [
    { radio: 'UHF CH17', text: 'Corpus Approach, Ranger 837, complete in Mustang 3, South to North transition, request High-Key into Aransas County' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, proceed as requested' },
    { radio: 'UHF CH17', text: 'Ranger 837, South to North transition, Aransas County' },
    { radio: 'UHF CH17', text: 'Corpus Approach, Ranger 837, terminate Aransas County' },
    { who: 'ATC', text: 'Ranger 837, terminate' }
  ]
});
add(crExamples, r('Working Areas-Mustang-', 197, 200), {
  title: 'Complete in MUSTANG 3, Lex Arrival', from: '2-60', lines: [
    { radio: 'UHF CH17', text: 'Corpus Approach, Ranger 837, complete in Mustang 3, request the Lex Arrival with information bravo' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, proceed as requested' },
    { radio: 'UHF CH17', text: 'Ranger 837, Lex Arrival' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, contact Navy Corpus Tower' },
    { radio: 'UHF CH17', text: 'Ranger 837, contact Navy Corpus Tower' },
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, USS Lexington, straight-in, full stop' }
  ]
});

add(crExamples, ['Working Areas-Foxtrot-189', 'Working Areas-Foxtrot-190'], {
  title: 'Into FOXTROT', from: '2-21', lines: [
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, terminate Foxtrot' },
    { who: 'ATC', text: 'Ranger 837, terminate' },
    { manual: 'Switch to FOXTROT Common (CH 22 UHF) for advisories and area coordination.', page: '2-21' }
  ]
});

add(crExamples, ['Routes-Arrivals-106', 'Routes-Arrivals-110'], TERMINATE_SHAMROCK);

// KINGS 4 exit to Aransas County, and Goliad departures (2-28, 2-51, 2-58)
const WOODSBORO_TO_ARANSAS = [
  { radio: 'UHF CH6', text: 'Corpus Approach, Ranger 837, Over Woodsboro, course rules Aransas County' },
  ...IDENT('Approach', 'proceed course rules Aransas County'),
  { radio: 'UHF CH6', text: 'Ranger 837, course rules Aransas County' },
  { radio: 'UHF CH6', text: 'Corpus Approach, Ranger 837, terminate Aransas County' },
  { who: 'ATC', text: 'Ranger 837, terminate' },
  { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, 10 miles to the west, at 2500, inbound for a left overhead runway 14, Aransas County' }
];

add(crExamples, ['Routes-Transitions-202'], {
  title: 'Complete in KINGS 4, course rules Aransas County', from: '2-28', lines: [
    { radio: 'VHF CH22', text: 'Houston Center, Ranger 837, complete Kings 4, VFR to Aransas County, negative flight following' },
    { who: 'ATC', text: 'Ranger 837, Houston Center, proceed as requested, terminate, frequency change approved, squawk appropriate code' },
    { radio: 'VHF CH22', text: 'Ranger 837, terminate' },
    { radio: 'UHF CH20', text: '99 Kings 4, Ranger 837 departing area 9 low, Aransas County' },
    ...WOODSBORO_TO_ARANSAS
  ]
});

add(crExamples, r('Routes-Arrivals-', 25, 28), {
  title: 'Into Aransas County from Goliad or KINGS 4 (runway 14)', from: '2-51', lines: [
    { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, 10 miles to the west, at 2500, inbound for a left overhead runway 14, Aransas County' },
    { radio: 'UHF CH21', text: 'Any Texans working Aransas County?' },
    { radio: 'UHF CH21', text: 'Ranger 837 is inbound for the initial' },
    { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, 2 mile Initial runway 14 for a left overhead, Aransas County' },
    { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, numbers runway 14 for the left overhead, Aransas County' }
  ]
});

add(crExamples, r('Routes-Departures-', 46, 49), {
  title: 'Goliad to Aransas County', from: '2-51', lines: [
    { radio: 'UHF CH15', text: 'Goliad RDO, Ranger 837, departing' },
    { who: 'RDO', text: 'Ranger 837, RDO, roger' },
    ...WOODSBORO_TO_ARANSAS
  ]
});

add(crExamples, r('Routes-Departures-', 46, 49), {
  title: 'Goliad to KINGS 4', from: '2-26', lines: [
    { radio: 'UHF CH15', text: 'Goliad RDO, Ranger 837, departing' },
    { who: 'RDO', text: 'Ranger 837, RDO, roger' },
    { radio: 'VHF CH22', text: 'Houston Center, Ranger 837, off Goliad, 4500, course rules kings 4' },
    { who: 'ATC', text: 'Ranger 837, Houston Center, cleared Kings 4' },
    { radio: 'VHF CH22', text: 'Ranger 837, cleared Kings 4' },
    { note: '(Switch UHF CH20 no later than 8000)' },
    { radio: 'UHF CH20', text: '99 Kings 4, anybody working area 9 low?' },
    { radio: 'UHF CH20', text: '99 Kings 4, Ranger 837 claims area 9 low' }
  ]
});

add(crExamples, r('Routes-Departures-', 46, 49), {
  title: 'Goliad to Ingleside', from: '2-58', lines: [
    { radio: 'UHF CH15', text: 'Goliad RDO, Ranger 837, departing' },
    { who: 'RDO', text: 'Ranger 837, RDO, roger' },
    { radio: 'UHF CH6', text: 'Corpus Approach, Ranger 837, Woodsboro, 2500, Ingleside' },
    ...IDENT('Approach', 'proceed as requested'),
    { radio: 'UHF CH6', text: 'Ranger 837, proceed as requested' }
  ]
});

// PT Rusty for Goliad, and KNGP to Ingleside (2-11, 2-58)
add(crExamples, ['Point-Departures-160'], {
  title: 'At PT Rusty, for Goliad', from: '2-11', lines: [
    { radio: 'UHF CH6', text: 'Corpus Approach, Ranger 837, 5500 over Point Rusty, course rules Goliad' },
    { who: 'ATC', text: 'Ranger 837, Corpus Approach, proceed course rules to Goliad' },
    { radio: 'UHF CH6', text: 'Ranger 837, course rules Goliad' },
    { radio: 'UHF CH6', text: 'Corpus Approach, Ranger 837, terminate Goliad' },
    { who: 'ATC', text: 'Ranger 837, terminate' }
  ]
});

add(crExamples, ['Routes-Arrivals-13', 'Routes-Arrivals-14'], {
  title: 'Navy Corpus to Ingleside', from: '2-11', lines: [
    { radio: 'UHF CH3', text: 'Navy Corpus Ground, Ranger 837, delta line, request taxi with information alpha, RUSTY, VFR to Ingleside' },
    ...TOWER_TO('departure'),
    { radio: 'UHF CH12', text: 'Corpus Departure, Ranger 837, 500 feet off Navy Corpus, VFR to Ingleside' },
    ...IDENT('Departure', 'proceed as requested'),
    { radio: 'UHF CH12', text: 'Ranger 837, wilco' },
    { radio: 'UHF CH12', text: 'Corpus Departure, Ranger 837, terminate Ingleside' },
    { who: 'ATC', text: 'Ranger 837, terminate' }
  ]
});

// Ingleside: CTAF VHF 122.7; the airport's notes list the calls, Aransas County's give the words
const KTFP_ARRIVALS = ['Routes-Arrivals-5', 'Routes-Arrivals-6', 'Routes-Arrivals-8', 'Routes-Arrivals-9',
  'Routes-Arrivals-11', 'Routes-Arrivals-12', 'Routes-Arrivals-13', 'Routes-Arrivals-14',
  'Routes-Arrivals-15', 'Routes-Arrivals-16'];
perRunway(KTFP_ARRIVALS, n => ({
  title: `Into Ingleside (runway ${n})`, from: 'KTFP notes', lines: [
    { radio: 'UHF', text: 'Corpus Approach, Ranger 837, terminate Ingleside' },
    { who: 'ATC', text: 'Ranger 837, terminate' },
    { radio: 'VHF 122.7', text: `Ingleside Traffic, Ranger 837, 2 mile initial runway ${n} for a left overhead, Ingleside` },
    { radio: 'VHF 122.7', text: `Ingleside Traffic, Ranger 837, numbers runway ${n} for a left overhead, Ingleside` }
  ]
}));

perRunway(['Routes-Traffic Patterns-2', 'Routes-Traffic Patterns-3'], n => ({
  title: `Ingleside pattern (runway ${n})`, from: 'KTFP notes', lines: [
    { radio: 'VHF 122.7', text: `Ingleside Traffic, Ranger 837, left crosswind, runway ${n}, Ingleside` },
    { radio: 'VHF 122.7', text: `Ingleside Traffic, Ranger 837, left base, runway ${n}, touch and go, Ingleside` },
    { manual: 'Once established in the pattern, Aircrew must contact Corpus Approach on CH 6 UHF prior to climbing for high key 3000\' MSL.', page: '2-57' }
  ]
}));

perRunway(['Routes-Departures-17', 'Routes-Departures-18'], n => ({
  title: `Leaving Ingleside, single ship (runway ${n})`, from: 'KTFP single departure', lines: [
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, Ingleside, request course rules to Shamrock with information bravo' },
    ...IDENT('Approach', 'proceed course rules Shamrock'),
    { radio: 'UHF CH8', text: 'Ranger 837, course rules Shamrock' },
    { radio: 'VHF 122.7', text: `Ingleside Traffic, Ranger 837, departing runway ${n} to the north, Ingleside` }
  ]
}));

perRunway(['Routes-Departures-19', 'Routes-Departures-20'], n => ({
  title: `Leaving Ingleside, formation (runway ${n})`, from: 'KTFP formation departure', lines: [
    { radio: 'VHF 122.7', text: `Ingleside Traffic, Ranger 837 flight, departing runway ${n} to the north, Ingleside` },
    { radio: 'UHF CH6', text: 'Corpus Approach, Ranger 837 flight, off Ingleside, 1000, Goliad Arrival with information bravo' },
    ...IDENT('Approach', 'proceed course rules Shamrock'),
    { radio: 'UHF CH6', text: 'Ranger 837 flight, course rules Shamrock' }
  ]
}));

// Waldron's transitions back to Navy Corpus (2-47, 2-48)
perRunway(r('Routes-Departures-', 56, 59), n => ({
  title: `Runway ${n}, Sunrise Transition to Navy Corpus`, from: '2-47', lines: [
    { radio: 'UHF CH30', text: 'Waldron Tower, Ranger 837, request Sunrise Transition' },
    { who: 'ATC', text: 'Ranger 837, Waldron Tower, contact Cabaniss Tower' },
    { radio: 'UHF CH30', text: 'Ranger 837, contact Cabaniss Tower' },
    { radio: 'UHF CH27', text: 'Cabaniss Tower, Ranger 837, Point Chapman, Sunrise Transition' },
    { who: 'ATC', text: 'Ranger 837, Cabaniss Tower, contact Navy Corpus Tower' },
    { radio: 'UHF CH27', text: 'Ranger 837, contact Navy Corpus Tower' },
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, Point Sunrise, full stop' },
    { manual: 'Expect an Overhead, Base, or straight-in entry at Tower\'s discretion.', page: '2-47' }
  ]
}));

perRunway(r('Routes-Departures-', 74, 77), n => ({
  title: `Runway ${n}, Oso Transition to Navy Corpus`, from: '2-48', lines: [
    { radio: 'UHF CH30', text: 'Waldron Tower, Ranger 837, would like to put an Oso Transition on request' },
    { who: 'ATC', text: 'Ranger 837, Right turnout for your Oso Transition is approved. Contact Navy Tower' },
    { radio: 'UHF CH30', text: 'Ranger 837, contact Navy Tower' },
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, Oso Bridge, full stop' }
  ]
}));

perRunway(r('Routes-Arrivals-', 67, 70), n => ({
  title: `Into Waldron via the Oso Transition (runway ${n})`, from: '2-43', lines: [
    { radio: 'UHF CH30', text: `Waldron Tower, Ranger 837, initial ${n}` },
    { who: 'ATC', text: `Ranger 837, Waldron Tower, report the numbers runway ${n}` },
    { radio: 'UHF CH30', text: `Waldron Tower, Ranger 837, numbers ${n}` }
  ]
}));

// Aransas County departure for a working area (2-55)
add(crExamples, r('Routes-Departures-', 32, 35), {
  title: 'Leaving Aransas County for MUSTANG 1', from: '2-55', lines: [
    { radio: 'VHF CH21', text: 'Aransas County Traffic, Ranger 837, clear to the south, last call, Aransas County' },
    { radio: 'UHF CH8', text: 'Corpus Approach, Ranger 837, Off Aransas County, request Mustang 1' },
    ...IDENT('Approach', 'proceed as requested'),
    { radio: 'UHF CH8', text: 'Ranger 837, wilco, Mustang 1' }
  ]
});

// Navy Corpus tower pattern (2-6 and the script's Waldron pattern)
perRunway(r('Routes-Traffic Patterns-', 98, 101), n => ({
  title: `Navy Corpus pattern (runway ${n})`, from: '2-6', lines: [
    { radio: 'UHF CH4', text: `Navy Corpus Tower, Ranger 837, 180, gear down, touch and go` },
    { who: 'ATC', text: `Ranger 837, Navy Corpus Tower, runway ${n}, cleared touch and go` },
    { radio: 'UHF CH4', text: `Ranger 837, cleared touch and go, runway ${n}` }
  ]
}));

// Into Navy Corpus from PT Sunrise, and the Lex Arrival on its own leg (2-47, 2-60)
perRunway(r('Routes-Arrivals-', 136, 143), n => ({
  title: `From PT Sunrise (runway ${n})`, from: '2-47', lines: [
    { radio: 'UHF CH4', text: 'Navy Corpus Tower, Ranger 837, Point Sunrise, full stop' },
    { who: 'ATC', text: `Ranger 837, Navy Corpus Tower, report the initial runway ${n}` },
    { radio: 'UHF CH4', text: `Ranger 837, report the initial runway ${n}` },
    { manual: 'Expect an Overhead, Base, or straight-in entry at Tower\'s discretion.', page: '2-47' }
  ]
}));

add(crExamples, ['Routes-Arrivals-188'], crExamples['Working Areas-Mustang-197'].find(b => b.title.endsWith('Lex Arrival')));
