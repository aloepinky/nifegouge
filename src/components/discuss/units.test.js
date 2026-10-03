import { isOthers, hasSeveralUnits, unitsFor, squadronsFor, suggestUnit, unitOfWork, pageWing } from './units';

test('only a marked section folds, and the reader\'s own wing stays open', () => {
  expect(isOthers({ title: 'VT-28 SOP' }, 'VT-27')).toBe(false); // unmarked: everyone's
  expect(isOthers({ unit: 'VT-28' }, '')).toBe(false); // no squadron picked
  expect(isOthers({ unit: 'VT-28' }, 'VT-27')).toBe(true);
  expect(isOthers({ unit: 'TW-4' }, 'VT-27')).toBe(false);
  expect(isOthers({ unit: 'TW-5' }, 'VT-27')).toBe(true);
  expect(isOthers({ unit: 'VT-6' }, 'VT-6')).toBe(false);
  expect(isOthers({ unit: 'nonsense' }, 'VT-6')).toBe(false);
});

test('hasSeveralUnits counts marks, not headings', () => {
  expect(hasSeveralUnits([{ title: 'VT-27 SOP' }, { title: 'VT-28 SOP' }])).toBe(false);
  expect(hasSeveralUnits([{ unit: 'VT-2' }, { unit: 'VT-2' }])).toBe(false);
  expect(hasSeveralUnits([{ unit: 'TW-4' }, { unit: 'VT-27' }])).toBe(true);
});

test('units and squadrons by program', () => {
  expect(unitsFor('Primary').map((u) => u.id)).toEqual(['TW-4', 'TW-5', 'VT-27', 'VT-28', 'VT-2', 'VT-3', 'VT-6']);
  expect(squadronsFor('Advanced').map((u) => u.id)).toEqual(['VT-31', 'VT-35']);
  expect(squadronsFor('NIFE')).toEqual([]);
});

test('suggestUnit reads the sources first, then the heading', () => {
  const references = [
    { n: 1, work: 'VT-28 SOP' }, { n: 2, work: 'F FTI' }, { n: 3, work: 'Course Rules Manual' },
  ];
  expect(suggestUnit({ title: 'Working areas', refs: [3] }, references)).toEqual({ unit: 'TW-4', why: 'sources' });
  expect(suggestUnit({ title: 'Parade', paras: [{ text: 'x', refs: [1] }] }, references)).toEqual({ unit: 'VT-28', why: 'sources' });
  expect(suggestUnit({ title: 'Parade', paras: [{ text: 'x', refs: [1] }, { text: 'y', refs: [2] }] }, references)).toBeNull();
  expect(suggestUnit({ title: 'VT-3 SOP', refs: [2] }, references)).toEqual({ unit: 'VT-3', why: 'heading' });
  expect(suggestUnit({ title: 'Common errors', refs: [2] }, references)).toBeNull();
  // VT-2 is not a prefix of VT-27.
  expect(unitOfWork('VT-27 SOP')).toBe('VT-27');
  expect(unitOfWork('VT-2 DCON FAM Supplement')).toBe('VT-2');
});

test('pageWing reads a wing page from its title', () => {
  expect(pageWing({ title: 'Home field arrival (TW-5)' })).toBe('TW-5');
  expect(pageWing({ title: 'Home field arrival' })).toBeNull();
  expect(pageWing({ title: 'Thing (VT-2)' })).toBeNull();
});
