// Reading a bulk upload into question rows. Plain JS, no React, so parseUpload.test.js can run
// it on real pastes. Two shapes come in:
//
//   table    rows copied out of Excel or Google Sheets (tab-separated), or a .csv file: one
//            question per row. Columns are Question, Correct, Wrong 1, Wrong 2, Wrong 3,
//            Lecture, Explanation in that order unless a header row names them.
//   quizlet  a Quizlet set's export: term and definition per card, the term the question and
//            the definition the correct answer. Quizlet lets the exporter pick a tab or a comma
//            between the two and a newline or a semicolon between cards; all four are read.
//            A card has no wrong answers, so three are borrowed from other cards'
//            definitions, closest in length, and the row says so, to be checked.

const FIELDS = ['question', 'correctAnswer', 'incorrectAnswer1', 'incorrectAnswer2', 'incorrectAnswer3', 'lecture', 'explanation'];
const WRONG = ['incorrectAnswer1', 'incorrectAnswer2', 'incorrectAnswer3'];

// Header names, loosely: what a person is likely to have typed at the top of a column.
const HEADERS = [
  ['question', /^(question|questions|q|prompt|stem|term)$/],
  ['correctAnswer', /^(correct|correct answer|answer|right|right answer|key|answer key|definition)$/],
  ['wrong', /^(wrong|incorrect|distractor|false|other)( answer| choice| option)?s? ?\d*$/],
  ['lecture', /^(lecture|lec|lesson|lecture number)$/],
  ['explanation', /^(explanation|why|reason|rationale|notes?|comments?)$/],
  ['topic', /^(topic|section|subject|category)$/],
];

const clean = (s) => (s == null ? '' : String(s)).replace(/\r/g, '').trim();
const headerName = (cell) => clean(cell).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// RFC 4180 fields: a quoted field may hold the delimiter, newlines and doubled quotes. Excel
// quotes a copied cell that holds a newline, so the same reader serves a paste and a file.
export function parseDelimited(text, delim) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const src = text.replace(/\r\n?/g, '\n');
  while (i < src.length) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { quoted = false; i += 1; continue; }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && field === '') { quoted = true; i += 1; continue; }
    if (ch === delim) { row.push(field); field = ''; i += 1; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 1; continue; }
    field += ch;
    i += 1;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((c) => clean(c)));
}

// Which shape a paste is, and what separates its parts. `text` is looked at, not trusted: the
// upload page lets the person overrule it.
export function detect(text) {
  const src = (text || '').replace(/\r\n?/g, '\n').trim();
  const lines = src.split('\n').filter((l) => l.trim());
  const delim = lines.filter((l) => l.includes('\t')).length >= Math.max(1, lines.length / 2) ? '\t' : ',';
  // One long line holding semicolons is Quizlet with semicolons between cards.
  const rowSep = lines.length <= 1 && src.includes(';') ? ';' : '\n';
  if (rowSep === ';') return { format: 'quizlet', delim, rowSep };
  const rows = parseDelimited(src, delim);
  const widest = Math.max(0, ...rows.map((r) => r.length));
  if (rows.length && isHeader(rows[0])) return { format: 'table', delim, rowSep };
  return { format: widest <= 2 ? 'quizlet' : 'table', delim, rowSep };
}

function isHeader(cells) {
  const named = cells.filter((c) => HEADERS.some(([, re]) => re.test(headerName(c))));
  return named.length >= 2;
}

// Column index -> field, from a header row, or positional when there is none.
function columnsFor(header) {
  if (!header) return FIELDS;
  let wrong = 0;
  return header.map((cell) => {
    const name = headerName(cell);
    const hit = HEADERS.find(([, re]) => re.test(name));
    if (!hit) return null;
    if (hit[0] === 'wrong') {
      wrong += 1;
      return wrong <= 3 ? WRONG[wrong - 1] : null;
    }
    return hit[0];
  });
}

const blankRow = () => ({
  question: '', correctAnswer: '', incorrectAnswer1: '', incorrectAnswer2: '', incorrectAnswer3: '',
  lecture: '', explanation: '', topic: '', borrowed: false,
});

function parseTable(src, delim) {
  const rows = parseDelimited(src, delim);
  if (!rows.length) return [];
  const header = isHeader(rows[0]) ? rows[0] : null;
  const columns = columnsFor(header);
  return (header ? rows.slice(1) : rows).map((cells) => {
    const row = blankRow();
    cells.forEach((cell, i) => { if (columns[i]) row[columns[i]] = clean(cell); });
    return row;
  });
}

// Each card split at its first separator only, since a Quizlet export does not quote and a
// definition may well hold a comma.
function parseQuizlet(src, delim, rowSep) {
  const cards = src.replace(/\r\n?/g, '\n').split(rowSep).map((c) => c.trim()).filter(Boolean);
  const rows = cards.map((card) => {
    const at = card.indexOf(delim);
    const row = blankRow();
    row.question = clean(at < 0 ? card : card.slice(0, at));
    row.correctAnswer = clean(at < 0 ? '' : card.slice(at + 1));
    return row;
  });
  return borrowWrongAnswers(rows);
}

const norm = (s) => clean(s).toLowerCase().replace(/\s+/g, ' ');

// Three wrong answers for each card from the other cards' definitions, those closest to its own
// in length first, since an answer twice as long as the others gives itself away.
export function borrowWrongAnswers(rows) {
  return rows.map((row, i) => {
    const own = norm(row.correctAnswer);
    const seen = new Set([own]);
    const pool = rows
      .map((other, j) => ({ text: other.correctAnswer, j }))
      .filter(({ text, j }) => j !== i && clean(text))
      .sort((a, b) => Math.abs(a.text.length - row.correctAnswer.length) - Math.abs(b.text.length - row.correctAnswer.length) || a.j - b.j);
    const picked = [];
    for (const { text } of pool) {
      if (picked.length === 3) break;
      if (seen.has(norm(text))) continue;
      seen.add(norm(text));
      picked.push(clean(text));
    }
    const out = { ...row, borrowed: picked.length > 0 };
    picked.forEach((text, k) => { out[WRONG[k]] = text; });
    return out;
  });
}

// The whole read: text in, rows out. `format` overrules what detect() guessed.
export function parseUpload(text, { format } = {}) {
  const src = (text || '').trim();
  if (!src) return { format: format || 'table', rows: [] };
  const guess = detect(src);
  const chosen = format || guess.format;
  const rows = chosen === 'quizlet'
    ? parseQuizlet(src, guess.delim, guess.rowSep)
    : parseTable(src, guess.delim);
  return { format: chosen, rows: rows.filter((r) => r.question || r.correctAnswer) };
}

// What stops a row from being sent, in the words the page shows. The same rules the server
// applies to one question.
export function problemsWith(row) {
  const out = [];
  if (!clean(row.question)) out.push('No question.');
  if (!clean(row.correctAnswer)) out.push('No correct answer.');
  const answers = [row.correctAnswer, ...WRONG.map((k) => row[k])].map(norm).filter(Boolean);
  if (clean(row.correctAnswer) && answers.length < 2) out.push('No wrong answers.');
  if (new Set(answers).size !== answers.length) out.push('Two answers are the same.');
  return out;
}

// ---------------------------------------------------------------------------------------
// Likely duplicates of questions already in the quiz: the same words once case and
// punctuation are set aside, or a word-set Dice coefficient of 0.8 or more (the measure
// discuss/jppt/matchItems.js uses to tie a JPPT wording to a page).

const words = (s) => new Set(clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w.length > 1));

export function dice(a, b) {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  x.forEach((w) => { if (y.has(w)) shared += 1; });
  return (2 * shared) / (x.size + y.size);
}

export const DUPLICATE_AT = 0.8;

// The live question this row most looks like, if it looks like one enough to mention.
export function likelyDuplicate(row, live) {
  const key = words(row.question);
  if (!key.size) return null;
  let best = null;
  for (const q of live) {
    const score = norm(q.question) === norm(row.question) ? 1 : dice(row.question, q.question);
    if (score >= DUPLICATE_AT && (!best || score > best.score)) best = { question: q, score };
  }
  return best;
}
