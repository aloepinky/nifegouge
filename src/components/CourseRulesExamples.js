// Example radio exchanges for Flight Path Builder, from a TW-4 Primary comms practice script
// (10/7/20). It is a worked example, not a TW-4 publication: the page says so, and the
// manual's own calls (`comms` in CourseRulesFeatures.js) always come first.
//
// Each leg gets blocks of { title, page, lines }. A line is { radio, who, text } like a manual
// call, { note } for the script's stage directions, or { label } for this site's own caption.
// `who` is the speaker: the pilot's lines carry their channel; ATC, RDO and BASE are the
// replies. `was` keeps the script's wording where it was corrected: a typo, a wrong facility,
// or a name. A line the manual contradicts stays as the script has it, followed by a `manual`
// note giving the manual's version and page.

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
