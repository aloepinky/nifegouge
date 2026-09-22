// A briefing guide PDF, read into brief documents. Plain JS, no JSX, like ../discuss/jppt/.
//
// The input is pdf.js's text items, one array per page (loadTextItems in
// ../discuss/jppt/pdfText.js). The TW-4 Briefing Guide (COMTRAWINGFOURINST 1552.1) prints each
// brief twice, and both halves are read:
//
// - The expanded guide: one column of outline, `1. Administration` / `a. Local Area: <text>` /
//   `(1)` / `(a)`. This is where the words a student says come from.
// - The card (`FIGURE 1. … BRIEFING LIST`): two columns of short item names, which is what the
//   page shows as the prompt. Its layout is the page's layout, so each section keeps the column
//   and the card page it was printed on.
//
// A brief with no card (the Solo guide) keeps the guide's own names in one column.
//
// The guide is Paper Capture OCR, so its text layer splits words mid-run ("acti on") and puts
// spaces inside punctuation. Runs are joined by the gap between them rather than by the word
// boundaries pdf.js reports, and the outline is read by marker and indent, never by number:
// the FORM guide numbers two sections `5.`.

import { PROGRAMS } from '../programs';

const LINE_TOLERANCE = 2.5;
const COLUMN_GAP = 18; // a gap this wide between runs on one line is two columns
const WORD_GAP = 1.5; // a gap narrower than this is inside a word

const FURNITURE = [
  /^[A-Z]{4,}INST\s+[\d.]+[A-Z]?$/, // COMTRAWINGFOURINST 1552.1
  /^\d{1,2} [A-Z][a-z]{2} \d{4}$/, // 10 Mar 2025
  /^(\d+\s+)?Enclosure \(\s*\d+\s*\)$/, // 11 Enclosure (2)
  /^Version\s+[\d.]+\s+\d{1,2}\s+[A-Za-z]+\s+\d{4}$/, // Version 2.0 13 March 2026
  /^\d+$/,
];

// ---------------------------------------------------------------------------------------
// Lines

// -> [{ y, segs: [{ x, text }] }], top of page first. A seg is one column's run of text.
//
// Bold runs come back wrapped in `**`, the one piece of markup the page renders. The card
// prints its headings bold, and one item — OCF procedures — bold to say brief it every flight;
// the guide's pages carry no bold at all.
// `keepFurniture` leaves the running head and footer in, which is how the guide's own
// instruction and date are read; everything else wants them gone.
export function pageLines(items, keepFurniture) {
  const runs = items
    .filter((i) => i.str !== '')
    .map((i) => ({
      s: i.str, x: i.transform[4], x2: i.transform[4] + (i.width || 0), y: i.transform[5], bold: !!i.bold,
    }));
  runs.sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const rows = [];
  runs.forEach((r) => {
    const row = rows.find((l) => Math.abs(l.y - r.y) <= LINE_TOLERANCE);
    if (row) row.runs.push(r);
    else rows.push({ y: r.y, runs: [r] });
  });
  rows.sort((a, b) => b.y - a.y);
  return rows.map((row) => {
    row.runs.sort((a, b) => a.x - b.x);
    const segs = [];
    let cur = null;
    let end = -Infinity;
    row.runs.forEach((r) => {
      const gap = r.x - end;
      if (!cur || (gap > COLUMN_GAP && r.s.trim())) {
        cur = { x: r.x, parts: [] };
        segs.push(cur);
      } else if (!/^\s/.test(r.s) && !/\s$/.test(lastText(cur)) && gap > WORD_GAP) {
        cur.parts.push({ s: ' ', bold: false });
      }
      cur.parts.push({ s: r.s, bold: r.bold });
      end = r.s.trim() ? r.x2 : Math.max(end, r.x2);
      cur.end = end;
    });
    const kept = segs
      .map((s) => ({ x: s.x, x2: s.end, text: tidy(withBold(s.parts)) }))
      .filter((s) => s.text && (keepFurniture || !FURNITURE.some((re) => re.test(s.text))));
    return { y: row.y, segs: kept };
  }).filter((l) => l.segs.length);
}

const lastText = (seg) => (seg.parts.length ? seg.parts[seg.parts.length - 1].s : '');

// Runs joined, with each stretch of bold ones wrapped. The markers go inside the spaces, so
// `**OCF procedures** (Brief every Flight)` never comes out as `** OCF procedures **`.
function withBold(parts) {
  let out = '';
  let open = false;
  parts.forEach(({ s, bold }) => {
    const blank = !s.trim();
    if (!blank && bold !== open) {
      out += '**';
      open = bold;
    }
    out += s;
  });
  return open ? `${out}**` : out;
}

// Text with the bold markers taken out, for every test that asks what a line says rather than
// how it is set.
export const plain = (text) => (text || '').replace(/\*\*/g, '');

// The OCR's spacing around punctuation, undone.
function tidy(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\*{3,}\s*([^*]+?)\s*\*{3,}/g, '**$1**') // ***Do not be afraid…*** is the page's bold
    .replace(/\s+([.,;:!?)\]”’])/g, '$1')
    .replace(/([(“‘[])\s+/g, '$1')
    .trim();
}

// Lines joined into running text. A line ending in a hyphen joins without a space, keeping the
// hyphen: every break of that shape in the guide is a real hyphen (four-second, 4-6).
function joinText(parts) {
  return parts.reduce((out, part) => {
    if (!out) return part;
    if (part === '\n\n') return `${out.trimEnd()}\n\n`; // a paragraph break takes no space
    if (out.endsWith('\n\n')) return out + part;
    return /\S-$/.test(out) ? out + part : `${out} ${part}`;
  }, '');
}

const isCaps = (text) => /[A-Z]{3}/.test(plain(text)) && plain(text) === plain(text).toUpperCase();

// ---------------------------------------------------------------------------------------
// Where the briefs are

// A title names the guide it opens, in capitals (`T-6B MISSION/NATOPS BRIEFING GUIDE FOR FAM,
// VNAV, AND INAV STAGES`) or in title case (`NIFE Expanded Briefing Guide`). A sentence that
// merely mentions a briefing guide is longer than a name and closes with a stop, and a line
// that opens with an outline marker is a contents entry naming one — `(4) T-6B Solo Briefing
// Guide` — rather than the guide's own title page.
const isBriefTitle = (text) => /\bBRIEFING GUIDE\b/i.test(text)
  && !/^FIGURE\b/.test(text) && !STOPPED.test(plain(text)) && !PAREN.test(plain(text))
  && (isCaps(text) || (words(plain(text)) <= 8 && !/[.,;:]$/.test(plain(text)) && isTitleCase(plain(text))));
const isFigureCaption = (text) => /^FIGURE \d+\./.test(text);

// A page of the card is laid out in two columns; a page of the guide never is.
function isCardPage(lines) {
  return lines.filter((l) => l.segs.length >= 2).length >= 3;
}

// ---------------------------------------------------------------------------------------
// The guide

const L1 = /^(\d{1,2})\.\s+(.*)$/;
const L2 = /^([a-z])\.\s+(.*)$/;
const L2_NO_STOP = /^([a-z])\s+([A-Z].*)$/; // the OCR dropped the stop: `b Profile/Sequence`
const L3 = /^\((\d{1,2})\)\s*(.*)$/;
const L4 = /^\(([a-z])\)\s*(.*)$/;

// -> { note, nodes: [{ level, marker, parts, children }] } from single-column lines.
function readOutline(lines) {
  const margin = Math.min(...lines.map((l) => l.x));
  const root = { level: 0, children: [] };
  const stack = [root];
  const note = [];
  let current = null;

  lines.forEach(({ x, text }) => {
    let level = 0;
    let m = null;
    // A section number sits on the margin, where a wrapped line also starts; the lower
    // markers are never how a sentence begins, so they are taken wherever they fall (the Solo
    // guide prints its `a.` on the margin).
    if ((m = text.match(L1)) && x < margin + 8) level = 1;
    else if ((m = text.match(L2))) level = 2;
    else if (x >= margin + 8 && (m = text.match(L2_NO_STOP))) level = 2;
    else if ((m = text.match(L3))) level = 3;
    else if ((m = text.match(L4))) level = 4;

    if (!level) {
      const target = current ? current.parts : note;
      if (/^Note\s*:/.test(text) && target.length) target.push('\n\n');
      target.push(text);
      return;
    }
    const node = { level, marker: m[1], parts: [m[2]], children: [] };
    while (stack[stack.length - 1].level >= level) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
    current = node;
  });

  return { note: joinText(note), nodes: root.children };
}

// ---------------------------------------------------------------------------------------
// The guide, written the other way round
//
// The NIFE Expanded Briefing Guide numbers `1)` / `a)` / `i)` and runs its prose on `-` lines,
// where the Primary guide stops its markers and brackets the lower two. Two things about it
// cannot be read off the marker, and both are read off the page instead.
//
// A level: `i)` is the ninth letter to one guide and the first numeral to another, so the level
// is which rung of the indent ladder the line starts on rather than what the marker looks like.
//
// A name: this guide sets each name bold and runs its words on after it — `**b) Crew Day and
// Rest **Brief start and projected end…` — so the bold run is the name and there is nothing to
// infer.

const PAREN = /^(\d{1,2}|[a-z]|[ivxl]{1,5})\)\s+(.*)$/i;
const DASH = /^[-–—]\s*/;
const BOLD_DASH = /^(\*\*)?[-–—]\s*(\*\*)?/;

// Which of the two the guide in hand is written in.
const STOPPED = /^(?:\d{1,2}\.|[a-z]\.|\(\d{1,2}\)|\([a-z]\))\s/;
const isParenStyle = (lines) => lines.filter((l) => PAREN.test(plain(l.text))).length
  > lines.filter((l) => STOPPED.test(plain(l.text))).length;

// `**b) Crew Day and Rest **Brief start…` -> the name and what is said about it. The marker
// sits inside the bold run, so it comes out of the name rather than off the front of the line.
function splitBoldName(text) {
  const bold = text.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
  if (bold) {
    const label = bold[1].replace(PAREN, '$2').replace(/[.:]$/, '').trim();
    const body = bold[2].replace(DASH, '').trim();
    return { label, parts: body ? [body] : [] };
  }
  const m = text.match(PAREN);
  return { parts: [m ? m[2] : text] };
}

function readParenOutline(lines) {
  const rungs = [...new Set(lines.filter((l) => PAREN.test(plain(l.text))).map((l) => Math.round(l.x)))]
    .sort((a, b) => a - b);
  const levelOf = (x) => {
    let level = 1;
    rungs.forEach((rung, i) => { if (x >= rung - 2) level = i + 1; });
    return level;
  };

  // A line that stops well short of the right margin ended where it meant to; one that runs up
  // to the margin was broken by it, and the line beneath carries the same sentence on. The
  // margin is never reached exactly, so "short of it" is a share of the column, and the share
  // is tuned to this guide: read it wrongly and two sentences join or one splits, which is
  // worth less than the sentences a guide would lose by joining everything.
  const right = Math.max(...lines.map((l) => l.x2 || 0));
  const column = right - (rungs.length ? rungs[0] : 0);
  const fills = (line) => (line.x2 || 0) >= right - column * 0.12;

  const root = { level: 0, children: [] };
  const stack = [root];
  const note = [];
  let current = null;
  let previous = null;

  lines.forEach((line) => {
    const m = plain(line.text).match(PAREN);
    const named = m ? splitBoldName(line.text) : null;
    // `**a) **DOR/TTO is in effect…` is a marker with nothing bold after it: the guide numbered
    // a paragraph of the section above rather than naming an item, so that is what it becomes.
    if (m && named.label !== '') {
      const level = levelOf(line.x);
      const node = { level, marker: m[1], ...named, children: [] };
      while (stack[stack.length - 1].level >= level) stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push(node);
      current = node;
    } else {
      const target = current ? current.parts : note;
      const body = named ? joinText(named.parts) : line.text.replace(BOLD_DASH, '');
      const dashed = !named && DASH.test(plain(line.text));
      if (target.length && (dashed || named || !previous || !fills(previous))) target.push('\n\n');
      target.push(body);
    }
    previous = line;
  });

  return { note: joinText(note), nodes: root.children };
}

const words = (text) => text.split(/\s+/).filter(Boolean).length;

const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'if', 'in', 'is', 'of', 'on', 'or', 'the', 'to']);

// `Training Time-Out/Drop on Request Policy Is In Effect` is a name; `Solo flights are not
// usually graded` is a sentence.
function isTitleCase(text) {
  const counted = text.split(/\s+/).map((w) => w.replace(/^[^A-Za-z]+/, '')).filter((w) => w && !SMALL.has(w));
  return counted.length > 0 && counted.filter((w) => /^[A-Z]/.test(w)).length / counted.length >= 0.75;
}

// `Local Area: Brief current METARs…` -> ['Local Area', 'Brief current METARs…']. The name is
// what comes before the first colon or full stop, when that is short enough to be a name;
// otherwise the whole of it is the name and there is no text (`a. Unsafe gear.`).
// A name ended by a full stop has to read as one (title case); one ended by a colon need not.
export function splitName(text) {
  const m = text.match(/^(.{2,90}?)(:|\.(?=\s|$))\s*(.*)$/s);
  if (m && words(m[1]) <= 10 && !/\d$/.test(m[1]) && (m[2] === ':' || isTitleCase(m[1]))) {
    return [m[1].trim(), m[3].trim()];
  }
  return [text.replace(/[.:]$/, '').trim(), ''];
}

// `Familiarization and VNAV Stage. "If an IMC…` -> the lead-in in bold, as the page prints it.
// `Identify Hazards: What could go wrong?` and `UHF TAC Pri. Brief preset and manual…` too:
// the lead-in names the thing and the rest says it. A colon is enough on its own; a full stop
// has to be closing a name (`Time Critical.`, `UHF TAC Pri.`) rather than an abbreviation
// inside a sentence, which is what keeps `considerations (i.e. special taxi instructions…`
// out of it. A line with nothing after the lead-in, and lines under it, is bold end to end.
function boldLeadIn(text, hasChildren) {
  if (!text) return text;
  const m = text.match(/^([A-Z][^.:“"\n]{0,60}?([.:]))[ \t]+(\S)/);
  if (m && words(m[1]) <= 8 && (m[2] === ':' || isTitleCase(m[1]) || /[“"‘]/.test(m[3]))) {
    return `**${m[1]}** ${text.slice(m[0].length - m[3].length)}`;
  }
  if (hasChildren && words(text) <= 8 && !/[“"]/.test(text)) return `**${text}**`;
  return text;
}

// A guide that sets its own names bold has already said which words are the name (see
// readParenOutline); one that does not leaves it to be read off the punctuation.
const nameOf = (node) => (node.label === undefined
  ? splitName(joinText(node.parts))
  : [node.label, joinText(node.parts)]);

function toChild(node, id) {
  const children = node.children.map((c, i) => toChild(c, `${id}-${i + 1}`));
  const body = joinText(node.parts);
  const text = node.label === undefined
    ? boldLeadIn(body, children.length > 0)
    : [`**${node.label}**`, body].filter(Boolean).join(' ');
  return {
    id,
    marker: `(${node.marker})`,
    text,
    children,
  };
}

function toItem(node, id) {
  const [label, text] = nameOf(node);
  return {
    id,
    label,
    card: [],
    text,
    children: node.children.map((c, i) => toChild(c, `${id}-${i + 1}`)),
  };
}

function toGuideSection(node) {
  const [title, text] = nameOf(node);
  const items = [];
  node.children.forEach((child) => {
    // A (1) straight under a section, with no a. above it, is an item of its own.
    items.push(toItem(child, `${items.length + 1}`));
  });
  return { title, text, items };
}

// ---------------------------------------------------------------------------------------
// The card

const CARD_ITEM = /^(\d{1,2})\.\s*(.*)$/;
const CARD_SUB = /^(?:[a-z]\.|\(\d{1,2}\)|\([a-z]\))\s*/;

// `**12. OCF procedures**` -> `12. **OCF procedures**`, so a bold line still reads as a
// numbered one. The card sets a whole item bold; the number is not part of what it says.
function hoistMarker(text) {
  return text.replace(/^\*\*((?:\d{1,2}\.|[a-z]\.|\([0-9a-z]{1,2}\))\s*)/, '$1**');
}

// Card pages -> [{ title, column, page, items: [{ label, card: [text] }] }], in reading order:
// each page's left column, then its right.
function readCard(cardPages) {
  const sections = [];
  cardPages.forEach((lines, pageIndex) => {
    const seconds = lines.filter((l) => l.segs.length >= 2).map((l) => l.segs[1].x);
    const rightX = seconds.length ? Math.min(...seconds) - 15 : Infinity;
    const columns = [[], []];
    lines.forEach((l) => l.segs.forEach((s) => {
      if (isFigureCaption(s.text)) return;
      columns[s.x >= rightX ? 1 : 0].push(hoistMarker(s.text));
    }));
    columns.forEach((texts, col) => {
      let section = null;
      let item = null;
      let lastParts = null;
      texts.forEach((text) => {
        let m;
        // A heading is capitals with no closing stop; `WAVE OFF.` is a sentence wrapping.
        if (isCaps(text) && !/[.,;:]$/.test(plain(text)) && !CARD_ITEM.test(text) && !CARD_SUB.test(text)) {
          // A heading is already set bold by the page; the card's own bold says nothing more.
          section = { title: plain(text), column: col + 1, page: pageIndex + 1, items: [] };
          sections.push(section);
          item = null;
          lastParts = null;
        } else if (section && (m = text.match(CARD_ITEM))) {
          item = { parts: [m[2]], card: [] };
          section.items.push(item);
          lastParts = item.parts;
        } else if (item && CARD_SUB.test(text)) {
          const line = [text];
          item.card.push(line);
          lastParts = line;
        } else if (lastParts) {
          lastParts.push(text);
        }
      });
    });
  });
  return sections.map((s) => ({
    ...s,
    items: s.items.map((it) => {
      const label = joinText(it.parts);
      return {
        label: words(label) <= 10 ? label.replace(/[.:]$/, '') : label,
        card: it.card.map(joinText),
      };
    }),
  }));
}

// ---------------------------------------------------------------------------------------
// The brief

const norm = (title) => plain(title).toLowerCase().replace(/[^a-z]+/g, ' ')
  .split(' ').filter((w) => w && w !== 'and' && w !== 'the').join(' ');

export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'section';
}

// `T-6B MISSION/NATOPS BRIEFING GUIDE FOR FORM AND CAPSTONE STAGES` -> `FORM / CAPSTONE`, and
// `NIFE Expanded Briefing Guide` -> `NIFE`: the button says which brief it is, so the words
// every brief carries are not on it.
export function shortName(title) {
  const m = title.match(/\bFOR\s+(.+?)\s+STAGES?\b/i);
  const core = (m ? m[1] : title.replace(/\bBRIEFING GUIDE\b.*$/i, '').replace(/^T-\d+[A-Z]?\s+/, ''))
    .replace(/\bEXPANDED\b/i, '');
  return core.split(/\s*,\s*(?:AND\s+)?|\s+AND\s+/i).map((s) => s.trim()).filter(Boolean).join(' / ')
    || title;
}

function mintIds(sections) {
  const used = new Set();
  return sections.map((s) => {
    let id = slugify(s.title);
    for (let n = 2; used.has(id); n += 1) id = `${slugify(s.title)}-${n}`;
    used.add(id);
    return { ...s, id, items: s.items.map((it, i) => ({ ...it, id: `${id}-${i + 1}` })) };
  });
}

// ---------------------------------------------------------------------------------------
// Out of the parser's nodes and into the document, which is plain text throughout.
//
// A page of this is text with a little shape: numbered lines, two spaces to a level, blank
// lines between paragraphs. Keeping the nesting as data bought nothing the page draws and
// made editing an item a tree of boxes instead of the text it prints.

const paragraphsOf = (text) => (text || '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);

function nodeLines(nodes, depth, out) {
  (nodes || []).forEach((node) => {
    const pad = '  '.repeat(depth);
    const [first, ...rest] = paragraphsOf(node.text);
    out.push(`${pad}${node.marker} ${first || ''}`.trimEnd());
    rest.forEach((para) => out.push('', `${pad}${para}`));
    nodeLines(node.children, depth + 1, out);
  });
  return out;
}

// An item's body: its paragraphs, then its numbered lines.
function bodyText(item) {
  const out = paragraphsOf(item.text).flatMap((para, i) => (i ? ['', para] : [para]));
  if (item.children.length && out.length) out.push('');
  return nodeLines(item.children, 0, out).join('\n').trim();
}

// A section nobody can open — the card's own lists, which the guide says nothing more about —
// is one block of text rather than a row of items that do nothing when clicked.
const isFixedSection = (section) => section.items.length > 0
  && section.items.every((it) => !it.text && !it.children.length);

// The card's lines, indented the way it sets them: `a.` at the top, `(1)` under the `a.` it
// belongs to. The card reader keeps them flat, because the marker is what says the level. The
// lead-ins are bolded here as they are in the guide, and a line that ends in a colon with
// lines beneath it is a heading for them, so it is bold end to end.
const CARD_LINE = /^((?:[a-z]\.|\([0-9a-z]{1,2}\))\s+)(.*)$/i;

function cardText(card, base = 0) {
  const lines = card || [];
  const deeper = (i) => i + 1 < lines.length && /^\(/.test(lines[i + 1]) && !/^\(/.test(lines[i]);
  return lines
    .map((line, i) => {
      const m = line.match(CARD_LINE);
      const [marker, rest] = m ? [m[1], m[2]] : ['', line];
      const bold = /:$/.test(rest) && deeper(i) ? `**${rest}**` : boldLeadIn(rest, false);
      return `${'  '.repeat(base + (/^\(/.test(line) ? 1 : 0))}${marker}${bold}`;
    })
    .join('\n');
}

function fixedText(items) {
  const out = [];
  items.forEach((item, i) => {
    out.push(`${i + 1}. ${item.label}`);
    if ((item.card || []).length) out.push(cardText(item.card, 1));
  });
  return out.join('\n');
}

function toDocument(sections) {
  return sections.map((s) => {
    if (isFixedSection(s)) {
      return {
        ...s, fixed: true, text: fixedText(s.items), items: [],
      };
    }
    return {
      ...s,
      items: s.items.map((item) => {
        const card = cardText(item.card);
        const body = bodyText(item);
        // Nothing to open: the card's lines are the item, and it is fixed like a section.
        if (card && !body) return { label: item.label, fixed: true, text: card };
        // Both: the card keeps its lines under the name and the guide's words open behind it.
        if (card) return { label: item.label, subtext: card, text: body };
        return { label: item.label, text: body };
      }),
    };
  });
}

// Every line a node and its children carry.
function nodeTexts(nodes, out = []) {
  (nodes || []).forEach((n) => {
    if (n.text) out.push(n.text);
    nodeTexts(n.children, out);
  });
  return out;
}

const wordsIn = (text) => (plain(text).toLowerCase().match(/[a-z0-9]+/g) || []);

// Is the guide's version of an item the card's version over again?
//
// Apply time critical ORM and ATJ review of stage performance are printed twice in the same
// words, so opening them would show what is already on screen; the page prints those inert,
// as the card does. Two things have to hold: the guide says it in no more lines than the card
// does, and nearly every word it uses is already on the card. Mission planning fails the
// second (four labels against four sentences) and Loss of sight the first (two labels against
// thirteen lines), which is what makes both of those real expansions.
function repeatsCard(item) {
  const bodyLines = [item.text, ...nodeTexts(item.children)].filter(Boolean);
  if (!item.card.length || !bodyLines.length || bodyLines.length > item.card.length) return false;
  const card = new Set(item.card.flatMap(wordsIn));
  const body = bodyLines.flatMap(wordsIn);
  if (!card.size || body.length < 4) return false;
  return body.filter((w) => card.has(w)).length / body.length >= 0.6;
}

const dice = (a, b) => {
  const A = new Set(wordsIn(a));
  const B = new Set(wordsIn(b));
  if (!A.size || !B.size) return 0;
  const shared = [...A].filter((w) => B.has(w)).length;
  return (2 * shared) / (A.size + B.size);
};

// The guide prints the ELP training rules under Mission execution, and the card prints them
// again as a section of their own. A student reads them from the section, so the item keeps
// its lead-in — `read training rules verbatim, do not memorize` — and loses the copy. Only a
// run of three or more lines that matches a section of the same brief is dropped, so an item
// that merely mentions a rule keeps it.
function dropDuplicatedRules(sections) {
  const blocks = sections
    .filter((s) => s.items.length >= 3 && s.items.every((it) => !it.text && !it.children.length))
    .map((s) => s.items.map((it) => it.label));

  const prune = (nodes) => (nodes || []).map((node) => {
    const kids = node.children || [];
    const matches = (block) => kids.length >= 3
      && kids.filter((k) => block.some((line) => dice(k.text, line) >= 0.8)).length >= 3;
    if (blocks.some(matches)) return { ...node, children: [] };
    return { ...node, children: prune(kids) };
  });

  return sections.map((s) => ({ ...s, items: s.items.map((it) => ({ ...it, children: prune(it.children) })) }));
}

// Which school's guide this is, from what the title calls itself. A guide names its own
// programme — `T-6B MISSION/NATOPS BRIEFING GUIDE`, `NIFE Expanded Briefing Guide` — and the
// school is what decides which tab the brief appears on, so it is worth reading rather than
// assuming. The person uploading sees it in a box and can say otherwise.
export function programFor(title) {
  const known = PROGRAMS.find((p) => (
    new RegExp(`\\b${p.label}\\b`, 'i').test(title)
    || new RegExp(`\\b${p.aircraft.replace(/-/g, '-?')}\\b`, 'i').test(title)
  ));
  if (known) return { aircraft: known.aircraft, school: known.label };
  const airframe = (title.match(/\bT-\d+[A-Z]?\b/) || [])[0];
  return { aircraft: airframe === 'T-6' ? 'T-6B' : (airframe || 'T-6B'), school: 'Primary' };
}

// Training Air Wing Four publishes the Primary guide as COMTRAWINGFOURINST 1552.1, and that
// is the one place a guide states whose it is. Where a guide does not say, nothing is filled
// in: a squadron guessed from a mention in the prose is worse than an empty box.
const WINGS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6 };

export function unitFrom(publication) {
  const wing = /^COMTRAWING([A-Z]+)INST\b/.exec(publication || '');
  if (wing && WINGS[wing[1]]) return `TW-${WINGS[wing[1]]}`;
  const squadron = /^VT-?(\d+)INST\b/.exec(publication || '');
  if (squadron) return `VT-${squadron[1]}`;
  return '';
}

function buildBrief({ title, source, guideLines, cardPages }, order, warnings) {
  const { note, nodes } = isParenStyle(guideLines) ? readParenOutline(guideLines) : readOutline(guideLines);
  const guide = nodes.map(toGuideSection);
  const card = cardPages.length ? readCard(cardPages) : [];
  const where = shortName(title);

  let sections;
  if (!card.length) {
    sections = guide.map((g) => ({ title: g.title, text: g.text, column: 1, items: g.items }));
  } else {
    const used = new Set();
    sections = card.map((c, index) => {
      const gi = guide.findIndex((g, i) => !used.has(i) && norm(g.title) === norm(c.title));
      const g = gi >= 0 ? guide[gi] : null;
      if (g) used.add(gi);
      if (g && g.items.length !== c.items.length) {
        warnings.push(`${where}: ${c.title} has ${c.items.length} items on the card and ${g.items.length} in the guide; they were paired in order.`);
      }
      const items = c.items.map((ci, i) => {
        const gItem = g && g.items[i];
        const item = {
          label: ci.label,
          card: ci.card,
          text: gItem ? gItem.text : '',
          children: gItem ? gItem.children : [],
        };
        if (repeatsCard(item)) return { ...item, text: '', children: [] };
        return item;
      });
      if (g) g.items.slice(c.items.length).forEach((gItem) => items.push(gItem));
      const prev = card[index - 1];
      return {
        title: c.title,
        text: g ? g.text : '',
        column: c.column,
        ...(prev && prev.page !== c.page ? { break: true } : {}),
        items,
      };
    });
    guide.forEach((g, i) => {
      if (used.has(i)) return;
      warnings.push(`${where}: the guide's section "${g.title}" is not on the card; it was added at the end.`);
      sections.push({ title: g.title.toUpperCase(), text: g.text, column: 1, items: g.items });
    });
  }

  return {
    id: slugify(where),
    title,
    short: where,
    ...programFor(title),
    order,
    note,
    ...(source ? { source } : {}),
    sections: mintIds(toDocument(dropDuplicatedRules(sections))),
  };
}

// What the guide says about itself: the instruction that publishes it, the date it carries and
// the wing or squadron that follows from the instruction. The Primary guide prints all of this
// as a running head; the NIFE guide prints `Version 2.0 13 March 2026` in its footer and names
// no unit, so the unit is left for the person uploading to type.
const DATED = /\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/;
// Only the front matter is read: a date further in is something the prose said, not the date
// of the guide. The text is the joined lines rather than the raw items, because this PDF is
// OCR and the header comes out of it in pieces.
const SOURCE_PAGES = 4;

function readSource(pages) {
  let publication = '';
  let date = '';
  pages.slice(0, SOURCE_PAGES).some((items) => {
    const texts = pageLines(items, true).reduce((all, l) => all.concat(l.segs.map((s) => s.text)), []);
    publication = texts.find((t) => FURNITURE[0].test(t)) || '';
    date = date || texts.map((t) => (DATED.exec(t) || [])[0]).find(Boolean) || '';
    return !!publication;
  });
  const unit = unitFrom(publication);
  const source = {
    ...(publication ? { publication } : {}),
    ...(date ? { date } : {}),
    ...(unit ? { unit } : {}),
  };
  return Object.keys(source).length ? source : null;
}

// pages: pdf.js text items, one array per page. -> { briefs, warnings }
export function parseBriefGuide(pages) {
  const warnings = [];
  // Not `map(pageLines)`: the second argument would be the page number, and the furniture
  // would be kept on every page but the first.
  const allLines = pages.map((items) => pageLines(items));

  const source = readSource(pages);

  // A guide that prints its title as a running head says it on every page; the first is where
  // the brief starts and the rest are furniture, here and in the lines gathered below.
  const found = [];
  const titles = new Set();
  allLines.forEach((lines, p) => {
    lines.forEach((l, i) => {
      if (l.segs.length !== 1 || !isBriefTitle(l.segs[0].text)) return;
      const title = l.segs[0].text;
      if (titles.has(norm(title))) return;
      titles.add(norm(title));
      // A title set bold is printed bold; the markup is not part of the brief's name.
      found.push({ page: p, line: i, title: plain(title) });
    });
  });
  const isRunningHead = (text) => titles.has(norm(text)) && isBriefTitle(text);

  const briefs = found.map((start, n) => {
    const next = found[n + 1];
    const guideLines = [];
    const cardPages = [];
    for (let p = start.page; p < (next ? next.page + 1 : allLines.length); p += 1) {
      const lines = allLines[p].filter((l, i) => (p !== start.page || i > start.line)
        && (!next || p !== next.page || i < next.line));
      if (!lines.length) continue;
      if (isCardPage(lines)) {
        cardPages.push(lines);
      } else {
        lines.forEach((l) => l.segs.forEach((s) => {
          if (!isFigureCaption(s.text) && !isRunningHead(s.text)) guideLines.push(s);
        }));
      }
    }
    if (!guideLines.length) {
      warnings.push(`${shortName(start.title)}: no guide text was found under the title.`);
      return null;
    }
    return buildBrief({ title: start.title, source, guideLines, cardPages }, n + 1, warnings);
  }).filter(Boolean);

  if (!briefs.length) warnings.push('No page of this PDF carries a title that names a briefing guide.');
  return { briefs, warnings };
}
