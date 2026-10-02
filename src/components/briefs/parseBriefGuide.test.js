import fs from 'fs';
import path from 'path';
import { loadTextItems } from '../discuss/jppt/pdfText';
import {
  parseBriefGuide, splitName, shortName, programFor, unitFrom, unitOfTitle, pageList, nameScore, isoDate,
  pagesWithoutText, noTextMessage,
} from './parseBriefGuide';
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
  // Nothing it recognises: no school, so the upload keeps the one of the tab it is on.
  expect(programFor('BRIEFING GUIDE')).toEqual({});
  expect(programFor('AME BRIEFING GUIDE')).toEqual({});
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

test('a guide titled with its wing names its unit', () => {
  expect(unitOfTitle('TW-4 Flight Briefing Guide (Blue Card Script)')).toBe('TW-4');
  expect(unitOfTitle('AME BRIEFING GUIDE')).toBe('');
});

test('pageList reads the pages box', () => {
  expect(pageList('', 30)).toEqual({ pages: null });
  expect(pageList('6-8', 30)).toEqual({ pages: [5, 6, 7] });
  expect(pageList('6, 7, 8', 30)).toEqual({ pages: [5, 6, 7] });
  expect(pageList('8, 6-7', 30)).toEqual({ pages: [5, 6, 7] });
  expect(pageList('29-31', 30).error).toMatch(/not a page/);
  expect(pageList('six', 30).error).toMatch(/not a page/);
});

// The T-44C's guide: pages 6 to 8 of the TW-4 On-Wing Gouge Packet. The card (AME BRIEFING
// GUIDE, lettered headings in two columns) comes first under its own title, and the Blue Card
// Script follows under another, lettered `A.` / `1.`.
const T44C_PDF = path.join(__dirname, '..', '..', '..', '_reference-docs', 'T44C Advanced', 'Fundamental References', '_TW-4 On-Wing Gouge Packet - Mar 25.pdf');
const maybeT44c = fs.existsSync(T44C_PDF) ? describe : describe.skip;

maybeT44c('the T-44C Blue Card Script', () => {
  let out;
  beforeAll(async () => {
    const pages = await loadTextItems(new Uint8Array(fs.readFileSync(T44C_PDF)));
    out = parseBriefGuide(pageList('6-8', pages.length).pages.map((n) => pages[n]));
  });

  test('the card and the guide are one brief, named by the card', () => {
    expect(out.warnings).toEqual([]);
    expect(out.briefs).toHaveLength(1);
    const [b] = out.briefs;
    expect(b).toMatchObject({ id: 'ame', short: 'AME', note: '', source: { unit: 'TW-4' } });
    expect(b.school).toBeUndefined();
  });

  test("sections are the card's lettered headings, in its columns", () => {
    const [b] = out.briefs;
    expect(b.sections.map((s) => [s.title, s.column])).toEqual([
      ['Product Inventory', 1], ['Mission Overview', 1], ['Communications', 1],
      ['Weather / NOTAMS / BASH', 1], ['Flight Planning', 1], ['Emergencies', 2],
      ['Observer Duties', 2], ['Standarization Board Minutes / Read and Initial', 2],
      ['ORM Worksheet', 2], ['Discuss Items (Per MCG)', 2], ['Questions?', 2],
    ]);
  });

  test("each card item opens the guide's words for it", () => {
    const items = Object.fromEntries(out.briefs[0].sections.flatMap((s) => s.items.map((it) => [it.label, it.text])));
    expect(items['SNA 1 / SNA 2']).toBe('SNA 1 Event / SNA 2 Event');
    expect(items['System Failures (Actual / Simulated)']).toMatch(/^“Any simulated malfunction/);
    // Page 8 carries on page 7's section.
    expect(items['Emergency Egress']).toMatch(/The IP will be the last out of the aircraft\.”$/);
    expect(out.briefs[0].sections.find((s) => s.title === 'Observer Duties').fixed).toBe(true);
  });
});

// The TW-5's guide: Appendix D of the FWOP (COMTRAWINGFIVEINST 3710.2Z), pages 196 to 202 of
// the book. Its sections are bold `1. ADMIN:`, its items `a.` / `(1)` / `(a)` with bullets
// under them, and Ejection carries the NATOPS post-ejection checklist — `1.` / `a.` / `(1)`
// again — nested four deep. A debrief guide follows it under a title of its own.
const TW5_PDF = path.join(__dirname, '..', '..', '..', '_reference-docs', 'T6b Primary', 'Fundamental References', 'Fixed-Wing Standard Operating Procedures (FWOP) 3710.2Z (Change 6) 2.pdf');
const maybeTw5 = fs.existsSync(TW5_PDF) ? describe : describe.skip;

maybeTw5('the TW-5 FWOP briefing guide', () => {
  let out;
  const section = (b, title) => b.sections.find((s) => s.title === title);
  const item = (b, title, label) => section(b, title).items.find((i) => i.label === label);

  beforeAll(async () => {
    const pages = await loadTextItems(new Uint8Array(fs.readFileSync(TW5_PDF)));
    out = parseBriefGuide(pageList('196-202', pages.length).pages.map((n) => pages[n]));
  });

  test('two guides, named without their appendix number, and the wing from the instruction', () => {
    expect(out.warnings).toEqual([]);
    expect(out.briefs.map((b) => b.title)).toEqual(['BRIEFING GUIDE', 'MISSION BRIEFING GUIDE']);
    expect(out.briefs[0].source).toEqual({ publication: 'COMTRAWINGFIVEINST 3710.2Z', unit: 'TW-5' });
  });

  test('the bold numbered lines are the sections', () => {
    const [brief] = out.briefs;
    expect(brief.sections.map((s) => s.title)).toEqual([
      'ADMIN', '* CREW COORDINATION', 'PROFILE', 'EMERGENCIES', 'TAC ADMIN', 'MCG',
    ]);
    expect(section(brief, 'ADMIN').items.map((i) => i.label)).toEqual([
      'Side Number / Callsign', 'Walk / Takeoff / Land times', 'ORM', 'R&I', 'Pubs and EKB',
      'Review ATJ', '* DOR / TTO Policy',
    ]);
    expect(section(brief, 'EMERGENCIES').items).toHaveLength(12);
  });

  test('the page footer is not part of the text it falls in', () => {
    const text = JSON.stringify(out.briefs);
    expect(text).not.toMatch(/D-\d/);
    expect(item(out.briefs[0], 'EMERGENCIES', '* Birdstrike / Damaged Aircraft').text)
      .toMatch(/conduct a controllability check IAW with NATOPS\./);
  });

  test('a checklist nested inside an item keeps its own numbering', () => {
    const lines = item(out.briefs[0], 'EMERGENCIES', 'Ejection').text.split('\n');
    expect(lines).toContain('    1. Inspect canopy - Carefully inspect canopy and suspension lines for damage and/or malfunctions');
    expect(lines).toContain('      a. LeMoinge slots - Locate toggles on front risers. Pull down on toggles to turn chute into the wind prior to landing (left toggle, left turn; right toggle, right turn).');
    expect(lines).toContain('        (5) Shoulder blade');
    // After the checklist, the outline carries on where it was.
    expect(lines).toContain('  (d) Once the seat beacon is set, attempt to contact SAR assets using the PRC-648 on GUARD.');
    expect(lines).toContain('    • SQUAWK (7700, ELT on),');
  });

  test('the debrief guide is lists with nothing to open', () => {
    const debrief = out.briefs[1];
    expect(debrief.sections.map((s) => [s.title, !!s.fixed])).toEqual([
      ['SAFETY OF FLIGHT', true], ['ADMIN', true], ['MISSION', true],
    ]);
  });
});

// A guide in none of the schemes above — roman sections, lettered items, numbered and bulleted
// lines under them, no title on the page — made up here so the reader is held to reading the
// page rather than knowing the guides it has met.
test('an unfamiliar outline is read off the page', () => {
  let y = 700;
  const line = (x, str, bold) => {
    y -= 14;
    return { str, transform: [1, 0, 0, 1, x, y], width: str.length * 5, bold: !!bold };
  };
  const page = [
    line(72, 'I. PREFLIGHT', true),
    line(90, 'A. Weather. Brief the forecast for the local area and destination.'),
    line(90, 'B. Fuel'),
    line(108, '1. Joker'),
    line(108, '2. Bingo'),
    line(126, 'a. Computed for the farthest divert.'),
    line(72, 'II. EMERGENCIES', true),
    line(90, 'A. Engine failure'),
    line(108, '• Zoom or glide'),
    line(108, '• Assess landing options'),
    line(90, 'B. Ejection'),
  ];
  const { briefs, warnings } = parseBriefGuide([page]);
  expect(warnings[0]).toMatch(/read as one brief/);
  expect(briefs).toHaveLength(1);
  const [brief] = briefs;
  expect(brief.sections.map((s) => s.title)).toEqual(['PREFLIGHT', 'EMERGENCIES']);
  expect(brief.sections[0].items.map((i) => [i.label, i.text])).toEqual([
    ['Weather', 'Brief the forecast for the local area and destination.'],
    // A short line with lines under it heads them, so it is bold, as in the TW-4 guide.
    ['Fuel', '1. Joker\n2. **Bingo**\n  a. Computed for the farthest divert.'],
  ]);
  expect(brief.sections[1].items[0].text).toBe('• Zoom or glide\n• Assess landing options');
});

// A scanned guide run through OCR, made up here with the misreads a real one showed: each page
// sits a few points off the last, the running head is spelled differently on every page, the
// slashes in bold names come back plain, `l)` reads `I)`, `5)` reads `S)`, `j)` comes back as
// a scrap, and an `i)` indented under `h)` must not be taken for the letter after it.
test('an OCR scan is read through its misreads', () => {
  const HEADS = ['TRAINING SQUADRON NINE GUIDE', 'TRAlNING SQUADRON NlNE GUIDE', 'TRAINING SQUADR0N NINE GUlDE'];
  const pages = [[], [], []];
  let page;
  let y;
  let shift;
  const start = (n) => {
    page = pages[n];
    y = 700;
    shift = [0, 6, 2][n];
    page.push({ str: HEADS[n], transform: [1, 0, 0, 1, 300, 760], width: 150, bold: false });
  };
  // runs: [text, bold]; one line, the runs side by side.
  const line = (x, ...runs) => {
    y -= 14;
    let at = x + shift;
    runs.forEach(([str, bold]) => {
      page.push({ str, transform: [1, 0, 0, 1, at, y], width: str.length * 5, bold: !!bold });
      at += str.length * 5 + 2;
    });
  };
  start(0);
  line(46, ['1)', true], ['ADMIN', true]);
  line(64, ['a)', true], ['Weather', true], ['/', false], ['NOTAMS', true], ['I', false], ['TFRs', true], ['Brief it as planned for the day.', false]);
  line(64, ['b)', true], ['Fuel', true], ['Brief it as planned for the day.', false]);
  line(46, ['2)', true], ['EMERGENCIES', true]);
  'abcdef'.split('').forEach((c) => line(64, [`${c})`, true], [`Item ${c}`, true], ['Brief it as planned for the day.', false]));
  line(64, ['g)', true], ['Engine Failure', true], ['/', false], ['Power Loss', true], ['Brief it as planned for the day.', false]);
  line(64, ['h)', true], ['Stall', true], ['&', false], ['Recovery', true]);
  line(82, ['i) Stalls not properly recovered can lead to out of control flight.']);
  line(82, ['ii) Recover from the unusual attitude.']);
  line(64, ['i)', true], ['Radio Failure', true], ['Brief it as planned for the day.', false]);
  start(1);
  line(64, ['ii', false], ['Loss of ICS', true], ['Brief it as planned for the day.', false]);
  line(64, ['k)', true], ['Inadvertent IMC', true], ['Brief it as planned for the day.', false]);
  line(64, ['I)', false], ['Landing Irregularities', true]);
  line(82, ['i) Waveoffs are free.']);
  line(64, ['m)', true], ['CFS', true], ['Brief it as planned for the day.', false]);
  start(2);
  line(46, ['3)', true], ['MISSION', true]);
  line(64, ['a)', true], ['Contact', true], ['Brief it as planned for the day.', false]);
  line(46, ['4)', true], ['NIGHT', true]);
  line(64, ['a)', true], ['Lighting', true], ['Brief it as planned for the day.', false]);
  line(46, ['S)', true], ['WRAP UP', true]);
  line(64, ['a)', true], ['Debrief', true], ['Brief it as planned for the day.', false]);

  const { briefs } = parseBriefGuide(pages);
  const [brief] = briefs;
  expect(brief.sections.map((s) => s.title)).toEqual(['ADMIN', 'EMERGENCIES', 'MISSION', 'NIGHT', 'WRAP UP']);
  expect(brief.sections[0].items.map((i) => i.label)).toEqual(['Weather / NOTAMS / TFRs', 'Fuel']);
  const emergencies = brief.sections[1].items;
  expect(emergencies.slice(6).map((i) => i.label)).toEqual([
    'Engine Failure / Power Loss', 'Stall & Recovery', 'Radio Failure', 'Loss of ICS',
    'Inadvertent IMC', 'Landing Irregularities', 'CFS',
  ]);
  expect(emergencies[7].text).toMatch(/^\(i\) Stalls not properly recovered/);
  expect(emergencies[11].text).toBe('(i) Waveoffs are free.');
  // No running head is left in anything read.
  expect(JSON.stringify(brief)).not.toMatch(/SQUADR/);
});

// A scan with no text layer reads as nothing at all; the uploader is told it is a scan, and
// which pages, rather than that no brief was found.
test('pages with no text are named as scans', () => {
  const text = [{ str: 'a) Weather / NOTAMS / AHAS / TFRs. Brief the forecast.' }];
  const stamp = [{ str: 'Xerox 8045' }];
  expect(pagesWithoutText([text, [], stamp, text], [6, 7, 8, 9])).toEqual([7, 8]);
  expect(noTextMessage('This PDF', [], 4, false)).toBeNull();
  expect(noTextMessage('This PDF', [1, 2, 3], 3, false)).toBe('This PDF is a scan with no searchable text in it. To upload the brief, run the PDF through text recognition (OCR) first (like Adobe’s Scan & OCR or OCRmyPDF) and upload the OCR output.');
  expect(noTextMessage('This PDF', [17, 18], 2, true)).toMatch(/^This PDF: the pages you chose are a scan with no searchable text in them. To upload the brief/);
  expect(noTextMessage('This PDF', [7], 4, true)).toMatch(/^This PDF: page 7 has no searchable text in it, so nothing on it was read\. If it is a scanned page, run/);
  expect(noTextMessage('The abbreviated guide', [7, 8, 9], 4, false)).toMatch(/^The abbreviated guide: pages 7, 8 and 9 have no searchable text in them, so nothing on them was read\. If they are scanned pages/);
});

test('a card and its guide name one thing in different words', () => {
  expect(nameScore('Read and Initial', 'R&I')).toBeGreaterThan(0.8);
  expect(nameScore('ORM', 'Operational Risk Management')).toBeGreaterThan(0.8);
  expect(nameScore('* Damaged Aircraft / Bird strike', '* Birdstrike / Damaged Aircraft')).toBeGreaterThan(0.6);
  expect(nameScore('EP / Question of the day', 'EP / Question / Quote of the Day')).toBeGreaterThan(0.6);
  expect(nameScore('Night', 'VNAV')).toBeLessThan(0.5);
  // A card line may run on past its name after a colon.
  expect(nameScore('*CFS: Command and crew coordination', 'CFS')).toBeGreaterThan(0.8);
  expect(nameScore("Ejection: 6000' AGL OCF, 2000' AGL controlled", 'Ejection')).toBeGreaterThan(0.8);
});

// The TW-5 expanded guide gets its own outline wrong: it prints Night, VNAV, CCX and IP / IP
// as (2) to (5) under `c. INAV`. Its abbreviated guide makes them items of their own, and with
// both uploaded the brief takes the abbreviated guide's layout and the expanded guide's words.
const TW5_CARD = path.join(__dirname, '..', '..', '..', '_reference-docs', 'T6b Primary', 'Fundamental References', 'Abbreviated Wing Brief v1.0.pdf');
const maybeTw5Card = fs.existsSync(TW5_PDF) && fs.existsSync(TW5_CARD) ? describe : describe.skip;

maybeTw5Card('the TW-5 guide laid out by its abbreviated guide', () => {
  let out;
  const read = async (file) => loadTextItems(new Uint8Array(fs.readFileSync(file)));

  beforeAll(async () => {
    const pages = await read(TW5_PDF);
    const card = await read(TW5_CARD);
    out = parseBriefGuide(pageList('196-202', pages.length).pages.map((n) => pages[n]), { card });
  });

  test('the card names the brief, and its debrief page is a brief of its own', () => {
    expect(out.warnings).toEqual([]);
    expect(out.briefs.map((b) => [b.title, b.short])).toEqual([
      ['TW-5 BRIEFING GUIDE', 'BRIEF'], ['TW-5 DEBRIEF GUIDE', 'DEBRIEF GUIDE'],
    ]);
    expect(out.briefs[0].source.unit).toBe('TW-5');
    // The FWOP prints no date by its appendix; the abbreviated guide's footer does, to the month.
    expect(out.briefs[0].source.date).toBe('November 2025');
  });

  test("sections and items are the card's, in its columns", () => {
    const [brief] = out.briefs;
    expect(brief.sections.map((s) => [s.title, s.column])).toEqual([
      ['ADMIN', 1], ['* CREW COORDINATION', 1], ['PROFILE', 1], ['EMERGENCIES', 1], ['TAC ADMIN', 2], ['MCG', 2],
    ]);
    const tac = brief.sections.find((s) => s.title === 'TAC ADMIN');
    expect(tac.items.map((i) => i.label)).toEqual([
      'Familiarization', 'Formation', 'INAV', 'Night', 'VNAV', 'CCX / Off Station OPS', 'IP / IP',
    ]);
  });

  test("each item holds the expanded guide's words for it, wherever the guide printed them", () => {
    const [brief] = out.briefs;
    const item = (title, label) => brief.sections.find((s) => s.title === title).items.find((i) => i.label === label);
    expect(item('ADMIN', 'Read and Initial').text).toBe('Summary of most recent R&I');
    const inav = item('TAC ADMIN', 'INAV');
    expect(inav.subtext.split('\n')[1]).toBe('  (ii) Non flying pilot duties for IMC and instrument approaches');
    expect(inav.text).not.toMatch(/Night|VNAV|CCX/);
    expect(item('TAC ADMIN', 'Night').text).toMatch(/^\(a\) Sunset \/ Moonrise \/ EENT/);
    // The KIO table beside Formation's items is left to the guide, which lists it in full.
    expect(item('TAC ADMIN', 'Formation').subtext).not.toMatch(/GLOC/);
    expect(item('TAC ADMIN', 'Formation').text).toMatch(/\(c\) GLOC/);
  });
});

// The TW-4 PDF prints its card after each guide. Read as two uploads, the guide's pages and
// the card's pages, it comes out the same as read whole.
maybe('a card uploaded on its own', () => {
  test('lays out the FAM brief exactly as the card printed with it does', async () => {
    const pages = await loadTextItems(fs.readFileSync(PDF));
    const pick = (text) => pageList(text, pages.length).pages.map((n) => pages[n]);
    const whole = parseBriefGuide(pages).briefs[0];
    const split = parseBriefGuide(pick('36-44'), { card: pick('45-46') });
    expect(split.warnings).toEqual([]);
    expect(split.briefs[0].sections).toEqual(whole.sections);
  });
});

test('a guide date becomes the date box value, a month alone its first day', () => {
  expect(isoDate({ date: '10 Mar 2025' })).toBe('2025-03-10');
  expect(isoDate({ date: '13 March 2026' })).toBe('2026-03-13');
  expect(isoDate({ date: 'November 2025' })).toBe('2025-11-01');
  expect(isoDate({ date: '' })).toBe('');
  expect(isoDate(null)).toBe('');
});
