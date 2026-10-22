// The course rules map's features: what each placemark in public/kml/course-rules.kml is
// called, the folder it sits in, and where the Flight Path Builder can go next from it.
//
// Keyed by the page's feature ids, `${category}-${subType}-${n}`, numbered in the KML's
// placemark order (TW4CourseRules.js, KmlLayer): reorder the KML and every id moves. The
// server's course rules document (lambda/discussApi/courseRules.mjs) is keyed by these same ids.
//
// The words about each feature (course rules, quiz blanks, radio calls, example comms, airfield
// cards) are not here. They are the community's, edited on the page and stored on the server;
// until 2026-10-21 they were typed into this file and CourseRulesExamples.js, and
// tools/courserules-seed.js read them from there once.
//
// `endNote` is the site's own line for a stop with nowhere further to go on this map.

export const crFeatures = {
  "Point-default-0": {
    name: "KTFP",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport",
    subCategory: "Traffic Patterns",
    category: "Point",
    dependentNode: ["Airspace-default-1"],
    nextNode: ["Routes-Traffic Patterns-2","Routes-Traffic Patterns-3","Routes-Departures-17","Routes-Departures-18","Routes-Departures-19","Routes-Departures-20"]
  },
  "Airspace-default-1": {
    name: "2 NM Radius",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport",
    subCategory: "Airspace",
    category: "Airspace",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Traffic Patterns-2": {
    name: "13",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-0"]
  },
  "Routes-Traffic Patterns-3": {
    name: "31",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-0"]
  },
  "Point-Arrivals-4": {
    name: "9 Mile Point",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > North Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-5": {
    name: "13",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > North Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-default-21"],
    nextNode: ["Point-default-0"]
  },
  "Routes-Arrivals-6": {
    name: "31",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > North Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-default-21"],
    nextNode: ["Point-default-0"]
  },
  "Point-Arrivals-7": {
    name: "Port Royal",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > East / South Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-8": {
    name: "13",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > East / South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-7"],
    nextNode: ["Point-default-0"]
  },
  "Routes-Arrivals-9": {
    name: "31",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > East / South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-7"],
    nextNode: ["Point-default-0"]
  },
  "Point-Arrivals-10": {
    name: "PT Rusty",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > West Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: ["Routes-Arrivals-11","Routes-Arrivals-12"]
  },
  "Routes-Arrivals-11": {
    name: "13",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > West Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-10"],
    nextNode: ["Point-default-0"]
  },
  "Routes-Arrivals-12": {
    name: "31",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > West Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-10"],
    nextNode: ["Point-default-0"]
  },
  "Routes-Arrivals-13": {
    name: "13",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > Arrivals from KNGP",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-0"]
  },
  "Routes-Arrivals-14": {
    name: "31",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > Arrivals from KNGP",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-0"]
  },
  "Routes-Arrivals-15": {
    name: "13",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > Arrivals from Goliad",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-217"],
    nextNode: ["Point-default-0"]
  },
  "Routes-Arrivals-16": {
    name: "31",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > Arrivals from Goliad",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-217"],
    nextNode: ["Point-default-0"]
  },
  "Routes-Departures-17": {
    name: "13",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > Single Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Arrivals-113","Point-Arrivals-218"],
    nextNode: ["Point-Arrivals-113"]
  },
  "Routes-Departures-18": {
    name: "31",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > Single Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Arrivals-113","Point-Arrivals-218"],
    nextNode: ["Point-Arrivals-113"]
  },
  "Routes-Departures-19": {
    name: "13",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > Formation Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Arrivals-218"],
    nextNode: ["Point-Arrivals-113"]
  },
  "Routes-Departures-20": {
    name: "31",
    parentFolder: "(KTFP) Ingleside Regional Airport",
    folderPath: "(KTFP) Ingleside Regional Airport > Formation Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Arrivals-218"],
    nextNode: ["Point-Arrivals-113"]
  },
  "Point-default-21": {
    name: "KRKP",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport",
    subCategory: "Traffic Patterns",
    category: "Point",
    dependentNode: ["Airspace-default-22"],
    nextNode: ["Routes-Traffic Patterns-23","Routes-Traffic Patterns-24","Routes-Departures-32","Routes-Departures-33","Routes-Departures-34","Routes-Departures-35"]
  },
  "Airspace-default-22": {
    name: "2 NM Radius",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport",
    subCategory: "Airspace",
    category: "Airspace",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Traffic Patterns-23": {
    name: "14/32",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-21"]
  },
  "Routes-Traffic Patterns-24": {
    name: "18/36",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-21"]
  },
  "Routes-Arrivals-25": {
    name: "14",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-21"]
  },
  "Routes-Arrivals-26": {
    name: "18",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-21"]
  },
  "Routes-Arrivals-27": {
    name: "32",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-21"]
  },
  "Routes-Arrivals-28": {
    name: "36",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-21"]
  },
  "Point-Departures-29": {
    name: "LBJ Causeway",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Departures-30": {
    name: "9 Mile Point",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Departures-31": {
    name: "Redfish Point",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Departures-32": {
    name: "14",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-29","Point-Departures-30","Point-Departures-31"],
    nextNode: ["Routes-Arrivals-104","Working Areas-Foxtrot-189","Working Areas-Foxtrot-190","Working Areas-Mustang-191","Working Areas-Mustang-192","Working Areas-Mustang-193","Working Areas-Mustang-194"]
  },
  "Routes-Departures-33": {
    name: "18",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-29","Point-Departures-30"],
    nextNode: ["Routes-Arrivals-104","Working Areas-Foxtrot-189","Working Areas-Foxtrot-190","Working Areas-Mustang-191","Working Areas-Mustang-192","Working Areas-Mustang-193","Working Areas-Mustang-194"]
  },
  "Routes-Departures-34": {
    name: "32",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-29","Point-Departures-30","Point-Departures-31"],
    nextNode: ["Routes-Arrivals-104","Working Areas-Foxtrot-189","Working Areas-Foxtrot-190","Working Areas-Mustang-191","Working Areas-Mustang-192","Working Areas-Mustang-193","Working Areas-Mustang-194"]
  },
  "Routes-Departures-35": {
    name: "36",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-29","Point-Departures-30"],
    nextNode: ["Routes-Arrivals-104","Working Areas-Foxtrot-189","Working Areas-Foxtrot-190","Working Areas-Mustang-191","Working Areas-Mustang-192","Working Areas-Mustang-193","Working Areas-Mustang-194"]
  },
  "Point-Mustang-36": {
    name: "KRAS",
    parentFolder: "(KRAS) Mustang Beach Airport",
    folderPath: "(KRAS) Mustang Beach Airport",
    subCategory: "Mustang",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Airspace-default-37": {
    name: "KRAS Stand Off",
    parentFolder: "(KRAS) Mustang Beach Airport",
    folderPath: "(KRAS) Mustang Beach Airport",
    subCategory: "Airspace",
    category: "Airspace",
    dependentNode: [],
    nextNode: []
  },
  "Point-default-38": {
    name: "KNGT",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF",
    subCategory: "Point",
    category: "Point",
    dependentNode: ["Airspace-default-41"],
    nextNode: ["Routes-Traffic Patterns-39","Routes-Traffic Patterns-40","Routes-Departures-46","Routes-Departures-47","Routes-Departures-48","Routes-Departures-49"]
  },
  "Routes-Traffic Patterns-39": {
    name: "11/29",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-38"]
  },
  "Routes-Traffic Patterns-40": {
    name: "17/35",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-38"]
  },
  "Airspace-default-41": {
    name: "4 NM Radius",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF > Arrivals",
    subCategory: "Airspace",
    category: "Airspace",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-42": {
    name: "11",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF > Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-default-212"],
    nextNode: ["Point-default-38"]
  },
  "Routes-Arrivals-43": {
    name: "17",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF > Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-default-212"],
    nextNode: ["Point-default-38"]
  },
  "Routes-Arrivals-44": {
    name: "29",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF > Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-default-212"],
    nextNode: ["Point-default-38"]
  },
  "Routes-Arrivals-45": {
    name: "35",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF > Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-default-212"],
    nextNode: ["Point-default-38"]
  },
  "Routes-Departures-46": {
    name: "11",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF > Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Arrivals-217","Point-default-212"],
    nextNode: ["Routes-Arrivals-112","Routes-Arrivals-15","Routes-Arrivals-16","Working Areas-King-203","Working Areas-King-204","Working Areas-King-205","Working Areas-King-206","Working Areas-King-207","Working Areas-King-208","Working Areas-King-209","Working Areas-King-210","Working Areas-King-211","Routes-Transitions-214"]
  },
  "Routes-Departures-47": {
    name: "17",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF > Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Arrivals-217","Point-default-212"],
    nextNode: ["Routes-Arrivals-112","Routes-Arrivals-15","Routes-Arrivals-16","Working Areas-King-203","Working Areas-King-204","Working Areas-King-205","Working Areas-King-206","Working Areas-King-207","Working Areas-King-208","Working Areas-King-209","Working Areas-King-210","Working Areas-King-211","Routes-Transitions-214"]
  },
  "Routes-Departures-48": {
    name: "29",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF > Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Arrivals-217","Point-default-212"],
    nextNode: ["Routes-Arrivals-112","Routes-Arrivals-15","Routes-Arrivals-16","Working Areas-King-203","Working Areas-King-204","Working Areas-King-205","Working Areas-King-206","Working Areas-King-207","Working Areas-King-208","Working Areas-King-209","Working Areas-King-210","Working Areas-King-211","Routes-Transitions-214"]
  },
  "Routes-Departures-49": {
    name: "35",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF > Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Arrivals-217","Point-default-212"],
    nextNode: ["Routes-Arrivals-112","Routes-Arrivals-15","Routes-Arrivals-16","Working Areas-King-203","Working Areas-King-204","Working Areas-King-205","Working Areas-King-206","Working Areas-King-207","Working Areas-King-208","Working Areas-King-209","Working Areas-King-210","Working Areas-King-211","Routes-Transitions-214"]
  },
  "Point-default-50": {
    name: "KNWL",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF",
    subCategory: "Point",
    category: "Point",
    dependentNode: ["Airspace-default-51"],
    nextNode: ["Routes-Traffic Patterns-52","Routes-Traffic Patterns-53","Routes-Departures-56","Routes-Departures-57","Routes-Departures-58","Routes-Departures-59","Routes-Departures-74","Routes-Departures-75","Routes-Departures-76","Routes-Departures-77","Routes-Departures-91","Routes-Departures-92","Routes-Departures-93","Routes-Departures-94"]
  },
  "Airspace-default-51": {
    name: "Class D Airspace",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF",
    subCategory: "Airspace",
    category: "Airspace",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Traffic Patterns-52": {
    name: "13/31",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-50"]
  },
  "Routes-Traffic Patterns-53": {
    name: "18/36",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-50"]
  },
  "Point-Departures-54": {
    name: "PT Chapman",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Sunrise Transition / North Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Departures-55": {
    name: "PT Sunrise",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Sunrise Transition / North Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: ["Point-Arrivals-135"],
    nextNode: ["Routes-Arrivals-136","Routes-Arrivals-137","Routes-Arrivals-138","Routes-Arrivals-139","Routes-Arrivals-140","Routes-Arrivals-141","Routes-Arrivals-142","Routes-Arrivals-143"]
  },
  "Routes-Departures-56": {
    name: "13",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Sunrise Transition / North Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-54","Point-Departures-55"],
    nextNode: ["Point-Departures-55"]
  },
  "Routes-Departures-57": {
    name: "18",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Sunrise Transition / North Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-54","Point-Departures-55"],
    nextNode: ["Point-Departures-55"]
  },
  "Routes-Departures-58": {
    name: "31",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Sunrise Transition / North Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-54","Point-Departures-55"],
    nextNode: ["Point-Departures-55"]
  },
  "Routes-Departures-59": {
    name: "36",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Sunrise Transition / North Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-54","Point-Departures-55"],
    nextNode: ["Point-Departures-55"]
  },
  "Point-Arrivals-60": {
    name: "Oso Bridge (West Side)",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: ["Routes-Arrivals-67","Routes-Arrivals-68","Routes-Arrivals-69","Routes-Arrivals-70"]
  },
  "Point-Arrivals-61": {
    name: "PT Lima",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-62": {
    name: "Water Tower",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-63": {
    name: "Yorktown Bridge",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-64": {
    name: "Cooling Pond",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-65": {
    name: "PITA Island",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-66": {
    name: "Power Plant",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-67": {
    name: "13",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-50"]
  },
  "Routes-Arrivals-68": {
    name: "18",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-default-50"]
  },
  "Routes-Arrivals-69": {
    name: "31",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-63","Point-Arrivals-64","Point-Arrivals-65","Point-Arrivals-66"],
    nextNode: ["Point-default-50"]
  },
  "Routes-Arrivals-70": {
    name: "36",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-63","Point-Arrivals-64","Point-Arrivals-66"],
    nextNode: ["Point-default-50"]
  },
  "Point-Departures-71": {
    name: "Oso Bridge (West Side)",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: ["Point-Arrivals-126"],
    nextNode: ["Routes-Arrivals-127","Routes-Arrivals-128","Routes-Arrivals-129","Routes-Arrivals-130","Routes-Arrivals-131","Routes-Arrivals-132","Routes-Arrivals-133","Routes-Arrivals-134"]
  },
  "Point-Departures-72": {
    name: "Yorktown Bridge",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Departures-73": {
    name: "Water Tower",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Departures-74": {
    name: "18",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-71"],
    nextNode: ["Point-Departures-71"]
  },
  "Routes-Departures-75": {
    name: "13",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-71"],
    nextNode: ["Point-Departures-71"]
  },
  "Routes-Departures-76": {
    name: "31",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-71"],
    nextNode: ["Point-Departures-71"]
  },
  "Routes-Departures-77": {
    name: "36",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > Oso Transition / North Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-71"],
    nextNode: ["Point-Departures-71"]
  },
  "Point-Arrivals-78": {
    name: "Camel Humps",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: ["Routes-Arrivals-86","Routes-Arrivals-87","Routes-Arrivals-88","Routes-Arrivals-89"]
  },
  "Point-Arrivals-79": {
    name: "Power Plant",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-80": {
    name: "PITA Island",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-81": {
    name: "Shrimp Pond",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-82": {
    name: "Cooling Pond",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-83": {
    name: "Yorktown Bridge",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-84": {
    name: "Water Tower",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-85": {
    name: "PT Lima",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-86": {
    name: "13",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-78","Point-Arrivals-81","Point-Arrivals-82","Point-Arrivals-83","Point-Arrivals-84"],
    nextNode: ["Point-default-50"]
  },
  "Routes-Arrivals-87": {
    name: "18",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-78","Point-Arrivals-81","Point-Arrivals-82","Point-Arrivals-83","Point-Arrivals-84"],
    nextNode: ["Point-default-50"]
  },
  "Routes-Arrivals-88": {
    name: "31",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-78","Point-Arrivals-79","Point-Arrivals-80","Point-Arrivals-81"],
    nextNode: ["Point-default-50"]
  },
  "Routes-Arrivals-89": {
    name: "36",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-78","Point-Arrivals-79","Point-Arrivals-81"],
    nextNode: ["Point-default-50"]
  },
  "Point-Departures-90": {
    name: "Sandbar",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > East Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Departures-91": {
    name: "13",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > East Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-90","Point-Arrivals-79"],
    nextNode: ["Routes-Arrivals-108"]
  },
  "Routes-Departures-92": {
    name: "18",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > East Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-90","Point-Arrivals-79"],
    nextNode: ["Routes-Arrivals-108"]
  },
  "Routes-Departures-93": {
    name: "31",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > East Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-90","Point-Arrivals-79"],
    nextNode: ["Routes-Arrivals-108"]
  },
  "Routes-Departures-94": {
    name: "36",
    parentFolder: "(KNWL) Waldron NOLF",
    folderPath: "(KNWL) Waldron NOLF > East Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-90","Point-Arrivals-79"],
    nextNode: ["Routes-Arrivals-108"]
  },
  "Point-default-95": {
    name: "KNGP",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS",
    subCategory: "Point",
    category: "Point",
    dependentNode: ["Airspace-default-96","Airspace-default-97","Point-default-216"],
    nextNode: ["Routes-Traffic Patterns-98","Routes-Traffic Patterns-99","Routes-Traffic Patterns-100","Routes-Traffic Patterns-101","Routes-Arrivals-134","Routes-Arrivals-133","Routes-Arrivals-132","Routes-Arrivals-131","Routes-Arrivals-130","Routes-Arrivals-129","Routes-Arrivals-128","Routes-Arrivals-127","Routes-Departures-145","Routes-Departures-146","Routes-Departures-147","Routes-Departures-148","Routes-Departures-149","Routes-Departures-150","Routes-Departures-151","Routes-Departures-152","Routes-Departures-161","Routes-Departures-162","Routes-Departures-163","Routes-Departures-164","Routes-Departures-165","Routes-Departures-166","Routes-Departures-167","Routes-Departures-168","Routes-Departures-179","Routes-Departures-180","Routes-Departures-181","Routes-Departures-182","Routes-Departures-183","Routes-Departures-184","Routes-Departures-185","Routes-Departures-186","Routes-Arrivals-170","Routes-Arrivals-171","Routes-Arrivals-172","Routes-Arrivals-173","Routes-Arrivals-174","Routes-Arrivals-175","Routes-Arrivals-176","Routes-Arrivals-177"]
  },
  "Airspace-default-96": {
    name: "Class D Airspace",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS",
    subCategory: "Airspace",
    category: "Airspace",
    dependentNode: [],
    nextNode: []
  },
  "Airspace-default-97": {
    name: "Controlled Ejection Area",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS",
    subCategory: "Airspace",
    category: "Airspace",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Traffic Patterns-98": {
    name: "04/22",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: ["Point-default-95"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Traffic Patterns-99": {
    name: "18/36",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: ["Point-default-95"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Traffic Patterns-100": {
    name: "13L/31R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: ["Point-default-95"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Traffic Patterns-101": {
    name: "13R/31L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS",
    subCategory: "Traffic Patterns",
    category: "Routes",
    dependentNode: ["Point-default-95"],
    nextNode: ["Point-default-95"]
  },
  "Point-Arrivals-102": {
    name: "Aransas Pass Causeway",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-103": {
    name: "9 Mile Point",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-104": {
    name: "North Arrivals",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-102","Point-Arrivals-103","Point-Arrivals-113"],
    nextNode: ["Point-Arrivals-113"]
  },
  "Point-Arrivals-105": {
    name: "Twin Condos",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-106": {
    name: "East Arrivals",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-105","Point-Arrivals-107","Point-Arrivals-113"],
    nextNode: ["Point-Arrivals-113"]
  },
  "Point-Arrivals-107": {
    name: "Port Royal",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-108": {
    name: "South Arrivals",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-107","Point-Arrivals-113"],
    nextNode: ["Point-Arrivals-113"]
  },
  "Point-Arrivals-109": {
    name: "PT Rusty",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-110": {
    name: "West Arrivals",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-109","Point-Arrivals-113"],
    nextNode: ["Point-Arrivals-113"]
  },
  "Point-Arrivals-111": {
    name: "Port Bay Bridge",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-112": {
    name: "Goliad Arrivals",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-111","Point-Arrivals-113","Point-Arrivals-217","Point-Arrivals-218"],
    nextNode: ["Point-Arrivals-113"]
  },
  "Point-Arrivals-113": {
    name: "PT Shamrock",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: ["Routes-Arrivals-115","Routes-Arrivals-116","Routes-Arrivals-117","Routes-Arrivals-118","Routes-Arrivals-122","Routes-Arrivals-123","Routes-Arrivals-124","Routes-Arrivals-125"]
  },
  "Point-Arrivals-114": {
    name: "TAMUCC NW Corner",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-115": {
    name: "18",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-113","Point-Arrivals-114"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-116": {
    name: "22",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-113","Point-Arrivals-114"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-117": {
    name: "13L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-113","Point-Arrivals-114"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-118": {
    name: "13R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-113","Point-Arrivals-114"],
    nextNode: ["Point-default-95"]
  },
  "Point-Arrivals-119": {
    name: "High Bridge",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-120": {
    name: "Low Bridge",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-121": {
    name: "PT DIMMIT",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-122": {
    name: "04",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-113","Point-Arrivals-119","Point-Arrivals-121","Point-Arrivals-120"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-123": {
    name: "36",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-113","Point-Arrivals-119","Point-Arrivals-121","Point-Arrivals-120"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-124": {
    name: "31R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-113","Point-Arrivals-119","Point-Arrivals-121"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-125": {
    name: "31L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals > PT Shamrock",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-113","Point-Arrivals-119","Point-Arrivals-121"],
    nextNode: ["Point-default-95"]
  },
  "Point-Arrivals-126": {
    name: "Oso Bridge (West Side)",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Oso Transition / South Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: ["Point-Arrivals-60"],
    nextNode: ["Routes-Arrivals-67","Routes-Arrivals-68","Routes-Arrivals-69","Routes-Arrivals-70"]
  },
  "Routes-Arrivals-127": {
    name: "04",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Oso Transition / South Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-126","Point-default-95"],
    nextNode: ["Point-Arrivals-126","Point-default-95"]
  },
  "Routes-Arrivals-128": {
    name: "13L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Oso Transition / South Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-126","Point-default-95"],
    nextNode: ["Point-Arrivals-126","Point-default-95"]
  },
  "Routes-Arrivals-129": {
    name: "13R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Oso Transition / South Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-126","Point-default-95"],
    nextNode: ["Point-Arrivals-126","Point-default-95"]
  },
  "Routes-Arrivals-130": {
    name: "18",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Oso Transition / South Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-126","Point-default-95"],
    nextNode: ["Point-Arrivals-126","Point-default-95"]
  },
  "Routes-Arrivals-131": {
    name: "22",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Oso Transition / South Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-126","Point-default-95"],
    nextNode: ["Point-Arrivals-126","Point-default-95"]
  },
  "Routes-Arrivals-132": {
    name: "31L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Oso Transition / South Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-126","Point-default-95"],
    nextNode: ["Point-Arrivals-126","Point-default-95"]
  },
  "Routes-Arrivals-133": {
    name: "31R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Oso Transition / South Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-126","Point-default-95"],
    nextNode: ["Point-Arrivals-126","Point-default-95"]
  },
  "Routes-Arrivals-134": {
    name: "36",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Oso Transition / South Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-126","Point-default-95"],
    nextNode: ["Point-Arrivals-126","Point-default-95"]
  },
  "Point-Arrivals-135": {
    name: "PT Sunrise",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Sunrise Transition / South Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: ["Routes-Arrivals-136","Routes-Arrivals-137","Routes-Arrivals-138","Routes-Arrivals-139","Routes-Arrivals-140","Routes-Arrivals-141","Routes-Arrivals-142","Routes-Arrivals-143"]
  },
  "Routes-Arrivals-136": {
    name: "04",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Sunrise Transition / South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-135"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-137": {
    name: "13L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Sunrise Transition / South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-135"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-138": {
    name: "13R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Sunrise Transition / South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-135"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-139": {
    name: "18",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Sunrise Transition / South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-135"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-140": {
    name: "22",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Sunrise Transition / South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-135"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-141": {
    name: "31L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Sunrise Transition / South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-135"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-142": {
    name: "31R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Sunrise Transition / South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-135"],
    nextNode: ["Point-default-95"]
  },
  "Routes-Arrivals-143": {
    name: "36",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Sunrise Transition / South Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-135"],
    nextNode: ["Point-default-95"]
  },
  "Point-Departures-144": {
    name: "High Bridge",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Departures-145": {
    name: "04",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Routes-Transitions-153","Routes-Transitions-154","Routes-Departures-156","Routes-Departures-158","Working Areas-Mustang Maintenance-196","Routes-Transitions-220"]
  },
  "Routes-Departures-146": {
    name: "13L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-144"],
    nextNode: ["Routes-Transitions-153","Routes-Transitions-154","Routes-Departures-156","Routes-Departures-158","Working Areas-Mustang Maintenance-196","Routes-Transitions-220"]
  },
  "Routes-Departures-147": {
    name: "13R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-144"],
    nextNode: ["Routes-Transitions-153","Routes-Transitions-154","Routes-Departures-156","Routes-Departures-158","Working Areas-Mustang Maintenance-196","Routes-Transitions-220"]
  },
  "Routes-Departures-148": {
    name: "18",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-144"],
    nextNode: ["Routes-Transitions-153","Routes-Transitions-154","Routes-Departures-156","Routes-Departures-158","Working Areas-Mustang Maintenance-196","Routes-Transitions-220"]
  },
  "Routes-Departures-149": {
    name: "22",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-144"],
    nextNode: ["Routes-Transitions-153","Routes-Transitions-154","Routes-Departures-156","Routes-Departures-158","Working Areas-Mustang Maintenance-196","Routes-Transitions-220"]
  },
  "Routes-Departures-150": {
    name: "31L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Routes-Transitions-153","Routes-Transitions-154","Routes-Departures-156","Routes-Departures-158","Working Areas-Mustang Maintenance-196","Routes-Transitions-220"]
  },
  "Routes-Departures-151": {
    name: "31R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Routes-Transitions-153","Routes-Transitions-154","Routes-Departures-156","Routes-Departures-158","Working Areas-Mustang Maintenance-196","Routes-Transitions-220"]
  },
  "Routes-Departures-152": {
    name: "36",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Routes-Transitions-153","Routes-Transitions-154","Routes-Departures-156","Routes-Departures-158","Working Areas-Mustang Maintenance-196","Routes-Transitions-220"]
  },
  "Routes-Transitions-153": {
    name: "Foxtrot/North Mustang Transition",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Transition",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Working Areas-Foxtrot-189","Working Areas-Foxtrot-190","Working Areas-Mustang-191","Working Areas-Mustang-192","Working Areas-Mustang-193","Working Areas-Mustang-194"]
  },
  "Routes-Transitions-154": {
    name: "South Mustang Transition",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Transition",
    category: "Routes",
    dependentNode: ["Point-Mustang-221"],
    nextNode: ["Working Areas-Mustang-197","Working Areas-Mustang-198","Working Areas-Mustang-199","Working Areas-Mustang-200"]
  },
  "Point-Departures-155": {
    name: "Camel Humps",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: ["Point-Arrivals-78"]
  },
  "Routes-Departures-156": {
    name: "Waldron Arrival",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-155"],
    nextNode: ["Point-Arrivals-78"]
  },
  "Point-Departures-157": {
    name: "PT Shamrock",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Departures-158": {
    name: "Shamrock Re-entry",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-157"],
    nextNode: ["Routes-Arrivals-108"]
  },
  "Point-Departures-159": {
    name: "High Bridge",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Rusty Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Departures-160": {
    name: "PT Rusty",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Rusty Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: ["Routes-Arrivals-11","Routes-Arrivals-12","Routes-Arrivals-110","Routes-Transitions-201","Routes-Arrivals-13","Routes-Arrivals-14","Routes-Arrivals-213"]
  },
  "Routes-Departures-161": {
    name: "04",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Rusty Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-Departures-160"]
  },
  "Routes-Departures-162": {
    name: "13L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Rusty Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-159"],
    nextNode: ["Point-Departures-160"]
  },
  "Routes-Departures-163": {
    name: "13R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Rusty Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-159"],
    nextNode: ["Point-Departures-160"]
  },
  "Routes-Departures-164": {
    name: "18",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Rusty Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-159"],
    nextNode: ["Point-Departures-160"]
  },
  "Routes-Departures-165": {
    name: "22",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Rusty Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-159"],
    nextNode: ["Point-Departures-160"]
  },
  "Routes-Departures-166": {
    name: "31L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Rusty Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-Departures-160"]
  },
  "Routes-Departures-167": {
    name: "31R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Rusty Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-Departures-160"]
  },
  "Routes-Departures-168": {
    name: "36",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Rusty Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: [],
    nextNode: ["Point-Departures-160"]
  },
  "Point-Arrivals-169": {
    name: "PT Sunrise",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Nueces Transition / East Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: [],
    endNote: "The Nueces Transition continues west to Corpus Christi International, which isn't on this map."
  },
  "Routes-Arrivals-170": {
    name: "04",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Nueces Transition / East Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-169"],
    nextNode: ["Point-Arrivals-169"]
  },
  "Routes-Arrivals-171": {
    name: "13L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Nueces Transition / East Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-169"],
    nextNode: ["Point-Arrivals-169"]
  },
  "Routes-Arrivals-172": {
    name: "13R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Nueces Transition / East Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-169"],
    nextNode: ["Point-Arrivals-169"]
  },
  "Routes-Arrivals-173": {
    name: "18",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Nueces Transition / East Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-169"],
    nextNode: ["Point-Arrivals-169"]
  },
  "Routes-Arrivals-174": {
    name: "22",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Nueces Transition / East Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-169"],
    nextNode: ["Point-Arrivals-169"]
  },
  "Routes-Arrivals-175": {
    name: "31L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Nueces Transition / East Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-169"],
    nextNode: ["Point-Arrivals-169"]
  },
  "Routes-Arrivals-176": {
    name: "31R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Nueces Transition / East Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-169"],
    nextNode: ["Point-Arrivals-169"]
  },
  "Routes-Arrivals-177": {
    name: "36",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Nueces Transition / East Arrivals & Departures",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-169"],
    nextNode: ["Point-Arrivals-169"]
  },
  "Point-Departures-178": {
    name: "PT Silver",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Portland Departures",
    subCategory: "Departures",
    category: "Point",
    dependentNode: [],
    nextNode: [],
    endNote: "Portland Low ends here; the flight continues with the VFR intentions given to Corpus Departure."
  },
  "Routes-Departures-179": {
    name: "04",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Portland Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-178"],
    nextNode: ["Point-Departures-178"]
  },
  "Routes-Departures-180": {
    name: "13L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Portland Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-178"],
    nextNode: ["Point-Departures-178"]
  },
  "Routes-Departures-181": {
    name: "13R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Portland Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-178"],
    nextNode: ["Point-Departures-178"]
  },
  "Routes-Departures-182": {
    name: "18",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Portland Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-178"],
    nextNode: ["Point-Departures-178"]
  },
  "Routes-Departures-183": {
    name: "22",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Portland Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-178"],
    nextNode: ["Point-Departures-178"]
  },
  "Routes-Departures-184": {
    name: "31L",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Portland Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-178"],
    nextNode: ["Point-Departures-178"]
  },
  "Routes-Departures-185": {
    name: "31R",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Portland Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-178"],
    nextNode: ["Point-Departures-178"]
  },
  "Routes-Departures-186": {
    name: "36",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Portland Departures",
    subCategory: "Departures",
    category: "Routes",
    dependentNode: ["Point-Departures-178"],
    nextNode: ["Point-Departures-178"]
  },
  "Point-Arrivals-187": {
    name: "USS Lexington",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Lexington Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-188": {
    name: "South Flow - Straight In",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Lexington Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-187"],
    nextNode: ["Point-default-95"]
  },
  "Working Areas-Foxtrot-189": {
    name: "Foxtrot 1",
    parentFolder: "Foxtrot Working Areas",
    folderPath: "Foxtrot Working Areas",
    subCategory: "Foxtrot",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Arrivals-104","Routes-Arrivals-5","Routes-Arrivals-6","Routes-Arrivals-25","Routes-Arrivals-26","Routes-Arrivals-27","Routes-Arrivals-28","Routes-Transitions-224"]
  },
  "Working Areas-Foxtrot-190": {
    name: "Foxtrot 2",
    parentFolder: "Foxtrot Working Areas",
    folderPath: "Foxtrot Working Areas",
    subCategory: "Foxtrot",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Arrivals-104","Routes-Arrivals-5","Routes-Arrivals-6","Routes-Arrivals-25","Routes-Arrivals-26","Routes-Arrivals-27","Routes-Arrivals-28","Routes-Transitions-224"]
  },
  "Working Areas-Mustang-191": {
    name: "Mustang North 1",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang",
    category: "Working Areas",
    dependentNode: ["Airspace-default-37","Point-Mustang-36"],
    nextNode: ["Routes-Arrivals-104","Routes-Arrivals-5","Routes-Arrivals-6","Routes-Arrivals-25","Routes-Arrivals-26","Routes-Arrivals-27","Routes-Arrivals-28","Routes-Transitions-224"]
  },
  "Working Areas-Mustang-192": {
    name: "Mustang North 5",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Arrivals-104","Routes-Arrivals-5","Routes-Arrivals-6","Routes-Arrivals-25","Routes-Arrivals-26","Routes-Arrivals-27","Routes-Arrivals-28","Routes-Transitions-224"]
  },
  "Working Areas-Mustang-193": {
    name: "Mustang North 2",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang",
    category: "Working Areas",
    dependentNode: ["Airspace-default-37","Point-Mustang-36"],
    nextNode: ["Routes-Arrivals-104","Routes-Arrivals-5","Routes-Arrivals-6","Routes-Arrivals-25","Routes-Arrivals-26","Routes-Arrivals-27","Routes-Arrivals-28","Routes-Transitions-224"]
  },
  "Working Areas-Mustang-194": {
    name: "Mustang North 6",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Arrivals-104","Routes-Arrivals-5","Routes-Arrivals-6","Routes-Arrivals-25","Routes-Arrivals-26","Routes-Arrivals-27","Routes-Arrivals-28","Routes-Transitions-224"]
  },
  "Working Areas-Mustang Maintenance-195": {
    name: "Mustang Central",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang Maintenance",
    category: "Working Areas",
    dependentNode: ["Point-Mustang-222"],
    nextNode: ["Routes-Arrivals-219"]
  },
  "Working Areas-Mustang Maintenance-196": {
    name: "Mustang Maintenance Area",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang Maintenance",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Point-Arrivals-113"]
  },
  "Working Areas-Mustang-197": {
    name: "Mustang South 3",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang",
    category: "Working Areas",
    dependentNode: ["Point-Mustang-36","Airspace-default-37","Point-Mustang-221"],
    nextNode: ["Routes-Arrivals-108","Routes-Arrivals-188","Point-Arrivals-78","Routes-Arrivals-8","Routes-Arrivals-9","Routes-Transitions-223"]
  },
  "Working Areas-Mustang-198": {
    name: "Mustang South 7",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang",
    category: "Working Areas",
    dependentNode: ["Point-Mustang-221"],
    nextNode: ["Routes-Arrivals-108","Routes-Arrivals-188","Point-Arrivals-78","Routes-Arrivals-8","Routes-Arrivals-9","Routes-Transitions-223"]
  },
  "Working Areas-Mustang-199": {
    name: "Mustang South 4",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang",
    category: "Working Areas",
    dependentNode: ["Point-Mustang-36","Airspace-default-37","Point-Mustang-221"],
    nextNode: ["Routes-Arrivals-108","Routes-Arrivals-188","Point-Arrivals-78","Routes-Arrivals-8","Routes-Arrivals-9","Routes-Transitions-223"]
  },
  "Working Areas-Mustang-200": {
    name: "Mustang South 8",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang",
    category: "Working Areas",
    dependentNode: ["Point-Mustang-221"],
    nextNode: ["Routes-Arrivals-108","Routes-Arrivals-188","Point-Arrivals-78","Routes-Arrivals-8","Routes-Arrivals-9","Routes-Transitions-223"]
  },
  "Routes-Transitions-201": {
    name: "Rusty Entry",
    parentFolder: "Kings 4 MOAs",
    folderPath: "Kings 4 MOAs",
    subCategory: "King",
    category: "Working Areas",
    dependentNode: ["Point-Arrivals-218"],
    nextNode: ["Working Areas-King-203","Working Areas-King-204","Working Areas-King-205","Working Areas-King-206","Working Areas-King-207","Working Areas-King-208","Working Areas-King-209","Working Areas-King-210","Working Areas-King-211"]
  },
  "Routes-Transitions-202": {
    name: "Aransas Exit",
    parentFolder: "Kings 4 MOAs",
    folderPath: "Kings 4 MOAs",
    subCategory: "King",
    category: "Working Areas",
    dependentNode: ["Working Areas-King-211","Point-Arrivals-217","Point-Arrivals-218"],
    nextNode: ["Routes-Arrivals-25","Routes-Arrivals-26","Routes-Arrivals-27","Routes-Arrivals-28"]
  },
  "Working Areas-King-203": {
    name: "Kings 4 MOA 1",
    parentFolder: "Kings 4 MOAs",
    folderPath: "Kings 4 MOAs",
    subCategory: "King",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Transitions-202","Routes-Arrivals-112","Routes-Arrivals-42","Routes-Arrivals-43","Routes-Arrivals-44","Routes-Arrivals-45"]
  },
  "Working Areas-King-204": {
    name: "Kings 4 MOA 2",
    parentFolder: "Kings 4 MOAs",
    folderPath: "Kings 4 MOAs",
    subCategory: "King",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Transitions-202","Routes-Arrivals-112","Routes-Arrivals-42","Routes-Arrivals-43","Routes-Arrivals-44","Routes-Arrivals-45"]
  },
  "Working Areas-King-205": {
    name: "Kings 4 MOA 3",
    parentFolder: "Kings 4 MOAs",
    folderPath: "Kings 4 MOAs",
    subCategory: "King",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Transitions-202","Routes-Arrivals-112","Routes-Arrivals-42","Routes-Arrivals-43","Routes-Arrivals-44","Routes-Arrivals-45"]
  },
  "Working Areas-King-206": {
    name: "Kings 4 MOA 4",
    parentFolder: "Kings 4 MOAs",
    folderPath: "Kings 4 MOAs",
    subCategory: "King",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Transitions-202","Routes-Arrivals-112","Routes-Arrivals-42","Routes-Arrivals-43","Routes-Arrivals-44","Routes-Arrivals-45"]
  },
  "Working Areas-King-207": {
    name: "Kings 4 MOA 5",
    parentFolder: "Kings 4 MOAs",
    folderPath: "Kings 4 MOAs",
    subCategory: "King",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Transitions-202","Routes-Arrivals-112","Routes-Arrivals-42","Routes-Arrivals-43","Routes-Arrivals-44","Routes-Arrivals-45"]
  },
  "Working Areas-King-208": {
    name: "Kings 4 MOA 6",
    parentFolder: "Kings 4 MOAs",
    folderPath: "Kings 4 MOAs",
    subCategory: "King",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Transitions-202","Routes-Arrivals-112","Routes-Arrivals-42","Routes-Arrivals-43","Routes-Arrivals-44","Routes-Arrivals-45"]
  },
  "Working Areas-King-209": {
    name: "Kings 4 MOA 7",
    parentFolder: "Kings 4 MOAs",
    folderPath: "Kings 4 MOAs",
    subCategory: "King",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Transitions-202","Routes-Arrivals-112","Routes-Arrivals-42","Routes-Arrivals-43","Routes-Arrivals-44","Routes-Arrivals-45"]
  },
  "Working Areas-King-210": {
    name: "Kings 4 MOA 8",
    parentFolder: "Kings 4 MOAs",
    folderPath: "Kings 4 MOAs",
    subCategory: "King",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Transitions-202","Routes-Arrivals-112","Routes-Arrivals-42","Routes-Arrivals-43","Routes-Arrivals-44","Routes-Arrivals-45"]
  },
  "Working Areas-King-211": {
    name: "Kings 4 MOA 9",
    parentFolder: "Kings 4 MOAs",
    folderPath: "Kings 4 MOAs",
    subCategory: "King",
    category: "Working Areas",
    dependentNode: [],
    nextNode: ["Routes-Transitions-202","Routes-Arrivals-112","Routes-Arrivals-42","Routes-Arrivals-43","Routes-Arrivals-44","Routes-Arrivals-45"]
  },
  "Point-default-212": {
    name: "Berclair",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF",
    subCategory: "Point",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-213": {
    name: "From PT Rusty",
    parentFolder: "(KNGT) Goliad NOLF",
    folderPath: "(KNGT) Goliad NOLF > Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Arrivals-218","Point-default-212"],
    nextNode: ["Routes-Arrivals-42","Routes-Arrivals-43","Routes-Arrivals-44","Routes-Arrivals-45"]
  },
  "Routes-Transitions-214": {
    name: "From Goliad / KINGS 4",
    parentFolder: "(KRKP) Aransas County Airport",
    folderPath: "(KRKP) Aransas County Airport > Arrivals",
    subCategory: "Transition",
    category: "Routes",
    dependentNode: ["Point-Arrivals-217","Point-Arrivals-218"],
    nextNode: ["Routes-Arrivals-25","Routes-Arrivals-26","Routes-Arrivals-27","Routes-Arrivals-28"]
  },
  "Point-default-215": {
    name: "NGP TACAN",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS",
    subCategory: "Point",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-default-216": {
    name: "CRP VORTAC",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS",
    subCategory: "Point",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-217": {
    name: "Woodsboro",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Arrivals-218": {
    name: "Bayside",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Arrivals-219": {
    name: "Descent from Central",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Shamrock Arrivals",
    subCategory: "Arrivals",
    category: "Routes",
    dependentNode: ["Point-Mustang-222","Point-default-215"],
    nextNode: ["Routes-Arrivals-106","Routes-Arrivals-8","Routes-Arrivals-9"]
  },
  "Routes-Transitions-220": {
    name: "Central MUSTANG Transition",
    parentFolder: "(KNGP) Corpus Christi NAS",
    folderPath: "(KNGP) Corpus Christi NAS > Beach Line Departures",
    subCategory: "Transition",
    category: "Routes",
    dependentNode: ["Point-default-215"],
    nextNode: ["Working Areas-Mustang Maintenance-195"]
  },
  "Point-Mustang-221": {
    name: "Padre Balli Park (Bob Hall Pier)",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Point-Mustang-222": {
    name: "Fish Pass",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Mustang",
    category: "Point",
    dependentNode: [],
    nextNode: []
  },
  "Routes-Transitions-223": {
    name: "South to North Transition",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Transition",
    category: "Routes",
    dependentNode: ["Point-Arrivals-119"],
    nextNode: ["Routes-Arrivals-25","Routes-Arrivals-26","Routes-Arrivals-27","Routes-Arrivals-28"]
  },
  "Routes-Transitions-224": {
    name: "North to South Transition",
    parentFolder: "Mustang Working Areas",
    folderPath: "Mustang Working Areas",
    subCategory: "Transition",
    category: "Routes",
    dependentNode: ["Point-Arrivals-119"],
    nextNode: ["Point-Arrivals-78"]
  }
};
