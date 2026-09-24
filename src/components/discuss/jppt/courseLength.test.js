import fs from 'fs';
import path from 'path';
import { loadTextPages } from './pdfText';
import { extractCourseLength } from './courseLength';
// No Worker in jsdom: this puts pdf.js's worker in-process.
import 'pdfjs-dist/legacy/build/pdf.worker.entry';

if (typeof global.ReadableStream === 'undefined') {
  // eslint-disable-next-line global-require
  global.ReadableStream = require('stream/web').ReadableStream;
}

// Against the publications themselves, which are gitignored, so each case skips on a machine
// without its PDF. The expected figures were read off the rendered pages, not the text layer.

jest.setTimeout(120000);

const REFS = path.join(__dirname, '..', '..', '..', '..', '_reference-docs');
const CASES = [
  {
    pdf: path.join(REFS, 'T6b Primary', 'Fundamental References', 'Delta JPPT.pdf'),
    expected: {
      weeksLabel: 'Production Weeks',
      rows: [
        { label: 'TW-4 Primary JPPT', trainingDays: 130.9, weeks: 28 },
        { label: 'TW-5 Primary JPPT', trainingDays: 130.9, weeks: 28 },
        { label: 'TW-4 NASA SVC T-6B', trainingDays: 71.5, weeks: 16 },
        { label: 'TW-5 NASA SVC T-6B', trainingDays: 71.5, weeks: 16 },
      ],
    },
  },
  {
    pdf: path.join(REFS, 'T6b Primary', 'Fundamental References', 'Echo JPPT.pdf'),
    expected: {
      weeksLabel: 'Production Weeks',
      rows: [
        { label: 'TW-4 Primary JPPT', trainingDays: 126.9, weeks: 28 },
        { label: 'TW-5 Primary JPPT', trainingDays: 126.9, weeks: 28 },
        { label: 'TW-4 NASA SVC T-6B', trainingDays: 69.9, weeks: 15 },
        { label: 'TW-5 NASA SVC T-6B', trainingDays: 69.9, weeks: 15 },
        { label: 'TW-4 USMC PFIP Transition', trainingDays: 126.9, weeks: 28 },
        { label: 'TW-5 USMC PFIP Transition', trainingDays: 126.9, weeks: 28 },
      ],
    },
  },
  {
    pdf: path.join(REFS, 'C172 NIFE', 'Fundamental References', 'MCG (NASCINST 1542.1B NIFE MASTER CURRICULUM GUIDE 11 JUL 2025).pdf'),
    expected: {
      weeksLabel: 'Calendar Weeks',
      rows: [
        { label: 'NIFE 1 – GROUND', trainingDays: 21, weeks: 4 },
        { label: 'NIFE 2 - FLIGHT', trainingDays: 15, weeks: 4 },
      ],
    },
  },
];

CASES.forEach(({ pdf, expected }) => {
  (fs.existsSync(pdf) ? test : test.skip)(`course length: ${path.basename(pdf)}`, async () => {
    const pages = await loadTextPages(fs.readFileSync(pdf));
    expect(extractCourseLength(pages)).toEqual(expected);
  });
});

test('no table, no course length', () => {
  expect(extractCourseLength([[{ text: 'Chapter I', words: [{ text: 'Chapter' }, { text: 'I' }] }]])).toBeNull();
});
