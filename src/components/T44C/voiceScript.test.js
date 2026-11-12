import { T44C_HOLLYWOOD } from './t44cNormals';
import { scriptFor, spoken, lastWord, doneCall, isMine, commandOf, endsLine } from './voiceScript';

const proc = (id) => T44C_HOLLYWOOD.find((p) => p.id === id);
const said = (lines) => lines.filter((l) => l.kind === 'say').map((l) => `${l.seat}: ${l.text}`);

describe('voice script', () => {
  test('Before Start: the PM reads, the PF answers, and the PM closes', () => {
    const lines = said(scriptFor(proc('before-start')));
    expect(lines.slice(0, 4)).toEqual(['PM: Parking Brake', 'PF: SET', 'PM: Electrical Panel', 'PF: SET']);
    // Flaps: both seats answer.
    expect(lines).toEqual(expect.arrayContaining(['PM: Flaps', 'PF: CORRESPOND', 'PM: CORRESPOND']));
    expect(lines[lines.length - 1]).toBe('PM: BEFORE START CHECKLIST COMPLETE');
  });

  test('the observer answers as the observer', () => {
    const lines = scriptFor(proc('before-start'));
    expect(lines.some((l) => l.seat === 'OBS' && l.text === 'LOCKED')).toBe(true);
  });

  test('a start is called by the PF, item and response together', () => {
    const lines = scriptFor(proc('start-right'));
    const first = lines.find((l) => l.kind === 'say');
    expect(first).toMatchObject({ seat: 'PF', text: 'Right Starter, On, Ignition, rotation' });
    expect(lines.some((l) => l.seat === 'PM' && l.text === 'Right Starter')).toBe(false);
    // Fuel Flow - Note has nothing spoken, so it is shown and not waited for.
    expect(lines.find((l) => l.step === 'sr4')).toMatchObject({ kind: 'act', text: 'Fuel Flow - Note' });
    // The control check's PM answers are the PM's.
    expect(lines).toEqual(expect.arrayContaining([expect.objectContaining({ seat: 'PM', text: 'Down.' })]));
  });

  test('radio calls are shown, not spoken', () => {
    const lines = scriptFor(proc('after-start'));
    const radio = lines.filter((l) => /Navy Corpus|Base, \(call-sign\)/.test(l.text));
    expect(radio.length).toBeGreaterThan(0);
    radio.forEach((l) => expect(l.kind).toBe('act'));
  });

  test('every checklist has lines for both seats and no empty speech', () => {
    T44C_HOLLYWOOD.forEach((p) => {
      const lines = scriptFor(p);
      expect(lines.some((l) => isMine(l, 'PF'))).toBe(true);
      lines.filter((l) => l.kind === 'say').forEach((l) => expect(l.say).not.toBe(''));
    });
  });

  test('a seat swap gives the other seat every line', () => {
    const lines = scriptFor(proc('before-start'));
    const pf = lines.filter((l) => isMine(l, 'PF')).length;
    const pm = lines.filter((l) => isMine(l, 'PM')).length;
    expect(pf + pm + lines.filter((l) => l.kind === 'say' && l.seat === 'OBS').length)
      .toBe(lines.filter((l) => l.kind === 'say').length);
  });

  test('spoken text', () => {
    expect(spoken('CHECKED/SET')).toBe('checked, set');
    expect(spoken('___.___ SET')).toBe('set');
    expect(spoken('Load below .5')).toBe('Load below point 5');
    expect(spoken('N1 stable above 50%')).toBe('N one stable above 50%');
    expect(spoken('__lbs, __lbs required')).toBe('pounds, pounds required');
    expect(spoken('ICS check')).toBe('ICS check');
    expect(spoken('Radar CHECKED/STANDBY')).toBe('Radar checked, standby');
  });

  test('the last word, the closing call and the commands', () => {
    expect(lastWord('Above 12 percent')).toBe('percent');
    expect(lastWord('CHECKED/SET')).toBe('set');
    expect(doneCall('"APPROACH CHECKLIST COMPLETE" or "ABBREVIATED APPROACH CHECKLIST COMPLETE" (PM)'))
      .toBe('APPROACH CHECKLIST COMPLETE');
    expect(commandOf('Say again')).toBe('again');
    expect(commandOf('go back.')).toBe('back');
    expect(commandOf('set')).toBe(null);
    const l = { last: 'set' };
    expect(endsLine('checked set', l)).toBe(true);
    expect(endsLine('checked', l)).toBe(false);
    expect(endsLine('on ignition rotation', { last: 'rotation' })).toBe(true);
  });
});
