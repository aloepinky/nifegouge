import { renderToStaticMarkup } from 'react-dom/server';
import * as T6B from '../TW4LimitsCards';
import * as T44C from '../T44C/t44cCards';
import * as T54A from '../T54A/t54aCards';
import * as TH73A from '../TH73A/th73aCards';
import * as C172 from '../Flight/c172Cards';
import { T6B_LIMITS } from '../TW4Limits';
import { T44C_LIMITS } from '../T44C/t44cData';
import { T54A_LIMITS } from '../T54A/t54aData';
import { TH73A_LIMITS } from '../TH73A/th73aData';
import { C172_LIMITS } from '../Flight/c172Data';

// Single Mode must ask every limit on a school's sheet, and each one once: a note's blanks belong
// to one card only. A note a card prints in full must not give that card's answer away.
const SCHOOLS = [
  ['T-6B', T6B, T6B_LIMITS],
  ['T-44C', T44C, T44C_LIMITS],
  ['T-54A', T54A, T54A_LIMITS],
  ['TH-73A', TH73A, TH73A_LIMITS],
  ['C172', C172, C172_LIMITS],
];

describe.each(SCHOOLS)('%s', (_, { CARDS, NOTES, cardFields }, answers) => {
  test('every limit is on exactly one card', () => {
    const asked = CARDS.flatMap(cardFields);
    expect([...asked].sort()).toEqual(Object.keys(answers).sort());
  });

  test('every note a card shows exists, and a note with blanks is under one card only', () => {
    for (const card of CARDS) for (const n of card.notes) expect(NOTES[n]).toBeDefined();
    for (const [n, note] of Object.entries(NOTES)) {
      if (!note.fields.length) continue;
      expect(CARDS.filter((c) => c.notes.includes(Number(n)))).toHaveLength(1);
    }
  });

  test('no note a card prints in full states one of its answers', () => {
    const blank = () => '';
    // A figure of two or more digits from the answer, standing alone in the note's text.
    const states = (text, figure) => new RegExp(`(^|[^0-9.])${figure.replace('.', '[.]')}(?![0-9])`).test(text);
    const given = [];
    for (const card of CARDS) {
      for (const n of card.notes) {
        if (NOTES[n].fields.length) continue;
        const text = renderToStaticMarkup(NOTES[n].body(blank)).replace(/([0-9]),([0-9])/g, '$1$2');
        for (const f of card.fields) {
          for (const figure of String(answers[f]).match(/[0-9]{2,}([.][0-9]+)?/g) || []) {
            if (states(text, figure)) given.push(`${f} in note ${n}`);
          }
        }
      }
    }
    expect(given).toEqual([]);
  });
});
