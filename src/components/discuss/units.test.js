import { ownerOf, isOthers, hasSeveralUnits } from './units';

test('ownerOf names the wing and squadron of a local section', () => {
  expect(ownerOf('VT-28 SOP')).toEqual({ wing: 'TW-4', squadron: 'VT-28' });
  expect(ownerOf('VT-2 Formation Supplement')).toEqual({ wing: 'TW-5', squadron: 'VT-2' });
  expect(ownerOf('TW-5 SOP')).toEqual({ wing: 'TW-5', squadron: null });
  expect(ownerOf('TW-4 Briefing Guide')).toEqual({ wing: 'TW-4', squadron: null });
  expect(ownerOf('Common errors')).toBeNull();
  expect(ownerOf('VT-35 SOP')).toBeNull();
  // VT-2 is not a prefix of VT-27.
  expect(ownerOf('VT-27 SOP').squadron).toBe('VT-27');
});

test('isOthers folds other units and keeps the reader\'s wing', () => {
  expect(isOthers('VT-28 SOP', '')).toBe(false);
  expect(isOthers('VT-28 SOP', 'VT-27')).toBe(true);
  expect(isOthers('TW-4 SOP', 'VT-27')).toBe(false);
  expect(isOthers('TW-5 SOP', 'VT-27')).toBe(true);
  expect(isOthers('VT-6 SOP', 'VT-6')).toBe(false);
  expect(isOthers('Procedure', 'VT-6')).toBe(false);
});

test('hasSeveralUnits', () => {
  expect(hasSeveralUnits([{ title: 'VT-27 SOP' }, { title: 'Common errors' }])).toBe(false);
  expect(hasSeveralUnits([{ title: 'VT-2 SOP' }, { title: 'VT-2 Formation Supplement' }])).toBe(false);
  expect(hasSeveralUnits([{ title: 'TW-4 SOP' }, { title: 'VT-27 SOP' }])).toBe(true);
});
