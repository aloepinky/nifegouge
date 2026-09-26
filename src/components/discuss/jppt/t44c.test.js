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

// The browser parser run against the two T-44C syllabi, the way jppt.test.js runs it against
// Delta. _reference-docs is gitignored, so these skip on a machine without the publications.
//
// These two are why the parser grew per-community charts and why a range in a prerequisite no
// longer invents events, so they are worth pinning: the figures are read off the rendered
// pages (I-5 and I-7 of 1542.168C, I-3 of 1542.175D) and the counts off the publications' own
// block headers.
//
// Setting T44C_DOCS_OUT also writes the two documents, which is how tools/t44c-syllabus.js
// gets something to publish. The parser is browser code and there is no other way to run it
// outside a browser; the assertions below are what makes the output trustworthy.

jest.setTimeout(300000);

const REFS = path.join(__dirname, '..', '..', '..', '..', '_reference-docs', 'T44C Advanced', 'Fundamental References');
const OUT = process.env.T44C_DOCS_OUT || null;

const CASES = [
  {
    id: 't44c-p8',
    name: 'T-44C P-8 Advanced',
    file: '1542.168C CH-2.pdf',
    aircraft: 'T-44C',
    school: 'Advanced',
    instruction: 'CNATRAINST 1542.168C',
    blocks: 54,
    events: 78,
    briefed: 34,
    // Page I-7, top band first: USN P-8 and E-6 share it, divided by a rule turned on its side.
    postFlows: ['USN P-8', 'E-6', 'USMC C-130', 'USCG', 'TILT-ROTOR'],
    courseRows: ['USN P-8', 'IMT P-8', 'USMC C-130', 'USCG', 'USN/USMC Tilt-Rotor'],
    // Read off the rendered Flight Training tables (pp. x-xviii), which print OFT, UTD and
    // T-44C Dual/Solo per block and total each column. `flights` is Dual + Solo, `sims` is
    // OFT + UTD, `flightHours` is the two T-44C hour columns. The stats derive these from
    // which blocks each community's charts name, and have to land on the same figures.
    //
    // USN P-8    OFT 22/33.0  UTD 9/13.5  Dual 31/67.5  Solo 1/2.0
    // E-6        OFT 22/33.0  UTD 9/13.5  Dual 30/65.5  Solo 1/2.0
    // USMC C-130 OFT 24/36.0  UTD 9/13.5  Dual 33/70.9  Solo 1/2.0
    //
    // The E-6 has no Course Length row of its own — its CIN (Q-2A-1668) and its chart exist,
    // but the table does not list it — so it takes USN P-8's, the community it shares the top
    // band with. Its flight table differs from the P-8's by one solo.
    perCommunity: {
      'USN P-8': { flights: 32, sims: 31, flightHours: 69.5, weeks: 23, trainingDays: 103.6 },
      'E-6': { flights: 31, sims: 31, flightHours: 67.5, weeks: 23, trainingDays: 103.6 },
      'USMC C-130': { flights: 34, sims: 33, flightHours: 72.9, weeks: 23, trainingDays: 105 },
      USCG: { weeks: 23, trainingDays: 103.6 },
      'TILT-ROTOR': { weeks: 23, trainingDays: 106.2 },
    },
  },
  {
    id: 't44c-e2d',
    name: 'T-44C E-2D Intermediate',
    file: '1542.175D CH-1.pdf',
    aircraft: 'T-44C',
    school: 'Advanced',
    instruction: 'CNATRAINST 1542.175D',
    blocks: 35,
    events: 59,
    briefed: 23,
    // One community, so the publication prints one chart and the reader is offered no choice.
    postFlows: [],
    courseRows: ['T-44C E-2D Intermediate MPTS'],
  },
];

CASES.forEach((c) => {
  const pdf = path.join(REFS, c.file);
  const has = fs.existsSync(pdf);
  (has ? describe : describe.skip)(c.name, () => {
    let doc;
    let warnings;

    beforeAll(async () => {
      ({ doc, warnings } = await parseJppt(fs.readFileSync(pdf)));
      // The program pair is not guessable from either title page — 1542.168C never names the
      // P-8 at all and 1542.175D calls its school Intermediate — so it is set here, which is
      // what whoever uploads a JPPT does on the upload form.
      doc.aircraft = c.aircraft;
      doc.school = c.school;
      if (OUT) {
        fs.mkdirSync(OUT, { recursive: true });
        fs.writeFileSync(
          path.join(OUT, `${c.id}.json`),
          JSON.stringify({ id: c.id, name: c.name, doc }, null, 2),
        );
      }
    });

    test('reads the publication it came from', () => {
      expect(doc.source.instruction).toBe(c.instruction);
      expect(doc.courseLength.rows.map((r) => r.label)).toEqual(c.courseRows);
    });

    test('finds the blocks and events the block headers count', () => {
      expect(doc.blocks.length).toBe(c.blocks);
      expect(doc.events.length).toBe(c.events);
      expect(doc.blocks.filter((b) => b.briefed).length).toBe(c.briefed);
    });

    // A prerequisite reading "G0301 prior to G0401-90 (in order)" spans the block's numbering,
    // not its event list: G04 holds four events and the range names ninety.
    test('does not invent events from a prerequisite range', () => {
      const ids = doc.blocks.flatMap((b) => b.events.map((e) => e.id));
      expect(ids).not.toContain('G0450');
      expect(new Set(ids).size).toBe(ids.length);
      const counted = warnings.filter((w) => /the header counts/.test(w));
      expect(counted).toEqual([]);
    });

    test('traces the course flow', () => {
      expect(doc.flow.NODES.length).toBeGreaterThan(40);
      expect(doc.flow.EDGES.length).toBeGreaterThan(40);
      // Every box is keyed to a legend category rather than falling through to "other".
      expect(doc.flow.NODES.filter((n) => n.kind === 'other')).toEqual([]);
    });

    test('traces one chart per community, in the order the figure prints them', () => {
      expect((doc.postFlows || []).map((f) => f.label)).toEqual(c.postFlows);
      (doc.postFlows || []).forEach((f) => {
        expect(f.NODES.length).toBeGreaterThan(1);
        expect(typeof f.VIEWBOX).toBe('string');
        // The per-community page draws no legend; they share the course flow's.
        expect(f.LEGEND).toEqual([]);
      });
    });

    // Without a community the figures are the document's, which is the union of all of them.
    test('counts the whole syllabus when no community is chosen', () => {
      const st = syllabusStats(doc);
      expect(st.discussItems).toBe(doc.events.reduce((n, e) => n + e.items.length, 0));
      // The union flies at least as much as any one community does.
      const most = Object.values(c.perCommunity || {})
        .reduce((n, x) => Math.max(n, x.flights || 0), 0);
      expect(st.flights).toBeGreaterThanOrEqual(most);
    });

    test('counts each community as the publication totals it', () => {
      Object.entries(c.perCommunity || {}).forEach(([label, want]) => {
        const platform = doc.postFlows.find((f) => f.label === label);
        expect(platform).toBeTruthy();
        const st = syllabusStats(doc, platform);
        Object.entries(want).forEach(([k, v]) => expect([label, k, st[k]]).toEqual([label, k, v]));
      });
    });

    test('fits the store', () => {
      expect(Buffer.byteLength(JSON.stringify(doc), 'utf8')).toBeLessThan(350 * 1024);
    });
  });
});
