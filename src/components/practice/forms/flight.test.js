import { begin, buildFlight, decodeCode, encodeCode, isDone, position, readout, reduce, view } from './flight';
import { PROFILES } from './profiles';

const SEEDS = 200;
const codes = Object.keys(PROFILES).flatMap((p) => Array.from({ length: SEEDS }, (_, i) => encodeCode(p, i * 5237 + 11)));

// A seeded stream of clicks, as two students might make them: mostly forward, sometimes back,
// a skip to a stage, a reveal-all.
function clicks(seed, n) {
  let a = seed;
  const rnd = () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = rnd();
    out.push(r < 0.8 ? { type: 'forward' } : r < 0.88 ? { type: 'back' } : r < 0.94 ? { type: 'revealAll' }
      : r < 0.97 ? { type: 'skipTo', phase: ['Working area', 'Recovery', 'Landing'][Math.floor(rnd() * 3)] } : { type: 'next' });
  }
  return out;
}

describe('flight codes', () => {
  test('a code reads back as its profile and seed', () => {
    for (const p of Object.keys(PROFILES)) {
      for (const seed of [0, 1, 31, 32, 99999, 1048575]) {
        expect(decodeCode(encodeCode(p, seed))).toEqual({ profile: p, seed });
      }
    }
  });
  test('a code is read however it is typed', () => {
    const code = encodeCode('L', 123456);
    expect(decodeCode(code.toLowerCase())).toEqual(decodeCode(code));
    expect(decodeCode(` ${code.slice(0, 3)}-${code.slice(3)} `)).toEqual(decodeCode(code));
    expect(decodeCode('L1O0O')).toEqual(decodeCode('L1000'));
    expect(decodeCode('X1234')).toBeNull();
    expect(decodeCode('F12')).toBeNull();
  });
  test('the same code makes the same flight', () => {
    for (const code of codes.slice(0, 30)) {
      expect(JSON.stringify(buildFlight(code))).toBe(JSON.stringify(buildFlight(code)));
    }
  });
});

describe('Lead and Wing stay in step', () => {
  test('every click leaves both screens on the same beat and the same line', () => {
    codes.filter((_, k) => k % 4 === 0).forEach((code, k) => {
      const flight = buildFlight(code);
      let s = begin(flight);
      for (const action of clicks(k + 1, 900)) {
        s = reduce(s, action);
        const lead = view(s, '11');
        const wing = view(s, '12');
        expect(!wing).toBe(!lead);
        if (!lead) continue;
        expect(wing.id).toBe(lead.id);
        expect(wing.lines.map((l) => [l.shown, l.next, l.counts])).toEqual(lead.lines.map((l) => [l.shown, l.next, l.counts]));
      }
    });
  });

  test('a beat costs the same clicks from either cockpit: one per aircraft line, one to go on', () => {
    for (const code of codes) {
      const flight = buildFlight(code);
      let s = reduce(begin(flight), { type: 'next' });
      let n = 0;
      while (!isDone(s) && n < 10000) {
        const before = position(s);
        let k = 0;
        while (view(s, '11').lines.some((l) => l.counts && !l.shown)) {
          s = reduce(s, { type: 'forward' });
          k++;
        }
        expect(k).toBe(before.lines);
        expect(k).toBe(view(s, '12').lines.filter((l) => l.counts).length);
        s = reduce(s, { type: 'forward' });
        n++;
      }
      expect(n).toBe(flight.beats.length);
    }
  });

  test('a station line shows with the line before it, never on its own click', () => {
    const flight = buildFlight(codes[0]);
    const after = (l, x, all) => !l.counts && x > 0 && all[x - 1].counts;
    const i = flight.beats.findIndex((b) => b.lines.some(after));
    let s = { ...begin(flight), at: i };
    const lines = flight.beats[i].lines;
    const j = lines.findIndex(after);
    const before = lines.slice(0, j).filter((l) => l.counts).length;
    s = { ...s, upTo: before - 1 };
    expect(view(s, '11').lines[j].shown).toBe(false);
    s = reduce(s, { type: 'reveal' });
    expect(view(s, '11').lines[j].shown).toBe(true);
  });
});

describe('the flight', () => {
  test('each aircraft leads, swapping at each lead change, and 11 brings the flight home', () => {
    for (const code of codes) {
      const { beats } = buildFlight(code);
      const changes = beats.filter((b) => b.name === 'leadChange');
      expect(changes.length).toBe(2);
      expect(changes[0].leader).toBe('11');
      expect(changes[1].leader).toBe('12');
      const last = beats[beats.length - 1];
      expect(last.leader).toBe('11');
      // Within a lead change the signal is the old Lead's, the TCAS call the new Lead's.
      changes.forEach((b) => {
        expect(b.lines[0].ac).toBe(b.leader);
        expect(b.lines[b.lines.length - 1].ac).not.toBe(b.leader);
      });
    }
  });

  test('in every Ops Check 11 answers first, wherever it is (FTI §107)', () => {
    for (const code of codes.slice(0, 120)) {
      const { beats } = buildFlight(code);
      beats.forEach((b) => {
        const fuel = b.lines.filter((l) => /Good G\./.test(l.text));
        if (!fuel.length) return;
        expect(fuel[0].text).toMatch(/ 11, \d+, Good G\./);
        expect(fuel[fuel.length - 1].text).toMatch(/ 12, \d+, Good G\./);
      });
    }
  });

  test('Joker is reset entering the area only when the lowest fuel is 30 lb or more from 900', () => {
    for (const code of codes) {
      const { beats, profile } = buildFlight(code);
      const first = beats.find((b) => b.name === 'firstOps');
      const fuel = first.lines.filter((l) => /Good G\./.test(l.text)).map((l) => Number(/, (\d+), Good/.exec(l.text)[1]));
      const low = Math.min(...fuel);
      const reset = first.lines.find((l) => /reset Joker/.test(l.text));
      const want = Math.abs(low - 900) < 30 ? null : `reset Joker ${profile.fuel[0] + (low - 900) / 2}.`;
      expect(reset ? reset.text.slice(reset.text.indexOf('reset')) : null).toBe(want);
    }
  });

  test('every line cites its publication or says it is made up', () => {
    for (const code of codes) {
      buildFlight(code).beats.forEach((b) => b.lines.forEach((l) => {
        if (!l.ref && !l.generated) throw new Error(`${code} ${b.title}: "${l.text}" has no source`);
      }));
    }
  });

  test('no blank is left unfilled', () => {
    const LEFT = /\((?:TAC|ATC|ATIS|wind|altimeter|altitude|EP|reset|fuel \d+|squadron|side \d+|event|break|lead #|wing #)\)|\{rwy\}|undefined|null/;
    for (const code of codes) {
      buildFlight(code).beats.forEach((b) => b.lines.forEach((l) => {
        expect(`${b.title}: ${l.text}`).not.toMatch(LEFT);
        expect(l.kind !== 'row' || l.lead !== null || l.wing !== null).toBe(true);
      }));
    }
  });

  test('the radios end the flight on Ground, with the TAC on the AUX, in both aircraft', () => {
    for (const code of codes.slice(0, 60)) {
      const flight = buildFlight(code);
      const s = { ...begin(flight), at: flight.beats.length };
      ['11', '12'].forEach((ac) => {
        const r = readout(s, ac);
        expect(r.pri.v).toBe('CH 3 UHF');
        expect(r.aux.v).toBe('TAC AUX');
      });
    }
  });

  test('low work flies TAC over eight: tactical on the UHF, Approach on VHF button 8', () => {
    const code = codes.find((c) => c[0] === 'L');
    const flight = buildFlight(code);
    const i = flight.beats.findIndex((b) => b.name === 'tacOverEight');
    const s = { ...begin(flight), at: i, upTo: flight.beats[i].clicks };
    ['11', '12'].forEach((ac) => {
      const r = readout(s, ac);
      expect(r.pri.v).toBe('TAC PRI');
      expect(r.aux.v).toBe('CH 8 VHF');
    });
  });
});
