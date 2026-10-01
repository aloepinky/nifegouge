import fs from 'fs';
import path from 'path';
import { loadPageContents } from './pdfSource';
import { extractFlow } from './flowExtract';
import { VIEWBOX, NODES, LEGEND, EDGES } from './__fixtures__/delta/FLOW';
import { loadTextPages } from './pdfText';
import { extractSyllabus } from './syllabusExtract';
import { BLOCKS, hasDiscussItems } from './__fixtures__/delta/SYLLABUS';
import { EVENT_LIST } from './__fixtures__/delta/EVENTS';
import ITEM_INDEX from './__fixtures__/delta/ITEM_INDEX.json';
import { buildMatcher, protectedPhrases, tokens } from './matchItems';
// No Worker in jsdom: this puts pdf.js's worker in-process.
import 'pdfjs-dist/legacy/build/pdf.worker.entry';

// jsdom has no ReadableStream, which pdf.js streams text content through; Node's will do.
if (typeof global.ReadableStream === 'undefined') {
  // eslint-disable-next-line global-require
  global.ReadableStream = require('stream/web').ReadableStream;
}

// The browser parser run against the Delta JPPT. _reference-docs is gitignored, so these skip
// on any machine without the publication.
//
// The expected values are the Delta registries as they were when the corpus moved to the
// server (__fixtures__/delta), which is what the parser has to reproduce from the PDF. The
// live Delta document is edited on the site and drifts from them on purpose.

const PDF = path.join(__dirname, '..', '..', '..', '..', '_reference-docs', 'T6b Primary', 'Fundamental References', 'Delta JPPT.pdf');
const HAVE_PDF = fs.existsSync(PDF);
const maybe = HAVE_PDF ? describe : describe.skip;

const matcher = buildMatcher(EVENT_LIST, ITEM_INDEX);
const phrases = protectedPhrases(EVENT_LIST, ITEM_INDEX);

jest.setTimeout(120000);

maybe('Delta JPPT', () => {
  let pages;

  beforeAll(async () => {
    pages = await loadPageContents(fs.readFileSync(PDF));
  });

  test('flowExtract reproduces FLOW.js exactly', () => {
    const flow = extractFlow(pages);
    expect(flow.warnings).toEqual([]);
    expect(flow.VIEWBOX).toBe(VIEWBOX);
    expect(flow.LEGEND).toEqual(LEGEND);
    expect(flow.NODES).toEqual(NODES);
    expect(flow.EDGES).toEqual(EDGES);
  });

  describe('syllabusExtract', () => {
    let syl;
    beforeAll(async () => {
      syl = extractSyllabus(await loadTextPages(fs.readFileSync(PDF)), { phrases, matcher });
    });

    test('finds every block SYLLABUS.js has', () => {
      if (syl.warnings.length) console.log(`warnings:\n  ${syl.warnings.join('\n  ')}`);
      expect(syl.blocks.map((b) => b.id).sort()).toEqual(BLOCKS.map((b) => b.id).sort());
    });

    // Every block in Delta names its media in one token, so a second word in that cell means
    // the header reader has taken the first word of the title. It used to, wherever a title was
    // long enough to start left of the midpoint between the two headers: "Crew Resource
    // Management" came out as media "Class Crew". (A two-word media is legitimate in general —
    // the T-44C E-2D syllabus has a "Flight Line" block — which is why this is pinned on Delta
    // rather than asserted everywhere.) The fixture's own titles are the hand-built registry's
    // wording, "FAM Aerobatics" where the JPPT prints "Familiarization Aerobatics", so the
    // shape is what is checked here and not the strings.
    test('keeps a title out of the media column', () => {
      syl.blocks.forEach((b) => {
        expect([b.id, b.media]).toEqual([b.id, expect.stringMatching(/^\S+$/)]);
        expect([b.id, !!b.title]).toEqual([b.id, true]);
      });
    });

    test('finds each block\'s events', () => {
      const got = Object.fromEntries(syl.blocks.map((b) => [b.id, b.events.map((e) => e.id).sort()]));
      const want = Object.fromEntries(BLOCKS.map((b) => [b.id, b.events.map((e) => e.id).sort()]));
      expect(got).toEqual(want);
    });

    test('marks the same blocks briefed', () => {
      const got = syl.blocks.filter((b) => b.briefed).map((b) => b.id).sort();
      const want = BLOCKS.filter(hasDiscussItems).map((b) => b.id).sort();
      expect(got).toEqual(want);
    });

    // Laid out three ways: one line per event (FAM42), one sentence for the whole block (FAM33,
    // whose events all get it), and "F4103/F4104" set above the text it applies to.
    test('reads the Special Syllabus Requirements', () => {
      const ssr = Object.fromEntries(syl.events.filter((e) => e.ssr).map((e) => [e.id, e.ssr]));
      expect(Object.keys(ssr).length).toBe(24);
      expect(ssr.FAM4202).toBe('IP demonstrates spin with steady state spin recovery.');
      expect(ssr.FAM4203).toBe('SNA executes visual straight-in.');
      expect(ssr.FAM3301).toBe('Gusty wind conditions on takeoff/landing.');
      expect(syl.blocks.find((b) => b.id === 'FAM33').ssr).toBe('Gusty wind conditions on takeoff/landing.');
      expect(ssr.F4103).toBe('Section approach, lost sight procedures, blind rendezvous.');
      expect(ssr.F4101).toBeUndefined();
      expect(ssr.CS4290).toMatch(/^IP’s should select one of the following/);
      expect(ssr.FAM6201).toBeUndefined(); // "None."
    });

    // The notes are a lettered list for the block; an event's own notes are the lines that
    // start with its id. FAM21 has both, FAM62's whole list is the sentence introducing its
    // events' lines, and F41's "(, course rules, etc.)" is the publication's own typo.
    test('reads the syllabus notes: the list to the block, id-led lines to the event', () => {
      const block = (id) => syl.blocks.find((b) => b.id === id).syllabusNotes;
      const event = (id) => (syl.events.find((e) => e.id === id) || {}).syllabusNotes;
      expect(block('FAM21')).toEqual([
        'The student shall bring all required flight gear and practice strapping in on every event in this block.',
        'FAM2101-2 shall only be scheduled as one event per day.',
        'FAM2101-2 should be conducted in the UTD/ER.',
        'The following procedures will be performed by the student on the indicated event.',
      ]);
      expect(event('FAM2101')).toMatch(/^Checklist procedures required: Before exterior inspection,/);
      expect(event('FAM2101')).toMatch(/Checklist procedures optional time permitting: Climb \(passing 10,000 feet\), and descent\.$/);
      expect(block('FAM62')).toEqual(['The following procedures will be performed on each event:']);
      expect(event('FAM6203')).toMatch(/^Execute a full local area profile\./);
      expect(block('F41')).toHaveLength(2);
      expect(event('F4101')).toBeNull();
      expect(block('FAM42')[0]).toBe('Students shall fly four events within FAM4201-4302 off-wing.');
    });

    // Not an exact comparison: the registry's labels were split and trimmed by hand. What must
    // hold is that an item a human tied to a page is still tied to that page, and the report
    // shows how far the automatic split is from the hand split.
    test('links hand-matched items to the same pages', () => {
      const parsed = Object.fromEntries(syl.events.map((e) => [e.id, e.items.map((i) => i.label)]));
      const lost = [];
      const wrong = [];
      let total = 0;
      EVENT_LIST.forEach((event) => {
        const labels = parsed[event.id] || [];
        event.items.forEach((row) => {
          total += 1;
          const key = tokens(row.label).join(' ');
          const label = labels.find((l) => tokens(l).join(' ') === key);
          if (!label) {
            lost.push(`${event.id}: ${row.label}`);
            return;
          }
          // A wording the registry itself ties to two pages may resolve to either.
          const { alternatives } = matcher.matchDetail(label);
          const hand = row.slug || row.href;
          if (!hand) return; // a label-only row: no page to compare against
          if (!alternatives.some((t) => (t.slug || t.href) === hand)) {
            const got = alternatives[0] || {};
            wrong.push(`${event.id}: "${label}" -> ${got.slug || got.href} (hand: ${row.slug || row.href})`);
          }
        });
      });
      const unmatched = syl.events.flatMap((e) => e.items
        .filter((i) => !matcher.matchDetail(i.label).target)
        .map((i) => `${e.id}: ${i.label}`));
      console.log(
        `${unmatched.length} generated items link to no page:\n  ${unmatched.join('\n  ')}\n`
        + `${total - lost.length}/${total} hand labels found verbatim in the split\n`
        + `not found (split differs):\n  ${lost.join('\n  ')}`
      );
      expect(wrong).toEqual([]);
    });
  });
});
