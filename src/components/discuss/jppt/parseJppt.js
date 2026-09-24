import { loadPageContents } from './pdfSource';
import { loadTextPages } from './pdfText';
import { extractFlow } from './flowExtract';
import { extractSyllabus } from './syllabusExtract';
import { extractCourseLength } from './courseLength';
import { guessProgram } from '../program';

// An uploaded JPPT, start to finish: the PDF in, a syllabus document out.
//
// The document is what gets published and what SyllabusContext.fromDoc renders:
//
//   { version, aircraft?, school?, source: { instruction, date, flowPage, citation },
//     stages: [{ id, label, weight, graded }],
//     blocks: [{ id, stage, media, title, hours, hx?, blkName?, prereqs?, briefed, events: [{ id, title? }] }],
//     events: [{ id, title, block, media, hours, prereqs, syllabusNotes, items: [{ label, slug? | href? }] }],
//     flow:   { VIEWBOX, NODES, LEGEND, EDGES } }
//
// `aircraft` and `school` are guessed from the title page and confirmed by whoever uploads;
// the server refuses a document without both.
//
// `warnings` travels beside the document, not in it: it is for the person fixing the upload.

export const DOC_VERSION = 1;

// Longest-path rank of every box through the chart, so each stage's blocks list in the order a
// student meets them rather than by id. Circles sharing a letter are one point on the figure,
// so an exit circle feeds every entrance with its letter.
export function flowRanks(flow) {
  const nodes = (flow && flow.NODES) || [];
  const out = new Map(nodes.map((n) => [n.id, []]));
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  const link = (a, b) => {
    if (!out.has(a) || !out.has(b) || a === b) return;
    out.get(a).push(b);
    indeg.set(b, indeg.get(b) + 1);
  };
  ((flow && flow.EDGES) || []).forEach((e) => link(e.from, e.to));
  const jumps = nodes.filter((n) => n.kind === 'jump');
  jumps.filter((n) => n.role !== 'entrance').forEach((a) => {
    jumps.filter((b) => b !== a && b.letter === a.letter && b.role !== 'exit').forEach((b) => link(a.id, b.id));
  });

  const rank = new Map(nodes.map((n) => [n.id, 0]));
  const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    seen.add(id);
    out.get(id).forEach((next) => {
      rank.set(next, Math.max(rank.get(next), rank.get(id) + 1));
      indeg.set(next, indeg.get(next) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    });
  }
  const blocks = new Map();
  nodes.forEach((n) => {
    if (!n.block) return;
    const r = seen.has(n.id) ? rank.get(n.id) : Number.MAX_SAFE_INTEGER;
    blocks.set(n.block, Math.min(blocks.has(n.block) ? blocks.get(n.block) : Infinity, r));
  });
  return blocks;
}

export function orderBlocks(blocks, flow) {
  const ranks = flowRanks(flow);
  return blocks
    .map((b, i) => ({ b, i, r: ranks.has(b.id) ? ranks.get(b.id) : Number.MAX_SAFE_INTEGER }))
    .sort((x, y) => (x.b.stage === y.b.stage ? (x.r - y.r) || (x.i - y.i) : x.i - y.i))
    .map((x) => x.b);
}

// A chart with nothing traced still has to be editable: lay the blocks out one column per
// stage so the editor has boxes to move rather than an empty canvas.
export function scaffoldFlow(stages, blocks) {
  const NODES = [];
  stages.forEach((stage, col) => {
    blocks.filter((b) => b.stage === stage.id).forEach((b, row) => {
      const ids = b.events.map((e) => e.id);
      NODES.push({
        id: b.id,
        label: ids.length > 1 ? `${ids[0]}-${ids[ids.length - 1].slice(-2)}` : (ids[0] || b.id),
        x: 20 + col * 70,
        y: 20 + row * 22,
        w: 45,
        h: 15,
        kind: b.hx != null ? 'flight' : 'ground',
        block: b.id,
        events: ids,
      });
    });
  });
  const rows = Math.max(1, ...stages.map((s) => blocks.filter((b) => b.stage === s.id).length));
  return {
    VIEWBOX: `0 0 ${Math.max(200, 40 + stages.length * 70)} ${40 + rows * 22}`,
    NODES,
    LEGEND: [],
    EDGES: [],
  };
}

// `matcher` (jppt/matchItems.js buildMatcher) ties each discuss-item wording to a page;
// `phrases` are the wordings the splitter must not cut through. Both come from the Delta
// syllabus and the item index, which the caller has loaded.
export async function parseJppt(data, onProgress = () => {}, { matcher = null, phrases = [] } = {}) {
  const warnings = [];

  onProgress('Reading the PDF');
  const contents = await loadPageContents(data);

  const textPages = await loadTextPages(data, (page, total) => {
    onProgress(`Reading page ${page} of ${total}`);
  });

  onProgress('Finding blocks and discuss items');
  const syllabus = extractSyllabus(textPages, { phrases, matcher });
  warnings.push(...syllabus.warnings);

  onProgress('Tracing the course flow chart');
  const known = new Set(syllabus.blocks.flatMap((b) => b.events.map((e) => e.id)));
  let flow = null;
  let flowPage = null;
  try {
    const traced = extractFlow(contents, { knownEventIds: known });
    warnings.push(...traced.warnings);
    const { VIEWBOX, NODES, LEGEND, EDGES } = traced;
    flow = { VIEWBOX, NODES, LEGEND, EDGES };
    const footer = (textPages[traced.page - 1] || []).map((l) => l.text).find((t) => /^[IVX]+-\d+$/.test(t));
    flowPage = footer || null;
  } catch (err) {
    warnings.push(`${err.message} The boxes below are laid out from the syllabus text instead; arrange and connect them to match the publication.`);
    flow = scaffoldFlow(syllabus.stages, syllabus.blocks);
  }

  onProgress('Matching discuss items to existing pages');
  const events = syllabus.events.map((e) => ({
    ...e,
    items: e.items.map((row) => ({ label: row.label, ...(matcher ? matcher.matchLabel(row.label) : {}) })),
  }));

  const { instruction, date } = syllabus.source;
  const citation = [
    instruction,
    date && `(${date})`,
  ].filter(Boolean).join(' ') + (flowPage ? `, p. ${flowPage}` : '');

  const courseLength = extractCourseLength(textPages);
  if (!courseLength) warnings.push('No course length table was found (Course Data, Course Length).');

  const opening = textPages.slice(0, 3).flat().map((l) => l.text).join(' ');
  const doc = {
    version: DOC_VERSION,
    ...guessProgram(opening),
    source: { instruction, date, flowPage, citation: citation || null },
    ...(courseLength ? { courseLength } : {}),
    stages: syllabus.stages,
    blocks: orderBlocks(syllabus.blocks, flow),
    events,
    flow,
  };
  return { doc, warnings };
}
