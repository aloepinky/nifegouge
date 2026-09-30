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
// A brief with no card (the Solo guide, NIFE, the TW-5 FWOP appendix) keeps the guide's own
// names in one column.
//
// No guide's numbering scheme is known in advance (see readOutline): each wing and school
// writes its outline differently, and a reader written for one has failed on the next. Pages
// that carry no title are still read, as one brief the uploader names.
//
// The TW-4 guide is Paper Capture OCR, so its text layer splits words mid-run ("acti on") and
// puts spaces inside punctuation. Runs are joined by the gap between them rather than by the
// word boundaries pdf.js reports, and the outline is read by marker and indent, never by
// number alone: the FORM guide numbers two sections `5.`.

import { PROGRAMS } from '../programs';

const LINE_TOLERANCE = 2.5;
const COLUMN_GAP = 18; // a gap this wide between runs on one line is two columns
const WORD_GAP = 1.5; // a gap narrower than this is inside a word

const FURNITURE = [
  /^[A-Z]{4,}INST\s+[\d.]+[A-Z]?$/, // COMTRAWINGFOURINST 1552.1
  /^\d{1,2} [A-Z][a-z]{2} \d{4}$/, // 10 Mar 2025
  /^(\d+\s+)?Enclosure \(\s*\d+\s*\)$/, // 11 Enclosure (2)
  /^Version\s+[\d.]+\s+\d{1,2}\s+[A-Za-z]+\s+\d{4}$/, // Version 2.0 13 March 2026
  /^\(Updated\s+[A-Za-z]+\s+\d{4}\)$/i, // (Updated MAR 2025), under the TW-4 Blue Card Script's title
  /^\d+$/,
  /^[A-Z]{1,2}\s?-\s?\d{1,3}$/, // D-1, an appendix's page number
  /^Page \d+( of \d+)?$/i,
];

// Whatever a book prints in the same place on page after page — its running head, its page
// numbers, a version line — is furniture, whatever its words. A line at the top or foot of the
// page whose words (numbers aside) recur there on three pages is dropped. A brief's own
// title can be a running head too; that one is left for the title finder, which needs it.
const BAND = 40;

function dropRunningLines(pagesOfLines) {
  const ys = pagesOfLines.flatMap((lines) => lines.map((l) => l.y));
  if (pagesOfLines.length < 3 || !ys.length) return pagesOfLines;
  const top = Math.max(...ys) - BAND;
  const foot = Math.min(...ys) + BAND;
  const keyOf = (l) => (l.y >= top || l.y <= foot) && plain(l.segs.map((s) => s.text).join(' ')).replace(/\d+/g, '#');
  const seen = new Map();
  pagesOfLines.forEach((lines) => new Set(lines.map(keyOf).filter(Boolean)).forEach((k) => seen.set(k, (seen.get(k) || 0) + 1)));
  return pagesOfLines.map((lines) => lines.filter((l) => {
    const k = keyOf(l);
    return !k || seen.get(k) < 3 || isBriefTitle(l.segs[0].text);
  }));
}

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
  }, '').replace(/\*\* \*\*/g, ' '); // one bold run broken across two lines is one run
}

const isCaps = (text) => /[A-Z]{3}/.test(plain(text)) && plain(text) === plain(text).toUpperCase();

// ---------------------------------------------------------------------------------------
// Where the briefs are

// A title names the guide it opens, in capitals (`T-6B MISSION/NATOPS BRIEFING GUIDE FOR FAM,
// VNAV, AND INAV STAGES`) or in title case (`NIFE Expanded Briefing Guide`). A sentence that
// merely mentions a briefing guide is longer than a name and closes with a stop, and a line
// that opens with an outline marker is a contents entry naming one — `(4) T-6B Solo Briefing
// Guide` — rather than the guide's own title page. A card or script is named the same way
// (`BRIEF GUIDE`, `BRIEFING CARD`); `DEBRIEFING GUIDE` is a heading on the TW-4 card, not a
// title, and the word boundary keeps it out.
const TITLE_WORDS = /\bBRIEF(?:ING)?\s+(?:GUIDE|CARD|SCRIPT|OUTLINE)\b/i;
const isBriefTitle = (text) => TITLE_WORDS.test(text)
  && !/^FIGURE\b/.test(text) && !readMarker(plain(text))
  && (isCaps(text) || (words(plain(text)) <= 8 && !/[.,;:]$/.test(plain(text)) && isTitleCase(plain(text))));
const isFigureCaption = (text) => /^FIGURE \d+\./.test(text);

// `D.1 BRIEFING GUIDE` is part 1 of appendix D; the number says where it sits in the book.
export const cleanTitle = (text) => plain(text)
  .replace(/^(?:APPENDIX\s+[A-Z0-9]+\s*[-–—:.]?\s*|[A-Z]?\d*(?:\.\d+)+\.?\s+|[A-Z]\.\d+\s+)/i, '')
  .trim();

// A page of the card is laid out in two columns; a page of the guide never is.
function isCardPage(lines) {
  return lines.filter((l) => l.segs.length >= 2).length >= 3;
}

// ---------------------------------------------------------------------------------------
// The guide
//
// Every guide so far has been an outline, and each writes it its own way: the TW-4 guide
// `1.` / `a.` / `(1)` / `(a)`, the Blue Card Script a rung higher with `A.` on the margin, the
// NIFE guide `1)` / `a)` / `i)` with its names set bold, the TW-5 appendix `1.` / `a.` / `(1)` /
// `(a)` with a NATOPS checklist (`1.` / `a.` / `(1)` again) nested four deep inside it. So
// nothing here knows a guide's scheme in advance; it is read off the page:
//
// - A marker's style is its kind and its punctuation: `1.`, `(1)`, `a)`, `A.`, `(i)`, a bullet.
// - A line in a style already open, printed where that level is (or continuing its count:
//   `c.` after `b.`), is the next of that level, and closes everything under it.
// - Any other marker opens a level under the line above it, and a new list starts at its first
//   number (1, a, i) — unless it is printed left of the level above it, where it cannot be a
//   wrapped line of that level's text.
// - Anything else continues the line above it.
//
// That is how `i)` is the ninth letter in one list and the first numeral in another, and how
// the TW-5's `1. Inspect canopy` is the first step of a checklist rather than a sixth section:
// the page says which, not the marker.

const X_SAME = 6; // printed at the same indent
const X_NEAR = 24; // near enough, for a line that also continues its level's count
const BULLET = /^([•●▪◦○■□►➢✓])\s*(.*)$/;
// A bracketed marker may run straight into its text (`(2)“Transfer…`); a bare one needs the space.
const MARKER = /^(\()?(\d{1,2}|[a-zA-Z]|[ivxlc]{2,5}|[IVXLC]{2,5})([.)])(\s*)(.*)$/;
const DASH = /^[-–—]\s*/;
const BOLD_DASH = /^(\*\*)?[-–—]\s*(\*\*)?/;
const NWC = /^(?:\*\*)?(?:Note|NOTE|WARNING|Warning|CAUTION|Caution)\b\s*\**\s*[:\-–—]/;

const ROMAN = {
  i: 1, v: 5, x: 10, l: 50, c: 100,
};

function romanValue(text) {
  const s = text.toLowerCase();
  if (!/^[ivxlc]+$/.test(s)) return 0;
  let total = 0;
  for (let i = 0; i < s.length; i += 1) {
    const v = ROMAN[s[i]];
    total += ROMAN[s[i + 1]] > v ? -v : v;
  }
  return total;
}

// `(1)` -> [{ style: '(num)', ord: 1 }]; `i)` -> the ninth letter or the first numeral, and
// which it is waits for the page.
function markerKinds(open, token, close) {
  if (open && close !== ')') return [];
  const punct = (kind) => `${open ? '(' : ''}${kind}${close}`;
  if (/^\d+$/.test(token)) return [{ style: punct('num'), ord: Number(token) }];
  const upper = token === token.toUpperCase();
  const out = [];
  if (token.length === 1) {
    out.push({ style: punct(upper ? 'ALPHA' : 'alpha'), ord: token.toLowerCase().charCodeAt(0) - 96 });
  }
  const roman = romanValue(token);
  if (roman) out.push({ style: punct(upper ? 'ROMAN' : 'roman'), ord: roman });
  return out;
}

// The marker a line opens with, and the rest of it. A marker inside a bold run
// (`**b) Crew Day and Rest **Brief start…`) leaves the bold on what follows it; a marker that
// is the only bold on its line (`**a) **DOR/TTO is in effect…`) says so.
export function readMarker(text) {
  const bolded = text.startsWith('**');
  const bare = bolded ? text.slice(2) : text;
  const bullet = bare.match(BULLET);
  if (bullet) {
    return {
      kinds: [{ style: 'bullet', ord: 0 }], shown: '•', rest: bolded ? `**${bullet[2]}` : bullet[2], boldMarker: false,
    };
  }
  const m = bare.match(MARKER);
  if (!m || (!m[1] && !m[4] && m[5])) return null;
  const kinds = markerKinds(m[1], m[2], m[3]);
  if (!kinds.length) return null;
  let rest = m[5];
  let boldMarker = false;
  if (bolded) {
    if (rest.startsWith('**')) {
      rest = rest.slice(2).trimStart();
      boldMarker = true;
    } else if (rest) rest = `**${rest}`;
  }
  // `(1)` hangs as `(1)` and `1.` as `1.`; `i)` is shown bracketed, like the bracketed levels.
  const shown = m[1] || m[3] === ')' ? `(${m[2]})` : `${m[2]}.`;
  return {
    kinds, shown, rest, boldMarker,
  };
}

// A line set bold from its first word is named by that run: `**Crew Day and Rest **Brief
// start…` names Crew Day and Rest and says the rest about it. A line bold end to end is only a
// name (`**ADMIN:**`).
function boldName(rest) {
  const m = rest.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
  if (!m || !plain(m[1]).trim()) return null;
  return { label: plain(m[1]).replace(/[.:]\s*$/, '').trim(), body: m[2].replace(DASH, '').trim() };
}

// A heading with no marker: one short line, bold or in capitals, with no closing stop, on the
// margin, with the outline starting straight under it — and not the last words of a sentence
// the line above broke (`ATC.”`).
function isBareHeading(line, next, margin, wrapped) {
  const text = plain(line.text).trim();
  if (wrapped || !next || !readMarker(next.text) || line.x > margin + X_SAME || next.x < line.x - X_SAME) return false;
  if (NWC.test(line.text) || /[.,;!?][”"’)]*$/.test(text) || words(text) > 8) return false;
  return /^\*\*[^*]+\*\*$/.test(line.text.trim()) || isCaps(text);
}

// -> { note, nodes: [{ level, marker, label?, parts, children }] }
function readOutline(lines) {
  const margin = Math.min(...lines.map((l) => l.x));
  const right = Math.max(...lines.map((l) => l.x2 || 0));
  const column = right - margin;
  // A line that stops well short of the right margin ended where it meant to; one that runs up
  // to it was broken by it, and the line beneath carries the same sentence on. A ragged margin
  // stops short too, wherever the next word was too long to fit, so a short line is only an
  // ending where the next line's first word would have fitted on it, and where it closed a
  // sentence or the next line opens like one (`14-30 day break`, not `requirements are met`).
  const fills = (line, next) => {
    if (!line || (line.x2 || 0) >= right - column * 0.12) return true;
    const text = plain(line.text).trim();
    const following = plain((next && next.text) || '').trim();
    const perChar = ((line.x2 || line.x) - line.x) / Math.max(text.length, 1);
    const firstWord = following.split(/\s+/)[0] || '';
    if ((firstWord.length + 1) * perChar > right - (line.x2 || 0)) return true;
    return !/[.:;!?][”"’)]*$/.test(text) && !/^[A-Z0-9]/.test(following);
  };

  const root = { level: 0, children: [] };
  const stack = []; // open levels, outermost first: { style, x, ord, node }
  const note = [];
  let current = null;
  let previous = null;

  const open = (node, entry) => {
    const parent = stack.length ? stack[stack.length - 1].node : root;
    parent.children.push(node);
    stack.push({ ...entry, node });
    current = node;
  };

  // Where a marked line goes: the next of an open level ({ depth }), a new level under the
  // first `depth` open ones, or null when it is not a marker after all.
  const place = (kinds, x) => {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const e = stack[i];
      const hit = kinds.find((k) => k.style === e.style && k.ord === e.ord + 1 && Math.abs(x - e.x) <= X_NEAR)
        || kinds.find((k) => k.style === e.style && Math.abs(x - e.x) <= X_SAME);
      if (hit) return { depth: i, kind: hit };
    }
    // A new level. Everything open to the right of this line is over.
    let depth = stack.length;
    while (depth > 0 && stack[depth - 1].x > x + X_SAME) depth -= 1;
    const first = kinds.find((k) => k.ord <= 1);
    if (first) return { depth, kind: first };
    if (depth < stack.length || !stack.length) return { depth, kind: kinds[0] };
    return null;
  };

  const addText = (text, breakBefore) => {
    const target = current ? current.parts : note;
    if (target.length && breakBefore) target.push('\n\n');
    target.push(text);
  };

  lines.forEach((line, n) => {
    let marker = readMarker(line.text);
    // The OCR dropped the stop: `b Profile/Sequence`, where `b.` is the letter due.
    if (!marker) {
      const m = line.text.match(/^([a-z])\s+([A-Z].*)$/);
      const due = m && stack.find((e) => e.style === 'alpha.' && e.ord + 1 === m[1].charCodeAt(0) - 96
        && Math.abs(line.x - e.x) <= X_SAME);
      if (due) {
        marker = {
          kinds: [{ style: 'alpha.', ord: due.ord + 1 }], shown: `${m[1]}.`, rest: m[2], boldMarker: false,
        };
      }
    }
    const where = marker && place(marker.kinds, line.x);

    // A marker that is the only bold on its line numbers a paragraph of the level above
    // rather than naming anything: the guide sets every name it means bold.
    if (where && !(marker.boldMarker && marker.rest && !marker.rest.startsWith('**'))) {
      stack.length = where.depth;
      const named = boldName(marker.rest);
      const node = {
        marker: marker.shown,
        ...(named ? { label: named.label, parts: named.body ? [named.body] : [] } : { parts: marker.rest ? [marker.rest] : [] }),
        children: [],
      };
      open(node, { style: where.kind.style, x: line.x, ord: where.kind.ord });
    } else if (!marker && isBareHeading(line, lines[n + 1], margin, previous && fills(previous, line))) {
      const at = stack.findIndex((e) => e.style === 'head');
      stack.length = at >= 0 ? at : 0;
      open({ marker: '', label: plain(line.text).replace(/[.:]\s*$/, '').trim(), parts: [], children: [] },
        { style: 'head', x: line.x, ord: 0 });
    } else {
      const body = marker ? marker.rest : line.text.replace(BOLD_DASH, '');
      const dashed = DASH.test(plain(line.text));
      addText(body, !!marker || dashed || NWC.test(line.text) || !fills(previous, line));
    }
    previous = line;
  });

  // One heading over the whole of it is the guide's title again, not a section of it.
  let nodes = root.children;
  const preface = [joinText(note)];
  while (nodes.length === 1 && nodes[0].children.length >= 2) {
    preface.push(joinText(nodes[0].parts));
    nodes = nodes[0].children;
  }
  return { note: preface.filter(Boolean).join('\n\n'), nodes };
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
  // A name may end in a digit before a colon (`SNA1 / SNA2: SNA 1 Event…`); before a full stop
  // the digit is a number closing a sentence.
  if (m && words(m[1]) <= 10 && (m[2] === ':' || (!/\d$/.test(m[1]) && isTitleCase(m[1])))) {
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
  // The TW-5 stars an item that may be briefed as "standard"; the star is not part of the name.
  const star = text.match(/^(\*\s+)([^*][\s\S]*)$/);
  if (star) return star[1] + boldLeadIn(star[2], hasChildren);
  const m = text.match(/^([A-Z][^.:“"\n]{0,60}?([.:]))[ \t]+(\S)/);
  if (m && words(m[1]) <= 8 && (m[2] === ':' || isTitleCase(m[1]) || /[“"‘]/.test(m[3]))) {
    return `**${m[1]}** ${text.slice(m[0].length - m[3].length)}`;
  }
  if (hasChildren && words(text) <= 8 && !/[“"]/.test(text)) return `**${text}**`;
  return text;
}

// A guide that sets its own names bold has already said which words are the name (see
// boldName); one that does not leaves it to be read off the punctuation.
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
    marker: node.marker,
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
// The T-44C card letters its headings in bold title case, `A. Product Inventory`, where the
// Primary card sets them in capitals with no marker. A lettered heading can wrap
// (`H. Standarization Board Minutes /` over `Read and Initial`), so the lines between it and
// its first item are the rest of its name.
const CARD_HEAD = /^[A-Z]\.\s+(.+)$/;

// `**12. OCF procedures**` -> `12. **OCF procedures**`, so a bold line still reads as a
// numbered one. The card sets a whole item bold; the number is not part of what it says.
function hoistMarker(text) {
  return text.replace(/^\*\*((?:\d{1,2}\.|[a-zA-Z]\.|\([0-9a-z]{1,2}\))\s*)/, '$1**');
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
        if ((m = text.match(CARD_HEAD))) {
          section = { title: plain(m[1]), column: col + 1, page: pageIndex + 1, items: [], wraps: true };
          sections.push(section);
          item = null;
          lastParts = null;
        } else if (section && section.wraps && !section.items.length && !CARD_ITEM.test(text)) {
          section.title = `${section.title} ${plain(text)}`;
        } else if (isCaps(text) && !/[.,;:]$/.test(plain(text)) && !CARD_ITEM.test(text) && !CARD_SUB.test(text)) {
          // A heading is capitals with no closing stop; `WAVE OFF.` is a sentence wrapping.
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
  return sections.map(({ wraps, ...s }) => ({
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
  const core = (m ? m[1] : title.replace(new RegExp(`${TITLE_WORDS.source}.*$`, 'i'), '').replace(/^T-\d+[A-Z]?\s+/, ''))
    .replace(/\bEXPANDED\b/i, '');
  // A title that is nothing but the words every guide carries (the TW-5's `BRIEFING GUIDE`)
  // leaves a button that says Brief, to be renamed before it is published.
  const fallback = isCaps(title) ? 'BRIEF' : 'Brief';
  return core.split(/\s*,\s*(?:AND\s+)?|\s+AND\s+/i).map((s) => s.trim()).filter(Boolean).join(' / ')
    || fallback;
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
  if (/\bT-6\b/.test(title)) return { aircraft: 'T-6B', school: 'Primary' };
  // Nothing recognised (`AME BRIEFING GUIDE`): no school, so the upload keeps the tab's own.
  return {};
}

// `TW-4 Flight Briefing Guide (Blue Card Script)` names its wing in its title, where the Primary
// guide names it through its instruction.
export function unitOfTitle(title) {
  const m = /^(TW|VT)-?\s*(\d+)\b/.exec(plain(title || ''));
  return m ? `${m[1]}-${m[2]}` : '';
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
  const { note, nodes } = readOutline(guideLines);
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

// `6-8` or `6, 7, 8` -> [5, 6, 7], the page indexes to read; blank -> null, every page. A guide
// can be three pages of a longer packet (the T-44C's is pages 6 to 8 of the TW-4 On-Wing Gouge
// Packet), and read whole the pages after it would run on as the guide's last section.
// -> { pages } or { error }.
export function pageList(text, total) {
  if (!text.trim()) return { pages: null };
  const pages = new Set();
  const parts = text.split(',').map((t) => t.trim()).filter(Boolean);
  for (let i = 0; i < parts.length; i += 1) {
    const m = parts[i].match(/^(\d+)\s*(?:[-–]\s*(\d+))?$/);
    const from = m && Number(m[1]);
    const to = m && Number(m[2] || m[1]);
    if (!m || from < 1 || to < from || to > total) {
      return { error: `"${parts[i]}" is not a page of this PDF, which has ${total}.` };
    }
    for (let n = from; n <= to; n += 1) pages.add(n - 1);
  }
  return { pages: [...pages].sort((a, b) => a - b) };
}

// pages: pdf.js text items, one array per page. -> { briefs, warnings }
export function parseBriefGuide(pages) {
  const warnings = [];
  // Not `map(pageLines)`: the second argument would be the page number, and the furniture
  // would be kept on every page but the first.
  const allLines = dropRunningLines(pages.map((items) => pageLines(items)));

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
      found.push({ page: p, line: i, title: cleanTitle(title) });
    });
  });
  // Pages that name no guide are still a brief: someone chose them. It is read whole, and
  // the person uploading names it.
  if (!found.length && allLines.some((lines) => lines.length)) {
    found.push({ page: 0, line: -1, title: 'Brief' });
    warnings.push('No title naming a briefing guide was found on these pages, so they were read as one brief. Give it a name before publishing.');
  }
  const isRunningHead = (text) => titles.has(norm(text)) && isBriefTitle(text);

  const gathered = found.map((start, n) => {
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
    return { title: start.title, guideLines, cardPages };
  });

  // The T-44C prints its card under one title (`AME BRIEFING GUIDE`) and the guide after it
  // under another (`TW-4 Flight Briefing Guide (Blue Card Script)`). A card with no guide of
  // its own, followed by a guide with no card of its own, is one brief, named by the card.
  const merged = [];
  gathered.forEach((g) => {
    const prev = merged[merged.length - 1];
    if (prev && !prev.guideLines.length && prev.cardPages.length && g.guideLines.length && !g.cardPages.length) {
      merged[merged.length - 1] = { ...prev, guideTitle: g.title, guideLines: g.guideLines };
    } else merged.push(g);
  });

  const briefs = merged.map((g, n) => {
    if (!g.guideLines.length) {
      warnings.push(`${shortName(g.title)}: no guide text was found under the title.`);
      return null;
    }
    const unit = (source && source.unit) || unitOfTitle(g.guideTitle || g.title);
    const own = unit ? { ...source, unit } : source;
    return buildBrief({
      title: g.title, source: own, guideLines: g.guideLines, cardPages: g.cardPages,
    }, n + 1, warnings);
  }).filter(Boolean);

  if (!briefs.length) warnings.push('No briefing guide was found on these pages.');
  return { briefs, warnings };
}
