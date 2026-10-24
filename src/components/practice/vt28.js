// VT-28's memory aids for the moments a practice flight flies, from the squadron's Student
// Standardization Handout (July 2025), "Techniques and Memory Aids", pp. 10-11, word for word.
// The handout is plain that they are techniques: "Techniques are not mandatory, and your
// instructor might have his or her own technique ... You should never be graded on using
// techniques, only procedures written in NATOPS or the FTI." Pure data.
//
// Each line is [cue, what it stands for]. Said from memory, the cue shows its first letter
// and the rest is blank, as a course rule's marked words are.

const ref = (pages) => ({ work: 'VT-28 Student Standardization Handout', loc: 'Techniques and Memory Aids', pages });

const AIDS = {
  break: {
    title: 'Break',
    ref: ref('p. 10'),
    lines: [
      ['FLOP', '45°-60° AOB'],
      ['CHOP', '0-10% torque'],
      ['POP', 'Speed brake (As Required)'],
      ['LEVEL', 'Maintain level turn'],
      ['CHECK', 'Airspeed and downwind spacing during the second half of the turn'],
      ['DROP', 'Below 150 KIAS, lower landing gear, slow to 120 KIAS and slightly advance the PCL (~30%)'],
    ],
  },
  transition: {
    title: 'Transition in the downwind',
    ref: ref('p. 10'),
    lines: [
      ['FLAPS', 'From 120 KIAS level on downwind, set desired flaps then add power (~31% NF, ~42% TF, ~52% LF)'],
      ['POWER', 'Set ~20% torque for all flap settings at the transition point'],
      ['PITCH', 'Slight nose up to arrest descent and bleed off airspeed (as required)'],
      ['TRIM', 'Trim the aircraft (generally requiring nose up trim)'],
      ['TURN', 'At the 180, slightly relax the nose to capture 120 KIAS (NF), 115 KIAS (TF), 110 KIAS (LF).'],
      ['TALK (OUT)', '"731, 180, Gear Down"'],
      ['TALK (IN)', 'In the groove, "Gear Down, Flaps UP/TO/LDG, Lights Checked"'],
    ],
  },
  touchAndGo: {
    title: 'Touch and go',
    ref: ref('p. 10'),
    lines: [
      ['POWER UP', 'Smoothly add max power'],
      ['SPOOL UP', 'Wait for engine spool up'],
      ['RUDDER UP', 'Anticipate adding right rudder as the engine spools up.'],
    ],
  },
  remaining: {
    title: 'Remaining in the pattern',
    ref: ref('p. 10'),
    lines: [
      ['FLAPS', 'Raise from LDG to TO, wait for 110 KIAS to raise the flaps to UP'],
      ['POWER', 'Reduce the PCL to 60-70% torque approaching 120 KIAS'],
      ['PITCH', '7°-10° nose high'],
      ['TRIM', 'Trim the aircraft to hold 120 KIAS'],
      ['TALK (OUT)', '"731, crosswind, touch and go"'],
      ['TURN', 'With appropriate interval to downwind heading use 30°-45° AOB depending on crosswinds'],
      ['TORQUE', 'Anticipate pattern altitude and reduce torque 100 feet prior (~30%)'],
    ],
  },
  departingOlf: {
    title: 'Departing the OLF',
    ref: ref('p. 11'),
    lines: [
      ['CHECK', 'Check interval and ensure you are number one upwind'],
      ['CLEAN', 'Raise the gear and flaps below 150 KIAS'],
      ['CALL', '"Goliad RDO, Ranger 731, number one upwind departing"'],
      ['CLEAR', 'Clear visually above and in front of you'],
      ['CLIMB', 'When clear of the pattern, turn away and climb(as required) for course rules'],
    ],
  },
  pelp: {
    title: 'PEL/P (Upon reaching DEGA)',
    ref: ref('p. 11'),
    lines: [
      ['REDUCE', '100\' prior to DEGA, Pull power to 4-6%'],
      ['LOWER', 'Relax the nose to intercept glide (~120KIAS)'],
      ['LOWER', 'Below 150KIAS, drop the gear'],
    ],
  },
  abcdont: {
    title: 'Checking out of the MOA: ABCDONT',
    ref: ref('p. 11'),
    lines: [
      ['A', 'ATIS/WX'],
      ['B', 'Bingo'],
      ['C', 'CDI to Landing runway'],
      ['D', 'Descent Checklist'],
      ['O', 'Ops Check'],
      ['N', 'Navigation – FMS needle? Direct to?'],
      ['T', 'Transponder as required'],
    ],
  },
  gooftwar: {
    title: 'Checking out of the MOA: GOOFTWAR',
    ref: ref('p. 11'),
    lines: [
      ['G', 'G reset'],
      ['O', 'establish an orbit by reducing power to conserve gas and trimming to maintain altitude'],
      ['O', 'Ops check / descent check'],
      ['F', 'FMS - bring Goliad up to the top'],
      ['T', 'TRANSPONDER - make your call to Houston Center and change your transponder code back to company.'],
      ['W', 'Weather - grab ASOS and make a Goliad Landing call.'],
      ['A', 'Altitude - reset your altitude bug and brief the break/pattern altitude'],
      ['R', 'Runway - brief the runway in use and set your CDI.'],
    ],
  },
};

// An aid as rule paragraphs: the cue's first letter showing, the rest of it and its meaning
// blank. A one-letter cue (ABCDONT) shows whole: the acronym is the prompt.
const blank = (cue) => (cue.length === 1 ? cue : `${cue[0]}[[${cue.slice(1)}]]`);
export const VT28 = Object.fromEntries(Object.entries(AIDS).map(([id, aid]) => [id, {
  title: aid.title,
  ref: aid.ref,
  technique: true,
  rule: aid.lines.map(([cue, says]) => ({ text: `${blank(cue)} – [[${says.replace(/[[\]]/g, '')}]]` })),
}]));
