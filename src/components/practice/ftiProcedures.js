// The FAM FTI's procedures for the moments a practice flight flies, said from memory with
// the numbers blanked (the same steps a course rule is). Generated from the FTI's text by
// a one-off script, its lost glyphs (degrees, fractions, dashes) put back from the rendered
// pages; edit it here. Pure data. Only the lettered steps the flight is at are kept: the
// takeoff roll and climb-out of §505, and the parts of §606 and §607 for the pattern.

export const FTI = {
  takeoffRoll: {
    title: "Takeoff",
    ref: {
      work: "FAM FTI",
      loc: "§505 — Takeoff",
      pages: "p. 5-3"
    },
    rule: [
      {
        text: "e. Select a reference point. Position the elevator aft of neutral. For crosswinds, position aileron as required into the prevailing winds. To compensate for torque effect when left crosswind is below approximately [[10 knots]], add right aileron at MAX power. Release brakes, dropping your heels to the deck (toes off the brakes)."
      },
      {
        text: "f. Release the brakes and allow the plane to roll forward momentarily to ensure the nose wheel is centered. Smoothly advance the PCL to MAX in [[2-3 seconds]]. Anticipate the need for right rudder as the engine spools up. Maintain directional control."
      },
      {
        text: "g. At [[60 KIAS]], check torque is at or above minimum power calculated on the Before Takeoff Checklist and fuel flow less than [[800 lbs]]. If not, abort the takeoff. Verbalize over the ICS \"[[60 knots]], XXX% torque; good flow\" IAW local SOP or Course Rules."
      },
      {
        text: "h. At [[90 KIAS]], smoothly apply back-stick pressure and position the nose to takeoff attitude ([[7-10°]] nose high, spinner on or slightly below the horizon). Allow the aircraft to fly itself off the deck."
      }
    ]
  },
  climbOut: {
    title: "Takeoff",
    ref: {
      work: "FAM FTI",
      loc: "§505 — Takeoff",
      pages: "p. 5-3"
    },
    rule: [
      {
        text: "j. Check nose attitude at [[7-10°]] nose high and continue acceleration, trimming as necessary. Approaching [[180 KIAS]], set the [[180 knot]] climbing attitude and climb out in accordance with local SOP or Course Rules or departure procedures."
      }
    ]
  },
  olfEntry: {
    title: "Outlying Field Entry",
    ref: {
      work: "FAM FTI",
      loc: "§603 — Outlying Field Entry",
      pages: "p. 6-3"
    },
    rule: [
      {
        text: "a. Determine the duty runway."
      },
      {
        text: "b. Fly to establish the aircraft at the appropriate initial point. At this point the aircraft shall be:"
      },
      {
        text: "i. On or parallel to extended runway centerline and on runway heading (see local SOP or Course Rules.",
        sub: true
      },
      {
        text: "ii. Wings level."
      },
      {
        text: "iii. At break altitude (see local SOP or Course Rules)."
      },
      {
        text: "iv. On airspeed (see local SOP or Course Rules)."
      },
      {
        text: "c. When at the initial point, make the appropriate radio call."
      },
      {
        text: "d. Fly from the initial point towards the runway maintaining altitude and airspeed, visually locate pattern traffic, and obtain wind information."
      }
    ]
  },
  theBreak: {
    title: "The Break",
    ref: {
      work: "FAM FTI",
      loc: "§604 — The Break",
      pages: "p. 6-4"
    },
    rule: [
      {
        text: "c. Clear in the direction of turn, then roll into a [[30-60°]] AOB turn, retard PCL to idle (extend speed brake as required) and maintain altitude. AOB and back-stick pressure will vary with wind conditions. Trim for deceleration."
      },
      {
        text: "d. Verbally confirm airspeed below [[150 KIAS]] on the ICS. Lower the landing gear after the IP has acknowledged the airspeed call. \"Below 150, Gear,\" is the challenge, and \"Clear\" is the response."
      },
      {
        text: "e. Slightly advance PCL once the landing gear is extended to spool the engine up in anticipation for slowing to [[120 KIAS]] and adding power as appropriate for the downwind."
      },
      {
        text: "f. Halfway through the break turn, adjust the AOB to establish a [[¾ - 1]] wingtip distance on Downwind."
      },
      {
        text: "g. Slow to [[120 KIAS]], maintaining Break altitude and raising the nose attitude as required to maintain level flight. Trim for deceleration."
      },
      {
        text: "h. Approaching [[120 KIAS]] ([[~130 KIAS]]), advance the PCL to [[~31%]] to capture [[120 KIAS]] if remaining level or to [[~20%]] and pitch down for [[120 KIAS]] if descending to pattern altitude (as directed by local SOP or Course Rules). On Downwind, lower the flaps to the desired setting."
      },
      {
        text: "i. Level off at pattern altitude using the P.A.T. principle: Power. Approximate starting point [[31/42/52%]] torque for NF/TO/LDG setting. Adjust as required. Attitude. Stop the descent by initially setting a slightly nose-up attitude immediately followed by the [[120 KIAS]] level flight attitude. Trim. Re-trim."
      },
      {
        text: "j. Conduct the Before Landing Checklist once on Downwind with the desired flaps setting selected."
      }
    ]
  },
  approach: {
    title: "Approach",
    ref: {
      work: "FAM FTI",
      loc: "§606 — Approach",
      pages: "p. 6-6"
    },
    rule: [
      {
        text: "a. Downwind leg"
      },
      {
        text: "i. Once on Downwind, lower the flaps as required and perform the Before Landing Checklist. Report the Before Landing Checklist complete over the ICS prior to the Abeam position.",
        sub: true
      },
      {
        text: "ii. Maintain proper Downwind, parallel to the runway at [[¾ - 1]] wingtip distance, pattern altitude, and [[120 KIAS]] (using power as required, approximately [[31%]] torque for NF, ~42%TO, ~52%LDG). TRIM."
      },
      {
        text: "b. No sooner than the Abeam position, TRANSITION. Reduce power as required – approximately [[20%]] torque for all flap settings. TRIM left rudder for the power reduction and nose up for deceleration."
      },
      {
        text: "c. [[180°]] Position"
      },
      {
        text: "i. Opposite the intended rollout position for no wind, simultaneously lower the nose approximately 2-3 degrees to the NF/TO/LDG approach attitude, maintain [[120/115/110 KIAS]] respectively.",
        sub: true
      },
      {
        text: "ii. TURN towards the [[90°]] position using approximately [[25-30°]] AOB."
      },
      {
        text: "iii. TALK: Make appropriate radio transmission."
      },
      {
        text: "iv. Make necessary corrections throughout the approach using power to control rate of descent and nose attitude to control airspeed and AOA."
      },
      {
        text: "v. Re-trim the aircraft throughout the approach.",
        sub: true
      },
      {
        text: "vi. Vary AOB and power as necessary to arrive at a proper [[90°]] position; [[120/115/110 KIAS]], [[450 feet AGL]] perpendicular to the runway."
      },
      {
        text: "vii. Continue turn to intercept the \"Start\" of the \"Groove\", [[1200-1500 feet]] from the threshold, at [[200 feet AGL]], wings level."
      }
    ]
  },
  touchAndGo: {
    title: "Touch-and-Go Landing",
    ref: {
      work: "FAM FTI",
      loc: "§607 — Landings",
      pages: "p. 6-15"
    },
    rule: [
      {
        text: "d. Touch-and-Go Landing"
      },
      {
        text: "i. Smoothly and immediately advance the PCL to Max without delay. As power becomes available following engine spool-up, apply right rudder, while keeping the nose at the takeoff attitude ([[7-10°]] nose high) to preclude a tail strike, allow the aircraft to smoothly takeoff.",
        sub: true
      },
      {
        text: "ii. Execute a normal takeoff. Once two positive rates of climb is confirmed, raise flaps from LDG to TO (if applicable), and once airspeed is [[110 KIAS]] minimum, retract the flaps (leave gear down). Trim."
      },
      {
        text: "iii. As airspeed approaches [[120 KIAS]], reduce power to [[60%]] and climb straight-ahead."
      },
      {
        text: "iv. Once trimmed at [[120 KIAS]] and number one Upwind with Interval, make a Crosswind or departing radio call. Crosswind should not normally be initiated until past the departure end of the runway with Interval and cleared by Tower (as applicable). Comply with local SOP or Course Rules."
      },
      {
        text: "v. Rollout on Downwind with [[¾ - 1]] WTD spacing from the runway.",
        sub: true
      },
      {
        text: "vi. [[50 feet]] prior to pattern altitude, transition to level flight by reducing power to [[~31%]]."
      },
      {
        text: "vii. Once on Downwind, complete the Before Landing Checklist prior to the Abeam position."
      }
    ]
  },
  olfDeparture: {
    title: "Outlying Field Departure",
    ref: {
      work: "FAM FTI",
      loc: "§612 — Outlying Field Departure",
      pages: "p. 6-31"
    },
    rule: [
      {
        text: "a. Ensure you are number one Upwind."
      },
      {
        text: "b. Aircraft shall be safely airborne and past the departure end of the runway (or as defined by local SOP or Course Rules) and [[120 KIAS]] minimum."
      },
      {
        text: "c. Check airspeed below [[150 KIAS]]."
      },
      {
        text: "d. Raise landing gear handle and ensure flaps are up. Report over ICS, \"Gear up, flaps up at ___ knots.\""
      },
      {
        text: "e. Advance PCL to MAX."
      },
      {
        text: "f. Transmit departure call (see local SOP or Course Rules)."
      },
      {
        text: "g. Comply with local SOP or Course Rules for departure."
      }
    ]
  },
  pel: {
    title: "Precautionary Emergency Landing (PEL)",
    ref: {
      work: "FAM FTI",
      loc: "§704 — Precautionary Emergency Landing (PEL)",
      pages: "p. 7-13"
    },
    rule: [
      {
        text: "The first three steps, \"Turn, Climb, Clean,\" must be executed nearly simultaneously and without delay."
      },
      {
        text: "a. TURN. Turn in the general direction toward the nearest suitable field. Locate the field visually, use conventional NAVAIDS, FMS NAV/TSD displays, or FMS NRST to aid in determining nearest field. A good pilot should always know where the nearest field is located."
      },
      {
        text: "b. CLIMB or ACCELERATE. If a climb is needed, climb at [[140 KIAS]] using an appropriate power setting to achieve DEGA. If unable to climb due to clouds, icing, etc., increase energy by accelerating to a higher airspeed. Remain clear of clouds until in position to descend and/or decelerate to enter the ELP. If at high altitude, a descent will be required to enter the ELP."
      },
      {
        text: "c. CLEAN. Ensure aircraft is in a clean configuration by raising landing gear, flaps, and speed brake (as appropriate for the emergency) as soon as possible. Retraction may not be possible if the engine fails. Remember that excess drag inhibits the climb and greatly reduces gliding range."
      },
      {
        text: "d. CHECK. Conduct a systematic check of the aircraft and instruments for additional signs of impending engine failure."
      },
      {
        text: "e. Boost Pump Switch – as required."
      },
      {
        text: "f. Ignition Switch – as required."
      },
      {
        text: "g. Plan: To intercept the ELP in the appropriate configuration and a minimum speed of [[120 KIAS]]. The above considerations and energy state should lead to one of three decisions:"
      },
      {
        text: "i. Intercept the ELP profile at high key.",
        sub: true
      },
      {
        text: "ii. Intercept the ELP profile at a point other than high key with the appropriate configuration and airspeed."
      },
      {
        text: "iii. Eject if it becomes clear that the aircraft cannot be safely recovered."
      },
      {
        text: "h. DETERMINE your landing runway/site before intercepting the ELP profile."
      },
      {
        text: "i. DELIVER a simulated emergency voice report using ISPI format over ICS to the instructor. For an actual emergency, notify ATC/Tower/RDO over the radio of your situation/intentions."
      },
      {
        text: "j. REDUCE power to [[4-6%]] torque no sooner than DEGA."
      },
      {
        text: "k. LOWER the landing gear no later than high key."
      },
      {
        text: "l. REPORT on ICS the Before Landing Checklist and re-trim for [[120 KIAS]] minimum."
      },
      {
        text: "m. At high key; turn, using angle of bank as necessary ([[~ 15-20°]] in calm wind), towards the low key position to maintain ground track and make the appropriate radio call IAW local SOP or Course Rules. Maintain [[120 KIAS]] minimum."
      },
      {
        text: "n. Approaching low key, vary the angle of bank as necessary so as to arrive at approximately [[2/3]] WTD abeam the Intended Point of Landing. Level the wings momentarily to accurately check your position abeam."
      },
      {
        text: "o. At low key, level the wings momentarily to accurately check your position abeam. Set flaps to takeoff and perform the low key radio call IAW local SOP or Course Rules. Lower flaps no sooner than low key."
      },
      {
        text: "p. Continue the turn towards the base key position. Vary angle of bank as necessary to arrive at a proper base key ([[600-800 feet AGL]], [[120 KIAS]] minimum)."
      },
      {
        text: "q. Check and report, \"Gear down, flaps TO (or LDG as required), speed brake retracted, Before Landing Checklist complete\" if checklist was not completed."
      },
      {
        text: "r. When landing is assured, flaps may be lowered to LDG."
      },
      {
        text: "s. Use normal power corrections as required to make a safe and controlled landing inside base key."
      },
      {
        text: "t. Decelerate toward [[110 KIAS]] (minimum) after rolling out on final. Maintain [[110 KIAS]] (minimum) on final until commencing the landing transition. Make an ICS call IAW local SOP or Course Rules."
      }
    ]
  },
  patternPel: {
    title: "Precautionary Emergency Landing from the Pattern",
    ref: {
      work: "FAM FTI",
      loc: "§705 — Precautionary Emergency Landing from the Pattern",
      pages: "p. 7-16"
    },
    rule: [
      {
        text: "a. TURN towards the nearest suitable runway. Consider the use of an off-duty runway. If the pattern is extended and/or the winds are calm, the nearest suitable runway may be the reciprocal of the runway the aircraft just departed. The instructor will then direct which runway will be used. Practice PELs in the pattern must conform with local SOP or Course Rules. The instructor will make the appropriate call to the Tower/RDO/crash crew."
      },
      {
        text: "b. CLIMB at [[125 KIAS]], utilizing power setting as appropriate for the simulated emergency."
      },
      {
        text: "c. CLEAN up the aircraft (as required), gear, flaps, and Speed brake – UP. Report \"aircraft clean\" to your instructor."
      },
      {
        text: "d. CHECK Aircraft and engine instruments. Conduct a systematic check of the aircraft for secondary indications."
      },
      {
        text: "e. Boost Pump Switch – As required."
      },
      {
        text: "f. Ignition Switch – As required."
      },
      {
        text: "g. Plan – to intercept ELP at or before low key position."
      },
      {
        text: "h. DETERMINE or verify the intended runway with the instructor."
      },
      {
        text: "i. DELIVER the appropriate simulated emergency voice report using the ISPI format over ICS to your instructor. For an actual emergency, notify the tower/RDO of your situation/intentions on the radio."
      },
      {
        text: "j. REDUCE power to [[4-6%]] torque once on ELP. (Lower the nose to the [[125 KIAS]] glide attitude and re-trim.)"
      },
      {
        text: "k. LOWER the landing gear."
      },
      {
        text: "l. REPORT over ICS the Before Landing Checklist and re-trim for [[120 KIAS]] minimum."
      },
      {
        text: "m. Arrive at pattern low key with proper configuration (lower flaps no sooner than low key), altitude, and approximately [[⅔]] wingtip distance."
      },
      {
        text: "n. Make the appropriate radio call at pattern low key IAW local SOP or Course Rules."
      },
      {
        text: "o. Complete the maneuver as in the last half of the PEL."
      }
    ]
  },
  powerOnStall: {
    title: "Power-On Stall",
    ref: {
      work: "FAM FTI",
      loc: "§518 — Power-On Stall",
      pages: "p. 5-25"
    },
    rule: [
      {
        text: "a. CONFIGURATION: Establish the aircraft in the clean configuration. Complete maneuver above [[6000 feet AGL]]."
      },
      {
        text: "b. CHECKLIST: Perform the Pre-Stalling, Spinning, and Aerobatic Checks."
      },
      {
        text: "c. CLEAR AREA: Clear working area with visual scan, TCAS, and clearing turns as required."
      },
      {
        text: "d. Straight-Ahead Stall. Adjust the PCL to [[30-60%]] torque. Raise the nose to a [[15-40°]] nose high attitude."
      },
      {
        text: "e. Recovery. RELAX: Reduce angle of attack to restore laminar flow. This may require a reduction in back stick pressure, or moving stick progressively towards neutral, or moving stick forward of the trim position. MAX: Advance PCL to maximum power to maintain flying airspeed. Simultaneously, LEVEL: Anticipate engine power effects, applying aileron and rudder as necessary to maintain or achieve wings level; BALL: Use aileron and rudder control as necessary to maintain wings level, coordinated flight throughout the recovery (apply right rudder as necessary to center the balance ball)."
      },
      {
        text: "f. Complete. Maneuver is complete when the aircraft is wings level with two positive rates of climb (as indicated on the Altimeter and VSI). Be mindful of retarding the PCL with a nose high attitude and lower airspeed."
      },
      {
        text: "g. Turning Stall. Setup is the same as the straight-ahead stall, except [[20-30°]] angle of bank in either direction is added. Hold the angle of bank with rudder and aileron pressure until un-commanded nose drop and/or unplanned rolling motion. Recovery is the same as for the straight-ahead stall. A precision entry is not as important as proper recognition and recovery from the stall."
      }
    ]
  },
  spin: {
    title: "Spin",
    ref: {
      work: "FAM FTI",
      loc: "§522 — Spin",
      pages: "p. 5-33"
    },
    rule: [
      {
        text: "a. Intentional Spin Entry"
      },
      {
        text: "i. CONFIGURATION: Establish and trim the aircraft in slow cruise configuration ([[150 KIAS]]). Trim will remain constant throughout the maneuver. Start the maneuver at an altitude so that the spin itself is entered below [[22,000 feet]] pressure altitude, and recovered before [[10,000 feet]] pressure altitude. Minimum entry altitude is [[13,500 feet AGL]].",
        sub: true
      },
      {
        text: "ii. CHECKLIST: Perform the Pre-Stalling, Spinning, and Aerobatic Checklist."
      },
      {
        text: "iii. CLEAR AREA: Clear working area with visual scan, TCAS, and clearing turns as required. TCAS \"Below\" mode may be used to aid clearing area below."
      },
      {
        text: "iv. Trim the aircraft for [[150 KIAS]] in straight and level flight."
      },
      {
        text: "v. Check the wings level, Retard the PCL to idle, and smoothly raise the nose to [[30°]] above the horizon. When the gear warning horn activates, SNA shall acknowledge the warning horn, however, the IP shall silence the horn prior to spin entry.",
        sub: true
      },
      {
        text: "vi. At the stick shaker, lead the stall with a slight amount of rudder in the desired direction of spin."
      },
      {
        text: "vii. When the aircraft stalls (recognized by the nose pitching down), smoothly apply full rudder in the direction of spin and full back-stick. Do not use aileron in the entry or during the spin."
      },
      {
        text: "viii. Call out altitude, AOA, airspeed, turn needle deflection/direction."
      },
      {
        text: "b. Incipient Spin Recovery Upon recognition of an incipient spin by stalled AOA, airspeed that is accelerating or decelerating toward the steady-state value, and turn needle fully deflected in direction of spin, initiate the INADVERTENT DEPARTURE FROM CONTROLLED FLIGHT Procedure, in accordance with the NATOPS. PCL – IDLE CONTROLS – NEUTRAL ALTITUDE – CHECK RECOVER FROM UNUSUAL ATTITUDE"
      },
      {
        text: "c. Steady-State Spin Recovery"
      },
      {
        text: "i. Upon recognition of a steady-state spin by stalled AOA, airspeed stabilized [[120-135 KIAS]] and turn needle fully deflected in direction of spin, respectively.",
        sub: true
      },
      {
        text: "ii. Apply full rudder opposite to the direction of turn needle. Follow immediately with smooth, positive forward stick to a position forward of neutral. Do not use ailerons!"
      },
      {
        text: "iii. Hold the controls in position until the rotation stops, and then recover from unusual attitude with a minimum loss of altitude. (a). Neutralize the controls (b). Level the wings by referencing the horizon. (c). Commence a smooth pullout. Use sufficient G during pullout to maintain working area boundaries. Do not aggressively pull to the horizon. The stick shaker and airframe buffet indicate a potential for stall. Decrease back-stick pressure before the stall. If the aircraft does not respond normally to control inputs, an OCF recovery should be accomplished. Avoid secondary stalls and do not exceed aircraft limitations."
      },
      {
        text: "iv. Continue the pullout until the nose is positioned to the level flight attitude. Emphasis is on smooth control inputs."
      },
      {
        text: "v. Check and report oil pressure (minimum of 90 psi).",
        sub: true
      },
      {
        text: "vi. Add power as required."
      }
    ]
  },
  elpStall: {
    title: "Power-Off Stall (ELP Stall)",
    ref: {
      work: "FAM FTI",
      loc: "§519 — Power-Off Stall (ELP Stall)",
      pages: "p. 5-28"
    },
    rule: [
      {
        text: "a. CONFIGURATION: Establish the aircraft in the clean configuration. Begin the maneuver at slow cruise ([[150 KIAS]]), or airspeed at the IP's discretion. Complete the maneuver above [[6000 feet AGL]]."
      },
      {
        text: "b. CHECKLIST: Perform the Pre-Stalling, Spinning, and Aerobatic Checks."
      },
      {
        text: "c. CLEAR AREA: Clear working area with visual scan, TCAS, and clearing turns as required."
      },
      {
        text: "d. Roll wings level. If at or below [[150 KIAS]], retard PCL to [[4-6%]] torque and begin decelerating towards best glide speed, [[125 KIAS]]. If above [[150 KIAS]], retard PCL to [[4-6%]] torque and zoom glide to capture best glide speed, [[125 KIAS]]."
      },
      {
        text: "e. As airspeed approaches [[125 KIAS]], lower nose to the [[125 KIAS]] glide attitude (horizon bisecting windscreen). Crosscheck and Verbalize VSI for [[1350-1500 feet]] per minute sink rate. Re-trim and stabilize."
      },
      {
        text: "f. Simulate high key and lower the landing gear; Re-trim for [[120 KIAS]] glide speed and commence a [[15-20°]] AOB turn to low key. Complete the Before Landing Checklist."
      },
      {
        text: "g. Raise the nose to [[5-10°]] nose high attitude and allow airspeed to decay until the first indication of stall (airframe buffet or stick shaker)."
      },
      {
        text: "h. Maintain the turn or profile ground track and recover by lowering the pitch attitude to put the prop arc on the horizon ([[~8°]] nose low) until [[120 KIAS]] is regained."
      }
    ]
  },
  landingPatternStall: {
    title: "Approach Turn Stall",
    ref: {
      work: "FAM FTI",
      loc: "§520 — Landing Pattern Stalls",
      pages: "p. 5-29"
    },
    rule: [
      {
        text: "Approach Turn Stall",
        heading: true
      },
      {
        text: "a. CONFIGURATION: Establish the aircraft in the appropriate Downwind configuration ([[120 KIAS]] gear down, flaps as required)."
      },
      {
        text: "b. CHECKLIST: Perform the Pre-Stalling, Spinning, and Aerobatic Checklist and the Before Landing Checklist."
      },
      {
        text: "c. CLEAR AREA: Clear working area with visual scan, TCAS, and clearing turns as required."
      },
      {
        text: "d. Simulate the transition near the Abeam position IAW Contact FTI landing pattern procedures. Power should be approximately [[20%]] torque, airspeed [[120/115/110 KIAS]] based on flap setting, trimmed in a descending 30o AOB turn to simulate the approach turn to final."
      },
      {
        text: "e. Once stabilized on airspeed [[120/115/110 KIAS]] in the simulated approach turn, raise the nose to [[5-10°]] nose high attitude, and retard PCL to idle. Adjust ailerons to maintain AOB between [[20-45°]], and increase back stick pressure to hold the pitch attitude."
      },
      {
        text: "f. At first indication of stall (airframe buffet or stick shaker) recover with minimal altitude loss."
      },
      {
        text: "Landing Attitude Stall",
        heading: true
      },
      {
        text: "a. CONFIGURATION: Establish a simulated final approach at [[5-10 knots]] above final approach airspeed commensurate with flap setting."
      },
      {
        text: "b. CHECKLIST: Perform the Pre-Stalling, Spinning, and Aerobatic Checklist and the Before Landing Checklist."
      },
      {
        text: "c. CLEAR AREA: Clear working area with visual scan, TCAS, and clearing turns as required."
      },
      {
        text: "d. Retard the PCL to idle and execute a simulated landing transition. Hold the landing attitude constant until an approach-to-stall indication occurs. At first indication of stall (airframe buffet or stick shaker) recover with minimal altitude loss."
      },
      {
        text: "Landing Pattern Stall Recovery",
        heading: true
      },
      {
        text: "For Landing Pattern stalls, recover at first indication of stall (airframe buffet or stick shaker), whichever occurs first. Do not enter a full stall!"
      },
      {
        text: "a. Recovery. RELAX: Reduce angle of attack to restore laminar flow. This may require a reduction in back stick pressure, or moving stick progressively towards neutral, or moving stick forward of the trim position. MAX: Advance PCL to maximum power to maintain flying airspeed. Simultaneously, LEVEL: Anticipate engine power effects, applying aileron and rudder as necessary to maintain or achieve wings level; BALL: Use aileron and rudder control as necessary to maintain wings level, coordinated flight throughout the recovery (apply right rudder as necessary to center the balance ball)."
      },
      {
        text: "b. Complete. Maneuver is complete when the aircraft is wings level with two positive rates of climb (as indicated on the Altimeter and VSI). Be mindful of retarding the PCL with a nose high attitude and lower airspeed."
      }
    ]
  },
  cuas: {
    title: "Contact Unusual Attitudes",
    ref: {
      work: "FAM FTI",
      loc: "§906 — Contact Unusual Attitudes",
      pages: "p. 9-6"
    },
    rule: [
      {
        text: "Nose-High Recovery",
        heading: true
      },
      {
        text: "a. PCL to MAX (as required in low airspeed situations) and initiate a coordinated roll past [[90°]] AOB towards inverted attitude until nose approaches the horizon. Utilize back stick pressure to bring the nose of the aircraft down to the nearest horizon. Depending on initial airspeed and aircraft attitude, a wings level, inverted attitude may be reached. As the nose approaches the horizon, roll to an upright attitude (Figure 9-2)."
      },
      {
        text: "b. If the airspeed is low, the rollout may be delayed until the nose is definitely below the horizon. In some cases, the nose has to be flown well below the horizon to regain enough airspeed to feel positive pressure on the controls. When airspeed is sufficient, roll wings level, raise the nose, check for normal oil pressure, and use power as required to recover to level flight."
      },
      {
        text: "c. Do not be too aggressive when pulling to the horizon or pulling up from a nose-low attitude. The stick shaker and airframe buffet indicate a potential for stall. Decrease back-stick pressure before the stall."
      },
      {
        text: "d. In all cases, observe system limitations when operating near zero-G."
      },
      {
        text: "e. During some nose-high, low airspeed situations, when the aircraft responds to inputs slowly due to low airspeed or torque effect, a reduction in power may be required (usually below [[60%]] torque) and all available control authority may be required to smoothly return the aircraft to level flight. If the aircraft does not respond normally, rapidly approaching a stall, or if situational awareness is lost, an OCF recovery shall be accomplished."
      },
      {
        text: "Nose-Low Recovery",
        heading: true
      },
      {
        text: "a. Roll the aircraft to the nearest horizon while simultaneously Retarding PCL to IDLE. Use the speed brake as required."
      },
      {
        text: "b. Do not exceed maximum allowable airspeed ([[316 KIAS]]). Airspeed may continue to increase as the nose is raised, and maximum airspeed can occur just before level flight is attained. G-loading increases during recovery. Accomplish a proper AGSM."
      },
      {
        text: "c. Do not aggressively pull to the horizon. The stick shaker and airframe buffet indicate a potential for accelerated stall. Decrease back-stick pressure prior to a full stall. If the aircraft does not respond normally to control inputs check AOA below 18 units, an OCF recovery may be required. The recovery procedure can only be re-initiated if the aircraft is not stalled with sufficient airspeed. If AOA below 18 units and airspeed excessively slow (below [[110 KIAS]]) advance PCL."
      },
      {
        text: "Inverted Recovery",
        heading: true
      },
      {
        text: "a. When slightly nose-high, nose-low, or near an inverted position, recover by rolling in the shortest direction to set the aircraft in an upright position adding power as required. With the nose on or slightly above the horizon, check and report oil pressure is normal then power as required."
      },
      {
        text: "b. For purely inverted recoveries, execute a coordinated roll to the nearest horizon."
      }
    ]
  },
  // Added by hand from p. 9-5 (rendered). Step b ends "smoothly pull" as the FTI prints it;
  // step d, for advanced aerobatic and formation training, is left out.
  gWarm: {
    title: "G-Warm Maneuver",
    ref: {
      work: "FAM FTI",
      loc: "§905 — G-Warm Maneuver",
      pages: "p. 9-5"
    },
    rule: [
      {
        text: "a. Complete the Pre-Stalling, Spinning, and Aerobatic Checklist. Notify the other crewmember that you are going to commence the G-Warm."
      },
      {
        text: "b. Begin wings level at [[200-220 KIAS]]. Advance PCL to MAX, smoothly roll to [[70-80 degrees]] AOB, allowing the nose to drop slightly below the horizon (no more than [[10 degrees]]), pause momentarily to stop roll and smoothly pull"
      },
      {
        text: "c. The G-onset rate should be slow and smooth, allowing sufficient time to evaluate the effectiveness of the AGSM and determine G-tolerance. Increase G's to approximately [[4 G's]] for approximately [[4-5 breathing cycles]] in order to allow full cardiovascular response."
      }
    ]
  }
};

// Each procedure cut to its numbers, in the order they are flown, for chair flying: a terse
// label and the FTI's own figure (every value is a figure from the procedure's text above, and
// the test checks it is). The procedure's section is the source.
// The numbers said with each procedure, as the user laid them out (2026-10-25): feet as ',
// thousands with commas, speeds in KIAS, power as torque, spacing in WTD. Each figure is in the
// procedure's own steps above, except a row with a third entry, which names where it is from.
const ROTATE_GUST = 'FAM FTI §505 — Takeoff, note, p. 5-7';
const DOWNWIND_TORQUE = 'FAM FTI §606 — Approach, p. 6-7';
const ELP = 'FAM FTI §703 — Emergency Landing Pattern (ELP), p. 7-11';
const NATOPS_SPINS = 'NATOPS Ch. 5 — Prohibited Maneuvers, p. 5-9';
export const FTI_NUMBERS = {
  takeoffRoll: [
    ['PCL to MAX in', '2-3 seconds'],
    ['Torque and fuel flow check at', '60 KIAS'],
    ['Fuel flow below', '800 pph'],
    ['Rotate at', '90 KIAS + ½ gust factor', ROTATE_GUST],
    ['Takeoff attitude, nose high', '7-10°'],
  ],
  theBreak: [
    ['Break AOB', '30-60°'],
    ['Gear down below', '150 KIAS'],
    ['Downwind spacing', '¾-1 WTD'],
    ['Slow to', '120 KIAS'],
    ['Torque to stay level', '~31%'],
    ['Torque to descend to pattern alt', '~20%'],
    ['Level-off torque, NF/TO/LDG', '31/42/52%'],
  ],
  approach: [
    ['Downwind speed', '120 KIAS'],
    ['Downwind torque, NF/TO/LDG', '31/42/52%', DOWNWIND_TORQUE],
    ['Transition torque, all flap settings', '20%'],
    ['180 speed, NF/TO/LDG', '120/115/110 KIAS'],
    ['Approach turn AOB', '25-30°'],
    ['90 alt', "450' AGL"],
    ['Groove distance from the threshold', "1,200-1,500'"],
    ['Groove alt', "200' AGL"],
  ],
  touchAndGo: [
    ['Takeoff attitude, nose high', '7-10°'],
    ['Flaps up at', '110 KIAS'],
    ['Torque approaching 120 KIAS', '60%'],
    ['Climb speed upwind', '120 KIAS'],
    ['Downwind spacing', '¾-1 WTD'],
    ['Start level-off', "50' below pattern alt"],
    ['Level-off torque', '~31%'],
  ],
  pel: [
    ['Climb speed', '140 KIAS'],
    ['Torque, no sooner than DEGA', '4-6%'],
    ['ELP minimum speed', '120 KIAS'],
    ['High key alt and AOB, calm wind', "3,000' AGL, ~15-20°", ELP],
    ['Low key alt and spacing', "1,500' AGL, ⅔ WTD", ELP],
    ['Base key alt', "600-800' AGL"],
    ['Final minimum speed', '110 KIAS'],
  ],
  patternPel: [
    ['Climb speed', '125 KIAS'],
    ['Torque on the ELP', '4-6%'],
    ['Glide speed', '125 KIAS'],
    ['After the gear, minimum speed', '120 KIAS'],
    ['Low key alt and spacing', "1,500' AGL, ⅔ WTD", ELP],
    ['Base key alt', "600-800' AGL", ELP],
    ['Final minimum speed', '110 KIAS', ELP],
  ],
  gWarm: [
    ['Begin at', '200-220 KIAS'],
    ['AOB', '70-80°'],
    ['Nose low, no more than', '10°'],
    ['G load', "4 G's"],
    ['Hold for', '4-5 breathing cycles'],
  ],
  powerOnStall: [
    ['Complete above', "6,000' AGL"],
    ['Torque', '30-60%'],
    ['Nose high', '15-40°'],
    ['Turning stall AOB', '20-30°'],
  ],
  spin: [
    ['Entry speed', '150 KIAS'],
    ['Max spin alt', "22,000' PA", NATOPS_SPINS],
    ['Recovered above', "10,000' PA", NATOPS_SPINS],
    ['Min entry alt', "13,500' AGL"],
    ['Nose above the horizon', '30°'],
    ['Steady-state speed', '120-135 KIAS'],
    ['Oil pressure minimum', '90 psi'],
  ],
  elpStall: [
    ['Complete above', "6,000' AGL"],
    ['Torque', '4-6%'],
    ['Best glide speed', '125 KIAS'],
    ['Sink rate', '1,350-1,500 fpm'],
    ['After the gear, glide speed', '120 KIAS'],
    ['Turn to low key AOB', '15-20°'],
    // A reminder, shown as it is and not asked: §519 f, "Complete the Before Landing Checklist".
    ['Before Landing Checklist', null],
    ['Nose high', '5-10°'],
    ['Recover, nose low', '~8°'],
  ],
  landingPatternStall: [
    // A reminder, shown as it is and not asked, before the downwind configuration.
    ['Before Landing Checklist', null],
    ['Downwind speed', '120 KIAS'],
    ['Transition torque', '20%'],
    ['Approach turn speed, NF/TO/LDG', '120/115/110 KIAS'],
    ['Nose high', '5-10°'],
    ['AOB', '20-45°'],
    ['Landing attitude stall, above final approach speed', '5-10 KIAS'],
  ],
  // No longer flown: the climb-out (a second takeoff table), the outlying field departure and
  // the unusual attitudes (their questions are the procedure). An outlying field entry's
  // figures are the field's.
  climbOut: [
    ['Nose attitude, nose high', '7-10°'],
    ['Climbing attitude approaching', '180 KIAS'],
  ],
  olfEntry: [],
  olfDeparture: [
    ['Airspeed minimum', '120 KIAS'],
    ['Gear and flaps up below', '150 KIAS'],
  ],
  cuas: [
    ['Nose high: roll past', '90°'],
    ['Nose high, slow: torque below', '60%'],
    ['Nose low: do not exceed', '316 KIAS'],
    ['Advance the PCL below', '110 KIAS'],
  ],
};

// What is said aloud through each procedure, after its numbers, as the user wrote it
// (2026-10-25), a line at a time. A line in brackets or parentheses is a reminder or a cue,
// shown and not said. The spin's are made in the engine (its altitude, airspeed and way round
// change each spin); the takeoff's and the pattern PEL's are their own calls.
export const FTI_CALLOUTS = {
  theBreak: [
    "Flop, chop, don't let the nose drop.",
    '(Roll first, pull power second)',
  ],
  touchAndGo: [
    'Above 110, flaps. 120, power coming back to 60.',
  ],
  gWarm: [
    '(While rolling)',
    "G's coming on, now, now, now.",
    '(Pull)',
    'And roll out.',
  ],
  powerOnStall: [
    "Nose coming up, there's stick shaker, and there's the full stall.",
    'Relax, max, level, ball.',
    'AOA, ball. AOA, ball. AOA, ball. AOA, ball.',
    'Two positive rates, maneuver complete.',
  ],
  elpStall: [
    'Stabilized at 125 KIAS, VSI between 1,350 and 1,500.',
    'Simulating approaching high key.',
    'Below 150, gear.',
    'Starting that turn.',
    'Restabilized at 120 KIAS.',
    '[Before Landing Checklist]',
    'And nose coming up.',
    "Stick shaker, nose low 8°, there's 120, maneuver complete.",
  ],
  landingPatternStall: [
    '[Before Landing Checklist]',
    "Simulated transition, there's the 180, power coming back, rolling to 30° AOB.",
    'Nose coming up, power coming to idle.',
    "There's stick shaker.",
    'Relax, max, level, ball.',
    'AOA, ball. AOA, ball. AOA, ball.',
    'Two positive rates, maneuver complete.',
  ],
};
