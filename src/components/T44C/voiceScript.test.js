import { T44C_HOLLYWOOD } from './t44cNormals';
import { scriptFor, spoken, lastWord, doneCall, isMine, commandOf, endsLine, PM_ACTION } from './voiceScript';

const proc = (id) => T44C_HOLLYWOOD.find((p) => p.id === id);
const said = (lines) => lines.filter((l) => l.kind === 'say').map((l) => `${l.seat}: ${l.text}`);

describe('voice script', () => {
  test('Before Start: the PM reads, the PF answers, and the PM closes', () => {
    const lines = said(scriptFor(proc('before-start')));
    expect(lines.slice(0, 5)).toEqual(['PF: Before Start Checklist', 'PM: Parking Brake', 'PF: SET', 'PM: Electrical Panel', 'PF: SET']);
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
    const first = lines.filter((l) => l.kind === 'say')[1];
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

  test('the PF opens each checklist by its title', () => {
    expect(scriptFor(proc('after-start'))[0]).toMatchObject({ seat: 'PF', text: 'After Start Checklist' });
    expect(scriptFor(proc('anti-ice-check'))[0].text).toBe('Full Anti-Ice/Deice Check');
  });

  test('the PM takes time to do its own action before answering', () => {
    const lines = scriptFor(proc('after-start'));
    const set = lines.find((l) => l.step === 'as1' && l.text === 'SET');
    expect(set).toMatchObject({ seat: 'PM', after: PM_ACTION });
    // Answering after the PF is no action of its own.
    const flaps = scriptFor(proc('before-start')).filter((l) => l.step === 'bs4');
    expect(flaps.map((l) => l.after)).toEqual([0, 0, 0]);
  });

  test('Runup 8 waits for the lights', () => {
    const lines = scriptFor(proc('engine-runup')).filter((l) => l.step === 'er8' && l.seat === 'PM' && l.kind === 'say');
    expect(lines.map((l) => [l.text, l.after])).toEqual([
      ['Autofeather/Autoignition', 0], ['Four lights', 0], ['Swap', 10], ['Flashing', 12], ['All four', 14],
      ['Swap', 8], ['Flashing', 13],
    ]);
  });

  test('Before Takeoff: altimeters, FMS, the brief and one closing call', () => {
    const said2 = (step) => said(scriptFor(proc('before-takeoff')).filter((l) => l.step === step));
    expect(said2('bt11')).toEqual([
      'PM: Altimeters', 'PF: PFD set 30.12 reading 30 feet, ESIS set 30.12 reading 30 feet. RADALT checks.',
      'PM: Set 30.12, reading 30 feet, RADALT checks', 'PF: CHECKED/SET', 'PM: CHECKED/SET',
    ]);
    expect(said2('bt12')).toEqual([
      'PM: FMS', 'PF: Hold the checklist', 'PF: You have the controls. I will be heads down.',
      'PM: I have the controls', 'PF: You have the controls', 'PF: Verify', 'PM: Execute',
      'PM: You have the controls', 'PF: I have the controls', 'PM: You have the controls',
      'PF: CHECKED/SET', 'PM: CHECKED/SET',
    ]);
    const all = said(scriptFor(proc('before-takeoff')));
    expect(all[all.indexOf('PF: Any questions?') + 1]).toBe('PM: No');
    expect(all.filter((l) => /BEFORE TAKEOFF CHECKLIST COMPLETE/i.test(l))).toHaveLength(1);
    expect(all.some((l) => /Checked (left|right)/i.test(l))).toBe(false);
  });
});
