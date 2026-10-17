// The publications the pages cite, each with the date of the edition the site is written
// against. A reference names its work and section; the date is added where the reference is
// printed, so it is written once here rather than on every page, and a new citation of a
// known work is dated without anyone typing it. Plain JS, no JSX.
//
// The date is the one the publication prints for its current issue: a change date where it
// has been changed (NATOPS, the PCL), otherwise its revision or issue date. DDMMMYY, the form
// the publications' own lists of effective pages use. A work with no printed date is listed
// without one and printed without one.
//
// When a publication is reissued, change its date here and check the pages that cite it.

export const WORKS = [
  { work: 'NATOPS', date: '01AUG23' },
  { work: 'TO 1T-6B-1CL-1', date: '01AUG23' },
  { work: 'FAM FTI', date: '22OCT21' },
  { work: 'I FTI', date: '19AUG26' },
  { work: 'VNAV FTI', date: '29JUL26' },
  { work: 'F FTI', date: '06APR20' },
  { work: 'TW-4 SOP', date: '05MAY25' },
  { work: 'VT-27 SOP', date: '12MAR26' },
  { work: 'VT-28 SOP', date: '23OCT25' },
  { work: 'TW-4 Formation Supplement', date: 'JUN24' },
  { work: 'TW-4 Briefing Guide', date: '31MAR25' },
  // Whiting Field. The VT-2 handouts are the SOP's Enclosures (2) to (4) and print only a
  // month; the INAV and Formation ones are still headed 3710.3H. `TW-5 SOP` is the FWOP,
  // COMTRAWINGFIVEINST 3710.2Z, dated by its cover's change (Ch 6, November 2025).
  { work: 'TW-5 SOP', date: 'NOV25' },
  { work: 'VT-2 SOP', date: '24JAN25' },
  { work: 'VT-2 DCON FAM Supplement', date: 'MAR25' },
  { work: 'VT-2 INAV Supplement', date: 'MAR24' },
  { work: 'VT-2 Formation Supplement', date: 'MAR24' },
  { work: 'VT-3 SOP', date: '21SEP26' },
  { work: 'VT-6 SOP', date: '01JUL26' },
  { work: 'VT-6 Formation Supplement', date: 'APR26' },
  { work: 'VT-6 NATOPS Briefing Guide', date: '14MAY25' },
  { work: 'VT-6 Standards', date: '13AUG25' },
  { work: 'Checklist Study Guide', date: '31MAR25' },
  { work: 'Course Rules Manual', date: '20FEB25' },
  { work: 'IFG', date: '05JUN26' },
  { work: 'KNGP IFG', date: '05JUN26' },
  // NIFE. The names carry the school because three of these collide with a Primary
  // publication of the same short name — `IFG` and `Checklist Study Guide` are both taken
  // above, and there is more than one FTI, SOP and MCG on the site.
  { work: 'NIFE FTI', date: '21MAR22' },
  { work: 'NIFE SOP', date: '22JUN26' },
  { work: 'NIFE MCG', date: '11JUL25' },
  { work: 'NIFE IFG', date: '20AUG26' },
  { work: 'NIFE Checklist Study Guide', date: '13MAR26' },
  { work: 'Ground School Trainee Guide', date: '29AUG23' },
  { work: 'NWP LOA', date: '01OCT24' },
  // Advanced (T-44C). `NATOPS` above is the T-6B's, so the aircraft goes in the name; the
  // squadron and wing publications shared with Primary (TW-4 SOP, Course Rules Manual) keep
  // their names. The Advanced MCG is 1542.168C, flown by every pipeline after the split,
  // not only the P-8.
  { work: 'T-44C NATOPS', date: '01SEP23' },
  { work: 'ME FTI', date: '09JUN26' },
  { work: 'C-130 Low-Level FTI', date: '10APR24' },
  { work: 'Tilt-Rotor Low-Level FTI', date: '13JUN22' },
  { work: 'LAT FTI', date: '03DEC21' },
  { work: 'T-44C Systems Handout', date: '11AUG20' },
  { work: 'ADV ME IFG', date: 'APR26' },
  { work: 'VT-35 SOP', date: '05AUG26' },
  { work: 'ADV ME MCG', date: '20MAR26' },
  { work: 'E-2D MCG', date: '11MAR26' },
  { work: 'CRM Instruction', date: '01SEP21' },
  { work: 'T-44C NATOPS Checklist', date: '01SEP23' },
  { work: 'T-44C FMS Brief' },
  { work: 'T-44C FGP Automation Brief' },
  // T-54A. Named for the aircraft like the T-44C's. The NATOPS is the 15 NOVEMBER 2025 issue
  // with IC 4 (30 JULY 2026); the FTI is still a draft, numbered P-xxxx and dated only by month.
  { work: 'T-54A NATOPS', date: '30JUL26' },
  { work: 'T-54A NATOPS Checklist', date: '15NOV25' },
  { work: 'T-54A FTI', date: 'AUG25' },
  { work: 'T-54A MCG', date: '31JUL25' },
  // TH-73A. Named for the aircraft; its FTIs are one per stage, so each carries the aircraft and
  // the stage. The NATOPS and the pocket checklist are the 15 FEBRUARY 2026 issue; the Night FAM
  // FTI is dated by its CH-1. The RWOP is COMTRAWINGFIVEINST 3710.8W CH-1, the Hollywood
  // Checklist COMTRAWINGFIVEINST 3710.30B (the TH-73A Supplementary Student Study Aide). The
  // HT-18 SOP file on hand has no signature page, so it carries no date yet.
  { work: 'TH-73A NATOPS', date: '15FEB26' },
  { work: 'TH-73A NATOPS Checklist', date: '15FEB26' },
  { work: 'TH-73A Day FAM FTI', date: '11DEC25' },
  { work: 'TH-73A Night FAM FTI', date: '29JAN24' },
  { work: 'TH-73A Navigation FTI', date: '04APR26' },
  { work: 'TH-73A BI/RI FTI', date: '23JAN26' },
  { work: 'TH-73A Instrument Workbook', date: '02MAR26' },
  { work: 'TH-73A Sea Logistics and SAR FTI', date: '11MAR26' },
  { work: 'TH-73A Land Logistics FTI', date: '06FEB25' },
  { work: 'TH-73A Formation FTI', date: '06MAR26' },
  { work: 'TH-73A Aeromedical FTI', date: '11JAN23' },
  { work: 'Helicopter Aero Reference Book', date: '28MAR24' },
  { work: 'RWOP', date: '01JUL26' },
  { work: 'HT-8 SOP', date: '14JUN24' },
  { work: 'HT-18 SOP' },
  { work: 'HT-28 SOP', date: '01MAR26' },
  { work: 'TW-5 Hollywood Checklist', date: '25SEP26' },
  { work: 'TH-73A SNA MCG', date: '16JAN26' },
  { work: 'TH-73A Tilt-Rotor MCG', date: '12FEB26' },
  { work: 'COPT-R/CORPS SGTO', date: '26JAN26' },
  // The general NATOPS manuals, shared by every program (so no aircraft in the name). The
  // Instrument Flight Manual is NAVAIR 00-80T-112, Aircraft Signals 00-80T-113 and Aircrew
  // Systems 00-80T-123; each is dated by its cover.
  { work: 'NATOPS Instrument Flight Manual', date: '01OCT22' },
  { work: 'Aircraft Signals NATOPS', date: '01APR18' },
  { work: 'Aircrew Systems NATOPS', date: '15APR20' },
  { work: 'FIH', date: '10JUL25' },
  { work: 'AIM', date: '09JUL26' },
  { work: 'Instrument Procedures Handbook', date: '2017' },
  { work: 'Instrument Flying Handbook', date: '2012' },
  { work: 'Airplane Flying Handbook', date: '2021' },
  { work: "Pilot's Handbook of Aeronautical Knowledge", date: '2023' },
  { work: 'FAA Order 8260.3', date: '01JUL24' },
  { work: 'National SAR Supplement', date: '23APR18' },
  { work: 'CNAF 3710', date: '07FEB25' },
  { work: 'Delta JPPT', date: '15JUL24' },
  { work: 'Echo JPPT', date: '24APR26' },
];

const DATES = new Map(WORKS.filter((w) => w.date).map((w) => [w.work, w.date]));

// The date of the edition a work is cited from, or '' for a work with none on record.
export function workDate(work) {
  return DATES.get((work || '').trim()) || '';
}

// The date a reference prints: the one typed on the reference, where a page cites an edition
// other than the one above or a publication not listed here, otherwise the list's.
export function citedDate(ref) {
  const own = ref && typeof ref.date === 'string' ? ref.date.trim() : '';
  return own || workDate(ref && ref.work);
}
