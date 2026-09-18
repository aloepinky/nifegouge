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
  { work: 'I FTI', date: '08AUG16' },
  { work: 'VNAV FTI', date: '09APR20' },
  { work: 'F FTI', date: '06APR20' },
  { work: 'TW-4 SOP', date: '05MAY25' },
  { work: 'VT-27 SOP', date: '12MAR26' },
  { work: 'VT-28 SOP', date: '23OCT25' },
  { work: 'TW-4 Formation Supplement', date: 'JUN24' },
  { work: 'TW-4 Briefing Guide', date: '31MAR25' },
  { work: 'Checklist Study Guide', date: '31MAR25' },
  { work: 'Course Rules Manual', date: '20FEB25' },
  { work: 'IFG' },
  { work: 'KNGP IFG' },
  { work: 'FIH', date: '10JUL25' },
  { work: 'AIM', date: '09JUL26' },
  { work: 'CNAF 3710', date: '07FEB25' },
  { work: 'Delta JPPT', date: '15JUL24' },
  { work: 'Echo JPPT', date: '24APR26' },
];

const DATES = new Map(WORKS.filter((w) => w.date).map((w) => [w.work, w.date]));

// The date of the edition a work is cited from, or '' for a work with none on record.
export function workDate(work) {
  return DATES.get((work || '').trim()) || '';
}
