import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';

// Each page's text as positioned lines, from pdf.js.
//
// The flow tracer reads raw content streams, where a box label is a handful of single-byte
// glyphs. The syllabus text is not like that: its fonts need their ToUnicode maps, which is
// what pdf.js is for. (pdftext.py, which tried without, recovered 16 of the JPPT's 194 pages.)
//
// pdf.js 3.x, legacy build: 4.x ships only .mjs, which CRA 5's webpack config mishandles.

// Who runs pdf.js's worker is the caller's business: the browser gives it a real Worker (see
// pdfWorker.js), and the test runner lets it fall back to running in-process.
export function setWorkerPort(port) {
  pdfjs.GlobalWorkerOptions.workerPort = port;
}

const LINE_TOLERANCE = 2.5;

// Words with an x-extent each. pdf.js hands back runs, not words; a run's width is split across
// its characters in proportion, which is plenty to tell a table column from its neighbour.
function wordsOf(items) {
  const words = [];
  items.forEach((item) => {
    const str = item.str || '';
    if (!str.trim()) return;
    const x = item.transform[4];
    const y = item.transform[5];
    const perChar = str.length ? (item.width || 0) / str.length : 0;
    const re = /\S+/g;
    let m;
    while ((m = re.exec(str)) !== null) {
      words.push({
        text: m[0],
        x: x + perChar * m.index,
        x2: x + perChar * (m.index + m[0].length),
        y,
      });
    }
  });
  return words;
}

export function toLines(items) {
  const words = wordsOf(items).sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const lines = [];
  words.forEach((w) => {
    const line = lines.find((l) => Math.abs(l.y - w.y) <= LINE_TOLERANCE);
    if (line) line.words.push(w);
    else lines.push({ y: w.y, words: [w] });
  });
  lines.sort((a, b) => b.y - a.y);
  lines.forEach((l) => {
    l.words.sort((a, b) => a.x - b.x);
    l.text = l.words.map((w) => w.text).join(' ');
  });
  return lines;
}

// -> [[line, ...], ...], one array per page, top of page first.
export async function loadTextPages(data, onProgress) {
  // pdf.js transfers the buffer to its worker, which detaches it; give it a copy.
  const bytes = new Uint8Array(data).slice();
  const doc = await pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
  }).promise;
  const pages = [];
  try {
    for (let p = 1; p <= doc.numPages; p += 1) {
      // eslint-disable-next-line no-await-in-loop
      const page = await doc.getPage(p);
      // eslint-disable-next-line no-await-in-loop
      const content = await page.getTextContent();
      pages.push(toLines(content.items));
      page.cleanup();
      if (onProgress) onProgress(p, doc.numPages);
    }
  } finally {
    doc.destroy();
  }
  return pages;
}
