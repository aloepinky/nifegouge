import { chapterOf, chapterKey, refMatches, sectionState, markedParts, partChanged, reportName } from './outdated';

const natops = (loc, pages) => ({ n: 1, work: 'NATOPS', loc, pages });
const report = (scope, part, extra = {}) => ({ work: 'NATOPS', scope, part, n: 1, at: '2026-10-20T00:00:00Z', ...extra });

test('a chapter is read off each kind of section number', () => {
  expect(chapterOf(natops('Ch. 4 — Operating Limitations')).key).toBe('4');
  expect(chapterOf(natops('§12.2.3 — CAS Caution Messages')).key).toBe('12');
  expect(chapterOf(natops('§1-1-9 — Instrument Landing System')).key).toBe('1');
  expect(chapterOf(natops('§403 — Chart Preparation')).key).toBe('4');
  expect(chapterOf(natops('§1107 — Autorotation')).key).toBe('11');
  expect(chapterOf(natops('Appendix A — Glossary')).key).toBe('app a');
  expect(chapterOf(natops('Pilot/Controller Glossary'))).toBe(null);
  expect(chapterOf(natops('Glossary', 'p. 7-3')).key).toBe('7');
});

test('a chapter is one key however it is typed', () => {
  ['4', 'Ch. 4', 'chapter 4', 'CH 4', '04'].forEach((t) => expect(chapterKey(t)).toBe('4'));
  expect(chapterKey('App. A')).toBe('app a');
});

test('reports match the references they cover', () => {
  const ref = natops('§12.2.3 — CAS Caution Messages');
  expect(refMatches(ref, report('pub', ''))).toBe(true);
  expect(refMatches(ref, report('chapter', 'Ch. 12'))).toBe(true);
  expect(refMatches(ref, report('chapter', '2'))).toBe(false);
  expect(refMatches(ref, report('section', '§12.2'))).toBe(true);
  expect(refMatches(ref, report('section', '12.2.3'))).toBe(true);
  expect(refMatches(ref, report('section', '§12.20'))).toBe(false);
  expect(refMatches(ref, report('pub', '', { work: 'AIM' }))).toBe(false);
  const titled = natops('Ch. 4 — Operating Limitations');
  expect(refMatches(titled, report('section', 'Operating limitations'))).toBe(true);
  expect(refMatches(titled, report('section', 'Ch. 4 — Operating Limitations'))).toBe(true);
  expect(refMatches(titled, report('section', 'Operating'))).toBe(false);
});

test('a report names what changed', () => {
  expect(reportName(report('chapter', 'chapter 4'))).toBe('NATOPS Ch. 4');
  expect(reportName(report('pub', ''))).toBe('NATOPS');
});

const item = {
  slug: 'flap-limits',
  numbers: [{ id: 'nb-01', refs: [2] }],
  sections: [
    { id: 's1', title: 'Limits', paras: [{ id: 'p1', refs: [1] }], subsections: [{ id: 's2', title: 'Landing', items: [{ id: 'i1', sub: [{ id: 'i2', refs: [2] }] }] }] },
  ],
  references: [natops('Ch. 4 — Operating Limitations'), { n: 2, work: 'AIM', loc: '§5-4-5 — Approaches' }],
};

test('a section counts its readers and the reports on what it cites', () => {
  const data = {
    pages: { 'primary/flap-limits': { marks: { s1: { n: 1, notes: ['IC 4'] } }, cleared: { s2: '2026-10-21T00:00:00Z' } } },
    pubs: [report('chapter', '4', { n: 2 }), { work: 'AIM', scope: 'pub', part: '', n: 1, at: '2026-10-20T00:00:00Z' }],
  };
  const s1 = sectionState(data, 'Primary', item, 's1', item.sections[0]);
  expect(s1.level).toBe(3);
  expect(s1.marks).toBe(1);
  expect(s1.pubs).toHaveLength(1);
  // The subsection cites the AIM, but was said to be up to date after the report.
  expect(sectionState(data, 'Primary', item, 's2', item.sections[0].subsections[0]).level).toBe(0);
  const parts = markedParts(data, 'Primary', item);
  expect(parts.map((p) => p.id)).toEqual(['numbers', 's1']);
});

test('a changed part is told from an unchanged one', () => {
  const after = { ...item, sections: [{ ...item.sections[0], title: 'Flap limits' }] };
  expect(partChanged(item, after, 's1')).toBe(true);
  expect(partChanged(item, after, 's2')).toBe(false);
  expect(partChanged(item, after, 'numbers')).toBe(false);
});
