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

// A page is stored at `items/<school>/<slug>.json`: two schools may both have a `turn-pattern`
// and they are different pages. The index prints the bare slug and carries the school beside
// it, which is what lets the address be composed again here. `--school=` scopes a run to one
// school's corpus, and its built-in syllabus comes with it.
const schoolNs = (school) => String(school || '').trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const itemPath = (entry) => {
  const ns = schoolNs(entry.school);
  return ns ? `${ns}/${entry.slug}` : entry.slug;
};
const SYLLABUS_OF = { primary: DELTA_ID, nife: 'nife-flight' };
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
async function loadCorpus({ from = null, quiet = false, school = null } = {}) {
  const say = (msg) => { if (!quiet) console.error(msg); };
  let index;
  let getItem;
  let deltaRecord;
  const ns = schoolNs(school);
  const syllabusId = SYLLABUS_OF[ns] || DELTA_ID;

  if (from) {
    const dir = path.resolve(from);
    index = readJson(path.join(dir, 'items', 'index.json'));
    if (!index) throw new Error(`no items/index.json under ${dir}`);
    getItem = async (rel) => readJson(path.join(dir, 'items', `${rel}.json`));
    deltaRecord = readJson(path.join(dir, 'syllabi', `${syllabusId}.json`));
  } else {
    say(`reading ${MIRROR_URL}`);
    index = await fetchJson(`${MIRROR_URL}/items/index.json`);
    if (!index) throw new Error(`no items/index.json at ${MIRROR_URL}`);
    getItem = (rel) => fetchJson(`${MIRROR_URL}/items/${rel}.json`);
    deltaRecord = await fetchJson(`${MIRROR_URL}/syllabi/${syllabusId}.json`);
  }

  // Byte order of the old file names, so a run here lists items in the order the file-based
  // linter always did (`holding-pattern` before `holding`, since '-' sorts before '.js').
  const byFile = (e) => `${e.slug}.js`;
  const scoped = ns ? index.items.filter((e) => schoolNs(e.school) === ns) : index.items;
  const entries = [...scoped].sort((a, b) => (byFile(a) < byFile(b) ? -1 : byFile(a) > byFile(b) ? 1 : 0));
  const items = await mapLimit(entries, CONCURRENCY, async (entry) => {
    const rel = itemPath(entry);
    const record = await getItem(rel);
    if (!record) throw new Error(`index lists ${entry.slug} but items/${rel}.json is missing`);
    return { file: `items/${rel}.json`, data: record.item, rev: record.rev };
  });

  if (!deltaRecord) throw new Error(`no syllabi/${syllabusId}.json`);
  return {
    items,
    syllabusDoc: deltaRecord.doc,
    syllabus: adapt(deltaRecord.doc),
    source: from ? path.resolve(from) : MIRROR_URL,
  };
}

module.exports = { loadCorpus, adapt, MIRROR_URL, DELTA_ID, schoolNs };
