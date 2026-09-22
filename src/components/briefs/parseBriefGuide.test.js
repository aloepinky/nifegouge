import fs from 'fs';
import path from 'path';
import { loadTextItems } from '../discuss/jppt/pdfText';
import { parseBriefGuide, splitName, shortName, programFor, unitFrom } from './parseBriefGuide';
// No Worker in jsdom: this puts pdf.js's worker in-process.
import 'pdfjs-dist/legacy/build/pdf.worker.entry';

if (typeof global.ReadableStream === 'undefined') {
  // eslint-disable-next-line global-require
  global.ReadableStream = require('stream/web').ReadableStream;
}

// The parser run against the TW-4 Briefing Guide. _reference-docs is gitignored, so this skips
// on any machine without the publication. The expected values are the ones the hand-built
// briefs page carried before the briefs moved to the server.

const PDF = path.join(__dirname, '..', '..', '..', '_reference-docs', 'T6b Primary', 'Fundamental References', 'Expanded Checklists and Brief.pdf');
const maybe = fs.existsSync(PDF) ? describe : describe.skip;

jest.setTimeout(120000);

test('splitName takes a title-case name before a stop, or any name before a colon', () => {
  expect(splitName('Local Area: Brief current METARs.')).toEqual(['Local Area', 'Brief current METARs.']);
  expect(splitName('‘I’M SAFE’ Checklist. Both pilots must')).toEqual(['‘I’M SAFE’ Checklist', 'Both pilots must']);
  expect(splitName('Solo flights are not usually graded. The ODO must')).toEqual(['Solo flights are not usually graded. The ODO must', '']);
  expect(splitName('Unsafe gear.')).toEqual(['Unsafe gear', '']);
});

test('a guide names its own school, and the aircraft follows', () => {
  expect(programFor('T-6B MISSION/NATOPS BRIEFING GUIDE FOR FAM, VNAV, AND INAV STAGES'))
    .toEqual({ school: 'Primary', aircraft: 'T-6B' });
  expect(programFor('NIFE Expanded Briefing Guide')).toEqual({ school: 'NIFE', aircraft: 'C172' });
  // Nothing it recognises: Primary, which is the corpus the page was written for.
  expect(programFor('BRIEFING GUIDE')).toEqual({ school: 'Primary', aircraft: 'T-6B' });
});

test('the wing follows from the instruction that publishes the guide', () => {
  expect(unitFrom('COMTRAWINGFOURINST 1552.1')).toBe('TW-4');
  expect(unitFrom('COMTRAWINGTWOINST 1552.3A')).toBe('TW-2');
  // A guide that names no instruction names no unit: the box is left to be typed.
  expect(unitFrom('')).toBe('');
  expect(unitFrom('NASCINST 3710.1B')).toBe('');
});

test('shortName', () => {
  expect(shortName('T-6B MISSION/NATOPS BRIEFING GUIDE FOR FAM, VNAV, AND INAV STAGES')).toBe('FAM / VNAV / INAV');
  expect(shortName('T-6B MISSION/NATOPS BRIEFING GUIDE FOR FORM AND CAPSTONE STAGES')).toBe('FORM / CAPSTONE');
  expect(shortName('T-6 SOLO BRIEFING GUIDE')).toBe('SOLO');
});

maybe('TW-4 Briefing Guide', () => {
  let out;
  const brief = (id) => out.briefs.find((b) => b.id === id);
  const section = (b, title) => b.sections.find((s) => s.title === title);

  beforeAll(async () => {
    out = parseBriefGuide(await loadTextItems(fs.readFileSync(PDF)));
  });

  test('the guide says whose it is, when it was published and which school it is for', () => {
    const fam = brief('fam-vnav-inav');
    expect(fam.school).toBe('Primary');
    expect(fam.aircraft).toBe('T-6B');
    expect(fam.source.publication).toMatch(/^COMTRAWINGFOURINST/);
    expect(fam.source.unit).toBe('TW-4');
    expect(fam.source.date).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
  });

  test('finds the three briefs, with no merge warnings', () => {
    expect(out.briefs.map((b) => b.title)).toEqual([
      'T-6B MISSION/NATOPS BRIEFING GUIDE FOR FAM, VNAV, AND INAV STAGES',
      'T-6B MISSION/NATOPS BRIEFING GUIDE FOR FORM AND CAPSTONE STAGES',
      'T-6 SOLO BRIEFING GUIDE',
    ]);
    expect(out.briefs.map((b) => b.id)).toEqual(['fam-vnav-inav', 'form-capstone', 'solo']);
    expect(out.warnings).toEqual([]);
  });

  test('FAM sections follow the card, page by page and column by column', () => {
    const fam = brief('fam-vnav-inav');
    expect(fam.sections.map((s) => [s.title, s.items.length, s.column, !!s.break, !!s.fixed])).toEqual([
      ['ADMINISTRATION', 8, 1, false, false],
      ['WEATHER', 5, 1, false, false],
      ['NAVIGATION AND FLIGHT PLANNING', 5, 2, false, false],
      ['MISSION EXECUTION/CONDUCT', 5, 2, false, false],
      ['COMMUNICATIONS AND CREW COORDINATION', 6, 2, false, false],
      ['EMERGENCIES', 14, 1, true, false],
      // The card's own lists: nothing in them opens, so each is one block of text.
      ['BRIEFING ITEMS', 0, 1, false, true],
      ['DEBRIEFING GUIDE', 0, 2, false, true],
      ['TRAINING RULES FOR ELP', 0, 2, false, true],
    ]);
  });

  test('names come from the card and words from the guide', () => {
    const admin = section(brief('fam-vnav-inav'), 'ADMINISTRATION');
    const imsafe = admin.items[0];
    expect(imsafe.label).toBe('I.M.S.A.F.E. Checklist');
    expect(imsafe.text).toMatch(/^Both pilots must ensure they are safe to fly/);

    const climb = section(brief('fam-vnav-inav'), 'NAVIGATION AND FLIGHT PLANNING').items[0];
    expect(climb.text.split('\n')).toEqual([
      '(1) **Familiarization and VNAV Stage.** “Expected climb-out will be ______.” (Ex. “Beachline Departure to North Mustangs”)',
      '(2) **INAV Stage.** “We will expect the ________ departure (as appropriate for runway in use and filed flight plan) but will remain flexible for changes from ATC.”',
    ]);

    const local = section(brief('fam-vnav-inav'), 'WEATHER').items[0];
    expect(local.label).toBe('Local area');
    expect(local.text).toMatch(/^Brief current METARs for applicable local area and destination airfields\./);

    const fuel = section(brief('fam-vnav-inav'), 'EMERGENCIES').items[2];
    expect(fuel.text).toBe('“We will declare MIN FUEL if we anticipate landing below 200 pounds and EMERGENCY FUEL if we anticipate landing below 120 pounds.”');
  });

  test('the OCR is joined into whole words', () => {
    const text = JSON.stringify(brief('fam-vnav-inav'));
    expect(text).toContain('take proper action');
    expect(text).toContain('four-second cadence');
    expect(text).toContain('set 4-6 percent torque');
    expect(text).not.toMatch(/acti on|need le|must ers/);
  });

  test('an item the guide only repeats is fixed, as it is on the card', () => {
    const admin = section(brief('fam-vnav-inav'), 'ADMINISTRATION');
    const orm = admin.items[1];
    expect(orm.label).toBe('Apply time critical Operational Risk Management');
    expect(orm.fixed).toBe(true);
    expect(orm.subtext).toBeUndefined();
    expect(orm.text.split('\n').slice(0, 3)).toEqual([
      // The card's lead-ins are bold, and a colon with lines under it is a heading for them.
      'a. **Identify Hazards:** What could go wrong?',
      'b. **Assess Hazards (severity/probability):**',
      '  (1) How bad could it get?',
    ]);

    const atj = admin.items[4];
    expect(atj.label).toBe('ATJ review of stage performance');
    expect(atj.fixed).toBe(true);
    expect(atj.text.split('\n')).toHaveLength(4);

    // Mission planning is four labels against four sentences: the labels stay under the name
    // as subtext and the sentences open behind it.
    const planning = section(brief('fam-vnav-inav'), 'NAVIGATION AND FLIGHT PLANNING').items[1];
    expect(planning.fixed).toBeUndefined();
    expect(planning.subtext.split('\n')).toHaveLength(4);
    expect(planning.text.split('\n')).toHaveLength(4);

    // Most items have neither: a name, and words behind it.
    const imsafe = admin.items[0];
    expect(imsafe.fixed).toBeUndefined();
    expect(imsafe.subtext).toBeUndefined();
  });

  test('a fixed section is the card list, numbered, with its sub-lines a level in', () => {
    const debrief = section(brief('fam-vnav-inav'), 'DEBRIEFING GUIDE');
    expect(debrief.items).toEqual([]);
    expect(debrief.text.split('\n').slice(0, 7)).toEqual([
      '1. Flight plan closed/ODO contacted',
      '2. NAVFLIR complete',
      '3. MAFS written / Fuel packet return (if applicable)',
      '4. ATF submitted',
      '5. Unsatisfactory event',
      '  a. Refer to Primary Curriculum Guide.',
      '  b. If unsatisfactory event results in a pink sheet, direct SNA to report to Student Control.',
    ]);
  });

  test('the card sets OCF procedures bold, and headings are not marked up', () => {
    const emerg = section(brief('fam-vnav-inav'), 'EMERGENCIES');
    expect(emerg.title).toBe('EMERGENCIES');
    expect(emerg.items[11].label).toBe('**OCF procedures (Brief every Flight)**');
    expect(emerg.items[0].label).toBe('Aborts');
  });

  test('a lead-in that names what follows is bold, and an abbreviation is not', () => {
    const freq = section(brief('form-capstone'), 'COMMUNICATIONS AND CREW COORDINATION').items[0];
    expect(freq.text.split('\n')[0]).toBe('(1) **UHF TAC Pri.** Brief preset and manual primary and secondary frequencies.');

    const planning = section(brief('fam-vnav-inav'), 'NAVIGATION AND FLIGHT PLANNING').items[1];
    expect(planning.text.split('\n')[1]).toBe('(2) Departure/Destination/Alternate airfield considerations (i.e. special taxi instructions, contract gas, PPR required, etc.)');

    // A paragraph break ends a lead-in: `ELP` is not a heading for the note under it.
    const rules = section(brief('fam-vnav-inav'), 'MISSION EXECUTION/CONDUCT').items[2];
    expect(rules.text).not.toMatch(/\*\*ELP/);
  });

  test('the ELP rules are printed once, in their own section', () => {
    const rules = section(brief('fam-vnav-inav'), 'MISSION EXECUTION/CONDUCT').items[2];
    expect(rules.label).toBe('Training rules – Read verbatim');
    expect(rules.text.split('\n')[0]).toBe('(1) ELP');
    expect(rules.text).toMatch(/Note: SNA\/IUT must read training rules verbatim/);
    expect(rules.text).not.toMatch(/below energy profile at Base Key/);
    expect(section(brief('fam-vnav-inav'), 'TRAINING RULES FOR ELP').text.split('\n')).toHaveLength(5);

    // FORM keeps Terminate, Knock-it-Off and Resets, which its card only names.
    const formRules = section(brief('form-capstone'), 'MISSION EXECUTION/CONDUCT').items[2];
    expect(formRules.text.replace(/\*\*/g, '').split('\n').filter((l) => /^\(\d\)/.test(l))).toEqual([
      '(1) ELP',
      '(2) Terminate.',
      '(3) Knock-it-Off.',
      '(4) Resets. “Bearing line resets must be conducted at the discretion of the IP”',
    ]);
  });

  test('the ELP rules keep the card wording', () => {
    const rules = section(brief('fam-vnav-inav'), 'TRAINING RULES FOR ELP');
    expect(rules.text.split('\n')[1]).toBe('2. A landing is not required on a practice Forced Landing (ELP). When in doubt, WAVE OFF.');
  });

  test('FORM reads its misnumbered sections and its dropped marker', () => {
    const form = brief('form-capstone');
    const mission = section(form, 'MISSION EXECUTION/CONDUCT');
    expect(mission.items.map((i) => i.label)).toEqual([
      'Ground ops', 'Profile/Sequence of Events', 'Training rules – Read ELP rules verbatim',
      'G-Awareness procedures', 'OLF operations and entry',
    ]);
    expect(mission.items[1].text.split('\n').filter((l) => /^\(\d\)/.test(l))).toHaveLength(2);
    expect(section(form, 'EMERGENCIES').items).toHaveLength(14);
  });

  test('Solo has no card: the guide names its items, in one column', () => {
    const solo = brief('solo');
    expect(solo.sections.every((s) => s.column === 1)).toBe(true);
    expect(solo.sections.map((s) => s.title)).toContain('Solo Restrictions');
    // Fourteen rules with nothing behind any of them: one block of text, not fourteen rows.
    const restrictions = solo.sections.find((s) => s.title === 'Solo Restrictions');
    expect(restrictions.fixed).toBe(true);
    expect(restrictions.text.split('\n')).toHaveLength(14);
  });
});

// The NIFE Expanded Briefing Guide, which is the other way a guide is written: numbered `1)`
// `a)` `i)`, prose on `-` lines, every name set bold, and no card printed with it.

const NIFE_PDF = path.join(__dirname, '..', '..', '..', '_reference-docs', 'C172 NIFE', 'Fundamental References', 'NIFE EXPANDED BRIEF 7AUG2026.pdf');
const maybeNife = fs.existsSync(NIFE_PDF) ? describe : describe.skip;

maybeNife('NIFE Expanded Briefing Guide', () => {
  let nife;
  const section = (title) => nife.sections.find((s) => s.title === title);

  beforeAll(async () => {
    const pages = await loadTextItems(new Uint8Array(fs.readFileSync(NIFE_PDF)));
    const out = parseBriefGuide(pages);
    expect(out.warnings).toEqual([]);
    expect(out.briefs).toHaveLength(1);
    [nife] = out.briefs;
  });

  test('a title in title case, printed as a running head on every page', () => {
    expect(nife.title).toBe('NIFE Expanded Briefing Guide');
    expect(nife.short).toBe('NIFE');
    expect(nife.id).toBe('nife');
    expect(nife.school).toBe('NIFE');
    expect(nife.aircraft).toBe('C172');
    // The head on the second page is furniture, not a second brief and not a line of the first.
    expect(nife.sections.some((s) => /Expanded Briefing Guide/i.test(s.title))).toBe(false);
  });

  test('the sections are the numbered levels, in the guide\'s order', () => {
    expect(nife.sections.map((s) => s.title)).toEqual([
      'ADMIN', 'MISSION CONDUCT', 'EMERGENCIES / CREW COORDINATION', 'DOR/TTO POLICY', 'QUESTIONS?',
    ]);
    expect(nife.sections.every((s) => s.column === 1)).toBe(true);
  });

  test('a name is the bold run and its words are what follows it', () => {
    const admin = section('ADMIN');
    expect(admin.items.map((i) => i.label)).toEqual([
      'IMSAFE / Human Factors', 'Crew Day and Rest', 'ORM Worksheet (Hazards and Controls)', 'CRM',
      'SNA/SNFO EKB/PED Use and Restrictions', 'Review ATJ to include', 'Discussion Items',
    ]);
    expect(admin.items[3].text).toBe('There is no rank in the cockpit. All crewmembers are participating members.');
    // Nothing behind the name: the item does not open.
    expect(admin.items[0].text).toBe('');
  });

  test('a line broken by the margin joins; one that stopped short of it does not', () => {
    const crewDay = section('ADMIN').items.find((i) => i.label === 'Crew Day and Rest');
    expect(crewDay.text).toBe('Brief start and projected end of crew day, and if crew rest may be projected to be less than 12 hours between today’s event and the follow-on event.');
    const atj = section('ADMIN').items.find((i) => i.label === 'Review ATJ to include');
    expect(atj.text.split('\n')).toContain('14-30 day break = one mandatory, one optional');
  });

  test('a `-` line is a paragraph of the item above it', () => {
    const controls = section('MISSION CONDUCT').items.find((i) => i.label === 'Change of Aircraft Controls');
    expect(controls.text.split('\n\n')).toHaveLength(4);
    expect(controls.text.split('\n\n')[3]).toBe('Any IP input does not constitute a control change.');
  });

  test('the `i)` level is numbered under its item, with its own name bold', () => {
    const emergencies = section('EMERGENCIES / CREW COORDINATION');
    const failures = emergencies.items[0];
    expect(failures.label).toBe('Aircraft Emergencies and System Failures');
    expect(failures.text.split('\n')[0]).toMatch(/^\(i\) \*\*Actual\*\* Treat all emergencies/);
    expect(failures.text).toMatch(/\(ii\) \*\*Simulated\*\*/);
    // The version line the guide prints at the foot of every page is furniture.
    expect(failures.text).not.toMatch(/Version 2\.0/);
  });

  test('a marker with nothing bold after it is a paragraph of its section', () => {
    const dor = section('DOR/TTO POLICY');
    expect(dor.items).toHaveLength(0);
    expect(dor.text).toMatch(/^DOR\/TTO is in effect except during critical phases of flight/);
  });

  test('the guide names no instruction, so only its date is carried', () => {
    expect(nife.source).toEqual({ date: '13 March 2026' });
  });
});
