// The Hollywood checklists (t44cNormals.js) as a script for two voices, for Voice Checklists:
// the student takes one seat, PF or PM, and the computer speaks every line of the other seat
// and the observer's, waiting for the student's own lines. Pure, tested in voiceScript.test.js.
//
// Who says what comes from the data and nothing else:
//   * a read item's challenge is the PM's (the PM reads the checklist, ME FTI §F100);
//   * a memory step (`critical`: the starts) has no challenge read: the PF calls the item and its
//     response together, so the challenge is said in the PF's first line;
//   * each reply's `who` names its seat (LS counts as PF and RS as PM, the crew boxes' pairing);
//     a reply with none is the student's (bold in the FTI, the PF) or, if `ip`, the PM's;
//   * `act` lines and decision rows are shown and not spoken; notes are left out;
//   * radio calls to ATC or base are shown and not spoken (no comms here, the user, 2026-11-12);
//   * the PF opens every checklist by its title ("After Start Checklist", the user, 2026-11-12);
//   * the PM answering its own challenge waits PM_ACTION seconds first, the time to do the
//     action (the user, 2026-11-12); a reply's own `after` (Runup 8's lights) overrides it.
//
// A line: { proc, step, seat: 'PF'|'PM'|'OBS', kind: 'say'|'act', text, say, last, after }.
// `text` is the card's wording, `say` what the speech engine is given, `last` the word that
// ends the line, which lets a listener move on as soon as it is heard.

const SEAT = { LS: 'PF', PF: 'PF', RS: 'PM', PM: 'PM', OBS: 'OBS' };

export const seatOf = (who, fallback) => {
  const first = String(who || '').split(/[,/]/)[0].trim();
  return SEAT[first] || fallback;
};

const RADIO = /^(Navy |\(Squadron\)|.*\(call-sign\),)/;
export const PM_ACTION = 2;
// A crew brief is long and paused in: the voice page waits at least this long after the
// student stops talking before moving on, whatever the Wait setting (the user, 2026-11-12).
export const BRIEF_WAIT = 1.2;

// Words the speech engine should read as letters. Everything else in capitals is said as a word.
const LETTERS = new Set(['ATIS', 'ICS', 'ITT', 'IGN', 'GEN', 'OBS', 'PM', 'PF', 'LS', 'RS', 'FD', 'YD', 'AP',
  'PFD', 'MFD', 'ESIS', 'FMS', 'RTU', 'ADF', 'NAV', 'VOR', 'ILS', 'GPS', 'DME', 'IFR', 'VFR', 'ATC', 'UTC',
  'TOLD', 'RAIM', 'TACAN', 'XPNDR', 'IFF', 'ACP', 'MIC', 'VMC', 'RADALT', 'EMER', 'BTN', 'CDI', 'UHF', 'VHF',
  'ADS', 'RSK', 'LSK', 'TR', 'G', 'X', 'Y', 'AUX', 'TCAS', 'ELT']);
// Of those, the ones read as a word anyway.
const AS_WORD = new Set(['ATIS', 'TOLD', 'RAIM', 'TACAN', 'RADALT', 'EMER', 'MIC', 'AUX', 'NAV', 'ESIS']);

// The card's text as it should sound: slashes as pauses, blanks dropped, units spelled out, and
// capitals read as words, so "CHECKED/SET" is "checked, set", not C-H-E-C-K-E-D.
export function spoken(text) {
  return String(text)
    .replace(/\s*±\s*\d+/g, '') // a tolerance is shown, not said: "410 ±50" is "410"
    .replace(/_+(\.?_+)*/g, ' ')
    .replace(/\blbs\b\.?/gi, 'pounds')
    .replace(/\bN1\b/g, 'N one')
    .replace(/\bNp\b/g, 'N P')
    .replace(/(^|[^\d])\.(\d)/g, '$1point $2')
    .replace(/\bx4\b/g, 'times four')
    .replace(/\s*\/\s*/g, ', ')
    .replace(/[()"]/g, '')
    .replace(/\b[A-Z][A-Z]+\b/g, (w) => (LETTERS.has(w) && !AS_WORD.has(w) ? w : w.toLowerCase()))
    .replace(/\s+([,.])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// The last word of a line, lower case, letters and digits only ("Above 12 percent" → "percent").
export function lastWord(text) {
  const words = spoken(text).toLowerCase().match(/[a-z0-9]+/g);
  return words ? words[words.length - 1] : '';
}

const line = (proc, step, seat, kind, text, after = 0) => ({
  proc, step, seat, kind, text, say: kind === 'say' ? spoken(text) : '', last: kind === 'say' ? lastWord(text) : '', after,
});

// What the PF says to open a checklist.
export const titleCall = (proc) => (/check$/i.test(proc.title) ? proc.title : `${proc.title} Checklist`);

// The PM's closing call off `done`: its first quoted sentence.
export function doneCall(done) {
  const m = String(done || '').match(/"([^"]+)"/);
  return m ? m[1].replace(/\.$/, '') : '';
}

// `opts.antiIce`: which Before Takeoff anti-ice check is said, 'pitot' (the default) or 'full',
// whose replies carry `branch`; the full check says the procedure named by `insert` in place of
// its own lines, found with `opts.find(id)` (the user, 2026-11-12).
export function scriptFor(proc, opts = {}) {
  const antiIce = opts.antiIce || 'pitot';
  // A procedure said inside another (`insert`) has no title call of its own.
  const out = opts.inserted ? [] : [line(proc.id, 'title', 'PF', 'say', titleCall(proc))];
  proc.rows.forEach((row, i) => {
    if (row.decision) { out.push(line(proc.id, `d${i}`, 'PM', 'act', row.decision)); return; }
    if (!row.challenge) return; // a note
    const owner = seatOf(row.who, 'PF');
    const replies = row.replies && row.replies.length ? row.replies
      : row.critical ? [] : [{ text: row.reply, who: row.who }];
    let pending = null; // a memory step's challenge, said with the PF's first line
    let afterChallenge = false; // the next line is the first after the PM's challenge
    if (row.critical) pending = row.quietChallenge ? null : row.challenge;
    else { out.push(line(proc.id, row.id, 'PM', 'say', row.challenge)); afterChallenge = true; }
    replies.forEach((r) => {
      if (r.branch && r.branch !== antiIce) return;
      if (r.inInsert) return;
      if (r.insert) {
        const inner = opts.find && opts.find(r.insert);
        if (inner) out.push(...scriptFor(inner, { ...opts, inserted: true }));
        afterChallenge = false;
        return;
      }
      if (r.header) return;
      const seat = seatOf(r.who, r.ip ? 'PM' : 'PF');
      if (r.act || RADIO.test(r.text)) {
        out.push(line(proc.id, row.id, seat, 'act', r.act ? r.text : `${r.text} (radio call)`));
        return;
      }
      let text = r.text;
      if (pending && seat === 'PF') { text = `${pending}, ${text}`; pending = null; }
      const after = r.after ?? (afterChallenge && seat === 'PM' ? PM_ACTION : 0);
      afterChallenge = false;
      out.push({ ...line(proc.id, row.id, seat, 'say', text, after), minWait: r.brief ? BRIEF_WAIT : 0 });
    });
    // A memory step with nothing spoken (Fuel Flow - Note): the PF's, shown as done.
    if (pending) out.push(line(proc.id, row.id, owner, 'act', `${row.challenge} - ${row.reply}`));
  });
  const done = doneCall(proc.done);
  if (done) out.push(line(proc.id, 'done', 'PM', 'say', done));
  return out;
}

// What the student hears said and must say: theirs is every spoken line of their seat.
export const isMine = (l, seat) => l.kind === 'say' && l.seat === seat;

// A spoken command, if the whole of what was heard is one.
const COMMANDS = [
  [/^(say again|repeat|say that again|again)$/, 'again'],
  [/^(go back|back|back up)$/, 'back'],
  [/^(skip|next|skip it)$/, 'skip'],
  [/^(pause|stop|hold|hold it)$/, 'pause'],
];
export function commandOf(heard) {
  const h = String(heard || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
  const hit = COMMANDS.find(([re]) => re.test(h));
  return hit ? hit[1] : null;
}

// Whether what was heard ends with the line's last word (said or close enough: the recogniser
// spells numbers as digits and the card sometimes as words).
const NUMBERS = { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
const norm = (w) => NUMBERS[w] || w.replace(/s$/, '');
export function endsLine(heard, l) {
  if (!l || !l.last) return false;
  const words = String(heard || '').toLowerCase().match(/[a-z0-9]+/g);
  if (!words) return false;
  return norm(words[words.length - 1]) === norm(l.last);
}
