import { fitLines } from './flowText';

// Where a chart label breaks. The text is drawn by the browser and never measured, so the width
// is an estimate; what these pin is the shape of the answer — which labels break, where, and
// which are left alone — rather than the estimate itself.

describe('fitLines', () => {
  test('leaves a label that fits on one line', () => {
    expect(fitLines('FAM4301-4', 45.7, 'rect')).toEqual(['FAM4301-4']);
  });

  // The P-8 chart's callout, which the publication itself prints on two lines in a box 58.5
  // wide and 21.5 high. Drawn on one it ran out across the legend beside it.
  test('breaks the P-8 callout where the publication breaks it', () => {
    expect(fitLines('SERVICE-SPECIFIC COURSE FLOW', 58.5, 'rect'))
      .toEqual(['SERVICE-SPECIFIC', 'COURSE FLOW']);
  });

  // The two legend captions the publication sets inside their keys.
  test('breaks the legend captions the publication breaks', () => {
    expect(fitLines('Ground Training', 42.7, 'ellipse')).toEqual(['Ground', 'Training']);
    expect(fitLines('Flight Support', 42.7, 'hex6')).toEqual(['Flight', 'Support']);
  });

  // A shape's usable width is less than its bounding box: the same word in the same width fits
  // a rectangle and a curved shape has to be given less.
  test('gives a curved shape less room than a rectangle', () => {
    expect(fitLines('Simulator Check', 42.7, 'rect')).toHaveLength(2);
    expect(fitLines('Check Flight', 42.7, 'rect')).toHaveLength(1);
    expect(fitLines('Check Flight', 42.7, 'ellipse')).toHaveLength(2);
  });

  test('breaks again where two lines are still too long', () => {
    const lines = fitLines('Low Level Tactical Formation Navigation Phase', 45, 'rect');
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.join(' ')).toBe('Low Level Tactical Formation Navigation Phase');
  });

  // An event id is one token. Broken across lines it would read as two ids, which is worse
  // than letting a long one overrun its box.
  test('never breaks a single word', () => {
    expect(fitLines('IN1401-13', 40.4, 'hex6')).toEqual(['IN1401-13']);
    expect(fitLines('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 20, 'rect')).toHaveLength(1);
  });
});
