#!/usr/bin/env node
//
// The TH-73A's briefs, published once to the briefs corpus (the /th73a/briefs tab):
//
//   th73a-natops     NATOPS      the NATOPS brief every flight gets
//   th73a-mission    MISSION     the TW-5 mission (SMEAC) brief, for navigation flights
//   th73a-formation  FORMATION   the TW-5 formation brief
//
// Every other school's briefs were made by uploading its briefing guide PDF on the site. The
// TH-73A has no such guide: its brief items are printed in the NATOPS flight manual, and the
// words a student says are printed in a wing example and in three FTIs. So the documents are
// compiled here, by hand, from those pages, and this tool publishes them. Where they come from:
//
//   NATOPS     items: NAVAIR 01-H73A-1 §6.4 (pp. 6.4-1 to 6.4-5), labels verbatim.
//              words: COMTRAWINGFIVE "Example TH-73 NATOPS Brief" (updated June 2025), with
//              the February 2024 sample filling where it is fuller; night items from the Night
//              FAM FTI (P-478) Ch. 11, "NATOPS Brief", pp. 11-3 to 11-7. People's names and
//              the example's own aircraft, spots and times are placeholders in brackets.
//   MISSION    card: Navigation FTI (P-479) Appendix C, Figure C-1 "TW-5 Briefing Guide".
//              words: the same FTI's Ch. 7, "Low-Level Mission Brief", pp. 7-1 to 7-12.
//   FORMATION  card: Formation FTI (P-484) Appendix C, "TW-5 Formation Briefing Guide".
//              words: the same FTI's Ch. 6, "Formation Brief", pp. 6-1 to 6-15. Text the FTI
//              prints in brackets "shall be briefed verbatim", and is kept bracketed and bold.
//
// IT SEEDS ONCE. The server keeps every brief as revisions, and the one on the site is the one
// students have since corrected; this tool refuses an id that is already on the index rather
// than publish over it. After the seed, a change is an edit on the site, like any brief.
//
//   node tools/th73a-briefs.mjs --dry-run
//   node tools/th73a-briefs.mjs --api=http://localhost:8787/discuss --mirror=http://localhost:8787/mirror
//   node tools/th73a-briefs.mjs
//
//   --api=<url>     the API base (default: the production API Gateway stage)
//   --mirror=<url>  the mirror (default: the production bucket), read for the index
//   --only=<id>     publish one of the three
//   --dry-run       print each document's shape and publish nothing

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { args, API_URL, MIRROR_URL, apiPost } = require('./lib/cli');

const { flag, value } = args();
const API = value('api') || API_URL;
const MIRROR = value('mirror') || MIRROR_URL;
const ONLY = value('only');
const DRY = flag('dry-run');

const AUTHOR = 'Loevinger';
const SUMMARY = 'Compiled from NATOPS Ch. 6 §6.4, the TW-5 example brief and the TW-5 FTIs';
const PROGRAM = { aircraft: 'TH-73A', school: 'TH-73A' };

// ---------------------------------------------------------------------------------------
// Document shape: what lambda/discussApi/briefs.mjs checks and briefs/BriefView.js draws.
// Ids are minted the way the upload mints them (parseBriefGuide.js mintIds): the section's
// from its title, an item's from its section and position.

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function section(title, column, items, extra = {}) {
  const id = extra.id || slug(title);
  return {
    id,
    title,
    column,
    ...(extra.break ? { break: true } : {}),
    ...(extra.fixed ? { fixed: true } : {}),
    text: extra.text || '',
    items: (items || []).map((it, i) => ({ id: `${id}-${i + 1}`, ...it })),
  };
}

const item = (label, text, subtext) => ({ label, ...(subtext ? { subtext } : {}), text });
const fixed = (title, column, text, extra = {}) => section(title, column, [], { ...extra, fixed: true, text });

// ---------------------------------------------------------------------------------------
// NATOPS brief

const NATOPS = {
  id: 'th73a-natops',
  title: 'TH-73A NATOPS Brief',
  short: 'NATOPS',
  order: 1,
  ...PROGRAM,
  note: 'The pilot is responsible for briefing the crew. A briefing guide will be used. On training flights, the appropriate syllabus guide should be used.\n'
    + 'The words under each item are the TW-5 example brief, which is tailored, adjusted and changed to match the mission being flown.',
  source: { unit: 'TW-5', date: '2026-02-15', publication: 'NAVAIR 01-H73A-1 Ch. 6' },
  sections: [
    section('General', 1, [
      item('Crew and Mission Operational Risk Management (ORM)', '“Completed.”'),
    ]),

    section('Conduct of Flight', 1, [
      item('Helicopter assignment, callsign, and location',
        '“We are a cold go in aircraft [side number] on spot [spot].”\n\n'
        + 'OR “We will be in aircraft [side number], hot seating from [rank name].”\n\n'
        + 'OR “We don’t have an aircraft assigned yet.”'),
      item('Flight event and duration',
        '“The DAY4390A is a 1.8 hour event and the DAY4103A is a 2.0 hour event.”'),
      item('Sequence of events and timeline',
        '“As briefed in ORM.”\n\n'
        + 'OR “[Name] will fly first. We will meet in maintenance control at [time] in order to preflight and takeoff at [time]. We will get hot fuel at Site-X. Then crew swap at the crew change with [name] at [time]. After the second go, we will hot seat to [name] in the crew change at [time] for their [time] takeoff.”\n\n'
        + 'OR “Our takeoff is at [time]; we will meet at maintenance control at [time] for our hot seat from [name] at the crew change. We will refuel in the fuel pits at KNDZ. Expect to crew swap with [name] at [time]. Upon return we will be shutting down / hot seating to [name].”\n\n'
        + 'a. Operating and landing area\n'
        + '  “1st Go checkride will go to Site-X with Spencer channel enroute / Pace channel on return to homefield. Plan to get fuel at the OLF and RTB via Snake Course Rules back for the crew swap. 2nd Go will also go to Site-X with Spencer/Pace channel work. Plan on getting fuel at Site-X as required for the hotseat.”',
        'a. Operating and landing area'),
      item('Preset and manual frequencies',
        '“Preset frequencies per the RWOP. UHF 1 will be our primary working radio. We will monitor Base on UHF 2 and Instructor common on VHF 2.”\n\n'
        + 'OR “1 ATIS, 3 Ground, 4 Tower, 10 Spencer. UHF 1 will be our primary working radio for these frequencies. We will monitor Base, button 5, in UHF 2. VHF 1 will have 124.85 and silenced unless required to talk to Approach. Instructor Common 121.95 will be monitored in VHF 2.”'),
      item('Navigation aids',
        '“None. Primary navigation today will be via visual references.”\n\n'
        + '(For instrument flights, speak to loading the flight plan in the FMS and loading NAVAIDs: 70X NSE TACAN, 110.55 NDZ localizer, etc. These are the two primary instrument NAVAIDs used at KNDZ, ILS 32 and TACAN 004.)'),
      item('DA/DH Settings',
        '“None. For FAM flights, all bugs will be set to OFF.”\n\n'
        + 'If needed: “Minimum Altitude” is set for both pilots from either side and is correlated to MSL. “Decision Height” is set on individual sides and is correlated to an AGL altitude. Expect to still hear the “150 feet” callout.'),
    ]),

    section('Flight Planning', 1, [
      item('Weather',
        'a. Current conditions\n'
        + '  (Have weather up on the computer and brief current winds, ceilings, visibility, and precipitation for the area of operation. Reference takeoff information from the KNDZ METAR and/or KNSE TAF. Compare this to the requirements for the flight.)\n'
        + '  “As briefed in ORM.”\n'
        + '  OR “Some scattered convective cells moving across Mobile Bay. Winds are out of the northwest, so expecting RWY 32. DA is noted as a little high at 2608’. Weather required for the Day FAM flight is 500-1 to work SVFR in the local pattern, 1200-3 to work EPs in the channel, and 600-1 to operate at the OLF. We will maintain VMC if operating in a Convective SIGMET.”\n'
        + '  (If flying something other than Day FAM, reference the weather applicable to the profile: departure mins, alternates, RWOP requirements, etc.)\n\n'
        + 'b. Forecast (origin/destination/alternate)\n'
        + '  (Read the applicable TAF information for KNSE/KPNS for our arrival times. Compare this to the requirements for the flight. Brief freezing levels if applicable.)\n'
        + '  “Thunderstorms and showers in the vicinity later this afternoon. Dew point spread is forecast to be less than 1 degree, so we may see some fog or low cloud development later. Winds will pick up to 22 knots, so it should keep the fog away but we will keep an eye on wind limits for the afternoon.”',
        'a. Current conditions\nb. Forecast (origin/destination/alternate)'),
      item('Notices to Airmen (NOTAMs)/TFRs',
        '(Brief anything applicable to the flight, including OLF locations.)\n\n'
        + '“Cones on northern spots at Site-X due to ponding. KNDZ flight checks in progress from 1115-1500L.”'),
      item('Weight and balance',
        '“Calculated for the Aft CG (or Actual) aircraft, loaded with 950 lbs of fuel and two pilots. It is less than 6283 lbs and within balance limits.”'),
      item('Aircraft performance calculations',
        '“At takeoff, HIGE is 70%, HOGE is 80%. Max continuous power (MCP) is 78.5% and takeoff power (TOP) is 95% torque.”\n\n'
        + '**The weight and balance Excel file HIGE/HOGE numbers are accurate; however, the Excel file MCP and TOP numbers are derived from a less accurate data profile and shall be calculated manually using the charts in Ch. 18 of NATOPS.**\n\n'
        + '(The torque numbers are derived from NATOPS performance charts and are related to ITT / N1 limits for an engine with a barely passing PAC check of +/-0° ITT / +/-0% N1 baseline. Most of the aircraft are much stronger than baseline, but this is a conservative calculation. NATOPS Chapter 4 TQ limits (continuous 0-100%, 5 min 100-108.5%, 5 sec 108.5-115%) are based on -20 °C OAT and shift left as the OAT increases (high/hot/heavy). Northwest Florida is rarely, if ever, this cold, therefore we are mostly ITT/N1 limited and use these calculated TQ numbers to power manage and plan.)'),
      item('Fuel planning',
        '“Expecting around 950 lbs for a cold go.” OR “We’ll take 800/850 lbs at the hot seat for a Day FAM flight.”\n\n'
        + 'a. Bingo\n'
        + '  “200 lbs from the OLF to land with no less than 50 lbs.”\n'
        + '  (Expect a XFER PUMP CAS around 260 lbs. The pump will shut off automatically after 5 seconds, so there is no rush to get it secured. Secure the switch above 200 ft with dual concurrence or when safe on deck. In the event the transfer pump fails, the remaining fuel within the cell is unusable.)\n\n'
        + 'b. Refuel plan\n'
        + '  “As previously briefed.” OR “Fuel at Site-X after the 1st Go. Home field fuel pits after the 2nd Go.”',
        'a. Bingo\nb. Refuel plan'),
      item('Flight publications/charts/fuel packet',
        '“We will have EKBs with appropriate pubs and charts downloaded and current, and check out / hot seat a paper PCL. No fuel card required.”\n\n'
        + '(Appropriate pubs and charts downloaded to the EKB are the PCL, RWOP, and local VFR and IFR charts and approach plates. Out/in profiles will require a fuel card.)'),
      item('Electronic Kneeboard (EKB) usage (battery/database currency)',
        '“As briefed in ORM.”\n\n'
        + 'OR “Both pilots will have an EKB with enough charge to cover the duration of the flight. We will utilize EKBs for checklists. If heads down on the EKB for an extended period, provide a ‘heads down’ call; the flying pilot will respond with a ‘heads up’ call.”\n\n'
        + '(For a triple or longer flight where in-flight charging could be expected, add: “All charging cables will stay clear of control surfaces throughout the flight and not be plugged in until complete with systems checks.”)'),
    ]),

    section('Crew Coordination/Crew Resource Management', 2, [
      item('PAC responsibilities',
        '“Aviate, Navigate, and Communicate in that order and task the PNAC as appropriate.”'),
      item('PNAC responsibilities',
        '“Back up the flying pilot with aviating, navigating, and communicating, and monitor gauges, copy ATIS and clearances, tune avionics, engage or disengage the flight director or anything else requested. Completion of a task will be signaled by a thumbs up or verbal response.”'),
      item('Control changes',
        '“Three-way, positive change of controls with emphasis on the word ‘controls.’ If there is any doubt who is on the controls, both pilots will assume the controls and sort it out verbally. Control inputs by the non-flying pilot do not constitute a control change.”\n\n'
        + '“Student pilots are restricted from utilizing twist grip manipulation during in-flight maneuvers and simulated EPs. The instructor pilot will verbalize these twist grip manipulations as they are made.”'),
      item('Lookout procedures/obstruction clearance',
        '“Call out all traffic and obstacles using ‘left’ or ‘right’ side or ‘clock’ direction, ‘high,’ ‘level’ or ‘low,’ ‘factor’ or ‘no factor.’ Birds are ‘birds’ and aircraft are ‘aircraft.’ **Be directive, then descriptive.** Anything not called is assumed not seen. We will utilize the TAWS and TAS warnings today and inhibit them only with dual concurrence. Ensure to re-engage the systems when continuing our flight outside of the OLF.”'),
      item('Safety of Flight',
        'a. Two-Challenge Rule and automatic control change\n'
        + '  “We will adhere to the two-challenge rule but may utilize a one or no challenge rule in the low altitude Day FAM environment at pilot judgement.”\n'
        + '  For instrument flights: “Either pilot can challenge the parameters of the flight, including altitude, airspeed, ball, and Nr/N2. The flying pilot will verbally respond with a ‘roger, correcting’ call and make the appropriate input. If a correction is not made after a second challenge, the non-flying pilot will call for a control change and assume the duties of the PAC.”\n\n'
        + 'b. Spatial disorientation (recognized/unrecognized/incapacitating)\n'
        + '  “While VMC in the Day FAM environment, fess up if you feel spatially disoriented and use the visible horizon and/or ground references to attempt to re-cage your senses. If unable to re-cage, execute a control change. The crew will discuss if able to continue the flight with a potential vestibular imbalance.”\n'
        + '  For IFR/IMC: “Recognized: if you think you may be disoriented and/or experiencing vertigo, confess it. The primary course of action will be for the non-flying pilot to talk the flying pilot back onto parameters; the secondary COA is to execute a control change. Unrecognized: will be handled in accordance with the two-challenge rule. Incapacitating: will necessitate a control change.”\n'
        + '  (SD can happen in VMC or IMC and occurs when the pilot has an incorrect perception of the attitude, altitude, motion, or location of one’s own aircraft relative to ground references. Vertigo is a type of SD where a false sense of movement causes confusion or disorientation.)\n\n'
        + 'c. Unusual attitude recovery procedures\n'
        + '  “Per the instrument FTI.”\n'
        + '  (Convert to an instrument scan, level wings, level nose, center ball, set power for 90 KIAS and climb or descend to a safe or assigned altitude, then turn to a safe heading. Avoid combining steps together, which may cause additional vertigo-inducing unusual attitudes.)',
        'a. Two-Challenge Rule and automatic control change\nb. Spatial disorientation (recognized/unrecognized/incapacitating)\nc. Unusual attitude recovery procedures'),
      item('Instrument flight responsibilities (PAC vs. PNAC vs. observer)',
        '“Not planning any intentional instrument flight. If necessary, any instrument flight responsibilities will be briefed in flight.”\n\n'
        + '(Be familiar with the following, especially on a marginal weather day: the PAC will be focused on maintaining parameters requiring control input. The PNAC will tune/select the Approach frequency, silence the other radios, tune applicable NAVAIDs, and prepare for an IFR recovery. Any crewmember in the back seat will be responsible for backing up the pilots with checklists, fuel plan, and approach backup.)\n\n'
        + 'a. Instrument approach progress\n'
        + '  “Both pilots will track progress of the approach plate and call out step-downs, fixes, and turns required.”\n\n'
        + 'b. At the Missed Approach Point (MAP)\n'
        + '  (1) Runway/runway environment lookout\n'
        + '    “The non-flying pilot will call a description of the environment once they see the runway or runway environment. The flying pilot will remain on the gauges until the PNAC confirms ‘landing is assured, come heads up, runway is at 1 o’clock low.’”\n'
        + '  (2) Change of scan vs. change of controls\n'
        + '    “If reported ceilings on approach are [___] ft or less and/or visibility is [___] SM or less, we will conduct a change of controls. When the non-flying pilot has the runway environment in sight, they will call for a control change and fly the aircraft to landing while the other pilot remains on an instrument scan. If weather is reported better than [___] ft and [___] SM, we will conduct a change of scan at or prior to the MAP or DA. The flying pilot will report the runway environment in sight.”\n'
        + '    (The briefed ceiling and visibility minimums to conduct a change of controls vs. scan are at crew discretion.)\n'
        + '  (3) Missed approach/climbout\n'
        + '    “If the runway environment is lost or in question after passing the MAP or DA, we will immediately report ‘executing missed approach.’ If practicing multiple practice approaches, report ‘executing climbout.’”',
        'a. Instrument approach progress\nb. At the Missed Approach Point (MAP)\n  (1) Runway/runway environment lookout\n  (2) Change of scan vs. change of controls\n  (3) Missed approach/climbout'),
      item('Autopilot/Flight Director (FD)',
        'a. Modes and phase of flight\n'
        + '  “Only inner-loop functions of the AFCS will be utilized today. The outer-loop autopilot will not be utilized for this flight unless IP demonstration or utilization of the flight director is required.”\n'
        + '  (Use of the flight director is at the IP’s discretion and will ensure the standard terminology of ‘On / Captured / Arm / Standby / Off / Disengaged’ is used by the crew, per Chapter 6 of the TAW-5 Genesys and Flight Director Management instruction. Later blocks have additional restrictions and requirements on FD usage; see the Genesys matrix.)\n\n'
        + 'b. System malfunction/failure\n'
        + '  “Any SAS or other inner-loop malfunctions will be handled in accordance with the PCL. If utilized, any flight director malfunctions or uncertainty about its operation will require the crew to disengage the system with ‘FD Standby’ and confirm that all modes are disengaged.”',
        'a. Modes and phase of flight\nb. System malfunction/failure'),
    ]),

    section('Emergencies/System Failures', 2, [
      item('Actual vs. simulated emergencies',
        '“Treat all emergencies as actual unless prefaced with the word ‘simulated,’ or ‘simulated’ is announced once the conditions are recognized.”\n\n'
        + '“We will aviate, navigate, and communicate in that order. The PAC will complete all CMIs involving flight control input. The PNAC will complete all CMIs not involving flight control input. The PNAC will also be responsible for squawking 7700 and declaring an emergency as required with identification, situation, position, and intentions (ISPI). The PNAC will then pull out the checklist and, time permitting, complete non-memory items and read all Warnings, Cautions, and Notes. The crew will determine appropriate landing criteria and land as required.”\n\n'
        + '“System failures are less immediate in nature. The PAC will continue flying the aircraft. The PNAC will troubleshoot. Per squadron SOP, dual concurrence is required for all hydraulic, electrical, fuel, SAS, or MAN/NOR switch manipulations while airborne. This includes the fuel transfer that will occur around 260 lbs.”\n\n'
        + '“For simulated emergencies, do not move any switches, buttons, or circuit breakers without dual verification. SNAs shall not manipulate the twist grip in flight during simulated emergencies. If we experience an actual emergency during a simulated emergency, we will attempt to clean up from the simulated emergency prior to troubleshooting the actual emergency.”'),
      item('Inadvertent Instrument Meteorological Conditions (IIMC)',
        '“If we inadvertently go IMC, we will immediately establish an instrument scan and recover from any unusual attitude. We will climb to a safe altitude of [___] ft and turn away from known obstacles. The PNAC will squawk emergency, switch to Pensacola Approach (124.85 / VHF button 3), declare an emergency, and request a PAR to KNDZ or secondarily request an RNAV approach. If we regain VMC, we will attempt to maintain VMC.”\n\n'
        + '(“Safe altitude” is dependent on the operating area. MSA at KNDZ is 2700’ MSL within 25 NM; MVA in Pensacola TRACON is 1700’. Tailor to the planned route and obstacles. We will avoid IMC to the extent of landing in a field if required.)'),
      item('Lost communication (internal/external)',
        '“If internal lost comms: check helmets, cords, and switches. Attempt ‘Backup,’ then ‘Emergency’ (per the ICS Failure EP). If unable to regain comms, shout and terminate training.”\n\n'
        + '“For external lost comms: troubleshoot radios and frequencies. If experiencing a complete radio failure, squawk 7600 and make all calls in the blind. If inbound on course rules or established at an OLF, we will land at the OLF. If returning to KNDZ, we will recover in accordance with the RWOP lost comms recovery procedures.”\n\n'
        + '(RWOP lost comms recovery: overfly the runway in use at 700’ MSL and 70 KIAS with position lights and searchlight on. Look for ALDIS lamp signals for clearance to land and rock rotors to acknowledge. The alternate Tower frequency is VHF 123.075. If getting static feedback on a frequency, swap the frequency back and forth; try the other radio prior to switching to the last assigned frequency.)'),
      item('Dynamic rollover',
        '“On takeoff, if we experience an accelerated roll about a ground attach point, we will smoothly lower the collective, neutralize the cyclic, and retrim; inspect the skids as required. Minimize time while light on the skids and maintain 3-5’ while hovering. If drift starts to occur while landing, stop the descent, restabilize, and trim the landing with no drift. When landing with forward speed, keep the skids aligned in the direction of travel.”\n\n'
        + '(Avoid increasing collective, which will exacerbate the roll. Dynamic rollover is most likely when thrust is approximately equal to weight, especially on takeoffs from a soft surface or loose gravel; maintain trim, eliminate lateral drift, and minimize the time light on the skids. Maintain at least the 3-foot hover while sliding in and out of the line and fuel pits.)'),
      item('Emergency landing/ditching',
        '“We will communicate externally our intended point of landing and discuss the planned type of approach and touchdown. Call out any obstacles to the landing. Stow all checklists below 200 feet AGL and terminate non-CMIs while we focus on the landing, or climb back above 200’. Avoid jettisoning the doors in forward flight. For power-off landings over water, we will attempt a zero-zero landing. When on deck, conduct an emergency shutdown if required.”'),
      item('Emergency egress',
        '“Remain strapped in the aircraft until all violent motion has stopped. Egress, stay clear of all turning rotors, and meet at a safe position (the 12 o’clock position or upwind of smoke and flames). Contact emergency assets and base using the handheld radio and/or cell phones, and coordinate for pickup and medical if needed.”\n\n'
        + '(For flights over water add: “If over water, execute the underwater egress procedures and meet at a safe position on the surface.”)'),
    ]),

    // Page 2: the event-specific briefing (NATOPS 6.4.6). Night has words, from the Night FAM
    // FTI; the others are the NATOPS outline, with nothing in the sources to say under them.
    section('Night Flight', 1, [
      item('Unaided considerations',
        'Discuss levels of illumination, current and forecasted weather and how it may affect the event, possible visual illusions, safe altitudes, airport lighting systems, lit and unlit obstacles along the route of flight, and any other information you might consider critical for unaided flight.'),
      item('Solar/lunar considerations',
        'a. Sunrise/Sunset/EENT\n'
        + '  State the time when the sunrise, sunset, and End of Evening Nautical Twilight (EENT) are expected. Basic times are provided on the flight schedule front page; this information can be retrieved for any location using the SLAP data program of JMPS. Sunset and sunrise determine when aircraft external lights must be turned on and off or the configuration changed. NVG will perform best after EENT: the NVG image will be degraded if a flight is conducted to the west between sunset and EENT or the east between the beginning of morning nautical twilight and sunrise.\n\n'
        + 'b. Moonrise/moonset/lux levels\n'
        + '  State the time the moon is expected to rise and set and the level of illumination that will be available while conducting the night/NVG event. Moon illumination might only occur if the moon is above the horizon (moonrise to moonset) between sunset and sunrise. LLL is a light level less than 0.0022 lux; HLL is a light level greater than or equal to 0.0022 lux.\n\n'
        + 'c. Moon angle/azimuth\n'
        + '  Discuss how the moon angle and azimuth affect night/NVG operations along the route of flight and in the LZ environment at the ETA, and how the mission profile could be changed to obtain the most benefit from them.\n\n'
        + 'd. Shadowing\n'
        + '  Shadowing may hide obstacles during takeoff/landing and obscure ground references, making checkpoint detection and identification harder. Shadowing is directly related to the moon angle: a low moon will generate longer shadows within an LZ.\n\n'
        + 'e. Ambient light\n'
        + '  Discuss the ambient light illumination and how it may affect the night event. As the ambient light increases, visual acuity increases; high ambient light will improve unaided night flight, but high levels of illumination may degrade the performance of NVG, to the point where unaided flight may be the safer option over a large city.\n\n'
        + 'f. Visual illusions\n'
        + '  Depending on the type of flight environment and LZ, discuss the possible type of visual illusion you may encounter during the night event: a false horizon illusion over water or a very dark area, the motion parallax illusion while hovering or taxiing in the line environment.',
        'a. Sunrise/Sunset/EENT\nb. Moonrise/moonset/lux levels\nc. Moon angle/azimuth\nd. Shadowing\ne. Ambient light\nf. Visual illusions'),
      item('NVG preflight',
        'Discuss when and how to inspect the NVG; let the other crew members know if the NVG has been preflighted or when the NVG preflight will be conducted. If the NVGs have already been preflighted, report any cosmetic blemishes (bright spots, black spots, and emission points) or operational defects (flickering, edge glow, and shading). Cosmetic blemishes are not normally a cause for rejecting the NVG; any operational defect is an immediate cause for rejecting the NVG.'),
      item('Goggle/degoggle procedures',
        'Define when and how the crew intends to start and stop using NVGs. The goggle/degoggle procedures may be initiated and terminated in the parking spot before taxi, at the hold short line before transitioning to the runway for takeoff, just prior to takeoff, after takeoff, or during cruise flight. Reference the TW-5 RWOP and/or SOPs for goggle/degoggle procedures.'),
      item('NVG failures/emergencies',
        'Discuss how the crew will manage NVG malfunctions (low battery light, battery failure, tube failure, etc.), aircraft emergencies, and emergency landings. Day and night EP steps will always be conducted IAW the NATOPS. Specifically, the selection of a safe landing site will change significantly depending on whether or not the crew is aided or unaided.'),
      item('Aircraft lighting',
        'a. External lights\n'
        + '  Review when and how to use external lights IAW the NATOPS, TW-5 RWOP, CNAF M-3710 and FAR. Develop a plan for the lighting configurations that will be used during OLF operations during both aided and unaided flights.\n\n'
        + 'b. Internal lights\n'
        + '  State when and how to use cockpit lighting and the expected brightness setting.\n\n'
        + 'c. Overhead spot light/lip light\n'
        + '  Coordinate the use of the map light, lip light, and finger light and how to avoid blinding the other crewmember.\n\n'
        + 'd. Lighting discipline\n'
        + '  Discuss how the crew plans to minimize the external and internal lights’ negative effects on night vision, NVG performance, and mission accomplishment.',
        'a. External lights\nb. Internal lights\nc. Overhead spot light/lip light\nd. Lighting discipline'),
      item('Radar altimeter',
        'Discuss radar altimeter settings and when they will be changed IAW the RWOP.'),
      item('Hazards',
        'Discuss possible hazards along the route of flight and in the airport/OLF/LZ traffic pattern. Specifically, address how the crew will identify and avoid known hazards and obstacles.'),
      item('LZ operations',
        'Discuss how to operate unaided and/or with NVG at planned Navy OLFs and/or airports.'),
    ], {
      break: true,
      text: 'Conduct a standard NATOPS brief and be sure to include the event-specific items for night flights.',
    }),

    fixed('Confined Area Landing/Pinnacle Landings', 2,
      '1. LZ operation\n'
      + '2. Site evaluation (SWEEP check)\n'
      + '  a. Size, slope, suitability, surface\n'
      + '  b. Winds\n'
      + '  c. Elevation\n'
      + '  d. Egress/obstacles\n'
      + '  e. Power required vs. available\n'
      + '3. Intended point of landing (markers, as required)\n'
      + '4. Obstruction clearance responsibilities\n'
      + '5. Waveoff'),
    fixed('External Load Operations', 2,
      '1. Power/CG calculations\n'
      + '2. External load operating area/pattern\n'
      + '3. Communication/visual signals\n'
      + '  a. Waveoff\n'
      + '  b. Fouled drop area\n'
      + '  c. Fouled load\n'
      + '4. External load hookup/grounding procedures\n'
      + '5. External load release\n'
      + '6. External load flight (airspeed/bank angle)\n'
      + '7. Lost ICS\n'
      + '8. Emergency procedures\n'
      + '  a. Jettison'),
    fixed('Hoist Operations', 2,
      '1. Power/CG calculations\n'
      + '2. Hoist operating area/pattern\n'
      + '3. Communication/visual signals\n'
      + '  a. Fouled hoist\n'
      + '  b. Fouled drop area\n'
      + '4. Hover coordination (verbal)\n'
      + '5. Lost ICS\n'
      + '6. Emergency procedures\n'
      + '  a. Hoist cut'),
    fixed('Formation Flight', 2,
      'Briefed from the TW-5 Formation Briefing Guide (the FORMATION button).\n\n'
      + '1. Number of aircraft/call signs\n'
      + '  a. Section Lead\n'
      + '  b. Lead/Wing responsibilities\n'
      + '2. Type of formation (parade/cruise/combat)\n'
      + '  a. Takeoff\n'
      + '  b. Enroute\n'
      + '  c. Landing\n'
      + '3. Air-to-air TACAN/Aircraft lighting\n'
      + '4. Maneuvers/join-up\n'
      + '5. Lead change\n'
      + '  a. Communication/visual\n'
      + '  b. Lost communication\n'
      + '6. Emergency procedures\n'
      + '  a. Aircraft emergencies\n'
      + '  b. On-scene commander responsibilities\n'
      + '  c. IIMC\n'
      + '  d. Loss of visual contact\n'
      + '7. Waveoff (flight/individual)'),
    fixed('Shipboard Operations', 2,
      '1. Ship name/type/hull number/TACAN\n'
      + '  a. Ship deck height\n'
      + '  b. Position of Intended Movement/Base Recovery Course (PIM/BRC)\n'
      + '2. DLQ pattern\n'
      + '3. Wind envelopes\n'
      + '4. Flight deck procedures\n'
      + '  a. LSE signals\n'
      + '    (1) Mandatory (waveoff/fouled deck)\n'
      + '    (2) Advisory\n'
      + '  b. Ship lighting (night/low visibility)\n'
      + '5. Fuel (ship vs. shore)\n'
      + '6. Aircraft emergencies'),

    // Page 3: the two briefs given to whoever was not at the NATOPS brief (NATOPS 6.4.7, 6.4.8).
    fixed('Observer Brief (When Observer Does Not Attend NATOPS Brief)', 1,
      '1. Mission\n'
      + '  a. Primary/secondary\n'
      + '  b. Operating area\n'
      + '  c. Sequence of events\n'
      + '2. Lookout doctrine\n'
      + '  a. Responsibilities\n'
      + '  b. Traffic\n'
      + '  c. Clearing aircraft\n'
      + '3. Communications/ICS\n'
      + '  a. Normal\n'
      + '  b. Lost ICS\n'
      + '4. Emergencies\n'
      + '  a. Aircraft emergencies\n'
      + '  b. Downed pilot/aircraft\n'
      + '  c. Crewmember casualty\n'
      + '5. Safety of flight\n'
      + '  a. Waveoff\n'
      + '  b. Question anything', { break: true }),
    fixed('Passenger Brief', 2,
      '1. Survival equipment (proper wear and use)\n'
      + '2. Entry and exit procedures\n'
      + '3. Seatbelt usage and communication equipment\n'
      + '4. Aircraft side number\n'
      + '5. Gear/equipment stowage\n'
      + '6. Emergency procedures\n'
      + '  a. Ditching/egress\n'
      + '    (1) Over land\n'
      + '    (2) Over water\n'
      + '  b. Emergency exits\n'
      + '    (1) Doors\n'
      + '    (2) Windows'),
  ],
};

// ---------------------------------------------------------------------------------------
// TW-5 Mission brief (Navigation FTI Appendix C card, Chapter 7 words)

const NATOPS_BY_EXCEPTION = 'For a single ship mission, pause at the end of the Mission Brief and ask if there are any questions. If there are no questions, continue with the NATOPS by exception brief. The NATOPS by exception brief covers only those items in the NATOPS brief that were not already covered in the Mission Brief: more detailed crew coordination instructions, such as PAC and PNAC responsibilities, and how aircraft emergencies or system failures will be handled. It is not necessary to state “previously briefed” for items discussed in the Mission Brief, just skip them and move on to the next item.';

const MISSION = {
  id: 'th73a-mission',
  title: 'TW-5 Mission Briefing Guide',
  short: 'MISSION',
  order: 2,
  ...PROGRAM,
  note: 'The template is an outline, not a script. The bullets and handwritten notes are meant to jog the speaker’s memory, not be read verbatim.\n'
    + '“Brief your plan, do not plan your brief.”',
  source: { unit: 'TW-5', date: '2026-04-04', publication: 'P-479 Navigation FTI' },
  sections: [
    section('Situation', 1, [
      item('Introduction', '“Attention to brief. I am (Rank and Last Name). Please hold all questions to the end.”'),
      item('Time Hack',
        '“Time Hack: In one minute, the time will be 1545 local... Thirty seconds to hack... Ten seconds to hack... 5, 4, 3, 2, 1, hack. At the hack, the time was 1545. If anyone requires an additional time hack, see me after the brief.”\n\n'
        + 'Obtain an accurate time prior to the brief by calling the Naval Observatory Master Clock. Always announce one minute until the hack, and then give a thirty-second and ten-second warning. Do not continue the brief until the time hack is complete.'),
      item('Aircraft Assignment(s)',
        '“We will be in aircraft 614 on spot C9. Our call-sign today is Eightball/Factoryhand/Lucky 614.”\n\n'
        + 'Give the aircraft assignment, the parking spot, and the call-sign. If the aircraft is a hot seat, state where the hot seat will occur.',
        'Lead: A/C & Spot\nWing: A/C & Spot'),
      item('Section Leader',
        'Single ship: not applicable. For a section, the Section Leader is designated on the flight schedule, and the section’s external call sign will always use the Section Leader’s side number.'),
      item('Call Sign',
        '“Our call-sign today is Eightball/Factoryhand/Lucky 614.”',
        'External / Internal'),
      item('Smart Pack Inventory',
        '“Page one of five is the cover sheet. Pen and ink changes are the current winds are 170 at 12. Page two of five is the route card beginning at NAS Whiting Field and ending at checkpoint 3. Page three...”\n\n'
        + 'The inventory begins with the first page and continues in order to the last page. Pen and ink changes should be briefed as the page it occurs on is inventoried.'),
      item('Maps/Charts', '“The map required for the flight is the Pensacola 1:250,000 JOG-A.”'),
      item('Weather',
        '“Current weather is scattered at 3,500, better than six statute miles visibility and winds 170 at 12 knots. Forecasted weather for KBFM at 1945 local is broken at 2,500, greater than 6 statute miles visibility and winds 200 at 9 knots. Weather required for the flight is 1000 and 3, winds no more than 20 gusting 25 knots.”\n\n'
        + 'Cover the weather for the origin, route of flight, and destination if the weather differs along the route of flight. If the mission involves an LZ that does not have weather observations, use the TAF from a nearby airfield.',
        'Current\nDestination\nRequired'),
      item('SLAP',
        '“Sunset is 1651, EENT is 1748, moonrise occurred at 1159, and moonset is 2356. The moon is at 50% illumination. At takeoff, the moon azimuth will be at 175 azimuth and 55 elevation. It will be descending and moving west throughout the flight, but will still be high above the horizon when we land. The entire flight will be high light, but we will see some shadows on the east side of terrain.”\n\n'
        + 'SLAP Data shall be briefed on all night flights.',
        'Sunrise / Sunset / EENT\nMoonrise / Moonset / %Illum\nSolar / Lunar Azm / Elev\nShadowing'),
    ]),

    section('Mission', 1, [
      item('At [TIME] L, HT-X will launch [one/two] TH-73As to safely complete [MISSION].',
        '“At 1745 local, HT-8 will launch a single TH-73A in order to safely complete a TRF4201A.”\n\n'
        + 'State the complete mission including the who, what (task), when, where, and why (purpose). The why is the most important part of the mission brief.'),
    ]),

    section('Execution', 1, [
      item('Concept of Operations',
        '“We will launch from NAS South Whiting Field to conduct a training flight in the Western Operation Area. Landings will be conducted at LZ Bay Minette. The flight will recover at Mobile Downtown Airport.”\n\n'
        + 'Describe the point of departure, area of operations, and mission in a sentence or two.'),
      item('Control Measures',
        '“Control measures: Boundaries. Our working area today is bounded by Highway 31 to the north, the Escambia River to the east, I-10 to the south, and Highway 59 to the west.”\n\n'
        + 'Boundaries should be linear features that are readily identifiable from the air: large highways, rivers, and coasts. List the LZs that will be used during the mission; the detailed LZ brief occurs during the scheme of maneuver.',
        'Boundaries\nAirspace / Restricted Areas\nNoise Sensitive Areas\nLZs'),
      item('Obstacles to Flight',
        '“Obstacle Avoidance. Our best defense is to maintain an active VFR scan and call out all obstacles using a clock code and state the action necessary to avoid the obstacle. All obstacles will be briefed in AGL.”\n\n'
        + '“Aircraft. We will make calls at each checkpoint along the route of flight and coordinate as necessary to avoid other aircraft.”\n\n'
        + '“Birds. We will make control inputs as required to avoid a bird strike. Each pilot will clear their respective sides prior to all turns.”\n\n'
        + '“Class C. There are three Class C airspaces in the Pensacola area. The Whiting Class C is centered on the Whiting TACAN. The Pensacola Class C is centered on Pensacola International Airport. The NAS Pensacola Class C is centered on the TACAN. All three have an inner core from the surface to 4,200 feet MSL out to a 5 nautical mile radius and an outer shelf from 5-10 nautical mile radius from 1400-4200 feet MSL.”\n\n'
        + '“Towers. We will offset from any towers, understanding that we have to avoid the guy wires as well as the towers themselves.”\n\n'
        + '“Restricted Areas. The Eglin Restricted Area 2915A is located south of HWY 90 from the surface to unlimited.”\n\n'
        + '“Power lines. There are multiple power lines running through the operating area today, but while flying at 500 feet, they will not be a factor. If we are forced to a lower altitude, we will cross them at the stanchion to the maximum extent possible.”\n\n'
        + 'Brief in the ABCTRP order, each item starting with the obstacle followed by a brief and executable mitigation.',
        'Aircraft\nBirds\nClass C Airspace (and above)\nTowers\nRestricted Areas\nPowerlines'),
      item('Scheme of Maneuver',
        '“We will walk at 1355 and begin preflight at 1425. We will start the aircraft at 1445 and taxi at 1455 for a 1500 takeoff.”\n\n'
        + 'Begin the scheme of maneuver with the sequence of events from preflight to takeoff. Brief the specific time the crew should conduct preflight, start the aircraft, and taxi. If the aircraft is a hot seat, brief the time the crew should expect to meet the aircraft and where the hot seat will occur.\n\n'
        + 'Course rules shall be briefed in the same detail as the route itself: headings, checkpoint names, and any changes to airspeed, altitude, transponder codes, or radio frequencies, with visual descriptions of each checkpoint and any funneling features, aim points, or limiting features.',
        'Preflight\nStart\nCheck-In\nTaxi\nTakeoff'),
      item('FALCON',
        'Formation: during single ship flights, the briefer only needs to state, “We will be single ship throughout the flight.”\n\n'
        + 'Airspeed/Altitude: brief any airspeed or altitude changes along course rules or the route.\n\n'
        + 'Lighting: brief the lighting scheme to be used throughout the flight. If it does not change, lighting only needs to be briefed at the beginning of the scheme of maneuver. During NVG flights, lighting should be briefed every time the lighting condition changes.\n\n'
        + 'Communications/Squawk: brief all radio frequency and transponder code changes throughout the flight.\n\n'
        + 'Obstacles and Terrain: brief each obstacle individually as it occurs on the route and the plan to avoid it.\n\n'
        + 'Navigation/NVG Considerations: navigation shall be briefed for every checkpoint. It begins with a statement of the direction of turn to a clock position, backup heading, time, and expected distance to the next checkpoint. It continues with a detailed description of the route to the next checkpoint.\n\n'
        + 'If some FALCON considerations changed, but others did not, only brief those considerations that changed.',
        'Formation\nAirspeed / Altitude\nLighting\nCommunication / Squawk\nObstacles\nNavigation'),
      item('Route to Working Area',
        '“From checkpoint six, we will make an easy left turn to the 11 o’clock, back up heading of 165 for a distance of 9.8 nautical miles and timing for 5 minutes 54 seconds to checkpoint seven which is a bridge. Leaving checkpoint six, there will be a series of three tall towers off our nose. We will aim for the center tower. As we approach checkpoint seven, look for a north/south running road paralleling our route off the left-hand side. This road will lead us into the checkpoint. We will also look for an east/west running creek roughly perpendicular to our course. Checkpoint seven is the bridge where the north/south running road crosses the east/west stream. I-10 is our limiting feature for this checkpoint. It runs east/west, south of the stream. If we reach I-10, we have passed our checkpoint. At checkpoint seven, we will make a left-hand turn to 10 o’clock.”\n\n'
        + 'Brief the route from big to small. After each checkpoint, begin by briefing the direction of turn and rollout clock position to the next checkpoint. Then give the backup heading, distance, and time to the next checkpoint. Brief intermediate, funneling, and limiting features along the way, touch on any obstacles and how to avoid them, and lastly describe the next checkpoint. Roads are all-weather or hardball, improved surface, unimproved surface, or jeep trails.'),
      item('Working Area / SOE',
        'Brief the sequence of events that will be conducted in the working area, in the order they will be flown.'),
      item('Route to LZ',
        'At the completion of the route, brief course rules to the OLF in the same detail as the route. It is NOT acceptable to simply say, “Following checkpoint ten, we will fly course rules to Site X.”'),
      item('LZ',
        '“LZ Site X is roughly a 1 mile by 1 mile grass field. There are 16 gravel spots, four located near midfield on each side. There are six paved runways, three north/south, and three east/west. There is slightly elevated terrain on the west side between the gravel landing spots. A depression surrounds the center runways and infield. The LZ is suitable for a single TH-73. Winds are expected from the NE at 15 knots. The LZ is 211 feet MSL. Our egress on a wave-off is straight ahead, with departure egress in the SW corner. Our power required at the LZ is calculated as HIGE of XX% and HOGE of XX%.”\n\n'
        + 'Actions in LZ: “We will approach LZ Site X from the southwest and circle to split the field for a course of 360, avoiding the southwest departure corner. We will split to the normal side on the right. Our first landing will be a normal approach to a hover over the duty runway in the 180 lane. We will then conduct DLAs for 20 minutes, beginning with 90-degree DLAs and progressing to 180 and 360-degree DLAs. At the completion of the DLAs, we will re-split the LZ at altitude and depart via the southwest corner.”\n\n'
        + 'The LZ brief is a detailed description of the LZ using the SWEEP format (Size/Slope/Surface/Suitability, Winds, Elevation, Egress Route, and Power). After completing the SWEEP brief, list the planned maneuvers, primary and alternate landing spots, and time on station at the LZ. Always conduct the LZ brief where it will occur chronologically in the flight.',
        'SWEEP\nActions in LZ'),
      item('RTB',
        'The course rules back to South Whiting shall be covered in the same detail as the rest of the route, including how the flight will maneuver to land at South Whiting and which landing spot will be utilized. Brief all details up to and including the shutdown or hot seat, such as taxi, refueling, and parking location.'),
    ]),

    section('Coordinating Instructions', 2, [
      item('Emergencies & System Failures',
        '“Coordinating Instructions. Emergencies/System Failures. If we have an emergency or system failure during the flight, we will handle it in accordance with NATOPS. We will always endeavor to turn a flying emergency into a ground emergency.”\n\n'
        + 'Give a broad description of what the flight will do during an emergency or system failure. This should not include any specific emergencies.'),
      item('IIMC (Popeye)',
        '“IIMC. If we go IIMC, the PAC will switch to an instrument scan, level the wings, level the nose, center the ball, and start a standard rate climb to 2500’. We will execute a standard rate turn in the shortest direction to the safe heading. PNAC will squawk 7700, Pensacola Approach on 118.6, and IFR clearance for an approach back to KNDZ. If we regain VMC, we will remain VMC. Our safe heading today is 360, except from checkpoint 9 through checkpoint 10 where the safe heading will be 090.”\n\n'
        + 'Brief a safe heading to which the crew can turn to avoid any obstacles. Depending on the obstacles in the working area, there may need to be different headings for different phases of the flight.',
        'Safe Heading / Altitude'),
      item('Loss of Visual Contact (Blind)', ''),
      item('Lost Communications',
        '“Lost Communications. If we experience a total radio failure, we will climb to troubleshoot as necessary. We will maintain a vigilant scan for other aircraft at all times during the emergency. If unable to regain radio communications, we will maintain VMC, squawk 7600, and make all calls in the blind. We will intercept course rules to NAS South Whiting Field. Once at NAS South Whiting Field, we will overfly the field, determine the course for the runway in use, and look for an Aldis lamp signal from the tower.”'),
      item('Disorientation',
        '“Disorientation Procedures. If we become disoriented on the route of flight, we will enter holding and attempt to identify a known reference point. If able, we can return to the last known checkpoint to reorient or continue to the next checkpoint once reoriented.”\n\n'
        + 'This plan may include orbiting until reoriented, climbing for better visibility, or returning to the last known checkpoint.'),
      item('Downed Aircraft', ''),
      item('Aborts', ''),
      item('Wave-offs', ''),
    ], {
      text: 'The following are examples of contingency briefs, not templates that must be followed word for word.',
    }),

    section('Administration & Logistics', 2, [
      item('Flight Duration',
        '“Administration and Logistics: Flight duration will be 1 hour and 33 minutes.”\n\n'
        + 'The flight duration shall be calculated using JMPS and briefed accordingly.'),
      item('Fuel',
        '“Fuel. Mission Fuel is 600 pounds. Bingo fuel is 150 pounds from checkpoint 5 direct to Point Snake for a course rules arrival to South Whiting using the maximum range airspeed of 135 knots.”\n\n'
        + 'Mission fuel is all the fuel required to complete the mission and land at the destination airfield at NATOPS minimum fuel. This includes course rules to and from the route, route execution, and 20 minutes of pattern work at an OLF or airfield. Brief the Bingo Fuel as well as the checkpoint from which it is calculated and the Bingo route to be flown, and state the maximum range airspeed from which the Bingo Fuel was calculated.',
        'Mission / Bingo'),
    ]),

    section('Command & Signal', 2, [
      item('Chain of Responsibility', 'In a section, the only person in the chain of command is the Section Leader; single ship, state “previously briefed.”'),
      item('Callsign(s)', '“Command and Signal: Chain of responsibility and call signs are as previously briefed.”'),
      item('Communications',
        '“Communications. Preset and manual frequencies will be used as required. Comm flow is 5 for Base, 1 for ATIS, 3 for Ground, 4 for Tower, 9 for Pace, 13 for Site-X, 19 for Western Common, 14 for Green Route Common, 122.8 for Bay Minette, 118.5 for Mobile Approach, 118.8 for Downtown Tower, and 121.7 for Downtown Ground.”\n\n'
        + '“Navigation along the route will be primarily visual. We will tune Gateswood TACAN 60X for reference in the Western Operating Area. The Green Route and Mobile Downtown will be loaded in the GPS for backup as required.”\n\n'
        + 'Brief all frequencies in the order in which they will be used during the flight, and all the NAVAIDs to be used as well as GPS waypoints that will be loaded into the FMS.',
        'Preset / Manual Frequencies\nFrequency Changes\nNAVAIDS / GPS'),
      item('Terminology', '', 'Terminate / Knock It Off\nHard Deck / Soft Deck'),
      item('ID & Recognition',
        '“ID and Recognition. Squawk. We will squawk 0100 outbound to Pt Pond. At Pt Pond, we will squawk the Western Operating Area code of 4777. Upon departing the Western Operating Area, we will squawk 1200 until otherwise assigned by Mobile Approach.”\n\n'
        + 'Discuss all the transponder codes to be used during the flight and when any automatic code changes will occur.',
        'Transponder'),
      item('Visual Signals', ''),
      item('Debrief', ''),
    ]),

    fixed('NATOPS by Exception', 2, NATOPS_BY_EXCEPTION),
  ],
};

// ---------------------------------------------------------------------------------------
// TW-5 Formation brief (Formation FTI Appendix C card, Chapter 6 words). Text the FTI prints
// in brackets shall be briefed verbatim; it is kept bracketed, and set bold.

const V = (text) => `**[${text}]**`;

const FORMATION = {
  id: 'th73a-formation',
  title: 'TW-5 Formation Briefing Guide',
  short: 'FORMATION',
  order: 3,
  ...PROGRAM,
  note: 'Example text need not be recited verbatim; tailor the brief to the specific event, using the examples as a framework. **Text contained in brackets shall be briefed verbatim.**\n'
    + 'The first student covers the Situation through the Scheme of Maneuver; the second student covers Coordinating Instructions through the end of the brief. Each flight, the students alternate.',
  source: { unit: 'TW-5', date: '2026-03-06', publication: 'P-484 Formation FTI' },
  sections: [
    section('Situation', 1, [
      item('Introduction',
        '“Attention to brief. I am [rank name] and this is [rank name]. Please hold all questions to the end.”\n\n'
        + 'The first speaker shall introduce both briefers, so there is no reason for the second student to reintroduce themselves when they begin their portion of the brief.'),
      item('Time Hack',
        '“Time Hack: In one minute, the time will be 0600 local... Thirty seconds to hack... Ten seconds to hack... 5, 4, 3, 2, 1, hack. At the hack, the time was 0600. If anyone requires an additional time hack, see me after the brief.”\n\n'
        + 'Obtain an accurate time from the Naval Observatory Master Clock prior to the brief. Do not continue the brief until the time hack is complete.'),
      item('Aircraft Assignment(s)',
        '“[Rank name] and [rank name] will be in aircraft 708 on spot E6. [Rank name] and [rank name] will be in aircraft 610 on G8.”\n\n'
        + 'Give the aircraft assignment and parking spot for each aircraft in the Section. If either aircraft is a hot-seat, state where the hot seat will occur. If aircraft are not yet assigned, “aircraft assignment is to be determined.”',
        'Lead: A/C & Spot\nWing: A/C & Spot'),
      item('Section Leader',
        '“The section leader today is [rank name] in aircraft 708.”\n\n'
        + 'The Section Leader is designated on the flight schedule, and the section’s external call sign will always use the Section Leader’s side number.'),
      item('Call Sign',
        '“Our external call sign will be Eightball 708. The internal call sign is Skeeter flight.”',
        'External / Internal'),
      item('Smart Pack Inventory',
        '“Page one of five is the cover sheet. Page two of five is the route card. Page three of five is the bingo route card. Page four of five is the KNDZ LZ diagram. Page five of five is the Harold LZ diagram. Pen and ink changes to page five: the calculated HIGE power is 65%, calculated HOGE power is 76% torque.”\n\n'
        + 'Any pen and ink changes should be briefed during the smart pack inventory.'),
      item('Maps/Charts', '“The map required for the flight is the Pensacola 1:250,000 JOG-A.”'),
      item('Weather',
        '“Current weather is broken at 2,500, overcast at 3,000 with ten statute miles of visibility and winds variable at 4 knots. Forecasted weather in the area predicts 3,000 broken, winds 030 at 15 knots with scattered thunderstorms. The weather required for the flight is 600 and 1.”\n\n'
        + 'If the flight involves an LZ or airfield that does not have weather observations or forecast, use the TAF from a nearby airfield.',
        'Current\nDestination\nRequired'),
      item('SLAP',
        'If sun position is not a factor for the event: “Our land time at 1400 is well before today’s sunset at 1953. Solar azimuth and elevation are not a concern for today’s event.”\n\n'
        + 'For night events: “Sunrise today was at 0554; sunset is at 1953. The moon is at 8% illumination. Moonrise is at 0811, and moonset is at 2209. At takeoff, the moon will be low on the horizon at 275 azimuth and 18 elevation. We will see shadowing on the east side of terrain and other objects.”\n\n'
        + 'SLAP Data shall be briefed on all flights. For day flights, only sunrise, sunset, and solar azimuth and elevation are applicable, but must be discussed: if the section is scheduled to land just prior to sunset, Wing may experience added difficulty maintaining position if the formation is on a heading towards the sun.',
        'Sunrise / Sunset / EENT\nMoonrise / Moonset / %Illum\nSolar / Lunar Azm / Elev\nShadowing'),
    ]),

    section('Mission', 1, [
      item('At [TIME] L, HT-X will launch two TH-73As to safely complete [MISSION].',
        '“At 0815 local, HT-8 will launch two TH-73As in order to safely complete a FRM4001A.”\n\n'
        + 'Concisely state the mission, including the who, what (task), when, where, and why (purpose). The why is the most important part.'),
    ]),

    section('Execution', 1, [
      item('Concept of Operations',
        '“Both aircraft will launch from NAS South Whiting to conduct training in the Eastern Formation Area. Landings will be conducted at LZ Harold. The flight will recover to NAS South Whiting at the completion of training.”\n\n'
        + 'A general overview of the mission in two sentences or less: point of departure, area of operations, and a brief mission overview.'),
      item('Control Measures',
        '“Control measures: Boundaries. Our working area today is bounded on the north by Highway 4 and the 270 radial of Crestview VORTAC. The eastern boundary is the Crestview 180 radial. The southern boundary is Highway 90 and the western boundary is a north/south line drawn from Harold OLF to the town of Munson.”',
        'Boundaries\nAirspace / Restricted Areas\nNoise Sensitive Areas\nLZs'),
      item('Obstacles to Flight',
        '“Obstacle Avoidance. Our best defense is to maintain an active VFR scan and call out all obstacles using a clock code based on Lead’s 12 o’clock and state the action necessary to avoid the obstacle.”\n\n'
        + '“Aircraft. There may be other formations operating in the formation area. We will de-conflict with this traffic over formation common. C-130s can be reached on IP common. There may be civil aircraft operating in the area, particularly near the Crestview VORTAC and in the vicinity of Highway 90. We will keep a constant see-and-avoid scan and turn away from any traffic that becomes a threat.”\n\n'
        + '“Birds. We will make control inputs as required to avoid a bird strike, but maintain awareness of the other aircraft’s position while maneuvering. Wing will accept a bird strike when needed to avoid causing a midair collision.”\n\n'
        + '“Class C Airspace. We will be transiting in and out of Whiting’s Class C airspace today. It is centered on the Whiting TACAN, has a 5 NM inner core from the surface to 4200 feet MSL and an outer shelf at 5-10 NM from 1400-4200 feet MSL. We will exit and enter the Whiting Class C via course rules. A portion of the outer shelf overhangs the Eastern Formation Area. To avoid climbing into the Class C, we will ensure that we are outside of 10 NM using the map page or FMS prior to beginning climbs and descents.”\n\n'
        + '“Towers. We will offset from any towers, understanding that we must avoid the guy wires as well as the towers themselves. Lead will be cognizant of Wing’s position to avoid placing Wing too close to a tower. Wing may maneuver to either side of Lead as needed.” (Point out problematic towers in the operating area.)\n\n'
        + '“Restricted Area. The Eglin Restricted Area R-2915A is located south of I-10 from the surface to unlimited altitude. To avoid the restricted area, we will remain north of Highway 90 at all times.”\n\n'
        + '“Power lines. There are multiple power lines running through the operating area today, particularly in the area between Point Racetrack and LZ Harold. Power lines are not a factor in the formation area. When transiting course rules to Harold we will avoid the power lines by maintaining the proper course rules altitude. If we need to descend to power line altitude for a PEL we will cross power lines at the stanchion to ensure clearance.”',
        'Aircraft\nBirds\nClass C Airspace (and above)\nTowers\nRestricted Areas\nPowerlines'),
      item('Scheme of Maneuver',
        '“Both aircraft are a cold go today. Aircraft 708 is located on E6, and 610 is located on G8. Both crews will walk at 0715 to conduct individual preflights and aircraft starts. [Name] will be the Lead in 708 departing KNDZ. He will initiate check-in at 0800 on VHF 121.95, followed by an automatic switch to check-in on UHF button 5. After both aircraft provide the up-and-ready call, Lead will check out with Base, then conduct a positive switch to Ground via one turn in ATIS. After receiving taxi clearance, both aircraft will lift from their respective spots simultaneously and rendezvous in the hub. Wing will assume the trail position. With winds from the northeast, we expect to take off from Spot 1 with Runway 5 in use. Both aircraft will make an automatic switch to Tower, UHF button four, when Lead is 200 feet prior to the hold short line. Takeoff will be at 0815.”\n\n'
        + 'Begin with the sequence of events from preflight to takeoff, building the timeline backward from the expected takeoff time. Course rules to the operating area or route shall be briefed in sufficient detail to include every altitude change, airspeed change, radio switch, etc.',
        'Preflight\nStart\nCheck-In\nTaxi\nTakeoff'),
      item('FALCON',
        '“On takeoff, Wing will be in the cruise position. We will climb to 900 MSL and accelerate to 120 KIAS. Lighting will be the standard configuration per your smart packs. Both aircraft will be squawking 0100 with 610 squawking in standby. Over the upwind numbers, we will turn right towards Pt Able, avoiding the maintenance pattern. There are no obstacles to flight enroute to Able. At Deaton Bridge we will conduct an automatic climb to 1000 MSL and decelerate to 100 KIAS. Lead will maneuver the section as needed to deconflict with other traffic.”\n\n'
        + 'Formation: course rules are conducted in cruise formation unless the instructor is demonstrating the parade position. If the section is conducting a navigation route, Wing will move to combat cruise as the section approaches a pre-briefed point.\n\n'
        + 'Communications/Squawk: for all frequency changes, indicate whether it will be a positive switch or an automatic switch. If it is an automatic switch, specify where exactly the switch will occur. Always brief if a check-in will follow the frequency change.\n\n'
        + 'Navigation: if leg parameters are clearly defined in the smart pack, the briefer may state, “for the purposes of this brief, leg headings, timing, and distance are per the smart pack.”\n\n'
        + 'FALCON should be summarized in full during the takeoff phase of the Scheme of Maneuver, after which only changes to the FALCON need be briefed.',
        'Formation\nAirspeed / Altitude\nLighting\nCommunication / Squawk\nObstacles\nNavigation'),
      item('Route to Working Area',
        'Brief course rules to the operating area using FALCON. If the section is conducting a navigation route, the route shall be briefed in the same manner as a TERF flight route as discussed in the Navigation FTI.'),
      item('Working Area / SOE',
        '“Working area. The sequence of events today will be Crossovers, Cruise Turns, Climbs and Descents, Breakup and Rendezvous with Overruns as required, and a Lead Change. Following the Lead Change, we will repeat the sequence of events minus the Lead Change. Wing will initiate all maneuvers.”'),
      item('Route to LZ',
        'At the completion of the working area or TERF route sequence of events, brief course rules to the LZ in the same level of detail as before using the FALCON acronym.'),
      item('LZ',
        '“LZ Harold is a roughly one mile by one mile T-shaped grass field. There are four landing lanes, each with at least one gravel landing spot. The terrain is bumpy but suitable for a section of TH-73As. Winds are expected from the northeast at 15 knots. The LZ is 159 feet MSL. Our egress on a wave-off is straight ahead. Departures are made to the northeast corner. Our power required at the LZ is 65% torque to HIGE and 76% torque to HOGE.”\n\n'
        + 'Actions in LZ: “We will approach LZ Harold from the east and circle to split the field for a course of 360. We will split to the left and take the highest numbered lane available. We will conduct three normal section landings followed by three high-speed approaches for each aircraft, time permitting. Both types of approach will be conducted instructor/instructor, instructor/student, and student/student. For normal approaches, Lead will land on this gravel pad (point); Wing will land in (left/right) echelon on the upwind side. For section high speed approaches, I anticipate Lead beginning the level off here (point) and landing near the departure end gravel pads. Upon completion of the pattern work, Wing will call for RTB. The section will depart via the northeast corner.”\n\n'
        + 'SWEEP: Size / Slope / Surface / Suitability, Winds, Elevation, Egress Route, and Power. Any time the section conducts a type of approach for the first time, the sequence will be instructor/instructor, instructor/student, and student/student.',
        'SWEEP\nActions in LZ'),
      item('RTB',
        'The course rules back to South Whiting shall be covered in the same detail as the rest of the route, including how the flight will maneuver to land at South Whiting and which landing spot will be utilized. If the flight will conduct the home-field break, it needs to be discussed during the return to Whiting. Brief all details up to and including the shutdown or hot-seat such as taxi, refueling, and parking location.\n\n'
        + 'Planning to fly course rules at 100 knots, or tasking Wing with making the Base call on the last downwind leg, are two techniques that can be used to speed up the comm sequence departing Harold.'),
    ]),

    section('Coordinating Instructions', 2, [
      item('Emergencies & System Failures',
        `${V('“Emergencies will be considered actual unless prefaced with the word “simulated.” Aircraft emergencies will be handled internally, notifying the other aircraft when safe to do so. The degraded aircraft will determine which aircraft will be in the Lead position. The Section Leader will determine the conduct of the remainder of the flight.”')}\n\n`
        + 'A broad description of how the section will react if an aircraft experiences an emergency. Detailed emergency procedures are covered during individual NATOPS briefs.'),
      item('IIMC (Popeye)',
        `${V('“If the flight encounters IIMC and Wing has sight of Lead, Wing will maintain position. If Wing loses sight of Lead or it is unsafe to remain in position, Wing will call ‘Skeeter Flight, Popeye’ and immediately start a climbing turn 20 degrees away from Lead. Lead will roll wings level and call base heading, speed, and directs a climb to minimum safe altitude in MSL. Wing will roll out 20 degrees offset from the base heading and level off 200 feet above MSA. Lead will climb to MSA on their original heading. If either aircraft regains VMC, they will remain VMC. The section leader will commence a check-in with status and fuel state after the turn and climb are established. At this point one of three cases will exist:')}\n\n`
        + `${V('“Case 1: Both aircraft VMC. We will execute a join up as directed by the Section Leader. Wing shall remain 200 feet above base altitude until visual contact with Lead is established. Once join up is initiated Wing may descend as appropriate. The Section Leader will direct the remainder of the flight.”')}\n\n`
        + `${V('“Case 2: One aircraft VMC/One aircraft IMC. The Section Leader will call for a positive switch to Approach with a check-in. The IMC aircraft will contact approach, declare an emergency, inform them of the situation, and obtain two discrete squawks. Once both aircraft are under positive control, the section is dissolved, and each aircraft will RTB separately.”')}\n\n`
        + `${V('“Case 3: Both aircraft IMC: The Section Leader will call for a positive switch to Approach with a check-in. The Section Leader will inform Approach of the situation and obtain two discrete squawks. Once both aircraft are under positive control, the section is dissolved, and each aircraft will RTB separately.”')}\n\n`
        + 'Safe Heading / Altitude: “The safe heading in the formation area is 045, the safe altitude is 2700 MSL.”\n\n'
        + 'Brief the procedure most appropriate for the given mission (the above is the Fan Break). All three cases shall be briefed. The safe heading and altitude should be tailored to the route of flight based on airspace, obstacles, and traffic deconfliction, and selected from published MSAs where applicable.',
        'Safe Heading / Altitude'),
      item('Loss of Visual Contact (Blind)',
        `${V('“If Wing loses sight of Lead, Wing will immediately commence a climbing turn away from Lead and call ‘Skeeter flight, Blind.’ Lead will call heading, airspeed, and altitude and communicate a join-up per “Case 1” under inadvertent IMC. If Wing goes Blind in the pattern, it is a mandatory wave-off for Wing. Lead will continue to a landing.”')}`),
      item('Lost Communications',
        `${V('“For the purposes of demonstration, palms down indicates normal lighting configuration (brief normal lighting configuration); palms up indicates the lost comm lighting configuration (brief lost comm lighting configuration).')}\n\n`
        + `${V('If Lead experiences a total radio failure, Lead will switch to the lost comm lighting configuration (palms up) and decrease speed 20 KIAS to gain Wing’s attention. Wing will gain safe lateral separation and move abeam the lost comm aircraft, then switch to the lost comm lighting configuration (palms up) to signify, ‘I understand you are lost comm, I am in position for a lead change.’ The lost comm aircraft will switch to the normal lighting configuration (palms down) to signify, ‘You have the lead.’ The good comm aircraft will then switch to the normal lighting configuration (palms down) to signify ‘I have the lead.’ The lost comm aircraft will then slide back to the cruise position. The flight will proceed as necessary, returning to base if possible.”')}\n\n`
        + `${V('“If Wing experiences a total radio failure, Wing will switch to the lost comm lighting configuration (palms up), gain safe lateral separation and move abeam Lead to signify, ‘I am lost comm.’ The good comm aircraft will then switch to the lost comm lighting configuration (palms up) to signify, ‘I understand you are lost comm, I will retain the lead.’ The lost comm aircraft will then switch to the normal lighting configuration (palms down) to signify, ‘You have the lead.’ The good comm aircraft will return to the normal lighting configuration (palms down) to signify, ‘I have the lead.’ The lost comm aircraft will slide back to the cruise position. The flight will proceed as necessary, returning to base if possible.”')}\n\n`
        + 'The aircraft are referred to as the “Good Comm” and “Lost Comm” aircraft to avoid confusion during the lead change. Students use their hands to indicate where the aircraft are in relation to each other and which lighting condition they are displaying.'),
      item('Disorientation',
        '“If either aircraft becomes disoriented, they will call ‘Skeeter Flight, Magellan.’ The other aircraft will communicate heading and distance to the next checkpoint or will direct a turn away from an obstacle. If Lead passes a checkpoint without calling the point, steers off the route more than 1 NM on a 1:250,000 chart or 500 meters on a 1:50,000 chart, or maintains a heading deviation of plus or minus one minute, Wing will communicate ‘Skeeter Flight, Magellan’ with an appropriate instruction to guide Lead back towards the desired checkpoint or parameter. If both aircraft are disoriented, the flight will orbit at present position and altitude using standard rate turns. They will utilize all assets in the aircraft to become reoriented. Once reoriented, the flight will continue.”\n\n'
        + '“For purposeful deviations to the route of flight, either aircraft may call ‘Skeeter Flight, Columbus.’ The aircraft initiating the change will communicate heading and distance to the new checkpoint with a brief reason for the deviation.”\n\n'
        + '“Magellan” is a brevity code indicating that an aircraft is disoriented or thinks the other aircraft is disoriented; “Columbus” indicates a deviation and new route of flight. The disorientation procedures must be tailored to each flight and need not be verbatim.'),
      item('Downed Aircraft',
        `${V('“If an aircraft within the section goes down, the remaining aircraft commander will assume the duties of On-Scene Commander and execute the On-Scene Commander Checklist. If the flight encounters a downed pilot and/or aircraft, the Section Leader will assume the duties of On-Scene Commander and execute the On-Scene Commander Checklist. The other aircraft will remain clear until tasked by the On-Scene Commander. We will stay on station until reaching our bingo state, have an emergency of our own, or we are relieved by a more suitable SAR asset.”')}`),
      item('Aborts',
        '“If an aircraft aborts prior to takeoff, the PAC will notify the other aircrew as soon as possible. On takeoff, if Lead aborts, Wing will abort with Lead if it is safe to do so. If not, Wing will continue to take off, enter a downwind and land clear of Lead. If Wing aborts, Lead will continue to takeoff, enter a downwind and land clear of Wing.”'),
      item('Wave-offs',
        `${V('“All wave-offs are mandatory regardless of who makes the call. All calls for a section wave-off shall be repeated verbatim by each crew. The three scenarios are:')}\n\n`
        + `${V('Scenario 1: When someone external to the section makes the wave-off call, Lead will make an internal call. Wing will echo the internal call, and both aircraft will wave off. Once safe to do so, Lead will make the external call.')}\n\n`
        + `${V('Scenario 2: Someone internal to the section may call for a section wave-off. The other aircraft will echo the internal call, and both aircraft will wave off. Once safe to do so, Lead will make the external call.')}\n\n`
        + `${V('Scenario 3: If Wing waves off single ship, Wing will make an internal call “Skeeter Two waving off, right/left side.” Once safe to do so, Wing will make an external call using their own side number: “Traffic, Eightball 610 waving off lane 4.” Lead will continue to a landing.”')}\n\n`
        + 'Emphasize who makes the internal and external calls during each scenario.'),
    ], {
      text: 'The second briefer takes over here. Several of the coordinating instructions are treated as emergency procedures and briefed verbatim.',
    }),

    section('Administration & Logistics', 2, [
      item('Flight Duration', '“We will call outbound for 2+00.”'),
      item('Fuel',
        '“Mission fuel is 700 pounds. Bingo from the farthest point in the area, the Crestview VORTAC, is 150 pounds. Bingo from the OLF is 125 pounds.”\n\n'
        + 'The mission fuel is the fuel required to complete both student events and land at the destination airfield with NATOPS minimum fuel. Bingo routes shall be calculated using maximum range airspeed given the forecasted ambient conditions.',
        'Mission / Bingo'),
    ]),

    section('Command & Signal', 2, [
      item('Chain of Responsibility',
        'Since the only person in the chain of command in a section is the Section Leader, the briefer does not need to repeat the information and can simply state, “previously briefed.”'),
      item('Callsign(s)', '“Command and Signal: Chain of responsibility and call signs are as previously briefed.”'),
      item('Communications',
        '“Lead will make all external calls using the Section Leader’s side number. Wing will initiate all maneuvers. Anyone can make a safety of flight call.”\n\n'
        + 'Preset / Manual Frequencies: “All preset and manual frequencies are as per the cover sheet.” (Ensure that all the frequencies to be used during the flight actually appear on the cover sheet.)\n\n'
        + 'Frequency Changes: “All changes will be positive switches unless over an automatic change point. All switches will require a check-in unless otherwise briefed.”\n\n'
        + 'NAVAIDS / GPS: “NAVAIDS are as per the cover sheet. 708’s TACAN will be tuned to 09Y, 610’s will be tuned to 72Y. Both aircraft TACANs will be in air-to-air transmit/receive mode. We will load the formation area into the GPS to help us remain oriented while in the area.”',
        'Preset / Manual Frequencies\nFrequency Changes\nNAVAIDS / GPS'),
      item('Terminology',
        `${V('“Terminate can be called by any aircrew to discontinue a maneuver by stating ‘Skeeter flight, terminate.’ The flight will abort the maneuver, reset, communicate as necessary, and continue with remaining maneuvers when able.”')}\n\n`
        + `${V('“Knock-it-off can be called by any aircrew following a safety of flight occurrence that distracts or prevents the continuation of training. By calling ‘Skeeter flight, Knock-it-off,’ the flight will be discontinued. IPs may ferry the aircraft back as a section at the discretion of the Section Leader. Debrief of the occurrence shall occur once on deck.”')}\n\n`
        + 'Hard Deck / Soft Deck: “The Hard Deck in the Formation Area for today’s flight is 800’ MSL, the Soft Deck is 900’ MSL. Outside the Formation Area, we will adhere to all course rules altitudes.”\n\n'
        + 'Hard decks describe a no-lower-than altitude during a mission; if a hard deck is reached in flight the Section Leader will generally call to knock it off. Soft decks are designed to prevent a hard deck from being reached. It may be necessary to brief different hard and soft decks for each phase of the mission.',
        'Terminate / Knock It Off\nHard Deck / Soft Deck'),
      item('ID & Recognition',
        '“708 will squawk the appropriate code in the ALT mode. 610 will squawk the appropriate code in standby. If the flight is dissolved or separated for any reason, each aircraft will squawk the appropriate code in the ALT mode. Transponder codes throughout the flight are as previously briefed.”',
        'Transponder'),
      item('Visual Signals',
        '“Visual Signals are as per the cover sheet.”\n\n'
        + 'At Training Air Wing Five, visual signals are limited to the lost comm lighting configuration and ready signals. Ensure that all visual signals are printed in the notes section of the cover sheet.'),
      item('Debrief',
        '“The flight will debrief as a section in aircraft issue following shutdown.” OR “The flight will debrief as a section in the crew change shack between events.”\n\n'
        + 'All members of the flight should attend the debrief. Following the section debrief, individual crews will conduct their own debriefs.'),
    ]),

    fixed('NATOPS by Exception', 2,
      'After completing the mission brief, each crew will separate to conduct their own NATOPS by exception to cover all remaining items not already addressed. This is not a rehash of the entire brief. If an item has already been discussed, there is no need to state, “previously briefed,” just move on to the next item. The NATOPS by exception covers those items that are cockpit specific, such as how individual crews will react to IIMC (level the wings, level the nose, center the ball...), control transfers, and cockpit lookout doctrine. It is an opportunity to discuss specific PAC and PNAC responsibilities within the cockpit.'),
  ],
};

// ---------------------------------------------------------------------------------------

const BRIEFS = [NATOPS, MISSION, FORMATION];

function describe(brief) {
  const items = brief.sections.reduce((n, s) => n + s.items.length, 0);
  const said = brief.sections.reduce((n, s) => n + s.items.filter((it) => it.text).length, 0);
  const pages = brief.sections.filter((s, i) => i === 0 || s.break).length;
  return `${brief.sections.length} sections on ${pages} page${pages === 1 ? '' : 's'}, ${items} items, ${said} with words`;
}

// The same checks the server makes on shape, so a slip is caught before anything is sent.
function check(brief) {
  const ids = new Set();
  const take = (id, where) => {
    if (!id) throw new Error(`${where} has no id`);
    if (ids.has(id)) throw new Error(`${where}: the id ${id} is used twice`);
    ids.add(id);
  };
  brief.sections.forEach((s, i) => {
    take(s.id, `Section ${i + 1}`);
    if (s.fixed && !(s.text || '').trim()) throw new Error(`${s.title} is fixed but has no text`);
    s.items.forEach((it, j) => {
      take(it.id, `${s.title}, item ${j + 1}`);
      if (!it.label.trim()) throw new Error(`${s.title}, item ${j + 1} has no name`);
    });
  });
  const bytes = Buffer.byteLength(JSON.stringify(brief));
  if (bytes > 200 * 1024) throw new Error(`${brief.id} is ${bytes} bytes, over the server's 200 KB`);
  return bytes;
}

async function published() {
  const res = await fetch(`${MIRROR}/briefs/index.json`, { cache: 'no-cache' });
  if (res.status === 404) return new Set();
  if (!res.ok) throw new Error(`index: HTTP ${res.status}`);
  const data = await res.json();
  return new Set((data.briefs || []).map((b) => b.id));
}

async function main() {
  const chosen = BRIEFS.filter((b) => !ONLY || b.id === ONLY);
  if (!chosen.length) throw new Error(`No brief is called ${ONLY}`);
  for (const brief of chosen) {
    const bytes = check(brief);
    console.log(`${brief.id} (${brief.short}): ${describe(brief)}, ${(bytes / 1024).toFixed(1)} KB`);
  }
  if (DRY) {
    console.log('Dry run: nothing published.');
    return;
  }
  const have = await published();
  for (const brief of chosen) {
    if (have.has(brief.id)) {
      console.log(`${brief.id}: already on the site; not published over. Edit it there.`);
      continue;
    }
    const out = await apiPost(API, 'publish-brief', { brief, author: AUTHOR, summary: SUMMARY });
    console.log(`${brief.id}: published as ${out.id} rev ${out.rev}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
