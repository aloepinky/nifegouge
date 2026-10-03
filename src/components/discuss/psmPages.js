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
  { path: '/primary/eps-limits', label: 'Emergency procedures' },
  { path: '/primary/eps-limits/limits', label: 'T-6B operating limitations' },
  { path: '/primary/courserules', label: 'Course rules' },
  { path: '/primary/briefs', label: 'Briefs and TOLD' },
  { path: '/primary/jetlog', label: 'Jet log' },
  { path: '/primary/docs', label: 'Documents' },
  ...SYSTEM_TABS.map((t) => ({ path: `/primary/systems/${t.id}`, label: `${t.label} diagram` })),
];

const NIFE = [
  { path: '/nife/questions', label: 'Questions' },
  { path: '/nife/nav', label: 'Problem generator' },
  { path: '/nife/eps-limits', label: 'EPs and limits' },
  { path: '/nife/briefs', label: 'Briefs and TOLD' },
  { path: '/nife/docs', label: 'Documents' },
];

const T44C = [
  { path: '/t44c/eps-limits', label: 'Emergency procedures' },
  { path: '/t44c/eps-limits/limits', label: 'T-44C operating limitations' },
  { path: '/t44c/briefs', label: 'Briefs' },
];

const T54A = [
  { path: '/t54a/eps-limits', label: 'Emergency procedures' },
  { path: '/t54a/eps-limits/limits', label: 'T-54A operating limitations' },
  { path: '/t54a/briefs', label: 'Briefs' },
];

export const PSM_PAGES = [
  ...TW4.map((p) => ({ ...p, school: 'Primary' })),
  ...NIFE.map((p) => ({ ...p, school: 'NIFE' })),
  ...T44C.map((p) => ({ ...p, school: 'Advanced' })),
  ...T54A.map((p) => ({ ...p, school: 'T-54A' })),
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
    if (SYSTEM_TABS.some((t) => t.id === id)) out.push(`/primary/systems/${id}`);
  }
  if (item.limits) out.push('/primary/eps-limits/limits');
  return out;
}
