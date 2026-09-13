// Loads the discuss corpus for the command-line tools, now that it lives on the server rather
// than in src/components/discuss/items/.
//
// Default: the S3 mirror the site itself reads — items/index.json, then every item, then the
// Delta syllabus document. `--from=<dir>` reads the same layout from a folder instead, which
// is what tools/discuss-migrate.js --out writes and what tools/discuss-dev-server.js keeps
// under _discuss-dev/mirror.
//
// The syllabus comes back through a small adapter with the names discuss-inventory.js used to
// read out of SYLLABUS.js, so the tools did not have to be rewritten around the document.

const fs = require('fs');
const path = require('path');

const MIRROR_URL = process.env.DISCUSS_MIRROR_URL || 'https://pinksheetmafia-discuss.s3.us-east-2.amazonaws.com';
const DELTA_ID = 'delta-primary';
const CONCURRENCY = 16;

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      out[i] = await fn(list[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return out;
}

// The registry surface the tools want, over a syllabus document.
function adapt(doc) {
  const BLOCKS = doc.blocks || [];
  const blockIndex = new Map(BLOCKS.map((b) => [b.id.toUpperCase(), b]));
  const events = BLOCKS.flatMap((block) => block.events.map((e) => ({
    id: e.id,
    title: e.title || block.title,
    note: e.note || null,
    block: block.id,
    stage: block.stage,
  })));
  const eventIndex = new Map(events.map((e) => [e.id.toUpperCase(), e]));
  const syllabusEvent = (id) => (id && eventIndex.get(id.toUpperCase())) || null;
  const blockOf = (eventId) => {
    const e = syllabusEvent(eventId);
    return e ? blockIndex.get(e.block.toUpperCase()) : null;
  };
  const hasDiscussItems = (idOrBlock) => {
    if (!idOrBlock) return false;
    const block = typeof idOrBlock === 'string'
      ? (blockIndex.get(idOrBlock.toUpperCase()) || blockOf(idOrBlock))
      : idOrBlock;
    return !!block && !!block.briefed;
  };
  return {
    STAGES: doc.stages || [],
    BLOCKS,
    SYLLABUS_EVENTS: events,
    EVENT_ROWS: doc.events || [],
    syllabusEvent,
    blockOf,
    hasDiscussItems,
  };
}

// -> { items: [{ file, data }], syllabusDoc, syllabus, source }
async function loadCorpus({ from = null, quiet = false } = {}) {
  const say = (msg) => { if (!quiet) console.error(msg); };
  let index;
  let getItem;
  let deltaRecord;

  if (from) {
    const dir = path.resolve(from);
    index = readJson(path.join(dir, 'items', 'index.json'));
    if (!index) throw new Error(`no items/index.json under ${dir}`);
    getItem = async (slug) => readJson(path.join(dir, 'items', `${slug}.json`));
    deltaRecord = readJson(path.join(dir, 'syllabi', `${DELTA_ID}.json`));
  } else {
    say(`reading ${MIRROR_URL}`);
    index = await fetchJson(`${MIRROR_URL}/items/index.json`);
    if (!index) throw new Error(`no items/index.json at ${MIRROR_URL}`);
    getItem = (slug) => fetchJson(`${MIRROR_URL}/items/${slug}.json`);
    deltaRecord = await fetchJson(`${MIRROR_URL}/syllabi/${DELTA_ID}.json`);
  }

  // Byte order of the old file names, so a run here lists items in the order the file-based
  // linter always did (`holding-pattern` before `holding`, since '-' sorts before '.js').
  const byFile = (e) => `${e.slug}.js`;
  const entries = [...index.items].sort((a, b) => (byFile(a) < byFile(b) ? -1 : byFile(a) > byFile(b) ? 1 : 0));
  const items = await mapLimit(entries, CONCURRENCY, async (entry) => {
    const record = await getItem(entry.slug);
    if (!record) throw new Error(`index lists ${entry.slug} but items/${entry.slug}.json is missing`);
    return { file: `items/${entry.slug}.json`, data: record.item, rev: record.rev };
  });

  if (!deltaRecord) throw new Error(`no syllabi/${DELTA_ID}.json`);
  return {
    items,
    syllabusDoc: deltaRecord.doc,
    syllabus: adapt(deltaRecord.doc),
    source: from ? path.resolve(from) : MIRROR_URL,
  };
}

module.exports = { loadCorpus, adapt, MIRROR_URL, DELTA_ID };
