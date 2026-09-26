import { wordDiff } from './EditDiff';

const render = (parts) => parts.map((p) => (p.state === 'same' ? p.text : p.state === 'removed' ? `[-${p.text}-]` : `{+${p.text}+}`)).join('');

test('an unchanged sentence is one plain run', () => {
  expect(wordDiff('Below 1500 ft AGL', 'Below 1500 ft AGL')).toEqual([{ text: 'Below 1500 ft AGL', state: 'same' }]);
});

test('a changed number is marked and nothing else is', () => {
  expect(render(wordDiff('Below 1500 ft AGL with 3 sm', 'Below 1500 ft AGL with 2 sm'))).toBe('Below 1500 ft AGL with [-3-]{+2+} sm');
});

test('added and removed words at the ends', () => {
  expect(render(wordDiff('Aerobatic flight is prohibited', 'Aerobatic flight is prohibited when'))).toBe('Aerobatic flight is prohibited{+ when+}');
  expect(render(wordDiff('Is it true', 'It true'))).toBe('[-Is it-]{+It+} true');
});

test('empty sides', () => {
  expect(wordDiff('', '')).toEqual([]);
  expect(render(wordDiff('', 'New explanation'))).toBe('{+New explanation+}');
  expect(render(wordDiff('Old one', ''))).toBe('[-Old one-]');
});
