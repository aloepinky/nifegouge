#!/usr/bin/env node
//
// Turns the course rules page's typed-in words into the server document, once.
//
// Before 2026-10-21 the words on /primary/courserules were in the site's code: the rules, radio
// calls and quiz questions in src/components/CourseRulesFeatures.js, the example comms in
// CourseRulesExamples.js, and the airfield cards as HTML inside public/kml/course-rules.kml.
// This reads all three and builds the document lambda/discussApi/courseRules.mjs stores:
//
//   - a rule's HTML becomes plain paragraphs, an underlined line alone becoming a subheading;
//   - each quiz question's answers are found in the rule text by the words around each blank
//     and marked there as [[blanks]], so the quiz is made from the rule from now on;
//   - an airfield card's table becomes blocks of a heading and lines.
//
// A blank that can't be placed by its context is never guessed: it is listed in the report for a
// hand ruling, and the leg's rule is published without it.
//
//   node tools/courserules-seed.js                      writes the document and the report
//   node tools/courserules-seed.js --from=<git rev>     ...from another commit (default e61e4c6,
//                                                       the last one with the words in the code)
//   node tools/courserules-seed.js --out=<dir>          ...somewhere else (default: _courserules-seed/)
//   DISCUSS_ADMIN_TOKEN=... node tools/courserules-seed.js --publish --api=<url> [--author=Name]
//
// It seeds once. The server refuses a second import, and after the first every change is a
// revision made on the site.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadSrc } = require('./lib/loadSrc.js');

const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);

// The files as they stood before the words left the code. They are read out of git, into a
// folder of their own so CourseRulesExamples.js can import CourseRulesFeatures.js beside it.
const FROM = arg('from', 'e61e4c6');
const older = fs.mkdtempSync(path.join(os.tmpdir(), 'courserules-seed-src-'));
const fromGit = (file) => execFileSync('git', ['show', `${FROM}:${file}`], { cwd: ROOT, maxBuffer: 1 << 26 }).toString('utf8');
for (const file of ['CourseRulesFeatures.js', 'CourseRulesExamples.js']) {
  fs.writeFileSync(path.join(older, file), fromGit(`src/components/${file}`));
}
const { crFeatures } = loadSrc(path.join(older, 'CourseRulesFeatures.js'));
const { crExamples } = loadSrc(path.join(older, 'CourseRulesExamples.js'));
const KML = fromGit('public/kml/course-rules.kml');

const clean = (s) => String(s).replace(/\s+/g, ' ').trim();
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''));
const report = [];

// ---------------------------------------------------------------------------------------
// Rules

function paragraphsOf(customDescription) {
  const parts = Array.isArray(customDescription) ? customDescription : [customDescription || ''];
  return parts.map((raw) => {
    const heading = raw.trim().match(/^<u>(.*)<\/u>$/i);
    if (heading) return { text: clean(heading[1]), heading: true };
    const text = clean(raw.replace(/<br\s*\/?>/gi, ' '));
    if (/<[a-z/]/i.test(text)) throw new Error(`Unexpected HTML in a rule: ${text}`);
    return { text };
  }).filter((p) => p.text);
}

// An answer as asked, then as the rule may print it: a figure without its foot mark, and with
// its thousands comma put in or taken out. Lowercase, for comparing.
function spellings(answer) {
  const a = answer.toLowerCase();
  const out = [a];
  const bare = a.replace(/'$/, '');
  if (/^\d[\d,]*$/.test(bare)) {
    const digits = bare.replace(/,/g, '');
    const comma = digits.replace(/\B(?=(\d{3})+$)/g, ',');
    for (const s of [bare, comma, digits]) if (!out.includes(s)) out.push(s);
  }
  return out;
}

// Places one question's answers in `text` (the leg's paragraphs joined by \n), returning the
// [start, end) spans it found and the blanks it could not place.
function placeAnswers(text, question, answers) {
  const q = clean(question);
  const pieces = q.split(/_{2,}/);
  const spans = [];
  const missed = [];
  const lower = text.toLowerCase();
  let cursor = 0;
  for (let k = 0; k < pieces.length - 1; k += 1) {
    const answer = clean(answers[k] == null ? '' : answers[k]);
    if (!answer) { missed.push({ blank: k + 1, answer, why: 'the question has no answer for it' }); continue; }
    const longBefore = pieces[k].slice(-30).trim().toLowerCase();
    const longAfter = pieces[k + 1].slice(0, 30).trim().toLowerCase();
    let at = -1;
    let len = 0;
    const find = (a, start, before, after) => {
      // The words before the blank, then the answer within a few characters of them.
      if (before) {
        for (let p = lower.indexOf(before, start); p !== -1; p = lower.indexOf(before, p + 1)) {
          const from = p + before.length;
          const hit = lower.indexOf(a, from);
          if (hit !== -1 && hit - from <= 6 && !text.slice(from, hit).includes('\n')) return hit;
        }
      }
      // Else the words after it, with the answer just before them.
      if (after) {
        for (let p = lower.indexOf(after, start); p !== -1; p = lower.indexOf(after, p + 1)) {
          const hit = lower.lastIndexOf(a, p);
          if (hit !== -1 && hit >= start && p - (hit + a.length) <= 6 && !text.slice(hit, p).includes('\n')) return hit;
        }
      }
      return -1;
    };
    // The quiz and the rule sometimes spell a figure differently (2500' and 2,500 ft), and a
    // question may ask its blanks in another order than the rule gives them, so the answer as
    // asked is tried first after the last blank, then its other spellings, then the whole rule.
    // Last, the one word either side of the blank ("36 ____ pattern").
    const contexts = [[longBefore, longAfter], [longBefore.split(' ').pop(), longAfter.split(' ')[0]]];
    search: for (const [before, after] of contexts) {
      for (const start of [cursor, 0]) {
        for (const a of spellings(answer)) {
          at = find(a, start, before, after);
          if (at !== -1) { len = a.length; break search; }
        }
      }
    }
    if (at === -1) { missed.push({ blank: k + 1, answer, why: 'its words are not in the rule' }); continue; }
    spans.push([at, at + len]);
    cursor = at + len;
  }
  return { spans, missed };
}

function markRule(id, feature) {
  const paragraphs = paragraphsOf(feature.customDescription);
  const questions = feature.questions || [];
  if (!questions.length) return paragraphs;
  if (!paragraphs.length) {
    report.push({ id, name: feature.name, problem: 'has quiz questions but no rule text', questions });
    return paragraphs;
  }
  const text = paragraphs.map((p) => p.text).join('\n');
  let spans = [];
  questions.forEach((question, i) => {
    const placed = placeAnswers(text, question, (feature.answers || [])[i] || []);
    spans.push(...placed.spans);
    if (placed.missed.length) report.push({ id, name: feature.name, question: i + 1, text: clean(question), missed: placed.missed });
  });
  // The same blank asked twice is one mark; an overlap keeps the first.
  spans = spans.sort((x, y) => x[0] - y[0] || y[1] - x[1]).filter((s, i, all) => i === 0 || s[0] >= all[i - 1][1]);
  let out = '';
  let last = 0;
  for (const [start, end] of spans) {
    out += `${text.slice(last, start)}[[${text.slice(start, end)}]]`;
    last = end;
  }
  out += text.slice(last);
  const marked = out.split('\n');
  return paragraphs.map((p, i) => ({ ...p, text: marked[i] }));
}

// ---------------------------------------------------------------------------------------
// Airfield cards

// One KML card: a title, then each <p> as a block. A <p> that opens with a bold run followed by
// a line break has that run as its heading; WARNING! is a warning block; a coloured bold run
// inside a line ("5 MAX") stays bold.
function cardOf(html) {
  const title = clean((html.match(/<center>([\s\S]*?)<\/center>/i) || [])[1].replace(/<[^>]+>/g, ''));
  const body = html.replace(/<center>[\s\S]*?<\/center>/i, '');
  const blocks = [];
  // A <p> is closed by </p> or, as the cards are typed, by the next <p>.
  for (const m of body.matchAll(/<p>([\s\S]*?)(?=<\/p>|<p>|<\/td>)/gi)) {
    let inner = m[1]
      .replace(/<font[^>]*>\s*<b>([\s\S]*?)<\/b>\s*<\/font>/gi, '**$1**')
      .replace(/<\/?font[^>]*>/gi, '');
    let heading;
    const lead = inner.match(/^\s*<b>([\s\S]*?)<\/b>\s*(?:<br\s*\/?>|<\/br>)?/i);
    if (lead) { heading = clean(lead[1]); inner = inner.slice(lead[0].length); }
    const lines = inner.split(/<br\s*\/?>|<\/br>/i)
      .map((l) => clean(l.replace(/<\/?b>/gi, '**').replace(/<[^>]+>/g, '')))
      .filter(Boolean);
    if (/[<>]/.test(lines.join(''))) throw new Error(`Unexpected HTML in a card line: ${lines.join(' | ')}`);
    const warning = heading && /^warning!?$/i.test(heading);
    if (!heading && !lines.length) continue;
    blocks.push(compact({ heading: warning ? 'WARNING!' : heading, lines, warning: warning || undefined }));
  }
  return { title, blocks };
}

// The airfield cards, by the page's feature ids. The map's popups showed the KML's card, but
// CourseRulesFeatures.js kept its own copy, and for three fields the copy is the fuller one (it
// adds the High-Key, Low-Key and Delta altitudes). The copy is taken; every card where the two
// differ is in the report, to be checked against the manual.
function airfieldCards() {
  const kml = {};
  for (const [placemark] of KML.matchAll(/<Placemark[\s>][\s\S]*?<\/Placemark>/g)) {
    const card = placemark.match(/<description>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/description>/);
    if (card) kml[((placemark.match(/<name>([^<]*)<\/name>/) || [])[1] || '').trim()] = card[1];
  }
  const cards = {};
  for (const [id, feature] of Object.entries(crFeatures)) {
    if (feature.category !== 'Point' || !/<table/i.test(feature.description || '')) continue;
    cards[id] = cardOf(feature.description);
    const shown = kml[feature.name];
    if (!shown) report.push({ id, name: feature.name, problem: 'card is not in the KML, so the map never showed it' });
    else if (clean(shown) !== clean(feature.description)) {
      const was = cardOf(shown).blocks.flatMap((b) => [b.heading, ...b.lines]).filter(Boolean);
      const now = cards[id].blocks.flatMap((b) => [b.heading, ...b.lines]).filter(Boolean);
      report.push({
        id, name: feature.name, problem: 'card differs from the one the map showed (KML); the fuller copy is used',
        added: now.filter((l) => !was.includes(l)), dropped: was.filter((l) => !now.includes(l)),
      });
    }
  }
  return cards;
}

// ---------------------------------------------------------------------------------------

function examplesOf(id) {
  return (crExamples[id] || []).map((b) => compact({
    title: b.title,
    page: b.page == null ? undefined : String(b.page),
    from: b.from == null ? undefined : String(b.from),
    lines: b.lines.map((l) => compact({ ...l, page: l.page == null ? undefined : String(l.page) })),
  }));
}

function build() {
  const legs = {};
  for (const [id, feature] of Object.entries(crFeatures)) {
    const leg = compact({
      rule: markRule(id, feature),
      comms: (feature.comms || []).map((c) => compact({ ...c })),
      examples: examplesOf(id),
    });
    for (const k of ['rule', 'comms', 'examples']) if (leg[k] && !leg[k].length) delete leg[k];
    if (Object.keys(leg).length) legs[id] = leg;
  }
  return {
    id: 'tw4',
    aircraft: 'T-6B',
    school: 'Primary',
    wing: 'TW-4',
    source: { publication: 'TW-4 VFR Course Rules Manual', number: 'COMTRAWINGFOURINST 3710.14', date: '20 Feb 2025' },
    legs,
    airfields: airfieldCards(),
  };
}

async function main() {
  const doc = build();
  const out = path.resolve(ROOT, arg('out', '_courserules-seed'));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'tw4.json'), `${JSON.stringify(doc, null, 2)}\n`);
  fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const legs = Object.values(doc.legs);
  const marks = legs.reduce((n, l) => n + (l.rule || []).reduce((m, p) => m + (p.text.match(/\[\[/g) || []).length, 0), 0);
  console.log(`${Object.keys(doc.legs).length} legs, ${legs.filter((l) => l.rule).length} with a rule, ${marks} quiz blanks, `
    + `${legs.filter((l) => l.comms).length} with radio calls, ${legs.filter((l) => l.examples).length} with examples, `
    + `${Object.keys(doc.airfields).length} airfield cards, ${Math.round(Buffer.byteLength(JSON.stringify(doc)) / 1024)} KB`);
  console.log(`${report.length} items need a hand ruling: ${path.join(out, 'report.json')}`);

  if (!flag('publish')) return;
  const api = arg('api');
  const token = process.env.DISCUSS_ADMIN_TOKEN;
  if (!api || !token) throw new Error('--publish needs --api=<url> and DISCUSS_ADMIN_TOKEN');
  const res = await fetch(`${api.replace(/\/$/, '')}/import-courserules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ id: doc.id, doc, author: arg('author', 'Loevinger') }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`import-courserules: ${res.status} ${body.error || ''}`);
  console.log(`Published ${doc.id} at revision ${body.rev}`);
}

main().catch((error) => { console.error(error.message || error); process.exit(1); });
