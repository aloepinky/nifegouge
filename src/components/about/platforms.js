import { epListStats, primaryEpStats } from './stats';
import { EP_TITLES, EP_ANSWERS, EP_NWC, EP_NWC_GROUPS } from '../EPDivsData';
import { T6B_LIMITS } from '../TW4Limits';
import { C172_EPS, C172_LIMITS } from '../Flight/c172Data';
import { T44C_EPS, T44C_LIMITS, T44C_EP_NWC } from '../T44C/t44cData';

// Each program's aircraft and what its EPs/Limits exam asks, keyed by program id (programs.js):
// [{ aircraft, eps: { eps, steps, words, nwcs }, limits }]. Counted from the EPs/Limits data
// files, so an edit to a procedure or a limits sheet moves the numbers. Read by the About pages
// and the landing page.
//
// One row per aircraft: Advanced will cover several, each with its own EPs and limits.
//
// TO DO (whoever adds a second Advanced platform): this table is hand-maintained, and it should
// not be. Each row imports one aircraft's data files by name, so a new platform needs a row
// here as well as its EPs/Limits page, and nothing fails if the row is forgotten: the landing
// tile and the About page just leave that aircraft out of the counts. Make it dynamic instead,
// derived from the same registry that tells the EPs/Limits pages which aircraft a program has
// (a per-program platform list next to PROGRAMS in programs.js, or the EPs/Limits upload once
// it exists), so adding a platform is one entry that every page reads. See CLAUDE.md,
// "About pages: at a glance".
export const PLATFORMS = {
  nife: [{ aircraft: 'C172', eps: epListStats(C172_EPS), limits: Object.keys(C172_LIMITS).length }],
  tw4: [{
    aircraft: 'T-6B',
    eps: primaryEpStats({ titles: EP_TITLES, answers: EP_ANSWERS, nwc: EP_NWC, nwcGroups: EP_NWC_GROUPS }),
    limits: Object.keys(T6B_LIMITS).length,
  }],
  t44c: [
    { aircraft: 'T-44C', eps: epListStats(T44C_EPS, T44C_EP_NWC), limits: Object.keys(T44C_LIMITS).length },
  ],
};
