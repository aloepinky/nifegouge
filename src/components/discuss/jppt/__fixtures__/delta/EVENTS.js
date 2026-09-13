// One row per Delta JPPT event. An event owns no content — only its JPPT metadata and an
// ordered list of item slugs. `label` is the JPPT's wording for that item *in this event*:
// N4101 writes "VFR field entry - departure (AIM)" where N3101 writes "VFR field
// entry/departure (AIM)", and both point at the same page.
//
// An item row is one of three shapes:
//
//   { slug, label }   the usual case — resolves to a discuss item page.
//   { href, label }   resolves to somewhere else on the site, with no page of its own.
//   { label }         a JPPT item nobody has a page for. Rendered as "no page yet" with a
//                     create-page button; `rowTo` returns null for it.
//
// The `href` shape is for one item only: the bare JPPT phrase "any emergency procedure",
// which resolves to /tw4/eps-limits because the EPs already live there in full. A *named*
// EP — hung start, uncommanded prop feather, chip detector warning — is an ordinary item
// with an ordinary page, carrying the indication and the decision while the boldface steps
// stay on the EP tab. An `href` row is deliberately not an item: it has no page, no stub,
// and never appears in the coverage counts, because there is nothing outstanding to write.
//
// Metadata and item order are verbatim from CNATRAINST 1542.166D (15 Jul 2024); the page
// each event was taken from is noted above it.
const ALL = [
  // p. VI-3.
  {
    id: 'N3101',
    title: 'Day Navigation',
    block: 'VNAV',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'NA1190 (VFR Navigation Exam)',
    syllabusNotes:
      'Flight planning for this event shall include a completed jet log, DD-1801, ' +
      'DD-175-1 weather brief, NOTAM, and BASH conditions.',
    items: [
      { slug: 'vfr-chart-preparation', label: 'VFR chart preparation' },
      { slug: 'emergency-field-selection', label: 'emergency field selection' },
      { slug: 'airspace-classification', label: 'airspace classification' },
      { slug: 'vfr-field-entry-departure', label: 'VFR field entry/departure (AIM)' },
      { slug: 'hud', label: 'HUD' },
      { slug: 'route-management', label: 'route management' },
      { slug: 'standard-time-corrections', label: 'standard time corrections' },
      { slug: 'standard-course-corrections', label: 'standard course corrections' },
    ],
  },
  // p. VI-7. N4101 lists seven of N3101's eight items — everything but the HUD — in a
  // different order, and adds five of its own.
  {
    id: 'N4101',
    title: 'Day Navigation',
    block: 'VNAV',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'N3101 (Day Navigation)',
    syllabusNotes:
      'Flight planning for these events shall include a completed jet log, DD-1801, ' +
      'DD-175-1 weather brief, NOTAM, and BASH conditions. Students should contact the ' +
      'IP prior to the flight (or Duty Officer after hours) to obtain guidance for the ' +
      'required route. Students shall provide charts with route appropriately depicted ' +
      'and jet logs for the IP and one for themselves. Fly VFR no lower than 1,000 feet AGL.',
    items: [
      { slug: 'vfr-chart-preparation', label: 'VFR chart preparation' },
      { slug: 'route-management', label: 'route management' },
      { slug: 'standard-time-corrections', label: 'standard time corrections' },
      { slug: 'standard-course-corrections', label: 'standard course corrections' },
      { slug: 'airspace-classification', label: 'airspace classification' },
      { slug: 'vfr-field-entry-departure', label: 'VFR field entry-departure (AIM)' },
      { slug: 'local-cross-country-sop', label: 'local cross-country SOP' },
      { slug: 'fms-procedures', label: 'FMS procedures' },
      { slug: 'emergency-field-selection', label: 'emergency field selection' },
      {
        slug: 'destination-maintenance-facilities',
        label: 'destination maintenance facilities and operating procedures',
      },
      { slug: 'time-on-target', label: 'TOT' },
      { slug: 'day-emergencies', label: 'any applicable day emergency' },
    ],
  },
  // p. VI-5. Every item is a night variant; none is shared with the day events, which is
  // why the night pages are separate rather than sections of their day counterparts.
  {
    id: 'N6101',
    title: 'Night Navigation',
    block: 'VNAV',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'N3101 (Day Navigation)',
    syllabusNotes:
      'Due to the lack of realistic tactile interaction with instrumentation, the ' +
      'learning objectives of this profile are overall mission management and in-flight ' +
      'planning, in-flight computations, communication with ATC, and general VFR ' +
      'procedures. Flight planning for this event shall include a completed jet log, ' +
      'DD-1801, DD-175-1 weather brief, NOTAM, and BASH conditions.',
    items: [
      {
        slug: 'night-vnav-timing-and-course-corrections',
        label: 'night VNAV timing and course corrections',
      },
      { slug: 'night-vfr-chart-interpretation', label: 'night VFR chart interpretation' },
      { slug: 'airfield-and-runway-lighting', label: 'airfield and runway lighting' },
      { slug: 'local-night-vnav-sop', label: 'local night VNAV SOP' },
      {
        slug: 'night-emergency-procedures',
        label: 'any applicable night emergency procedure',
      },
    ],
  },

  // ---- Ground training (chapter II) -----------------------------------------------------
  // p. II-1. G01's only discuss item, on G0102. Its page is the one FAM1301 also points at.
  {
    id: 'G0102',
    title: 'CNAF M-3710.7 Level-A Mission Readiness Training',
    block: 'ASI',
    media: 'Lect',
    hours: 6.0,
    prereqs: 'G0101 (Check-in)',
    syllabusNotes: 'G0102 requires the use of an EST, an EPT, and Blindfold use of PRC-648.',
    items: [
      {
        slug: 'seat-height-and-rudder-pedal-adjustment',
        label: 'Seat height and rudder pedal adjustment',
      },
    ],
  },

  // ---- FAM 2000: the trainers ---------------------------------------------------------
  // p. IV-4. Block metadata is FAM21's; the JPPT gives discuss items per event.
  {
    id: 'FAM2101',
    title: 'Familiarization Cockpit Procedures',
    block: 'FAM',
    media: 'UTD',
    hours: 1.3,
    prereqs: 'FAM1290 (Familiarization Exam 2), SY0301 (FMS Trainer 1), G0102-7 (Indoctrination)',
    syllabusNotes:
      'The student shall bring all required flight gear and practice strapping in on ' +
      'every event in this block. FAM2101-2 shall only be scheduled as one event per ' +
      'day, and should be conducted in the UTD/ER.',
    items: [
      {
        slug: 'checklist-challenge-action-response',
        label: 'checklist challenge-action response format',
      },
      { slug: 'dual-concurrence-response-crm', label: 'dual concurrence/response CRM' },
      { slug: 'memorized-checklists', label: 'memorized checklists' },
      { slug: 'ground-handling-signals', label: 'ground handling signals' },
      {
        slug: 'safety-check-call',
        label: 'safety check/call prior to cockpit entry and departing aircraft',
      },
      { slug: 'blindfold-cockpit-check', label: 'blindfold cockpit check' },
    ],
  },
  // p. IV-5. Eight of the nine items are named ground EPs, so each has a page carrying the
  // indication and the decision; the checklist steps stay on the EPs and Limits page. "CFS
  // and ejection CRM" is not a checklist at all — it is the crew coordination around one.
  {
    id: 'FAM2102',
    title: 'Familiarization Cockpit Procedures',
    block: 'FAM',
    media: 'UTD',
    hours: 1.3,
    prereqs: 'FAM2101 (Familiarization Cockpit Procedures)',
    syllabusNotes:
      'The student shall bring all required flight gear and practice strapping in on ' +
      'every event in this block. Ground emergencies required: no start, hung start, hot ' +
      'start, loss of start ready light during start sequence, battery bus light during ' +
      'start, fire on ground, emergency engine shutdown, and emergency ground egress.',
    items: [
      { slug: 'no-start', label: 'no start' },
      { slug: 'hung-start', label: 'hung start' },
      { slug: 'hot-start', label: 'hot start' },
      { slug: 'loss-of-start-ready-light-during-start-sequence', label: 'loss of start ready light during start sequence' },
      { slug: 'battery-bus-light-during-start', label: 'battery bus light during start' },
      { slug: 'fire-on-ground', label: 'fire on ground' },
      { slug: 'emergency-engine-shutdown-on-the-ground', label: 'emergency engine shutdown on the ground' },
      { slug: 'emergency-ground-egress', label: 'emergency ground egress' },
      { slug: 'cfs-and-ejection-crm', label: 'CFS and ejection CRM' },
    ],
  },
  // p. IV-8. Every item is a named EP, so every one has a page. What is on those pages is
  // the indication, the cause and the decision; the checklist steps stay at /tw4/eps-limits.
  {
    id: 'FAM2201',
    title: 'Familiarization Emergency Procedures Trainer',
    block: 'FAM',
    media: 'UTD',
    hours: 1.3,
    prereqs: 'FAM2102 (Familiarization Cockpit Procedures), PR0105 (Emergency Procedures)',
    syllabusNotes:
      'The student shall bring all required flight gear and practice strapping in on ' +
      'every event in this block. FAM2201 should be conducted in the UTD/ER, and FAM2201 ' +
      'and FAM2202 shall only be scheduled as one event per day.',
    items: [
      { slug: 'aborted-takeoff', label: 'abort takeoff' },
      { slug: 'aircraft-departs-prepared-surface', label: 'aircraft departs prepared surface' },
      { slug: 'engine-failure-immediately-after-takeoff', label: 'engine failure immediately after takeoff' },
      { slug: 'engine-failure-during-flight', label: 'engine failure during flight' },
      { slug: 'immediate-air-start', label: 'immediate air-start' },
      { slug: 'pmu-norm-air-start', label: 'PMU NORM air-start' },
      { slug: 'pmu-off-air-start', label: 'PMU OFF air-start' },
      { slug: 'uncommanded-power-changes-lop', label: 'uncommanded power changes/LOP' },
      { slug: 'uncommanded-prop-feather', label: 'uncommanded prop feather' },
      { slug: 'smoke-and-fume-elimination', label: 'smoke and fume elimination' },
      { slug: 'fire-warning-in-flight', label: 'fire warning in flight' },
      { slug: 'controlled-ejection', label: 'controlled ejection' },
      { slug: 'eject', label: 'eject' },
    ],
  },
  // p. IV-8. Eight named EPs plus BFI, the backup flight instrument, which is a systems
  // item rather than an EP and is scoped to what it shows and what powers it.
  {
    id: 'FAM2202',
    title: 'Familiarization Emergency Procedures Trainer',
    block: 'FAM',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'FAM2201 (Familiarization Emergency Procedures Trainer)',
    syllabusNotes:
      'The student shall bring all required flight gear and practice strapping in on ' +
      'every event in this block. FAM2202 should be conducted in the OFT, and FAM2201 ' +
      'and FAM2202 shall only be scheduled as one event per day.',
    items: [
      { slug: 'chip-detector-warning', label: 'chip detector warning' },
      { slug: 'oil-system-malfunction-or-low-oil-pressure', label: 'oil system malfunction or low oil pressure' },
      { slug: 'low-fuel-pressure', label: 'low fuel pressure' },
      { slug: 'hydraulic-system-malfunctions', label: 'hydraulic system malfunctions' },
      { slug: 'landing-gear-emergency-extension', label: 'landing gear emergency extension' },
      { slug: 'obogs-fail-message', label: 'OBOGS fail message' },
      { slug: 'runaway-trim', label: 'runaway trim' },
      { slug: 'precautionary-emergency-landing', label: 'precautionary emergency landing (PEL)' },
      { slug: 'bfi', label: 'BFI' },
    ],
  },

  // ---- FAM 3000: the OFT ---------------------------------------------------------------
  // p. IV-11. FAM3101 and FAM3102 open with the same two items; the JPPT repeats them
  // verbatim and both events point at the same pages.
  {
    id: 'FAM3101',
    title: 'Familiarization',
    block: 'FAM',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'I2103 (Basic Instruments), G0290 (Course Rules Exam)',
    syllabusNotes:
      'FAM31 block shall only be scheduled as one event per day. The instructor ' +
      'demonstrates how the PCL can be inadvertently moved to the cutoff position.',
    items: [
      { slug: 'normal-takeoff', label: 'normal takeoff' },
      { slug: 'local-area-departure', label: 'local area departure' },
      { slug: 'integrated-vmc-scan', label: 'integrated (VMC) scan' },
      { slug: 'turn-pattern', label: 'turn pattern' },
      { slug: 'level-speed-change', label: 'level speed change' },
      { slug: 'power-on-stalls', label: 'power-on stalls' },
      { slug: 'power-off-stall', label: 'power-off stall (ELP Stall)' },
      {
        slug: 'landing-pattern-stalls',
        label: 'landing pattern (approach turn and landing attitude) stalls',
      },
      { slug: 'intentional-spin-entry', label: 'intentional spin entry' },
      { slug: 'incipient-spin-recovery', label: 'incipient spin recovery' },
      { slug: 'steady-state-spin-recovery', label: 'steady-state spin recovery' },
    ],
  },
  // p. IV-11.
  {
    id: 'FAM3102',
    title: 'Familiarization',
    block: 'FAM',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'FAM3101 (Familiarization)',
    syllabusNotes: 'FAM31 block shall only be scheduled as one event per day.',
    items: [
      { slug: 'normal-takeoff', label: 'normal takeoff' },
      { slug: 'local-area-departure', label: 'local area departure' },
      { slug: 'inadvertent-trim-actuation', label: 'inadvertent trim actuation' },
      { slug: 'landing-pattern', label: 'landing pattern' },
      { slug: 'takeoff-flap-landings', label: 'takeoff flap landings' },
      { slug: 'landing-flap-landings', label: 'landing flap landings' },
      { slug: 'no-flap-landings', label: 'no-flap landings' },
      { slug: 'full-stop-landings', label: 'full-stop landings' },
      { slug: 'wave-off', label: 'wave-off' },
      { slug: 'contact-unusual-attitudes', label: 'contact unusual attitudes' },
    ],
  },
  // p. IV-11. "Crosswind takeoff" and "crosswind landings" are one page — FAM6202 lists
  // the pair as a single item, and the FTI teaches the two halves of the same correction.
  {
    id: 'FAM3103',
    title: 'Familiarization',
    block: 'FAM',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'FAM3102 (Familiarization)',
    syllabusNotes:
      'FAM31 block shall only be scheduled as one event per day. Flown with crosswinds ' +
      'at maximum solo limits. HUD introduction.',
    items: [
      { slug: 'crosswind-limits', label: 'crosswind limits' },
      { slug: 'crosswind-computations', label: 'crosswind computations' },
      { slug: 'crosswind-takeoff-and-landings', label: 'crosswind takeoff' },
      {
        slug: 'pattern-adjustments-for-crosswinds',
        label: 'pattern adjustments for crosswinds',
      },
      { slug: 'crosswind-takeoff-and-landings', label: 'crosswind landings' },
      { slug: 'crosswind-touch-and-goes', label: 'crosswind T&Gs' },
      { slug: 'crosswind-full-stops', label: 'crosswind full-stops' },
      { slug: 'aborted-takeoff', label: 'aborted takeoff' },
      { slug: 'aircraft-departs-prepared-surface', label: 'aircraft departs prepared surface' },
      { slug: 'hud', label: 'HUD' },
    ],
  },

  // ---- FAM 6000: the VTD ---------------------------------------------------------------
  // p. IV-14.
  {
    id: 'FAM6101',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'FAM3103 (Familiarization)',
    syllabusNotes:
      'Students demonstrate familiarity with local departures and recoveries to the MOA ' +
      'and OLF, including routings, altitudes, pitch/power settings, communications, and ' +
      'in-flight checks. Students should practice every available combination of home ' +
      'field runways, working areas, OLFs, OLF runways, and course rules as time allows. ' +
      'The student executes an OLF discontinued entry.',
    items: [
      { href: '/tw4/courserules', label: 'local course rules' },
      { slug: 'olf-arrival-and-departure', label: 'OLF arrival and departure' },
      { slug: 'home-field-arrival', label: 'home field arrival' },
      { slug: 'local-vfr-sectional-review', label: 'local VFR sectional review' },
    ],
  },
  // p. IV-14.
  {
    id: 'FAM6102',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'FAM6101 (Day Familiarization)',
    syllabusNotes:
      'Students will practice any available combination of home field runways, working ' +
      'areas, OLFs, OLF runways, and course rules not previously covered on FAM6101. If ' +
      'student proficiency and event timing allow, practice the overhead pattern from VFR ' +
      'traffic entry through landing. The student executes a home-field visual straight in.',
    items: [
      { slug: 'imsafe-checklist', label: '"IMSAFE" checklist' },
      { slug: 'crm', label: 'CRM' },
      { slug: 'see-and-avoid', label: 'see & avoid principle' },
      { slug: 'cloud-clearances', label: 'cloud clearances' },
      { slug: 'local-vfr-sectional-review', label: 'local VFR sectional review' },
    ],
  },
  // p. IV-15.
  {
    id: 'FAM6201',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'FAM6102 (Day Familiarization)',
    syllabusNotes:
      'Turn pattern, level speed change, power-on stalls, power-off stall (ELP stall), ' +
      'landing pattern (approach turn and landing attitude) stalls, intentional spin ' +
      'entry, and incipient spin recovery.',
    items: [
      { slug: 'three-cs', label: 'three Cs' },
      { slug: 'slow-flight', label: 'slow flight' },
      { slug: 'scatsafe', label: 'SCATSAFE maneuver' },
      { slug: 'energy-management', label: 'energy management' },
      { slug: 'slip', label: 'slip' },
    ],
  },
  // p. IV-15. "OLF entry" is the same page as FAM6101's "OLF arrival and departure" — one
  // topic, two JPPT phrasings, and a separate page could only be a fragment of the other.
  {
    id: 'FAM6202',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'FAM6201 (Day Familiarization)',
    syllabusNotes:
      'Normal takeoff, local area departure, landing pattern, takeoff flap landings, ' +
      'landing flap landings, no-flap landings, full-stop landings, and wave-off.',
    items: [
      { slug: 'olf-arrival-and-departure', label: 'OLF entry' },
      { slug: 'olf-rdo-communication', label: 'OLF/RDO communication' },
      {
        slug: 'crosswind-takeoff-and-landings',
        label: 'crosswind takeoff and landings',
      },
      { slug: 'wave-off', label: 'wave-off' },
    ],
  },
  // p. IV-15. The lone item is the "any previously discussed maneuver" family — see
  // CLAUDE.md, Items that are links, not pages. The generated list is not built yet.
  {
    id: 'FAM6203',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'FAM6202 (Day Familiarization)',
    syllabusNotes:
      'Execute a full local area profile. Sample maneuvers from FAM31 and FAM61 block ' +
      'events. Students should demonstrate procedural knowledge and skills required to ' +
      'perform these maneuvers sequentially.',
    items: [
      { slug: 'any-maneuver-in-this-block', label: 'any maneuver performed in this block' },
    ],
  },
  // p. IV-17. Both events carry the same single item, verbatim.
  {
    id: 'FAM6301',
    title: 'RDO Pattern Party',
    block: 'FAM',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'FAM6203 (Day Familiarization)',
    syllabusNotes:
      'Using an IP acting as RDO controller, fly RDO/OLF patterns with multiple aircraft. ' +
      'Events should be scheduled with a minimum of two students per instructor and a ' +
      'maximum of five students per instructor.',
    items: [{ slug: 'olf-course-rules', label: 'OLF Course rules for field of use' }],
  },
  // p. IV-17.
  {
    id: 'FAM6302',
    title: 'RDO Pattern Party',
    block: 'FAM',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'FAM6301 (RDO Pattern Party)',
    syllabusNotes:
      'Using an IP acting as RDO controller, fly RDO/OLF patterns with multiple aircraft. ' +
      'Events should be scheduled with a minimum of two students per instructor and a ' +
      'maximum of five students per instructor.',
    items: [{ slug: 'olf-course-rules', label: 'OLF Course rules for field of use' }],
  },

  // ---- FAM 4000: the aircraft -----------------------------------------------------------
  //
  // Eighteen events across FAM41, FAM42, FAM43, FAM44, FAM45, FAM46 and FAM47. Block
  // metadata is the block's; the JPPT gives discuss items per event except in FAM44, FAM45
  // and FAM46, where the block carries one list for its single event.
  //
  // Most of what these events brief already has a page from the trainers. FAM4102's stalls,
  // landings and wave-off are FAM31's items; FAM4103's course rules and OLF work are
  // FAM61's; FAM4101's takeoff and departure are FAM3101's. Those rows point at the
  // existing pages with this event's wording as the label — that is the whole reason an
  // event owns no content.
  //
  // out-of-control-flight recurs under two JPPT phrasings and resolves to one page: "OCF"
  // on FAM4104, "OCF recovery procedures" on FAM4202 and FAM4701.
  //
  // "Any critical action emergency procedure" is an href row, exactly like "any emergency
  // procedure" — the critical actions are the boldface steps of the EPs and they already
  // live in full at /tw4/eps-limits. FAM4302 writes it singular and FAM4303 plural; both
  // are the same redirect and neither is a page.

  // p. IV-4. FAM13 is a Lect block that carries items because briefing the flight is the
  // whole event. Its Discuss Items entry is one running sentence rather than a list, and
  // most of it is squadron administration with no publication behind it — those items are
  // stubs carrying a sourcing lead, which is what a stub is for. The list is the JPPT's,
  // in the JPPT's order; do not prune it because an entry looks like admin.
  {
    id: 'FAM1301',
    title: 'Familiarization Flight 0',
    block: 'FAM',
    media: 'Lect',
    hours: 3.0,
    prereqs: 'FAM6302 (RDO Pattern Party)',
    syllabusNotes:
      'The student shall demonstrate preflight, post flight and cockpit introduction — to ' +
      'include strapping in with proper seat height and rudder pedal adjustment — and ' +
      'emergency ground egress. With the survival vest on, the student shall locate, identify ' +
      'and discuss the function of each ALSS item.',
    items: [
      { slug: 'scheduling', label: 'scheduling' },
      { slug: 'snivels', label: 'snivels' },
      { slug: 'brief-and-debrief', label: 'brief and debrief' },
      { slug: 'flight-gear-check', label: 'flight gear check' },
      { slug: 'seat-height-and-rudder-pedal-adjustment', label: 'seat height' },
      {
        slug: 'seat-height-and-rudder-pedal-adjustment',
        label: 'rudder pedal adjustment',
      },
      { slug: 'feet-to-rudder-placement', label: 'feet to rudder placement' },
      { slug: 'aircraft-issue', label: 'aircraft issue' },
      { slug: 'weight-and-balance', label: 'weight and balance' },
      {
        slug: 'aircraft-discrepancy-reporting',
        label: 'aircraft discrepancy reporting',
      },
      { slug: 'grading-and-standards', label: 'ATF' },
      { slug: 'grading-and-standards', label: 'ATS' },
      { slug: 'grading-and-standards', label: 'CTS' },
      { slug: 'grading-and-standards', label: 'MIF' },
      { slug: 'headwork', label: 'headwork' },
      { slug: 'basic-air-work', label: 'basic air work' },
      { href: '/tw4/eps-limits', label: 'emergency procedures' },
      { slug: 'exams', label: 'exams' },
      { slug: 'fti-reference-material', label: 'FTI reference material' },
      {
        slug: 'fwb-website-and-weather-brief',
        label: 'FWB website usage and obtaining weather brief',
      },
      { slug: 'tms', label: 'TMS' },
      { slug: 'tower-visit', label: 'tower visit (if able)' },
      { slug: 'dor-tto-policy', label: 'DOR/TTO policy' },
      {
        slug: 'pcl-cutoff-and-inadvertent-engine-shutdown',
        label: 'PCL cutoff and inadvertent engine shutdown',
      },
      {
        slug: 'fuel-cutoff-gate-finger-lift-guard',
        label: 'fuel cutoff gate finger lift guard',
      },
    ],
  },

  // p. IV-21.
  {
    id: 'FAM4101',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.5,
    prereqs: 'FAM1301 (Familiarization Flight 0)',
    syllabusNotes:
      'Instructors will provide ample opportunity to practice basic maneuvers — turns, ' +
      'changes of airspeed, use of trim, local area familiarization. All flights in this ' +
      'block shall be with the on-wing instructor. Special syllabus requirements: AGSM, ' +
      'aircraft trim demonstration, integrated scan pattern demonstration, and TCAS ' +
      'demonstration.',
    items: [
      { slug: 'ejection-seat-and-cfs', label: 'ejection seat and CFS' },
      { slug: 'abnormal-starts', label: 'abnormal starts' },
      { slug: 'brake-failure', label: 'brake failure' },
      { slug: 'strike-of-ground-object', label: 'strike of ground object' },
      { slug: 'normal-takeoff', label: 'takeoff' },
      { slug: 'local-area-departure', label: 'departure' },
      { slug: 'basic-transitions', label: 'basic transitions' },
      { slug: 'trim', label: 'trim' },
      { slug: 'turn-pattern', label: 'turn pattern' },
      { slug: 'level-speed-change', label: 'level speed change' },
      { slug: 'slow-flight', label: 'slow flight' },
      { slug: 'hud', label: 'HUD' },
    ],
  },
  // p. IV-21.
  {
    id: 'FAM4102',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.5,
    prereqs: 'FAM4101 (Day Familiarization)',
    syllabusNotes:
      'All flights in this block shall be with the on-wing instructor. Special syllabus ' +
      'requirements: aborted takeoff demonstration, wave-off lights demonstration, and ' +
      'introduction to the HUD.',
    items: [
      { slug: 'tire-failures', label: 'tire failures' },
      { slug: 'aborted-takeoff', label: 'aborted takeoff' },
      { slug: 'power-on-stalls', label: 'power-on stalls' },
      { slug: 'landing-pattern-stalls', label: 'landing pattern stalls' },
      { slug: 'power-off-stall', label: 'power-off stalls' },
      { slug: 'landing-pattern', label: 'landing pattern' },
      { slug: 'no-flap-landings', label: 'no-flap landing' },
      { slug: 'takeoff-flap-landings', label: 'takeoff flap landing' },
      { slug: 'landing-flap-landings', label: 'landing flap landing' },
      { slug: 'landing-irregularities', label: 'landing irregularities' },
      { slug: 'wave-off', label: 'wave-off' },
    ],
  },
  // p. IV-21. "OLF operations" is the same page as FAM6101's "OLF arrival and departure".
  {
    id: 'FAM4103',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.5,
    prereqs: 'FAM4102 (Day Familiarization)',
    syllabusNotes:
      'All flights in this block shall be with the on-wing instructor. Students are ' +
      'required to review NATOPS Flight Manual, Chapter 6, Flight Characteristics, prior to ' +
      'this event. Special syllabus requirement: the instructor demonstrates the SCATSAFE ' +
      'maneuver.',
    items: [
      { slug: 'olf-arrival-and-departure', label: 'OLF operations' },
      { href: '/tw4/courserules', label: 'local course rules' },
      { slug: 'home-field-arrival', label: 'home-field arrival' },
      { slug: 'scatsafe', label: 'SCATSAFE maneuver' },
    ],
  },
  // p. IV-21.
  {
    id: 'FAM4104',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.5,
    prereqs: 'FAM4103 (Day Familiarization)',
    syllabusNotes:
      'All flights in this block shall be with the on-wing instructor. Spins require a ' +
      'clearly defined horizon, clear of clouds, and no spin shall occur below a 5,000-foot ' +
      'hard deck above the terrain or an undercast — adjusted upward over high ground or a ' +
      'high undercast. A minimum of five spins shall be completed across FAM41 to FAM43. ' +
      'The instructor enters unusual attitudes from normal aerobatic maneuvers and passes ' +
      'the controls for recovery above 90 KIAS.',
    items: [
      {
        slug: 'crosswind-takeoff-and-landings',
        label: 'crosswind takeoff/approach/landing',
      },
      { slug: 'out-of-control-flight', label: 'OCF' },
      { slug: 'contact-unusual-attitudes', label: 'contact unusual attitudes' },
    ],
  },

  // p. IV-23. FAM32 gives its discuss items per event rather than per block.
  {
    id: 'FAM3201',
    title: 'Familiarization',
    block: 'FAM',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'FAM4104 (Day Familiarization)',
    syllabusNotes:
      'The student performs introduction of the slip at altitude, straight and turning, plus ' +
      'PEL, ELP and PEL/P. Practice emergency procedures.',
    items: [
      {
        slug: 'impending-engine-failure-indications',
        label: 'impending engine failure indications',
      },
      { slug: 'precautionary-emergency-landing', label: 'PEL' },
      { slug: 'pel-from-the-pattern', label: 'PEL/P' },
      { slug: 'emergency-landing-pattern', label: 'ELP' },
    ],
  },
  // p. IV-23.
  {
    id: 'FAM3202',
    title: 'Familiarization',
    block: 'FAM',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'FAM3201 (Familiarization)',
    syllabusNotes:
      'The student performs engine failure immediately after takeoff, engine failure during ' +
      'flight, immediate air-start (PMU NORM), forced landing, PEL, PEL/P and ELP. Practice ' +
      'emergency procedures. Special syllabus requirement: at least one pattern and landing ' +
      'with the TAD off.',
    items: [
      { slug: 'engine-failure-indications', label: 'engine failure indications' },
      { slug: 'engine-failure-during-flight', label: 'engine failure during flight' },
      { slug: 'immediate-air-start', label: 'immediate air-start (PMU NORM)' },
      { slug: 'forced-landing', label: 'forced landing' },
      { slug: 'eject', label: 'eject' },
    ],
  },

  // p. IV-25. One event, and the block's discuss items are the event's.
  {
    id: 'FAM3301',
    title: 'Familiarization',
    block: 'FAM',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'FAM3202 (Familiarization)',
    syllabusNotes:
      'With crosswinds at maximum solo limits working up to maximum dual limits: crosswind ' +
      'takeoff, crosswind landings, crosswind touch-and-goes, crosswind full stops, aborted ' +
      'takeoff, and aircraft departs prepared surface. Practice emergency procedures. Special ' +
      'syllabus requirement: gusty wind conditions on takeoff and landing.',
    items: [
      {
        slug: 'crosswind-takeoff-and-landings',
        label: 'crosswind takeoff/touch-and-go/full-stop landings',
      },
      { slug: 'aborted-takeoff', label: 'aborted takeoff' },
      {
        slug: 'aircraft-departs-prepared-surface',
        label: 'aircraft departs a prepared surface',
      },
      { slug: 'wind-shear-recovery', label: 'wind shear recovery' },
      { slug: 'ufcp-failure', label: 'Up Front Control Panel (UFCP) failure' },
    ],
  },

  // p. IV-26. FAM64 gives its discuss items per event.
  {
    id: 'FAM6401',
    title: 'Advanced RDO Pattern Party',
    block: 'FAM',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'FAM3301 (Familiarization)',
    syllabusNotes:
      'Using an IP acting as RDO controller, fly RDO/OLF patterns with multiple aircraft. ' +
      'Students demonstrate familiarity with and gain exposure to PEL and PEL/P in the ' +
      'RDO/OLF environment. Scheduled with a minimum of two and a maximum of five students ' +
      'per instructor.',
    items: [
      {
        slug: 'precautionary-emergency-landing',
        label: 'PEL profile and procedures',
      },
      { href: '/tw4/eps-limits', label: 'any EP' },
    ],
  },
  // p. IV-26.
  {
    id: 'FAM6402',
    title: 'Advanced RDO Pattern Party',
    block: 'FAM',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'FAM6401 (Advanced RDO Pattern Party)',
    syllabusNotes:
      'Second of the two events. Same block notes: an IP acts as RDO controller for RDO/OLF ' +
      'patterns with multiple aircraft, and students gain exposure to PEL and PEL/P in that ' +
      'environment.',
    items: [
      { href: '/tw4/eps-limits', label: 'any EP' },
    ],
  },

  // p. IV-28.
  {
    id: 'FAM4201',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'FAM6402 (Advanced RDO Pattern Party)',
    syllabusNotes:
      'Students shall fly four events within FAM4201-4302 off-wing. Special syllabus ' +
      'requirement: Aldis lamp signals.',
    items: [
      { slug: 'natops-limitations', label: 'NATOPS limitations' },
      { slug: 'engine-system', label: 'engine system' },
      { slug: 'engine-malfunctions', label: 'engine malfunctions' },
      { slug: 'emergency-landing-pattern', label: 'ELP' },
      { slug: 'precautionary-emergency-landing', label: 'PEL' },
      { slug: 'forced-landing', label: 'forced landing' },
      { slug: 'aldis-lamp-signals', label: 'Aldis lamp signals' },
    ],
  },
  // p. IV-28. The crosswind item is one JPPT item naming three landings; it points at the
  // crosswind takeoff and landings page, which hatnotes across to the T&G and full-stop
  // pages rather than being split into three rows the JPPT does not count.
  {
    id: 'FAM4202',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'FAM4201 (Day Familiarization)',
    syllabusNotes:
      'Students shall fly four events within FAM4201-4302 off-wing. Special syllabus ' +
      'requirement: the instructor demonstrates a spin with steady-state spin recovery.',
    items: [
      { slug: 'hydraulic-system', label: 'hydraulic system' },
      { slug: 'spin', label: 'spin' },
      { slug: 'out-of-control-flight', label: 'OCF recovery procedures' },
      { slug: 'anti-spin-recovery-procedures', label: 'anti-spin recovery procedures' },
      {
        slug: 'crosswind-takeoff-and-landings',
        label: 'crosswind takeoffs/touch-and-goes/full-stop landings',
      },
    ],
  },
  // p. IV-29. "Oil and propeller systems" is one page: the propeller is positioned by engine
  // oil pressure, so the two are one subject in this aircraft.
  {
    id: 'FAM4203',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'FAM4202 (Day Familiarization)',
    syllabusNotes:
      'Students shall fly four events within FAM4201-4302 off-wing. Special syllabus ' +
      'requirement: the student executes a visual straight-in.',
    items: [
      { slug: 'oil-and-propeller-systems', label: 'oil and propeller systems' },
      { slug: 'engine-air-starts', label: 'engine air starts' },
      { slug: 'ejection', label: 'ejection' },
      { slug: 'visual-straight-in', label: 'visual straight-in' },
    ],
  },
  // p. IV-29.
  {
    id: 'FAM4204',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'FAM4203 (Day Familiarization)',
    syllabusNotes:
      'Students shall fly four events within FAM4201-4302 off-wing.',
    items: [
      { slug: 'electrical-system', label: 'electrical system' },
      { slug: 'avionics-malfunctions', label: 'avionics malfunctions' },
      { slug: 'lost-communications', label: 'lost communications' },
      {
        slug: 'local-area-flight-procedures-sop',
        label: 'local area flight procedures/SOP',
      },
    ],
  },

  // p. IV-31. "OBOGS and pressurization system" is one page for the same reason as oil and
  // propeller: both run on engine bleed air, which is why an engine failure takes both.
  {
    id: 'FAM4301',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'FAM4204 (Day Familiarization)',
    syllabusNotes:
      'Students shall fly four events within FAM4201-4302 off-wing. Special syllabus ' +
      'requirement: the student executes an aborted takeoff.',
    items: [
      {
        slug: 'obogs-and-pressurization-system',
        label: 'OBOGS and pressurization system',
      },
      { slug: 'aborted-takeoff', label: 'aborted takeoff' },
      { slug: 'lost-aircraft-procedures', label: 'lost aircraft procedures' },
      { slug: 'discontinued-entry', label: 'discontinued entry' },
      { slug: 'airborne-damaged-aircraft', label: 'airborne-damaged aircraft' },
    ],
  },
  // p. IV-31. "Any critical action emergency procedure" redirects to the EP tab, the same
  // as the bare phrase "any emergency procedure": the critical actions are the boldface
  // steps and they already live there in full. A discuss page could only copy them.
  {
    id: 'FAM4302',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'FAM4301 (Day Familiarization)',
    syllabusNotes:
      'Students shall fly four events within FAM4201-4302 off-wing.',
    items: [
      { slug: 'fuel-system', label: 'fuel system' },
      { slug: 'full-stop-landings', label: 'full-stop landings' },
      {
        slug: 'heavy-weight-landing-considerations',
        label: 'heavy-weight landing considerations',
      },
      { href: '/tw4/eps-limits', label: 'any critical action emergency procedure' },
    ],
  },
  // p. IV-32.
  {
    id: 'FAM4303',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'FAM4302 (Day Familiarization)',
    syllabusNotes:
      'Students shall fly FAM4303-4 on-wing. The student shall complete a T-6B emergency ' +
      'procedures and operating limitations exam and turn it in during the brief.',
    items: [
      { slug: 'hard-landings', label: 'hard landings' },
      { slug: 'gear-emergencies', label: 'gear emergencies' },
      { slug: 'flap-failures', label: 'flap failures' },
      { slug: 'emergency-orbit-pattern', label: 'emergency orbit pattern' },
      { href: '/tw4/eps-limits', label: 'any critical action emergency procedures' },
    ],
  },
  // p. IV-32.
  {
    id: 'FAM4304',
    title: 'Day Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'FAM4303 (Day Familiarization)',
    syllabusNotes:
      'Students shall fly FAM4303-4 on-wing. A minimum of five spins shall be completed ' +
      'across FAM41 to FAM43.',
    items: [
      {
        slug: 'securing-rear-cockpit-for-solo',
        label: 'securing rear cockpit for solo',
      },
      { slug: 'unauthorized-solo-maneuvers', label: 'unauthorized solo maneuvers' },
      {
        slug: 'unintentional-instrument-flight',
        label: 'unintentional instrument flight',
      },
      { href: '/tw4/courserules', label: 'local course rules' },
      {
        slug: 'previously-discussed-maneuvers',
        label: 'any previously discussed maneuver or procedure',
      },
    ],
  },

  // p. IV-34. The block states one run-on list rather than per-event items; it is read as
  // seven, with the trailing "local course rules, maneuvers, and emergency procedures"
  // taken as three. "Emergency procedures" is the phrase that resolves to the EP tab.
  {
    id: 'FAM4490',
    title: 'Familiarization Check Flight',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'FAM4304 (Day Familiarization), FAM1206 (Safe for Solo)',
    syllabusNotes:
      'Spins require a clearly defined horizon, clear of clouds, and no spin shall occur ' +
      'below a 5,000-foot hard deck above the terrain or an undercast — adjusted upward ' +
      'over high ground or a high undercast.',
    items: [
      {
        slug: 'previously-discussed-familiarization-items',
        label: 'any previously discussed items',
      },
      { slug: 'unauthorized-solo-maneuvers', label: 'unauthorized solo maneuvers' },
      { slug: 'lost-aircraft-procedures', label: 'lost aircraft procedures' },
      {
        slug: 'unintentional-instrument-flight',
        label: 'unintentional instrument flight',
      },
      { href: '/tw4/courserules', label: 'local course rules' },
      { slug: 'previously-discussed-maneuvers', label: 'maneuvers' },
      { href: '/tw4/eps-limits', label: 'emergency procedures' },
    ],
  },

  // p. IV-36. The JPPT's Discuss Items entry for FAM45 reads, in full, "Per the ODO/FDO solo
  // brief" — it names no items, so this event carries none. It is not an omission and it is
  // not a stub: the brief is the content, and it changes with the day.
  {
    id: 'FAM4501',
    title: 'Familiarization Solo Flight',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.5,
    prereqs: 'FAM4490 (Familiarization Check Flight)',
    syllabusNotes:
      'Discuss items are per the ODO/FDO solo brief; the JPPT names none. The student ' +
      'shall not perform stalls, spins, aerobatic maneuvers, or any maneuver not previously ' +
      'introduced, and may only accomplish maneuvers listed in the MIF table. A minimum of ' +
      'four touch-and-go landings should be accomplished. The student shall have completed ' +
      'a spin within five days of the solo flight.',
    items: [],
  },

  // p. IV-38. "Airport night lighting" is FAM46's wording for N6101's "airfield and runway
  // lighting", and "local night SOP" for its "local night VNAV SOP" — one page each.
  {
    id: 'FAM4601',
    title: 'Night Familiarization',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'FAM1205 (Night Procedures), N4101 (Day Navigation), N6101 (Night Navigation)',
    syllabusNotes:
      'Night landings shall be executed no earlier than 30 minutes after official sunset, ' +
      'and the instructor demonstrates at least one landing pattern before the student ' +
      'attempts night landings. The event shall be at least 1.4 hours with at least five ' +
      'landings, and should visit more than one airfield. Flight planning shall include a ' +
      'completed jet log, DD-1801, DD-175-1 weather brief, NOTAM and BASH conditions, with ' +
      'charts and jet logs provided for both crew. Fly the VFR route no lower than 2,000 ' +
      'feet AGL. Special syllabus requirement: introduce pilot-controlled lighting.',
    items: [
      { slug: 'night-flying-considerations', label: 'night flying considerations' },
      {
        slug: 'night-vfr-chart-interpretation',
        label: 'night VFR chart interpretation',
      },
      { slug: 'airfield-and-runway-lighting', label: 'airport night lighting' },
      {
        slug: 'aircraft-and-cockpit-lighting',
        label: 'aircraft and cockpit lighting',
      },
      { slug: 'night-emergency-procedures', label: 'applicable night emergencies' },
      { slug: 'local-night-vnav-sop', label: 'local night SOP' },
      {
        slug: 'electrical-system-malfunctions',
        label: 'electrical system malfunctions',
      },
    ],
  },

  // p. IV-40. The last FAM simulator, and the only event that briefs the full aerobatic set
  // as discuss items. "OCF recovery and airborne damaged aircraft" is one JPPT item and
  // resolves to the existing `out-of-control-flight` page, which is where OCF recovery
  // already lives; the damaged-aircraft half of the phrase is a gap on that page, not a
  // reason to split the row.
  {
    id: 'FAM3401',
    title: 'Familiarization',
    block: 'FAM',
    media: 'OFT',
    hours: 1.3,
    prereqs:
      'FAM1208 (Advanced Aerobatics), FAM4501 (FAM Solo Flight), I4490 (Instrument Check ' +
      'Flight), F4290 (Formation Check Flight)',
    syllabusNotes:
      'No block syllabus notes. Special syllabus requirements: OCF recovery, AOA approach, ' +
      'and HUD usage with aerobatic maneuvers. The I4490 and F4290 prerequisites do not ' +
      'apply under the NASA Flight Training syllabus.',
    items: [
      { slug: 'aoa-approach', label: 'AOA approach' },
      { slug: 'maneuvering-speeds', label: 'maneuvering speeds' },
      { slug: 'contact-unusual-attitudes', label: 'contact unusual attitudes' },
      { slug: 'aileron-roll', label: 'aileron roll' },
      { slug: 'loop', label: 'loop' },
      { slug: 'half-cuban-eight', label: 'half cuban eight' },
      { slug: 'immelmann', label: 'immelmann' },
      { slug: 'split-s', label: 'split-s' },
      { slug: 'wingover', label: 'wingover' },
      { slug: 'barrel-roll', label: 'barrel roll' },
      {
        slug: 'out-of-control-flight',
        label: 'OCF recovery and airborne damaged aircraft',
      },
      { slug: 'combination-maneuvers', label: 'combination maneuvers' },
      { slug: 'hud', label: 'HUD' },
    ],
  },

  // p. IV-42.
  {
    id: 'FAM4701',
    title: 'Familiarization Aerobatics',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'FAM3401 (Familiarization)',
    syllabusNotes:
      'Instructor pilots shall demonstrate every aerobatic maneuver at least once in the ' +
      'block before student execution. The instructor enters unusual attitudes from normal ' +
      'aerobatic maneuvers and passes the controls for recovery above 90 KIAS.',
    items: [
      { slug: 'out-of-control-flight', label: 'OCF recovery procedures' },
      { slug: 'contact-unusual-attitudes', label: 'contact unusual attitudes' },
      { slug: 'aerobatic-maneuvers', label: 'all aerobatic maneuvers' },
    ],
  },
  // p. IV-42.
  {
    id: 'FAM4702',
    title: 'Familiarization Aerobatics',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'FAM4701 (Familiarization Aerobatics)',
    syllabusNotes:
      'Instructor pilots shall demonstrate every aerobatic maneuver at least once in the ' +
      'block before student execution.',
    items: [
      { slug: 'spin', label: 'spin' },
      { slug: 'inverted-spin', label: 'inverted spin' },
      { slug: 'progressive-spin', label: 'progressive spin' },
      { slug: 'accelerated-stall', label: 'accelerated stall' },
      { slug: 'aoa-approach', label: 'AOA approach' },
    ],
  },
  // p. IV-42. "Any emergency procedure" is the one item that redirects — the EPs already
  // live in full at /tw4/eps-limits and a discuss page could only copy them and drift.
  {
    id: 'FAM4703',
    title: 'Familiarization Aerobatics',
    block: 'FAM',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'FAM4702 (Familiarization Aerobatics)',
    syllabusNotes:
      'Instructor pilots shall demonstrate every aerobatic maneuver at least once in the ' +
      'block before student execution.',
    items: [
      { slug: 'vn-diagram', label: 'T-6B VN diagram' },
      { slug: 'maneuvering-speed', label: 'maneuvering speed' },
      { slug: 'acceleration-limitations', label: 'acceleration limitations' },
      { href: '/tw4/eps-limits', label: 'any emergency procedure' },
    ],
  },

  // ---- Capstone (chapter VIII) ---------------------------------------------------------
  //
  // The Capstone re-briefs the rest of the course, so most of its items are owned by other
  // stages and point at their pages rather than at new ones. From the Formation stage:
  // cruise-maneuvering, lead-lag-and-pure-pursuit, knock-it-off, section-pel and
  // formation-emergency-procedures. Do not fork any of these — one page per item is the whole
  // point, and a Capstone copy would drift from the stage that owns it.
  //
  // Two wrinkles worth knowing:
  //
  // CS2101 writes "knock-it-off/terminate procedures" as one item where the Formation stage
  // splits it into two pages, `knock-it-off` and `terminate`. The row stays single, because the
  // JPPT counts it as one item and splitting it here would misreport the event's list;
  // `terminate` is reached from F4104 and from the knock-it-off page's See also.
  //
  // `previously-discussed-maneuvers` and `previously-discussed-familiarization-items`
  // are deliberately stubs, not written pages: per CLAUDE.md they resolve to a generated list
  // of links, and CS is the case that links every maneuver item in the syllabus rather than one
  // stage's. The generator needs FAM, I and F wired first.

  // p. VIII-2. Discuss items here are squadron discretion; the JPPT only offers examples.
  {
    id: 'CS1101',
    title: 'Capstone Flight 0',
    block: 'CS',
    media: 'Lect',
    hours: 2.0,
    prereqs: 'I4490 (Instrument Check Flight), F4290 (Formation Check Flight)',
    syllabusNotes:
      'Discussion items are at the discretion of the squadron — those below are the examples ' +
      'the JPPT offers. Conducted by one IP for the class, and not a review lecture: it is a ' +
      'guided discussion, so arrive having thoroughly reviewed every previously introduced ' +
      'maneuver.',
    items: [
      { slug: 'flight-split', label: 'inflight split' },
      { slug: 'radial-rendezvous', label: 'radial rendezvous' },
      { slug: 'formation-emergency-procedures', label: 'section EP' },
      { slug: 'fuel-planning', label: 'fuel planning' },
      { slug: 'ifr-to-vfr-transition', label: 'IFR to VFR transition' },
    ],
  },

  // p. VIII-3. Block metadata is CS21's; the JPPT gives discuss items per event.
  {
    id: 'CS2101',
    title: 'Advanced Formation Training',
    block: 'CS',
    media: 'UTD/MR',
    hours: 1.3,
    prereqs: 'FAM4703 (Familiarization Aerobatics), CS1101 (Capstone Flight 0)',
    syllabusNotes:
      'Flown with a formation partner in linked mixed-reality UTDs. Within the block you ' +
      'shall fly one formation approach as Lead or Wing — either an IFR approach in VMC or a ' +
      'visual straight-in — cruise maneuvering from both Lead and Wing, and an in-flight EP ' +
      'in formation, diverting to a destination other than the one originally intended. ' +
      'Special syllabus requirements for this event: section takeoff, section approach, ' +
      'section PEL.',
    items: [
      { slug: 'cruise-maneuvering', label: 'cruise position/maneuvering' },
      { slug: 'lead-lag-and-pure-pursuit', label: 'lead/lag and pure pursuit' },
      { slug: 'knock-it-off', label: 'knock-it-off/terminate procedures' },
      { slug: 'aborted-takeoff', label: 'aborted takeoff' },
      { slug: 'section-pel', label: 'section PEL procedures' },
      { slug: 'section-approach-procedures', label: 'section approach procedures' },
    ],
  },

  // p. VIII-3.
  {
    id: 'CS2102',
    title: 'Advanced Formation Training',
    block: 'CS',
    media: 'UTD/MR',
    hours: 1.3,
    prereqs: 'CS2101 (Advanced Formation Training)',
    syllabusNotes:
      'The second of the two linked mixed-reality events. Special syllabus requirements for ' +
      'this event: aborted takeoff, fan break.',
    items: [
      { slug: 'aborted-takeoff', label: 'aborted takeoff' },
      { slug: 'flight-split', label: 'dissolving the flight (flight split)' },
      { slug: 'radial-rendezvous', label: 'radial rendezvous' },
      { slug: 'fan-break', label: 'fan break' },
    ],
  },

  // p. VIII-6. Block metadata is CS31's; the JPPT gives discuss items per event.
  {
    id: 'CS3101',
    title: 'Advanced Familiarization / Radio Instruments Training',
    block: 'CS',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'CS2102 (Advanced Formation Training)',
    syllabusNotes:
      'Reintroduces familiarization maneuvers and redevelops the cross-check and aircraft ' +
      'control, then transitions to the IFR environment for approach work. Minimum ' +
      'recommended items: two stalls, two aerobatic maneuvers, one unusual attitude ' +
      'recovery, one landing of each flap setting (TO, LDG, no-flap), an ELP landing and one ' +
      'approach. Need not be flown with your formation partner, and the two CS31 events are ' +
      'flown in separate, unlinked OFTs.',
    items: [
      {
        slug: 'previously-discussed-familiarization-items',
        label: 'any previously discussed familiarization items',
      },
      { slug: 'ifr-pickup', label: 'IFR pick-up' },
      { slug: 'gca-pattern', label: 'GCA pattern' },
    ],
  },

  // p. VIII-6.
  {
    id: 'CS3102',
    title: 'Advanced Familiarization / Radio Instruments Training',
    block: 'CS',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'CS3101 (Advanced Familiarization / Radio Instruments Training)',
    syllabusNotes:
      'One of the two CS31 missions should be flown under simulated night conditions for the ' +
      'instrument approaches and the landing pattern, following the familiarization ' +
      'maneuvers. Same minimum recommended items as CS3101.',
    items: [
      {
        slug: 'previously-discussed-familiarization-items',
        label: 'any previously discussed familiarization items',
      },
      { slug: 'imc-emergencies', label: 'IMC emergencies' },
      { slug: 'lost-communications', label: 'lost communications (FIH)' },
    ],
  },

  // p. VIII-9. CS41's two events carry the same pair of items.
  {
    id: 'CS4101',
    title: 'Capstone',
    block: 'CS',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'CS3102 (Advanced Familiarization / Radio Instruments Training)',
    syllabusNotes:
      'Normally flown as a formation out-and-in; the formation chooses when and how to meet ' +
      'the formation requirements and when to split into single ships. Flight planning ' +
      'should include a completed jet log, DD-1801, DD-175-1 weather brief, NOTAM and BASH ' +
      'conditions. Minimum recommended items: parade sequence (one of each turn, cross-under, ' +
      'breakup and rendezvous, lead change), flight split by any method, two stalls, two ' +
      'aerobatic maneuvers, one unusual attitude recovery, ELP landing, wave-off, two ' +
      'approaches (one precision, one non-precision, one a full procedure turn), missed ' +
      'approach and holding. One CS41 event should include a visual navigation leg of three ' +
      'checkpoints, which may be flown as a section.',
    items: [
      // No file, deliberately: per CLAUDE.md this resolves to a generated list of links,
      // not a page. Same slug the Capstone events use.
      { slug: 'previously-discussed-maneuvers', label: 'any previously discussed maneuver' },
      { href: '/tw4/eps-limits', label: 'any emergency procedure' },
    ],
  },

  // p. VIII-10.
  {
    id: 'CS4102',
    title: 'Capstone',
    block: 'CS',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'CS4101 (Capstone)',
    syllabusNotes:
      'The other half of the CS41 out-and-in. Any single-ship mission may be flown at night, ' +
      'except for the maneuver items that require daylight. When Wing during a navigation ' +
      'phase you are still accountable for setting up every NAVAID and frequency, listening ' +
      'to the radios and clearances, and being able to take Lead at any time.',
    items: [
      // No file, deliberately: per CLAUDE.md this resolves to a generated list of links,
      // not a page. Same slug the Capstone events use.
      { slug: 'previously-discussed-maneuvers', label: 'any previously discussed maneuver' },
      { href: '/tw4/eps-limits', label: 'any emergency procedure' },
    ],
  },

  // p. VIII-13.
  {
    id: 'CS4290',
    title: 'Capstone Check Flight',
    block: 'CS',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'CS4102 (Capstone)',
    syllabusNotes:
      'Flight planning shall include a jet log, DD-1801, DD-175-1 weather brief, NOTAM and ' +
      'BASH conditions; contact the IP beforehand, or the Duty Officer after hours, for ' +
      'guidance on the required flight plan. Minimum required items: parade sequence (one of ' +
      'each turn, cross-under, breakup and rendezvous, lead change), flight split by any ' +
      'method, two stalls, two aerobatic maneuvers, two unusual attitude recoveries of any ' +
      'kind, a simulated emergency leading to an ELP landing, a wave-off and one approach. ' +
      'The IP selects one contingency to run in real time: separate clearances and a radial ' +
      'rendezvous in the working area, a published missed approach, a different approach than ' +
      'planned after ATIS, a simulated weather divert, unplanned holding or point-to-point, ' +
      'a simulated in-flight section emergency, or a NAV leg flown without the TSD.',
    items: [
      // No file, deliberately: per CLAUDE.md this resolves to a generated list of links,
      // not a page. Same slug the Capstone events use.
      { slug: 'previously-discussed-maneuvers', label: 'any previously discussed maneuver' },
      { href: '/tw4/eps-limits', label: 'any emergency procedure' },
    ],
  },
  // ---- Formation (chapter VII) -------------------------------------------------------
  // p. VII-3. F11 (F1101/F1102/F1190) states "Discuss Items. None." and so has no row.
  //
  //
  // p. VII-3. F12's entry is one running sentence. Three of its five items have pages
  // (formation tactical voice communications is the page F2101 calls formation
  // communications); squadron SOP and formation preflight planning are label-only rows,
  // shown as "no page yet".
  {
    id: 'F1201',
    title: 'Formation Flight 0',
    block: 'FORM',
    media: 'Lect',
    hours: 2.0,
    prereqs: 'F1190 (Formation Exam)',
    syllabusNotes:
      'Instructor shall demonstrate all additional preflight admin related to formation ' +
      'events. Students and Instructors shall practice the procedures for departing and ' +
      'arriving home field in formation, including hand signals together.',
    items: [
      { label: 'Squadron SOP' },
      { label: 'formation preflight planning' },
      { slug: 'formation-communications', label: 'formation tactical voice communications' },
      { slug: 'hand-signals', label: 'hand signals' },
      { slug: 'formation-emergency-procedures', label: 'formation emergency procedures' },
    ],
  },
  // p. VII-4.
  {
    id: 'F3101',
    title: 'Formation',
    block: 'FORM',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'F1201 (Formation Flight 0)',
    syllabusNotes: 'None.',
    items: [
      { slug: 'visual-signals', label: 'Visual signals' },
      { slug: 'formation-maneuvers', label: 'Formation maneuvers' },
    ],
  },
  // p. VII-6.
  {
    id: 'F2101',
    title: 'Formation',
    block: 'FORM',
    media: 'UTD/MR',
    hours: 1.3,
    prereqs: 'F3101 (Formation)',
    syllabusNotes:
      'F2101 shall be flown in a linked mixed reality UTD simulator with formation partner.',
    items: [
      {
        slug: 'formation-arrival-and-departure-procedures',
        label: 'formation arrival and departure procedures',
      },
      {
        slug: 'wingman-flight-leader-responsibilities',
        label: 'wingman/flight leader responsibilities',
      },
      { slug: 'formation-communications', label: 'formation communications' },
      { slug: 'formation-position-corrections', label: 'formation position corrections' },
    ],
  },
  // pp. VII-8 to VII-9. One block, four events, each with its own discuss items. The
  // block's syllabus notes and special syllabus requirements apply to all four.
  {
    id: 'F4101',
    title: 'Formation',
    block: 'FORM',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'F2101 (Formation)',
    syllabusNotes:
      'All events shall be flown from the front cockpit. If a running rendezvous is not '
      + 'possible after an interval takeoff (weather, course rules, etc.) a "B&R", "flight '
      + 'split", or "push to spread" should be conducted to allow the student to perform a '
      + 'running rendezvous.',
    items: [
      { slug: 'hand-signals', label: 'Hand signals' },
      {
        slug: 'wingman-flight-leader-responsibilities',
        label: 'wingman/flight leader responsibilities',
      },
      // Also briefed by FAM2201, FAM3103, FAM3301, FAM4102, FAM4301, CS2101 and CS2102 as
      // the single-ship case. One page, written with the FAM sims.
      { slug: 'aborted-takeoff', label: 'aborted takeoff' },
      { slug: 'lost-sight-procedures', label: 'lost sight procedures' },
      { slug: 'blind-procedures', label: 'blind procedures' },
      { slug: 'hefoe', label: 'HEFOE' },
    ],
  },
  {
    id: 'F4102',
    title: 'Formation',
    block: 'FORM',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'F2101 (Formation)',
    syllabusNotes:
      'All events shall be flown from the front cockpit. If a running rendezvous is not '
      + 'possible after an interval takeoff (weather, course rules, etc.) a "B&R", "flight '
      + 'split", or "push to spread" should be conducted to allow the student to perform a '
      + 'running rendezvous.',
    items: [
      // Also briefed by FAM3401 and FAM4301; the page is being written with the FAM sims.
      { slug: 'airborne-damaged-aircraft', label: 'Airborne damaged aircraft' },
      { slug: 'speed-brake-use-as-a-section', label: 'speed brake use as a section' },
      { slug: 'area-sun-management', label: 'area/sun management' },
      { slug: 'lost-communication-procedures', label: 'lost communication procedures' },
    ],
  },
  {
    id: 'F4103',
    title: 'Formation',
    block: 'FORM',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'F2101 (Formation)',
    syllabusNotes:
      'All events shall be flown from the front cockpit. If a running rendezvous is not '
      + 'possible after an interval takeoff (weather, course rules, etc.) a "B&R", "flight '
      + 'split", or "push to spread" should be conducted to allow the student to perform a '
      + 'running rendezvous. Special syllabus requirements for F4103/F4104: section '
      + 'approach, lost sight procedures, blind rendezvous.',
    items: [
      { slug: 'section-pel', label: 'Section PEL' },
      { slug: 'section-takeoff', label: 'section takeoff' },
      { slug: 'emergency-field-selection', label: 'emergency field selection' },
      { slug: 'inadvertent-instrument-flight', label: 'inadvertent instrument flight' },
    ],
  },
  {
    id: 'F4104',
    title: 'Formation',
    block: 'FORM',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'F2101 (Formation)',
    syllabusNotes:
      'All events shall be flown from the front cockpit. If a running rendezvous is not '
      + 'possible after an interval takeoff (weather, course rules, etc.) a "B&R", "flight '
      + 'split", or "push to spread" should be conducted to allow the student to perform a '
      + 'running rendezvous. Special syllabus requirements for F4103/F4104: section '
      + 'approach, lost sight procedures, blind rendezvous.',
    items: [
      { slug: 'landing-gear-inspection', label: 'Landing gear inspection' },
      { slug: 'knock-it-off', label: 'knock-it-off' },
      { slug: 'terminate', label: 'terminate' },
      { slug: 'cruise-maneuvering', label: 'cruise maneuvering' },
      { slug: 'lead-lag-and-pure-pursuit', label: 'principles of lead, lag and pure pursuit' },
    ],
  },
  // p. VII-11.
  {
    id: 'F4290',
    title: 'Formation Check Flight',
    block: 'FORM',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'F4104 (Formation)',
    syllabusNotes:
      'Event shall be flown from the front cockpit. The intent of this check flight is to '
      + 'verify the student\'s aptitude for follow on formation training and ability to '
      + 'control relative motion. To prevent unnecessary training delays, instructors may '
      + 'fly an IFR departure and arrival to and from VMC conditions.',
    items: [
      // No file, deliberately: per CLAUDE.md this resolves to a generated list of links,
      // not a page. Same slug the Capstone events use.
      { slug: 'previously-discussed-maneuvers', label: 'any previously discussed maneuver' },
      { href: '/tw4/eps-limits', label: 'any emergency procedure' },
    ],
  },

  // ---- Instrument (chapter V), the simulators ------------------------------------------
  // I21 and I22 in the UTD, I31 and I32 in the OFT, I61 through I63 in the VTD. The three
  // flight blocks — I41, I42, I43 — are not here yet.
  //
  // The JPPT prints each block's discuss items as one comma-separated sentence per event, and
  // the rows below split it on the commas, as the VNAV and FAM entries do. Two places where a
  // single JPPT element becomes two rows are flagged in comments where they occur.

  // p. V-7. Block metadata is I21's; the JPPT gives discuss items per event.
  {
    id: 'I2101',
    title: 'Basic Instruments',
    block: 'I',
    media: 'UTD',
    hours: 1.3,
    prereqs: 'IN1104 (Basic Instrument Review)',
    syllabusNotes: 'None.',
    items: [
      { slug: 'instrument-scan-patterns', label: 'instrument scan patterns' },
      { slug: 'airspeed-changes', label: 'airspeed changes' },
      { slug: 'steep-turns', label: 'steep turns' },
      { slug: 'timed-turns', label: 'timed-turns' },
      {
        slug: 'constant-airspeed-climbs-and-descents',
        label: 'constant airspeed climbs and descents',
      },
      { slug: 'en-route-descent', label: 'en route descent' },
    ],
  },
  // p. V-7.
  {
    id: 'I2102',
    title: 'Basic Instruments',
    block: 'I',
    media: 'UTD',
    hours: 1.3,
    prereqs: 'I2101 (Basic Instruments)',
    syllabusNotes: 'None.',
    items: [
      { slug: 'imc-emergencies', label: 'IMC emergencies' },
      { slug: 'gca-pattern', label: 'GCA pattern' },
      { slug: 's-1-pattern', label: 'S-1 pattern' },
    ],
  },
  // p. V-7. The block's one special syllabus requirement belongs to this event.
  {
    id: 'I2103',
    title: 'Basic Instruments',
    block: 'I',
    media: 'UTD',
    hours: 1.3,
    prereqs: 'I2102 (Basic Instruments)',
    syllabusNotes:
      'Special syllabus requirement: proceed direct to home-field using any available NAVAID.',
    items: [
      { slug: 'approach-maneuver', label: 'approach maneuver' },
      { slug: 'ifr-unusual-attitudes', label: 'IFR unusual attitudes' },
      { slug: 'imc-emergencies', label: 'IMC emergencies' },
      { slug: 'iac-failure', label: 'IAC failure (dual)' },
      { slug: 'bfi', label: 'BFI' },
    ],
  },

  // p. V-9. Block metadata is I22's.
  {
    id: 'I2201',
    title: 'Radio Instruments',
    block: 'I',
    media: 'UTD',
    hours: 1.3,
    prereqs: 'IN1501 (CRM Case Studies)',
    syllabusNotes: 'None.',
    items: [
      { slug: 'hsi-orientation', label: 'HSI orientation' },
      { slug: 'direct-to-a-vor', label: 'direct to a VOR' },
      { slug: 'tracking', label: 'tracking' },
      { slug: 'station-passage', label: 'station passage' },
      { slug: 'over-the-station-intercepts', label: 'over-the-station intercepts' },
      { slug: 'radial-intercept-procedures', label: 'radial intercept procedures' },
    ],
  },
  // p. V-9. "hyperventilation/hypoxia" is one JPPT element and one page.
  {
    id: 'I2202',
    title: 'Radio Instruments',
    block: 'I',
    media: 'UTD',
    hours: 1.3,
    prereqs: 'I2201 (Radio Instruments)',
    syllabusNotes: 'None.',
    items: [
      { slug: 'arcing', label: 'arcing' },
      { slug: 'radial-arc-intercepts', label: 'radial-arc intercepts' },
      { slug: 'arc-radial-intercepts', label: 'arc-radial intercepts' },
      { slug: 'obogs-malfunctions', label: 'OBOGS malfunctions' },
      { slug: 'hyperventilation-and-hypoxia', label: 'hyperventilation/hypoxia' },
      { slug: 'point-to-point', label: 'point-to-point' },
    ],
  },
  // p. V-9.
  {
    id: 'I2203',
    title: 'Radio Instruments',
    block: 'I',
    media: 'UTD',
    hours: 1.3,
    prereqs: 'I2202 (Radio Instruments)',
    syllabusNotes: 'None.',
    items: [
      { slug: 'holding-entry', label: 'holding entry' },
      { slug: 'no-wind-orbit', label: 'no-wind orbit' },
      { slug: 'holding-corrections', label: 'holding corrections' },
      { slug: 'battery-and-generator-failure', label: 'battery and generator failure' },
    ],
  },

  // p. V-11. Block metadata is I61's.
  // "VOR procedure turn, teardrop, and HILO approach procedure" is one JPPT element naming
  // three approaches, so it becomes three rows.
  {
    id: 'I6101',
    title: 'Radio Instruments',
    block: 'I',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'I2203 (Radio Instruments)',
    syllabusNotes: 'Events should start in flight ready for the first approach.',
    items: [
      { slug: 'clearance-and-departure-procedures', label: 'clearance and departure procedures' },
      { slug: 'procedure-turn-approach', label: 'VOR procedure turn' },
      { slug: 'teardrop-approach', label: 'teardrop' },
      { slug: 'hilo-approach', label: 'HILO approach procedure' },
      { slug: 'faf-to-map-timing-adjustments', label: 'FAF-to-MAP timing adjustments' },
      { slug: 'visual-descent-point', label: 'VDP' },
      { slug: 'missed-approach', label: 'missed approach' },
    ],
  },
  // p. V-11. The JPPT's bare "arcing" here is the arcing approach, not the I2202 maneuver —
  // the two are separate pages and the gouge for this event leads with the approach.
  {
    id: 'I6102',
    title: 'Radio Instruments',
    block: 'I',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'I6101 (Radio Instruments)',
    syllabusNotes: 'Events should start in flight ready for the first approach.',
    items: [
      { slug: 'arcing-approach', label: 'arcing' },
      { slug: 'rvfac', label: 'RVFAC' },
      { slug: 'ils-approach', label: 'ILS' },
      { slug: 'localizer-approach', label: 'localizer approach procedure' },
      { slug: 'holding', label: 'holding' },
      { slug: 'shuttle-descent', label: 'shuttle descent' },
    ],
  },

  // p. V-13. Block metadata is I31's.
  {
    id: 'I3101',
    title: 'Radio Instruments',
    block: 'I',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'I6102 (Radio Instruments)',
    syllabusNotes:
      'Should be conducted in the OFT. During this phase of training the student will be '
      + 'expected to fly all maneuvers without the use of FMS navigation. I3101 and I3102 '
      + 'shall only be scheduled as a single event per day.',
    items: [
      { slug: 'clearance-and-departure-procedures', label: 'clearance and departure procedures' },
      { slug: 'en-route-procedures', label: 'en route procedures' },
      { slug: 'procedure-turn-approach', label: 'procedure turn' },
      { slug: 'teardrop-approach', label: 'tear drop' },
      { slug: 'arcing-approach', label: 'arcing approaches' },
      { slug: 'missed-approach', label: 'missed approach procedures' },
    ],
  },
  // p. V-13.
  {
    id: 'I3102',
    title: 'Radio Instruments',
    block: 'I',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'I3101 (Radio Instruments)',
    syllabusNotes:
      'Should be conducted in the OFT. During this phase of training the student will be '
      + 'expected to fly all maneuvers without the use of FMS navigation. I3101 and I3102 '
      + 'shall only be scheduled as a single event per day.',
    items: [
      { slug: 'hilo-approach', label: 'HILO approaches' },
      { slug: 'holding', label: 'holding' },
      { slug: 'shuttle-descent', label: 'shuttle descent' },
      { slug: 'intersections', label: 'intersections' },
      {
        slug: 'oil-system-malfunction-or-low-oil-pressure',
        label: 'oil system malfunctions',
      },
    ],
  },
  // p. V-13.
  {
    id: 'I3103',
    title: 'Radio Instruments',
    block: 'I',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'I3102 (Radio Instruments)',
    syllabusNotes:
      'Should be conducted in the OFT. During this phase of training the student will be '
      + 'expected to fly all maneuvers without the use of FMS navigation.',
    items: [
      { slug: 'par-approach', label: 'PAR' },
      { slug: 'par-without-glideslope', label: 'PAR W/O GS' },
      { slug: 'asr-approach', label: 'ASR' },
      { slug: 'recommended-altitudes', label: 'recommended altitudes' },
      { slug: 'imc-emergencies', label: 'IMC emergencies' },
      { slug: 'propeller-malfunctions', label: 'propeller malfunctions' },
    ],
  },
  // p. V-13. The JPPT prints "ILS/LOV approaches"; LOV is a typo for LOC, and the element
  // names two approaches, so it becomes two rows. The labels read LOC — reproducing a
  // typesetting slip as the on-screen name of a page helps nobody.
  {
    id: 'I3104',
    title: 'Radio Instruments',
    block: 'I',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'I3103 (Radio Instruments), FAM1205 (Night Procedures)',
    syllabusNotes:
      'Shall be under simulated night conditions and shall be conducted in the OFT. During '
      + 'this phase of training the student will be expected to fly all maneuvers without the '
      + 'use of FMS navigation.',
    items: [
      { slug: 'night-cockpit-setup', label: 'night cockpit setup' },
      { slug: 'standard-instrument-departure', label: 'SID' },
      { slug: 'rvfac', label: 'RVFAC' },
      { slug: 'ils-approach', label: 'ILS approaches' },
      { slug: 'localizer-approach', label: 'LOC approaches' },
      { slug: 'point-to-point', label: 'PTP' },
      { href: '/tw4/eps-limits', label: 'any emergency procedure' },
    ],
  },

  // p. V-15. Block metadata is I62's.
  {
    id: 'I6201',
    title: 'Radio Instruments',
    block: 'I',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'I3104 (Radio Instruments)',
    syllabusNotes: 'None.',
    items: [
      { slug: 'minimum-fuel-requirements', label: 'CNAF M-3710.7 minimum fuel requirements' },
      {
        slug: 'notams',
        label:
          'NOTAM to include local, FDC, center, special notices, International/Domestic '
          + 'Notices, and GPS',
      },
    ],
  },
  // p. V-15.
  {
    id: 'I6202',
    title: 'Radio Instruments',
    block: 'I',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'I6201 (Radio Instruments)',
    syllabusNotes: 'None.',
    items: [
      { slug: 'en-route-weather-sources', label: 'en route weather sources' },
      { slug: 'icing', label: 'icing' },
      {
        slug: 'inadvertent-thunderstorm-penetration',
        label: 'inadvertent thunderstorm penetration',
      },
      {
        slug: 'change-of-route-or-destination',
        label: 'change of route or destination (inflight)',
      },
      { slug: 'imc-lost-communications', label: 'IMC lost communications' },
      { slug: 'ground-speed-calculations', label: 'ground-speed calculations' },
    ],
  },

  // p. V-21. Block metadata is I32's.
  {
    id: 'I3201',
    title: 'Radio Instruments',
    block: 'I',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'SY0302 (FMS Trainer 2)',
    syllabusNotes:
      'May be conducted in the UTD or UTD/ER. Full use of the FMS is available to the student '
      + 'on I3201-3. Flight planning for all events in this block shall include a completed '
      + 'jet log and DD-1801.',
    items: [
      { slug: 'gps-procedures', label: 'GPS procedures' },
      {
        slug: 'gps-allowable-operations',
        label: 'GPS allowable operations (GPS waypoints in lieu of NDB, VOR, and TACAN fixes)',
      },
      { slug: 'gps-approaches', label: 'GPS approaches' },
      { slug: 'gps-holding', label: 'GPS holding' },
      { slug: 'gps-flight-modes', label: 'GPS flight modes' },
    ],
  },
  // p. V-21.
  {
    id: 'I3202',
    title: 'Radio Instruments',
    block: 'I',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'I3201 (Radio Instruments)',
    syllabusNotes:
      'May be conducted in the UTD or UTD/ER. Full use of the FMS is available to the student '
      + 'on I3201-3. Flight planning for all events in this block shall include a completed '
      + 'jet log and DD-1801.',
    items: [
      { slug: 'star', label: 'STAR' },
      { slug: 'trouble-t', label: 'Trouble T' },
      { slug: 'obstacle-departure-procedures', label: 'obstacle departure procedures' },
      {
        slug: 'ifr-clearance-from-uncontrolled-airports',
        label: 'obtaining IFR clearance from uncontrolled airports',
      },
      { slug: 'rvfac-for-rnav-approaches', label: 'RVFAC for RNAV approaches' },
    ],
  },
  // p. V-21. The block's no-gyro GCA requirement is a block-level item; it is stated here
  // because this is the event that briefs the approach.
  {
    id: 'I3203',
    title: 'Radio Instruments',
    block: 'I',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'I3202 (Radio Instruments)',
    syllabusNotes:
      'Student shall fly one GCA as a no-gyro approach in the block. Full use of the FMS is '
      + 'available to the student on I3201-3. Flight planning for all events in this block '
      + 'shall include a completed jet log and DD-1801.',
    items: [
      { slug: 'no-gyro-approach', label: 'no-gyro approach' },
      { slug: 'bfi-approach', label: 'BFI approach' },
    ],
  },
  // p. V-21.
  {
    id: 'I3204',
    title: 'Radio Instruments',
    block: 'I',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'I3203 (Radio Instruments)',
    syllabusNotes:
      'Students should practice maneuvers and approaches without the use of the FMS, '
      + 'excluding GPS approaches. Flight planning for all events in this block shall include '
      + 'a completed jet log and DD-1801.',
    items: [
      { slug: 'high-altitude-approach', label: 'high-altitude approach' },
      {
        slug: 'non-radar-environment-communications',
        label: 'non-radar environment communications',
      },
    ],
  },
  // p. V-21.
  {
    id: 'I3205',
    title: 'Radio Instruments',
    block: 'I',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'I3204 (Radio Instruments)',
    syllabusNotes:
      'Shall be under simulated night conditions. Students should practice maneuvers and '
      + 'approaches without the use of the FMS, excluding GPS approaches. Flight planning for '
      + 'all events in this block shall include a completed jet log and DD-1801.',
    items: [
      { slug: 'avionics-failures', label: 'avionics failures' },
      { slug: 'obstacle-departure-procedures', label: 'obstacle departure procedures' },
      { slug: 'ils-full-procedure-turn', label: 'ILS full procedure turn' },
    ],
  },
  // p. V-21.
  {
    id: 'I3206',
    title: 'Radio Instruments',
    block: 'I',
    media: 'OFT',
    hours: 1.3,
    prereqs: 'I3205 (Radio Instruments)',
    syllabusNotes:
      'Shall be under simulated night conditions. Flight planning for all events in this '
      + 'block shall include a completed jet log and DD-1801.',
    items: [
      { slug: 'en-route-fuel-management', label: 'en route fuel management' },
      { slug: 'feeder-fixes', label: 'feeder fixes' },
      { slug: 'feeder-routes', label: 'feeder routes' },
      { slug: 'cdi-reverse-sensing-precautions', label: 'CDI reverse sensing precautions' },
    ],
  },

  // p. V-23. I63's discuss items are, in full, "Any emergency procedure." — the one item that
  // resolves to the EPs and Limits page rather than a discuss page of its own.
  {
    id: 'I6301',
    title: 'Radio Instruments',
    block: 'I',
    media: 'VTD',
    hours: 1.3,
    prereqs: 'I3206 (Radio Instruments)',
    syllabusNotes: 'None.',
    items: [
      { href: '/tw4/eps-limits', label: 'any emergency procedure' },
    ],
  },

  // ---- Instrument (chapter V), the aircraft ---------------------------------------------
  // I41, I42 and I43. Most of what these blocks brief is a sim page reused rather than
  // forked: every one of I4103's items and every one of I4303's is already written.

  // p. V-18. Block metadata is I41's. The block's one special syllabus requirement belongs to
  // I4101 and is stated in its syllabus notes rather than as a discuss item.
  {
    id: 'I4101',
    title: 'Radio Instruments',
    block: 'I',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'I6202 (Radio Instruments), FAM1204 (Rear Cockpit Preflight)',
    syllabusNotes:
      'Special syllabus requirement: front and rear cockpit differences, and vertigo '
      + 'demonstration. All events in this block shall be flown from the rear cockpit using '
      + 'paper publications only, without the use of FMS navigation. A minimum of three '
      + 'approaches, a point-to-point and holding should be completed on each event.',
    items: [
      { slug: 'crm', label: 'CRM' },
      { slug: 'holding', label: 'holding' },
      { slug: 'vor-approach-procedures', label: 'VOR approach procedures' },
    ],
  },
  // p. V-18. "ILS/LOC approach procedures" is one JPPT element naming two approaches, so it
  // becomes two rows — as on I3104, where the JPPT prints the same pair as "ILS/LOV".
  {
    id: 'I4102',
    title: 'Radio Instruments',
    block: 'I',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'I4101 (Radio Instruments)',
    syllabusNotes:
      'Rear cockpit, paper publications only, without the use of FMS navigation. Two events '
      + 'from this block should be flown at night. Students should attempt the RVFAC, '
      + 'teardrop, arcing, HILO and procedure turn approach types; a minimum of nine '
      + 'approaches are required for the block — two GCA, two ILS, one localizer and two VOR.',
    items: [
      { slug: 'ils-approach', label: 'ILS approach procedures' },
      { slug: 'localizer-approach', label: 'LOC approach procedures' },
      { slug: 'rvfac', label: 'RVFAC' },
      { slug: 'icing', label: 'icing considerations' },
    ],
  },
  // p. V-18. Every item here is a page the I-stage sims already own.
  {
    id: 'I4103',
    title: 'Radio Instruments',
    block: 'I',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'I4102 (Radio Instruments)',
    syllabusNotes:
      'Rear cockpit, paper publications only, without the use of FMS navigation. If an event '
      + 'is Proficiency Advanced, all attempts must be made to complete the block’s approach '
      + 'requirements; the remaining approaches are waived.',
    items: [
      { slug: 'par-approach', label: 'PAR' },
      { slug: 'asr-approach', label: 'ASR' },
      { slug: 'no-gyro-approach', label: 'no-gyro approaches' },
      { slug: 'hyperventilation-and-hypoxia', label: 'hypoxia/hyperventilation' },
      { slug: 'obogs-malfunctions', label: 'OBOGS malfunctions' },
      {
        slug: 'inadvertent-thunderstorm-penetration',
        label: 'inadvertent thunderstorm penetration',
      },
      { href: '/tw4/eps-limits', label: 'any emergency procedure' },
    ],
  },

  // p. V-26. Block metadata is I42's. "lost communications (local/FIH)" names both sources in
  // one element, and they are two pages — the IFG covers the local area, the FIH outside it.
  {
    id: 'I4201',
    title: 'Radio Instruments',
    block: 'I',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'I6301 (Radio Instruments), N6101 (Night Navigation)',
    syllabusNotes:
      'Two events should be flown from the front cockpit and two at night; FAM4601 (Night '
      + 'FAM) is required prior to night front-seat landings. Full use of the FMS is available '
      + 'on I4201-2. Flight planning for all events in this block shall include a completed '
      + 'jet log, DD-1801, DD-175-1 weather brief, NOTAM and BASH conditions.',
    items: [
      { slug: 'clearance-and-departure-procedures', label: 'clearance and departure procedures' },
      { slug: 'stereo-routes', label: 'stereo routes (canned flight plans)' },
      { slug: 'airway-navigation', label: 'airway navigation' },
      { slug: 'imc-lost-communications', label: 'lost communications (local)' },
      { slug: 'lost-communications', label: 'lost communications (FIH)' },
    ],
  },
  // p. V-26.
  {
    id: 'I4202',
    title: 'Radio Instruments',
    block: 'I',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'I4201 (Radio Instruments)',
    syllabusNotes:
      'Full use of the FMS is available on I4201-2. A minimum of three approaches, a '
      + 'point-to-point and holding should be completed on each event, and student use of the '
      + 'EKB is authorized at IP discretion. Flights may be conducted as an out-and-in or '
      + 'cross country.',
    items: [
      {
        slug: 'fms-flight-plan-usage',
        label: 'FMS flight plan usage (SID/STAR, holding, and approach)',
      },
      { slug: 'fms-arrivals', label: 'FMS arrivals' },
    ],
  },
  // p. V-26. The block's no-gyro GCA requirement is stated here, on the event that briefs it.
  // Bare "fuel management" is the same item I3206 lists as "en route fuel management".
  {
    id: 'I4203',
    title: 'Radio Instruments',
    block: 'I',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'I4202 (Radio Instruments)',
    syllabusNotes:
      'Student shall fly one GCA as a no-gyro approach in the block. On I4203-4, students '
      + 'should practice maneuvers and approaches without the use of the FMS, excluding GPS '
      + 'approaches. A minimum of 10 approaches are required for the block — two GCA, two ILS, '
      + 'one localizer, two VOR and two GPS.',
    items: [
      { slug: 'no-gyro-approach', label: 'no-gyro approach' },
      { slug: 'emergency-field-selection', label: 'emergency field selection' },
      { slug: 'en-route-fuel-management', label: 'fuel management' },
    ],
  },
  // p. V-26. One JPPT element naming two subjects — the minimums and the alternate criteria —
  // and they are two pages.
  {
    id: 'I4204',
    title: 'Radio Instruments',
    block: 'I',
    media: 'T-6B',
    hours: 1.6,
    prereqs: 'I4203 (Radio Instruments)',
    syllabusNotes:
      'Students should practice maneuvers and approaches without the use of the FMS, '
      + 'excluding GPS approaches. Students should attempt the RVFAC, teardrop, arcing, HILO '
      + 'and procedure turn approach types.',
    items: [
      {
        slug: 'takeoff-and-approach-minimums',
        label: 'CNAF M-3710.7 takeoff and approach minimums',
      },
      { slug: 'alternate-filing-minimums', label: 'alternate filing minimums' },
    ],
  },

  // p. V-29. Block metadata is I43's.
  {
    id: 'I4301',
    title: 'Instrument Navigation',
    block: 'I',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'I4204 (Radio Instruments)',
    syllabusNotes:
      'Two events shall be flown from the front cockpit and at least one at night. All events '
      + 'should be flown as an out-and-in or cross-country, and at least one flight should be '
      + 'flown within the high-altitude route structure. Flight planning shall include a '
      + 'completed jet log, DD-1801, DD-175-1 weather brief, NOTAM and BASH conditions. Full '
      + 'use of the FMS and EKB is available.',
    items: [
      { slug: 'ifr-flight-planning', label: 'flight planning' },
      { slug: 'jet-log', label: 'jet log' },
      { slug: 'dd-1801', label: 'DD-1801' },
      { slug: 'dd-175-1-weather-brief', label: 'DD-175-1 weather brief' },
      {
        slug: 'takeoff-and-approach-minimums',
        label: 'CNAF M-3710.7 takeoff and approach minimums',
      },
      { slug: 'alternate-filing-minimums', label: 'alternate filing minimums' },
      { slug: 'flight-service-station', label: 'FSS' },
      { slug: 'strange-field-operations', label: 'Strange Field operations' },
    ],
  },
  // p. V-29. "change of flight plan while airborne" is the same page I6202 lists as "change of
  // route or destination (inflight)".
  {
    id: 'I4302',
    title: 'Instrument Navigation',
    block: 'I',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'I4301 (Instrument Navigation)',
    syllabusNotes:
      'A minimum of three approaches, a point-to-point and holding should be completed on '
      + 'each event. A minimum of 10 approaches are required for the block — two GCA, two ILS, '
      + 'one localizer, one VOR and two GPS — and at least two should include a '
      + 'circling-to-land maneuver.',
    items: [
      { slug: 'en-route-weather-sources', label: 'en route weather' },
      { slug: 'divert-to-alternate', label: 'divert to alternate' },
      {
        slug: 'change-of-route-or-destination',
        label: 'change of flight plan while airborne',
      },
      { slug: 'ifr-supplement', label: 'IFR supplement' },
      { slug: 'circling-maneuver', label: 'circling maneuver' },
      { slug: 'visual-descent-point', label: 'VDP' },
    ],
  },
  // p. V-29. Every item here is already written.
  {
    id: 'I4303',
    title: 'Instrument Navigation',
    block: 'I',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'I4302 (Instrument Navigation)',
    syllabusNotes:
      'At least one flight in this block should be flown within the high-altitude route '
      + 'structure. Students should attempt the RVFAC, teardrop, arcing, HILO and procedure '
      + 'turn approach types.',
    items: [
      { slug: 'airspace-classification', label: 'controlled/uncontrolled airspace' },
      { slug: 'emergency-field-selection', label: 'emergency field selection' },
      { slug: 'high-altitude-approach', label: 'high altitude approach' },
      {
        slug: 'minimum-fuel-requirements',
        label: 'CNAF M-3710.7 minimum fuel requirements',
      },
      { slug: 'en-route-fuel-management', label: 'fuel management' },
    ],
  },
  // p. V-29. The JPPT prints "any emergency procedure" twice in this one sentence; it is one
  // item and appears once here. Duplicating the row would give two identical entries with the
  // same label, which is a repetition of the publication's slip rather than of its meaning.
  {
    id: 'I4304',
    title: 'Instrument Navigation',
    block: 'I',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'I4303 (Instrument Navigation)',
    syllabusNotes:
      'If an event is Proficiency Advanced, all attempts must be made to complete the block’s '
      + 'approach requirements; the remaining approaches are waived.',
    items: [
      { slug: 'lost-communications', label: 'lost communications (FIH)' },
      { slug: 'standard-instrument-departure', label: 'SID' },
      { slug: 'star', label: 'STAR' },
      { slug: 'obstacle-departure-procedures', label: 'obstacle departure procedures' },
      { slug: 'trouble-t', label: 'Trouble T' },
      { href: '/tw4/eps-limits', label: 'any emergency procedure' },
    ],
  },

  // p. V-32. The Instrument check flight. Its items are all pages the stage already owns,
  // plus the generated list. Two things about the JPPT's wording here:
  //
  // The flight planning item carries its detail inside a parenthesis rather than as separate
  // comma elements — "flight planning (submit a completed DD-1801 and jet log: Stopover
  // flight plan to include an en route holding delay (1st leg), and terminal delay (2nd
  // leg))" — so it is one row, and the stopover requirement is a section of that page.
  //
  // And the last item is "any previously discussed *item*", not maneuver. It is a fourth
  // generated list and its own page; see previously-discussed-items.js.
  {
    id: 'I4490',
    title: 'Instrument Check Flight',
    block: 'I',
    media: 'T-6B',
    hours: 1.7,
    prereqs: 'I4304 (Instrument Navigation)',
    syllabusNotes:
      'Shall be flown from the front cockpit. Flight planning shall include a completed jet '
      + 'log, DD-1801, DD-175-1 weather brief, NOTAM and BASH conditions; students should '
      + 'contact the IP prior to the flight, or the Duty Officer after hours, for guidance on '
      + 'the required flight plan. Students shall fly a minimum of three approaches, to '
      + 'include a combination of precision and non-precision approaches.',
    items: [
      { slug: 'lost-communications', label: 'lost communications (FIH)' },
      {
        slug: 'takeoff-and-approach-minimums',
        label: 'CNAF M-3710.7 takeoff/approach minimums',
      },
      {
        slug: 'ifr-flight-planning',
        label:
          'flight planning (submit a completed DD-1801 and jet log: Stopover flight plan to '
          + 'include an en route holding delay (1st leg), and terminal delay (2nd leg))',
      },
      { slug: 'notams', label: 'NOTAM' },
      { slug: 'en-route-weather-sources', label: 'en route weather' },
      { href: '/tw4/eps-limits', label: 'any emergency procedure' },
      { slug: 'previously-discussed-items', label: 'any previously discussed item' },
    ],
  },
];

export const EVENT_LIST = ALL;

// Where an item row points. An `href` row goes wherever it says; a slug row goes to its
// canonical page, carrying event context so the page can offer prev/next through the list.
export function rowTo(row, eventId) {
  if (!row) return null;
  if (row.href) return row.href;
  if (!row.slug) return null;
  return `/tw4/discuss/${row.slug}${eventId ? `?from=${eventId}` : ''}`;
}

// React key for an item row. Neither half is unique on its own: all 31 EP rows share one
// href, and FAM3103 lists "crosswind takeoff" and "crosswind landings" as two JPPT items
// resolving to one page. The label is what separates them, and labels are unique within an
// event, so the pair always is.
export function rowKey(row) {
  return `${row.slug || 'link'}|${row.label}`;
}

export const EVENTS = ALL.reduce((acc, e) => {
  acc[e.id] = e;
  return acc;
}, {});

export function getEvent(id) {
  return (id && EVENTS[id.toUpperCase()]) || null;
}

// Where `slug` sits in `event`'s list, and what flanks it. Drives the ?from= context strip.
// Where one page answers two of an event's JPPT items, the first occurrence is the one
// reported — a page has one position in a list, however many labels point at it.
export function positionIn(event, slug) {
  if (!event) return null;
  const index = event.items.findIndex((i) => i.slug === slug);
  if (index === -1) return null;
  return {
    index,
    total: event.items.length,
    prev: index > 0 ? event.items[index - 1] : null,
    next: index < event.items.length - 1 ? event.items[index + 1] : null,
  };
}

// Every event that lists this item, so an item page can show where it is briefed.
export function eventsListing(slug) {
  return ALL.filter((e) => e.items.some((i) => i.slug === slug));
}
