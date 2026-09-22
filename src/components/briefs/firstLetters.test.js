import { firstLetters } from './firstLetters';

test('keeps the first letter of each word', () => {
  expect(firstLetters('Brief current METARs')).toBe('B---- c------ M-----');
});

test('an apostrophe is inside the word', () => {
  expect(firstLetters('“I’M SAFE.”')).toBe('“I-- S---.”');
  expect(firstLetters("pilot's")).toBe('p------');
});

test('digits count as letters, and a hyphen splits', () => {
  expect(firstLetters('set 4-6 percent')).toBe('s-- 4-6 p------');
  expect(firstLetters('below 200 pounds')).toBe('b---- 2-- p-----');
});

test('bold markers and punctuation survive', () => {
  expect(firstLetters('**INAV Stage.** “Not applicable.”')).toBe('**I--- S----.** “N-- a---------.”');
});

test('empty text is left alone', () => {
  expect(firstLetters('')).toBe('');
  expect(firstLetters(undefined)).toBe(undefined);
});
