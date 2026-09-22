import { diffBriefs, diffSummary, lineDiff, pairUp } from './briefDiff';

const item = (id, label, text, rest) => ({ id, label, text, ...rest });
const section = (id, title, items, rest) => ({ id, title, column: 1, items, ...rest });

const base = () => ({
  id: 'fam-vnav-inav',
  title: 'BRIEFING GUIDE FOR FAM, VNAV, AND INAV STAGES',
  short: 'FAM / VNAV / INAV',
  sections: [
    section('admin', 'ADMINISTRATION', [
      item('admin-1', 'I.M.S.A.F.E. Checklist', 'Both pilots must ensure they are safe to fly.'),
      item('admin-2', 'Apply time critical ORM', 'a. Identify Hazards:\nb. Assess Hazards:', { fixed: true }),
    ]),
    section('wx', 'WEATHER', [
      item('wx-1', 'Local area', 'Brief current METARs.'),
    ]),
  ],
});

test('an unchanged brief is marked nowhere', () => {
  const out = diffBriefs(base(), base());
  expect(out.marks).toEqual({});
  expect(diffSummary(out)).toBe('0 items changed.');
});

test('a rewritten line is kept beside the one it replaced', () => {
  const next = base();
  next.sections[1].items[0].text = 'Brief current METARs and TAFs.';
  const out = diffBriefs(base(), next);

  expect(out.marks['wx-1'].state).toBe('changed');
  expect(out.marks['wx-1'].lines.text).toEqual(['removed', 'added']);
  // The item the page draws carries both lines, the old one first.
  const shown = out.doc.sections[1].items[0];
  expect(shown.text.split('\n')).toEqual([
    'Brief current METARs.',
    'Brief current METARs and TAFs.',
  ]);
  expect(diffSummary(out)).toBe('1 item changed.');
});

test('a line added inside a block marks only that line', () => {
  const next = base();
  next.sections[0].items[1].text = 'a. Identify Hazards:\nb. Assess Hazards:\nc. Make Risk Decisions:';
  const out = diffBriefs(base(), next);
  expect(out.marks['admin-2'].lines.text).toEqual(['same', 'same', 'added']);
});

test('an item that is gone is put back where it was, and one that is new is marked', () => {
  const next = base();
  next.sections[0].items = [
    next.sections[0].items[0],
    item('admin-9', 'Fuel and weight', 'Brief the fuel load.'),
  ];
  const out = diffBriefs(base(), next);

  expect(out.doc.sections[0].items.map((it) => it.id)).toEqual(['admin-1', 'gone:admin-2', 'admin-9']);
  expect(out.marks['gone:admin-2'].state).toBe('removed');
  expect(out.marks['admin-9'].state).toBe('added');
  expect(diffSummary(out)).toBe('1 item added, 1 item removed.');
});

test('a retitled item is one change, not a removal and an addition', () => {
  const next = base();
  next.sections[1].items[0] = item('wx-1', 'Local area weather', 'Brief current METARs.');
  const out = diffBriefs(base(), next);

  expect(out.marks['wx-1']).toMatchObject({ state: 'changed', label: true });
  expect(Object.keys(out.marks)).toEqual(['wx-1']);
});

test('a whole section added or dropped carries its items with it', () => {
  const next = base();
  next.sections = [next.sections[0], section('emerg', 'EMERGENCIES', [item('emerg-1', 'Aborts', 'Brief the abort.')])];
  const out = diffBriefs(base(), next);

  expect(out.marks.emerg.state).toBe('added');
  expect(out.marks['emerg-1'].state).toBe('added');
  expect(out.marks['gone:wx'].state).toBe('removed');
  expect(out.marks['gone:wx-1'].state).toBe('removed');
  expect(out.doc.sections.map((s) => s.id)).toEqual(['admin', 'gone:wx', 'emerg']);
});

test('the head fields are reported by name', () => {
  const next = { ...base(), short: 'FAM / VNAV', note: 'A new note.' };
  const out = diffBriefs(base(), next);
  expect(out.head).toEqual(['the name on the button', 'the note at the foot']);
  expect(diffSummary(out)).toBe('the name on the button, the note at the foot changed.');
});

test('an item that stops opening is a change', () => {
  const next = base();
  next.sections[0].items[1] = { ...next.sections[0].items[1], fixed: false };
  const out = diffBriefs(base(), next);
  expect(out.marks['admin-2'].state).toBe('changed');
});

test('lineDiff on an empty side', () => {
  expect(lineDiff('', 'one\ntwo').states).toEqual(['added', 'added']);
  expect(lineDiff('one\ntwo', '').states).toEqual(['removed', 'removed']);
  expect(lineDiff('', '').same).toBe(true);
});

test('pairUp keeps the new order and puts a deletion back in its place', () => {
  const before = [{ n: 'a' }, { n: 'b' }, { n: 'c' }];
  const after = [{ n: 'a' }, { n: 'c' }];
  expect(pairUp(before, after, (x) => x.n).map((p) => [p.before && p.before.n, p.after && p.after.n]))
    .toEqual([['a', 'a'], ['b', null], ['c', 'c']]);
});
