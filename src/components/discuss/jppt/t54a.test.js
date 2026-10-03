import fs from 'fs';
import path from 'path';
import { parseJppt } from './parseJppt';
import { syllabusStats } from '../../about/stats';
// No Worker in jsdom: this puts pdf.js's worker in-process.
import 'pdfjs-dist/legacy/build/pdf.worker.entry';

// jsdom has no ReadableStream, which pdf.js streams text content through; Node's will do.
if (typeof global.ReadableStream === 'undefined') {
  // eslint-disable-next-line global-require
  global.ReadableStream = require('stream/web').ReadableStream;
}

// The browser parser run against the T-54A's syllabus, CNATRAINST 1542.198 (the T-54A
// Advanced Multi-Engine Multi-Service MCG), the way t44c.test.js runs it against the T-44C's.
// _reference-docs is gitignored, so this skips on a machine without the publication.
//
// This MCG is why a course flow may run over several pages: it draws ground school on I-5,
// down to connector A, and the flight stages from A on I-7, both titled T-54A SNA COURSE
// FLOW. The counts are read off the block headers and the Flight Training tables (pp. x-xii).
//
// Setting T54A_DOCS_OUT also writes the document, which is how tools/t54a-syllabus.js gets
// something to publish.

jest.setTimeout(300000);

const PDF = path.join(__dirname, '..', '..', '..', '..', '_reference-docs', 'T-54A Advanced', 'T54 Syllabus.pdf');
const OUT = process.env.T54A_DOCS_OUT || null;
const ID = 't54a-me';
const NAME = 'T-54A';

(fs.existsSync(PDF) ? describe : describe.skip)('T-54A MCG', () => {
  let doc;
  let warnings;

  beforeAll(async () => {
    ({ doc, warnings } = await parseJppt(fs.readFileSync(PDF)));
    if (OUT) {
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(path.join(OUT, `${ID}.json`), JSON.stringify({ id: ID, name: NAME, doc }, null, 2));
    }
  });

  // The title page says "T-54A ADVANCED", and the T-54A's pages are filed under a school of
  // their own (programs.js), so the guess has to say T-54A rather than Advanced.
  test('reads the publication and its program', () => {
    expect(doc.source.instruction).toBe('CNATRAINST 1542.198');
    expect(doc.aircraft).toBe('T-54A');
    expect(doc.school).toBe('T-54A');
    expect(doc.courseLength.rows.map((r) => [r.label, r.trainingDays, r.weeks])).toEqual([
      ['USN/IMT ADV Multi-Engine (P-8)', 93.1, 20],
      ['USN ADV Multi-Engine (E-6)', 93.1, 20],
      ['USN ADV Multi-Engine (Tilt-rotor)', 93.1, 20],
      ['USCG ADV Multi-Engine', 94.8, 21],
      ['USMC ADV Multi-Engine (C-130)', 96.5, 21],
      ['USMC ADV Multi-Engine (Tilt-rotor)', 96.5, 21],
    ]);
  });

  // G03's header counts 3 events and lists four (G0301 to G0304, 6.0 hours at 1.5 each): the
  // publication's slip, which the parser reports rather than follows.
  test('finds the blocks and events the block headers count', () => {
    expect(doc.blocks.length).toBe(38);
    expect(doc.events.length).toBe(62);
    expect(doc.blocks.filter((b) => b.briefed).map((b) => b.id).sort()).toEqual([
      'CAP31', 'CAP41', 'CAP42', 'CAP43',
      'EP21', 'EP31', 'EP32', 'EP33', 'EP41', 'EP42',
      'FAM01', 'FAM21', 'FAM22', 'FAM31', 'FAM32', 'FAM33', 'FAM41', 'FAM42', 'FAM43', 'FAM44',
      'SAR31',
    ]);
    expect(warnings.filter((w) => /the header counts/.test(w))).toEqual([
      'G03: the header counts 3 events and 4 were found (G0301, G0302, G0303, G0304).',
    ]);
  });

  test('reads the Special Syllabus Requirements', () => {
    const ssr = Object.fromEntries(doc.events.filter((e) => e.ssr).map((e) => [e.id, e.ssr]));
    expect(Object.keys(ssr).length).toBe(14);
    expect(ssr.FAM2101).toBe('Demonstrate power lever restriction (detents).');
    expect(ssr.FAM2201).toBe('Demonstrate autothrottle operation.');
    expect(ssr.CAP4104).toBe('Demonstrate visual approach and full flap landing.');
  });

  test('splits the discuss items', () => {
    const items = (id) => doc.events.find((e) => e.id === id).items.map((r) => r.label);
    expect(items('EP3101')).toEqual(['Weather filing criteria', 'approach and landing minimums', 'SE/SSE (GCA and ILS approaches)', 'Fusion']);
    expect(items('FAM0101')).toHaveLength(20);
  });

  // One chart over two pages: each page traced as it stands, I-7 stacked below I-5, the two
  // A connectors kept apart, and I-7's legend (the fuller one) the chart's.
  test('traces the course flow across both of its pages', () => {
    expect(doc.source.citation).toBe('CNATRAINST 1542.198 (26 Mar 2025), pp. I-5 to I-7');
    const ids = doc.flow.NODES.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['G0101-4', 'FAM0101', 'jump-A-1', 'jump-A-2', 'FAM4101-4', 'G0105']));
    const y = (id) => doc.flow.NODES.find((n) => n.id === id).y;
    expect(y('jump-A-2')).toBeGreaterThan(y('jump-A-1'));
    expect(y('G0105')).toBeGreaterThan(y('FAM0101'));
    expect(doc.flow.LEGEND.map((k) => k.label)).toEqual(expect.arrayContaining(['Flight', 'Check Flight', 'Simulator', 'Ground Training', 'Flight Support']));
    expect(doc.postFlows || []).toEqual([]);
  });

  // USN/USMC: CPT/UTD 8, OFT 24, T-54A dual 28 and solo 1 (62.0 hours). USCG flies SAR3101 in
  // the OFT besides, so the whole syllabus, which is every community's, has one sim more.
  test('counts the whole syllabus as the Flight Training tables total it', () => {
    const st = syllabusStats(doc);
    expect(st.flights).toBe(29);
    expect(st.flightHours).toBe(62);
    expect(st.sims).toBe(33);
    expect(st.discussItems).toBe(doc.events.reduce((n, e) => n + e.items.length, 0));
  });

  test('fits the store', () => {
    expect(Buffer.byteLength(JSON.stringify(doc), 'utf8')).toBeLessThan(350 * 1024);
  });
});
