// The course length a curriculum publication prints in its Course Data, paragraph 9: training
// days and weeks for each course the instruction covers.
//
//   Delta JPPT:  a. TW-4 Primary JPPT        130.9   28      (Training Days / Production Weeks)
//   NIFE MCG:    NIFE 1 – GROUND:             21      4      (Training Days / Calendar Weeks)
//
// -> { weeksLabel, rows: [{ label, trainingDays, weeks }] }, or null where the publication
// prints no such table. Every row is kept, in the publication's order; which of them a page
// shows is the page's business.
//
// Read from positioned lines (pdfText.js toLines), where `pdftotext -layout` shears this table:
// on Delta it puts the TW-5 rows' figures a row out of step with their labels. A row is a line
// ending in two numbers, which a line of prose or a group heading ("Primary:") never does.

const NUMBER = /^\d+(?:\.\d+)?$/;

export function extractCourseLength(pages) {
  for (const page of pages) {
    const start = page.findIndex((l) => /\bCourse Length\b/.test(l.text));
    if (start === -1) continue;
    const rest = page.slice(start + 1);
    const head = rest.findIndex((l) => /Training Days/i.test(l.text) && /Weeks/i.test(l.text));
    if (head === -1) continue;
    const weeksLabel = (rest[head].text.match(/(\S+\s+Weeks)/i) || [])[1] || 'Weeks';

    const rows = [];
    for (const line of rest.slice(head + 1)) {
      // The next numbered paragraph ends the table.
      if (/^\d+\.\s/.test(line.text)) break;
      const words = line.words.map((w) => w.text);
      const n = words.length;
      if (n < 3 || !NUMBER.test(words[n - 1]) || !NUMBER.test(words[n - 2])) continue;
      const label = words.slice(0, n - 2).join(' ')
        .replace(/^[a-z]\.\s+/, '')
        .replace(/:$/, '')
        .trim();
      rows.push({ label, trainingDays: Number(words[n - 2]), weeks: Number(words[n - 1]) });
    }
    if (rows.length) return { weeksLabel, rows };
  }
  return null;
}
