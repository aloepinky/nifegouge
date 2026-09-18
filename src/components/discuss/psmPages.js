// The pages of this site an item page can link under its lead.
//
// It replaced two fixed controls — a checkbox per systems diagram, and one for the memory
// limits page — which between them could say only two things. A page whose subject is the
// course rules, the briefing guide or the jet log has the same reason to point at the tab
// that carries it, and adding a checkbox per tab is how that ends up back here. So the
// destinations are a list, and the editor offers whatever is in it.
//
// `school` is what filters the list: a page written for Primary is offered the T-6B tabs and
// not the NIFE ones. A school the list does not know is offered everything rather than
// nothing, since an empty dropdown is a dead end.
//
// The six systems come from SYSTEM_TABS so a seventh system is added in one place.

import { SYSTEM_TABS } from '../systems/systemTabs';

const TW4 = [
  { path: '/tw4/eps-limits', label: 'Emergency procedures' },
  { path: '/tw4/eps-limits/limits', label: 'T-6B operating limitations' },
  { path: '/tw4/courserules', label: 'Course rules' },
  { path: '/tw4/briefs', label: 'Briefs and TOLD' },
  { path: '/tw4/jetlog', label: 'Jet log' },
  { path: '/tw4/docs', label: 'Documents' },
  ...SYSTEM_TABS.map((t) => ({ path: `/tw4/systems/${t.id}`, label: `${t.label} diagram` })),
];

const NIFE = [
  { path: '/nife/questions', label: 'Questions' },
  { path: '/nife/nav', label: 'Problem generator' },
  { path: '/nife/flight', label: 'Flight' },
  { path: '/nife/docs', label: 'Documents' },
];

export const PSM_PAGES = [
  ...TW4.map((p) => ({ ...p, school: 'Primary' })),
  ...NIFE.map((p) => ({ ...p, school: 'NIFE' })),
];

const byPath = new Map(PSM_PAGES.map((p) => [p.path, p]));

// What a path is called. An address the list does not carry still renders, under itself: a
// link somebody typed is better shown than dropped.
export function psmPage(path) {
  return byPath.get(path) || (path ? { path, label: path, school: '' } : null);
}

export function psmPagesForSchool(school) {
  const want = (school || '').trim().toLowerCase();
  const mine = PSM_PAGES.filter((p) => p.school.toLowerCase() === want);
  return mine.length ? mine : PSM_PAGES;
}

// The links a page carries, as paths.
//
// `diagram` (a systems tab id, or several) and `limits` are what pages carried before this
// list existed. They are read here so a page that has not been saved since keeps its link,
// and the page editor writes `psmLinks` alone, so a page converts the next time anyone saves
// it. Nothing has to be migrated on the server.
export function psmLinksOf(item) {
  if (!item) return [];
  if (item.psmLinks && item.psmLinks.length) return item.psmLinks;
  const out = [];
  const ids = Array.isArray(item.diagram) ? item.diagram : item.diagram ? [item.diagram] : [];
  for (const id of ids) {
    if (SYSTEM_TABS.some((t) => t.id === id)) out.push(`/tw4/systems/${id}`);
  }
  if (item.limits) out.push('/tw4/eps-limits/limits');
  return out;
}
