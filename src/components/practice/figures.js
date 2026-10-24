// The numbers a pilot flies to, read out of the course rules: the altitude, heading, airspeed
// and radio channel a paragraph of a rule leaves you on, and a field's own figures (break and
// pattern altitude, high key, runway heading) from its page. The Practice Flight shows them as
// the flight's readout, so the student always knows what they should be flying. Pure.

const plain = (t) => String(t || '').replace(/\[\[|\]\]/g, '').replace(/\*\*/g, '');
const lastOf = (re, t, f) => {
  let v;
  for (const m of t.matchAll(re)) v = f(m) ?? v;
  return v;
};
const thousands = (n) => Number(String(n).replace(/,/g, '')).toLocaleString('en-US');

// A paragraph that lays out a band ("Low Block: 9000' MSL to 14000' MSL", "Working altitudes
// are 6500' MSL to 15,000' MSL") gives limits, not an altitude to fly.
const BAND = /\b(?:low|high) block\b|working altitudes|transition layer/i;

// "climb to 14,500 MSL", "maintain 800' MSL", "at 1500' MSL", "unoccupied area to 2,500 ft".
const ALT = /\b(?:(?:climb(?: and maintain| to)?|maintain|descend(?: and maintain| to)?|at|level off at)\s+(?:no higher than\s+)?~?(\d{1,2},\d{3}|\d{3,5})|to\s+(\d{1,2},\d{3}|\d{3,5})(?=\s*(?:'|ft\b|feet)))\s*(?:'|ft\b|feet)?\s*(?:MSL)?/gi;
const HDG = /(?:\b(?:HDG|heading)\s*~?\s*|~\s*)(\d{3})\b|\b(\d{3})\s*°(?!\s*turn)/gi;
const DIRECT = /\b(?:direct(?: to)?|towards?)\s+(?:the\s+)?((?:PT\s+)?[A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,3})/g;
const KIAS = /\b(\d{3})\s*KIAS/g;
const CHANNEL = /\bCH\s*(\d{1,2}(?:\/\d{1,2})?)\s*(UHF|VHF)?|\b(UHF|VHF)\s*CH\s*(\d{1,2})/gi;
// The station named just before a channel: "Corpus Departure (CH 12 UHF)", "Corpus Approach on
// CH 17 UHF", "Houston Center on 135.05 (VHF CH 22)".
const STATION = /((?:[A-Z][\w-]*|\d+)(?:\s+(?:[A-Z][\w-]*|\d+)){0,4})\s*(?:\(\s*|\s+on\s+(?:[\d.]+\s*\(\s*)?)(?:UHF\s+|VHF\s+)?$/;
// Listened to, not talked on: the channel to be on is the other one.
const LISTEN = /^(?:ASOS|ATIS)$/;

export const channelOf = (band, n) => `CH ${n}${band ? ` ${band.toUpperCase()}` : ''}`;

// A call's radio, as the course rules print it ("CH 12 UHF", "UHF CH15", "VHF 122.7").
export function radioOf(radio) {
  if (!radio) return null;
  const m = /CH\s*(\d{1,2})/i.exec(radio);
  if (!m) return radio;
  const band = /UHF|VHF/i.exec(radio);
  return channelOf(band && band[0], m[1]);
}

// What a paragraph says to fly: { alt, hdg, kias, ch, station }, each only where it says one.
// Where it gives more than one, the last is what the leg ends on.
export function figuresOf(text, { north } = {}) {
  let t = plain(text);
  // "For South flow traffic, ... For North flow traffic, ...": only the flow in use.
  const flows = /^(.*?)(For North flow traffic\b.*)$/i.exec(t);
  if (flows && /South flow/i.test(flows[1])) t = north ? flows[2] : flows[1];
  const out = {};
  // "Be alert for traffic established on the southern arrival at 1000' MSL" is someone else's.
  const own = t.split(/(?<=\.)\s+/).filter((x) => !/\bbe alert\b|\bcaution\b|\btraffic (?:already )?established\b/i.test(x)).join(' ');
  if (!BAND.test(t)) {
    const alt = lastOf(ALT, own, (m) => {
      const n = m[1] || m[2];
      return Number(n.replace(/,/g, '')) >= 500 ? `${thousands(n)}' MSL` : undefined;
    });
    if (alt) out.alt = alt;
  }
  // The last heading or fix flown to; a heading given with its fix ("towards Bayside (~360°)")
  // is said with it.
  const turns = [
    ...[...own.matchAll(HDG)].map((m) => ({ at: m.index, hdg: `${m[1] || m[2]}°` })),
    ...[...own.matchAll(DIRECT)].map((m) => ({ at: m.index, fix: m[1].trim() })),
  ].sort((a, b) => a.at - b.at);
  const last = turns[turns.length - 1];
  if (last) {
    const pair = turns.length > 1 && turns[turns.length - 2];
    const near = pair && last.at - pair.at < 30 && (pair.hdg ? last.fix : last.hdg);
    const hdg = last.hdg || (near && pair.hdg);
    const fix = last.fix || (near && pair.fix);
    out.hdg = hdg && fix ? `${hdg} to ${fix}` : hdg || `direct ${fix}`;
  }
  const kias = lastOf(KIAS, own, (m) => `${m[1]} KIAS`);
  if (kias) out.kias = kias;
  const channels = [...t.matchAll(CHANNEL)].map((m) => {
    const s = STATION.exec(t.slice(Math.max(0, m.index - 60), m.index));
    const station = s ? s[1].replace(/^(?:(?:auto-)?switch(?: to)?|contact|to)\s+/i, '') : null;
    return { ch: m[1] ? channelOf(m[2], m[1]) : channelOf(m[3], m[4]), station };
  });
  const talk = channels.filter((c) => !LISTEN.test(c.station || ''));
  const ch = talk[talk.length - 1] || channels[channels.length - 1];
  if (ch) {
    out.ch = ch.ch;
    if (ch.station) out.station = ch.station;
  }
  // A paragraph that sets both radios ("Contact Houston Center on 135.05 (VHF CH 22) ... switch
  // KINGS 4 MOA Common (UHF CH 20)") sets each: the last channel on each, in the order given.
  const byBand = {};
  (talk.length ? talk : channels).forEach((c, i) => { byBand[bandOf(c.ch)] = { ...c, i }; });
  const both = Object.values(byBand).sort((a, b) => a.i - b.i).map(({ ch: c, station }) => ({ ch: c, station }));
  if (both.length > 1) out.chans = both;
  return out;
}

// A field's own figures, from its page in the course rules document: { break, pattern,
// highKey, lowKey, heading(rwy) }.
export function fieldFigures(field) {
  if (!field) return null;
  const lines = field.blocks.flatMap((b) => [b.heading || '', ...(b.lines || [])]);
  const find = (re) => {
    const line = lines.find((l) => re.test(l));
    const m = line && /(\d{1,2},?\d{3}|\d{3})'?\s*MSL/.exec(line);
    return m ? `${thousands(m[1])}' MSL` : null;
  };
  const runways = field.blocks.filter((b) => /^Runway /.test(b.heading || ''));
  return {
    break: find(/^Break:/),
    pattern: find(/^Pattern:/),
    highKey: find(/^High-Key/),
    lowKey: find(/^Low-Key/),
    // "Runway 11/29", "Magnetic Heading: 106°/296°": runway 29's heading is 296°.
    heading(rwy) {
      for (const b of runways) {
        const names = b.heading.replace(/^Runway /, '').split('/');
        const hdgs = /(\d{3})°\s*\/\s*(\d{3})°/.exec((b.lines || []).join(' '));
        const i = names.indexOf(rwy);
        if (i >= 0 && hdgs) return `${hdgs[i + 1]}°`;
      }
      return null;
    },
  };
}

// The readout after `figs` are flown: each figure replaced where they give one, with what gave
// it, and cleared where they give it as null. The two radios are kept apart: a channel goes to
// the UHF or the VHF by its band (UHF where it names none).
export const bandOf = (ch) => (/VHF/.test(ch) && !/UHF/.test(ch) ? 'vhf' : 'uhf');
//
// The two radios are paired, as they are set up: the VHF on the UHF's button as a backup
// ("CH 4" on both; TW-4 In Flight Guide p. 8 lists each button's UHF and VHF). A channel given
// for the VHF on its own (Houston Center while the UHF is on KINGS 4 Common) unpairs them, and
// they stay apart until the VHF is let go (`vhf: null`), when it goes back to the UHF's button.
const button = (ch) => (/CH\s*(\d{1,2})/.exec(ch) || [])[1];
export function flyOn(fly, figs, from) {
  if (!figs) return fly;
  let next = { ...fly };
  ['alt', 'hdg', 'kias'].forEach((k) => {
    if (figs[k]) next[k] = { v: figs[k], from };
    else if (k in figs) delete next[k];
  });
  const tune = (ch, station) => {
    if (!button(ch)) return;
    if (bandOf(ch) === 'vhf') {
      next.vhf = { v: ch, station: station || null, from };
      next.split = true;
      return;
    }
    next.uhf = { v: ch, station: station || null, from };
    if (!next.split) next.vhf = { v: `CH ${button(ch)} VHF`, station: 'backup', from };
  };
  if (figs.chans) figs.chans.forEach((c) => tune(c.ch, c.station));
  else if (figs.ch) tune(figs.ch, figs.station);
  if ('uhf' in figs && !figs.uhf) delete next.uhf;
  if ('vhf' in figs && !figs.vhf) {
    next = { ...next, split: false };
    if (next.uhf) next.vhf = { v: `CH ${button(next.uhf.v)} VHF`, station: 'backup', from };
    else delete next.vhf;
  }
  return next;
}
