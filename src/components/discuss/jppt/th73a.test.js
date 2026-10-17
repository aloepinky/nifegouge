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

// The browser parser run against the TH-73A's three syllabi, the way t54a.test.js runs it
// against the T-54A's: the Advanced Helicopter SNA MCG (CNATRAMCG 1542.186D), the Intermediate
// Tilt-Rotor MCG (1542.188C) and the wing's COPT-R/CORPS syllabus (SGTO 2.0, a notice with no
// instruction number). _reference-docs is gitignored, so this skips on a machine without them.
//
// These are why a running head may say CNATRAMCG, why a chart may run over five sheets (each a
// blank verso apart) and why a chart label may carry the student letter after its range
// ("NAV0101-2A"). The counts are read off the block headers and the Course Data pages.
//
// Setting TH73A_DOCS_OUT also writes the documents, which is how tools/th73a-syllabus.js gets
// something to publish.

jest.setTimeout(600000);

const DIR = path.join(__dirname, '..', '..', '..', '..', '_reference-docs', 'TH-73A Advanced');
const OUT = process.env.TH73A_DOCS_OUT || null;

const SYLLABI = [
  { id: 'th73a-sna', name: 'TH-73A SNA', file: '1542.186D (SNA MCG).pdf' },
  { id: 'th73a-tr', name: 'TH-73A Tilt-Rotor', file: '1542.188C (Tilt-Rotor MCG).pdf' },
  { id: 'th73a-coptr', name: 'TH-73A COPT-R/CORPS', file: 'TH-73A COPTR_CORPS SGTO ADV V2.0.pdf' },
];

const have = SYLLABI.every((s) => fs.existsSync(path.join(DIR, s.file)));

(have ? describe : describe.skip)('TH-73A syllabi', () => {
  const docs = {};
  const warnings = {};

  beforeAll(async () => {
    for (const s of SYLLABI) {
      // eslint-disable-next-line no-await-in-loop
      const out = await parseJppt(fs.readFileSync(path.join(DIR, s.file)));
      docs[s.id] = out.doc;
      warnings[s.id] = out.warnings;
      if (OUT) {
        fs.mkdirSync(OUT, { recursive: true });
        fs.writeFileSync(path.join(OUT, `${s.id}.json`), JSON.stringify({ id: s.id, name: s.name, doc: out.doc }, null, 2));
      }
    }
  });

  const briefed = (doc) => doc.blocks.filter((b) => b.briefed).map((b) => b.id).sort();
  const items = (doc, id) => doc.events.find((e) => e.id === id).items.map((r) => r.label);
  const rows = (doc) => doc.events.reduce((n, e) => n + e.items.length, 0);

  // The SNA MCG's title page names no aircraft; "TH-73 Advanced Helicopter Training System" on
  // its Course Data page is the first mention, and TH-73 is read as the TH-73A.
  test('reads each publication and its program', () => {
    expect(docs['th73a-sna'].source.instruction).toBe('CNATRAINST 1542.186D');
    expect(docs['th73a-tr'].source.instruction).toBe('CNATRAINST 1542.188C');
    expect(docs['th73a-coptr'].source.instruction).toBe('TH-73A COPT-R/CORPS ADV (SGTO) 2.0');
    SYLLABI.forEach((s) => {
      expect(docs[s.id].aircraft).toBe('TH-73A');
      expect(docs[s.id].school).toBe('TH-73A');
    });
    const lengths = (id) => docs[id].courseLength.rows.map((r) => [r.label, r.trainingDays, r.weeks]);
    expect(lengths('th73a-sna')).toEqual([
      ['AHTS SNA (USN/USMC/IMT)', 172, 37],
      ['AHTS SNA (USCG)', 172, 37],
    ]);
    expect(lengths('th73a-tr')).toEqual([['AHTS Intermediate Tilt-Rotor', 85.2, 19]]);
    expect(lengths('th73a-coptr')).toEqual([
      ['COPT-R ADV SGTO (USN/USMC/IMT)', 173.5, 39],
      ['COPT-R ADV SGTO (USCG)', 173.5, 39],
    ]);
  });

  // Blocks and events as the Course Data tables list them; the briefed blocks are the ones
  // whose Discuss Items section is not "None". The two header slips are the publication's
  // (the SGTO's DAY45 counts 2 events and lists 3, its AER02 5 and lists 6 with the exam).
  test('finds the blocks and events the block headers count', () => {
    const counts = (doc) => [doc.blocks.length, doc.blocks.reduce((n, b) => n + b.events.length, 0), doc.events.length, rows(doc), briefed(doc).length];
    expect(counts(docs['th73a-sna'])).toEqual([89, 263, 111, 698, 52]);
    expect(counts(docs['th73a-tr'])).toEqual([48, 161, 49, 353, 22]);
    expect(counts(docs['th73a-coptr'])).toEqual([90, 281, 126, 730, 53]);
    expect(docs['th73a-sna'].stages.map((s) => s.label)).toEqual([
      'Ground Training', 'Day Familiarization Training', 'Night Familiarization Training', 'Visual Navigation Training',
      'Instrument Training', 'Logistics Training', 'Terrain Flight Training', 'Formation Training',
    ]);
    expect(docs['th73a-coptr'].stages[0].label).toBe('Ground Training');
    expect(warnings['th73a-coptr'].filter((w) => /the header counts/.test(w))).toEqual([
      'AER02: the header counts 5 events and 6 were found (AER0201, AER0202, AER0203, AER0204, AER0205, AER0290).',
      'DAY45: the header counts 2 events and 3 were found (DAY4501, DAY4502, DAY4503).',
    ]);
    SYLLABI.forEach((s) => {
      // eslint-disable-next-line no-console
      console.log(`${s.id} warnings:\n  ${warnings[s.id].join('\n  ')}`);
    });
  });

  test('splits the discuss items', () => {
    const sna = docs['th73a-sna'];
    expect(items(sna, 'DAY3001')).toEqual([
      'ORM checklist', 'CRM', 'NATOPS brief', 'VFR integrated scan', 'hover', 'hover taxi', 'vertical takeoff',
      'vertical landing', 'passing flight controls', 'ground effect', 'dynamic rollover', 'translating tendency',
      'turn on the spot', 'simulated engine failure in a hover/taxi (hover/taxi cut gun)',
    ]);
    // DAY2001A prints the student's list and then the instructor's: the student's is kept.
    expect(items(sna, 'DAY2001')[0]).toBe('NATOPS definitions (landing criteria, warnings, cautions, notes, shall, and should)');
    expect(items(sna, 'DAY2001')).toContain('emergency shutdown');
    expect(items(sna, 'DAY2001')).not.toContain('simulator scheduling');
    // One sentence for the whole block (DAY21), shared by its one event.
    expect(items(sna, 'DAY2101')).toContain('familiarization turn pattern');
    // The SGTO's extra events.
    expect(items(docs['th73a-coptr'], 'DAY0305')).toContain('ADB contents');
    // The Tilt-Rotor prints "4. Discuss Items. DAY0304T. Flight schedule, ...": DAY0304's, not the block's.
    expect(items(docs['th73a-tr'], 'DAY0304')).toContain('TTO policy');
    expect(docs['th73a-tr'].events.find((e) => e.id === 'DAY0301')).toBeUndefined();
    // "(PFD vs. MFD, ...)" is not a sentence break.
    expect(items(sna, 'DAY2003')[0]).toMatch(/^Electronic flight instrument system \(EFIS\)/);
  });

  test('traces the course flow across all of its sheets', () => {
    expect(docs['th73a-sna'].source.citation).toBe('CNATRAINST 1542.186D (16 Jan 2026), pp. I-9 to I-17');
    expect(docs['th73a-tr'].source.citation).toBe('CNATRAINST 1542.188C (12 Feb 2026), pp. I-7 to I-11');
    expect(docs['th73a-coptr'].source.citation).toBe('TH-73A COPT-R/CORPS ADV (SGTO) 2.0 (26 Jan 2026), pp. I-9 to I-17');
    const sna = docs['th73a-sna'].flow;
    const ids = sna.NODES.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['DAY2001-3A', 'NAV0101-2A', 'RI0101-10A', 'GND0501A', 'DAY4390A']));
    // The student letter is on every box and the syllabus drops it from the event id.
    expect(sna.NODES.find((n) => n.id === 'GND0501A').events).toEqual(['GND0501']);
    // The legend's captions sit inside its keys, and the sheets after the first borrow it.
    expect(sna.LEGEND.map((k) => k.label)).toEqual(expect.arrayContaining(['Ground Trng', 'Self Study', 'CAI', 'Exam', 'Simulator', 'MIL', 'Flight', 'Check Flight', 'Flow Connector', 'Opt Flow', 'Start / End']));
    // The Flow Connector key is a lettered circle with its caption beside it, on two lines as
    // the MCG prints it; the optional flow is keyed to a dashed line and the START/END markers
    // to a filled capsule, which the chart draws as boxes of their own.
    const connector = sna.LEGEND.find((k) => k.label === 'Flow Connector');
    expect(connector.inside).toBeUndefined();
    expect(connector.letter).toBe('A');
    expect(connector.lines).toEqual(['Flow', 'Connector']);
    expect(sna.LEGEND.find((k) => k.label === 'Opt Flow').shape).toBe('line');
    expect(sna.LEGEND.find((k) => k.label === 'Start / End').shape).toBe('capsule');
    expect(sna.NODES.filter((n) => n.kind === 'terminal').map((n) => n.label)).toEqual(expect.arrayContaining(['START TRAINING', 'END TRAINING']));
    expect(sna.EDGES.some((e) => e.from === 'start-1')).toBe(true);
    expect(sna.EDGES.some((e) => e.dashed)).toBe(true);
    expect(sna.NODES.filter((n) => n.kind === 'other')).toEqual([]);
    expect(sna.NODES.filter((n) => n.kind === 'jump').length).toBeGreaterThan(8);
    const y = (id) => sna.NODES.find((n) => n.id === id).y;
    expect(y('GND0501A')).toBeGreaterThan(y('NAV0101-2A'));
    expect(y('NAV0101-2A')).toBeGreaterThan(y('DAY2001-3A'));
    expect(docs['th73a-sna'].postFlows || []).toEqual([]);
    // The five sheets, each captioned as the publication prints it, in page order.
    expect(sna.sheets.map((b) => b.caption)).toEqual(['AHTS COURSE FLOW (1 OF 5)', 'AHTS COURSE FLOW (2 OF 5)', 'AHTS COURSE FLOW (3 OF 5)', 'AHTS COURSE FLOW (4 OF 5)', 'AHTS COURSE FLOW (5 OF 5)']);
    expect(docs['th73a-tr'].flow.sheets.map((b) => b.caption)).toEqual(['AHTS TILT-ROTOR COURSE FLOW (PAGE 1 OF 3)', 'AHTS TILT-ROTOR COURSE FLOW (PAGE 2 OF 3)', 'AHTS TILT-ROTOR COURSE FLOW (PAGE 3 OF 3)']);
    // Every box sits in one sheet's band, and the bands do not overlap.
    const inBand = (n) => sna.sheets.filter((b) => n.y + n.h / 2 >= b.y && n.y + n.h / 2 <= b.y + b.h).length;
    expect(sna.NODES.every((n) => inBand(n) === 1)).toBe(true);
  });

  test('counts the syllabus as the Flight Training tables total it', () => {
    // 60 dual and 3 solo flights, 110.9 + 5.0 hours; 14 Level 6 and 34 Level 7 FTD events.
    const st = syllabusStats(docs['th73a-sna']);
    expect(st.flights).toBe(63);
    expect(st.flightHours).toBe(115.9);
    expect(st.sims).toBe(48);
    expect(st.trainingDays).toBe(172);
    expect(st.discussItems).toBe(rows(docs['th73a-sna']));
  });

  test('fits the store', () => {
    SYLLABI.forEach((s) => {
      expect(Buffer.byteLength(JSON.stringify(docs[s.id]), 'utf8')).toBeLessThan(350 * 1024);
    });
  });
});
