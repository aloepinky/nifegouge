#!/usr/bin/env node
//
// Does every EP step have something to click?
//
// The cockpit posters answer a checklist step by writing "Action - SETTING" into its box. That
// only works if some record — a hotspot on a panel or a button beside it — claims that step's
// control AND can write that step's setting. Neither is visible by reading either file: the
// steps are in c172Data.js / t44cData.js and the records are in the poster files, and a step
// nobody covers looks exactly like a step somebody covers until you try to click it.
//
// So this pairs them up. Three failures, each one something that silently looks like a bug in
// the poster when it is really a gap in the data:
//
//   NO CONTROL      no record claims that control. The step can only be typed, and nothing on
//                   screen says so.
//   NO SETTING      a record claims the control but does not list that setting. A record
//                   answers only the settings it lists (src/components/epsLimits/controlMatch.js
//                   `settingOk`, which is how the T-44C's two Pressurization controls divide
//                   DUMP from SET), so this step cannot be clicked either; it is reported apart
//                   from NO CONTROL because the fix is a settings list, not a new record.
//                   Compared the way gradeAnswer compares, which is to say case and punctuation
//                   are ignored — "CLOSED" answers a step written "Closed".
//   CANNOT FINISH   the EP cannot be clicked through end to end. NO CONTROL says every step has
//                   something that claims it; this walks the page's own rule and says the
//                   sequence actually works.
//
// A normal checklist step's `watch` list (the gauges and lights it is checked against, which
// must be clicked as well) is held to the same: a watched wording no target answers for is NO
// CONTROL, and a step may not both watch and be split between targets with `fills`.
//
// Node, not part of the build. Exits non-zero on any finding.
//
//     node tools/check-posters.js

const path = require('path');
const { loadSrc } = require('./lib/loadSrc');

const SRC = path.join(__dirname, '..', 'src');

// The data files are ES modules that React compiles; node here is CommonJS. tools/lib/loadSrc.js
// compiles each one and resolves its own imports, so a poster gets `aliasesFrom` from
// controlMatch.js the way the page does.
const load = (rel) => loadSrc(path.join(SRC, rel));

// The real matcher and the real step rule the page uses, not copies of them. A second
// implementation here would drift from the first and then this check would be confirming its own
// idea of what matches.
const {
  controlOf, sameControl, settingOk, settingsFor, actionFor, matches, aliasesFrom, valuesFor, fillsFor,
} = load('components/epsLimits/controlMatch.js');
const { openStep, clickOutcome, FILL } = load('components/epsLimits/stepFlow.js');

// gradeAnswer lowercases and strips punctuation before comparing, so a record writing "CLOSED"
// correctly answers a step printed "Closed". Compare the same way or this reports a finding on
// every sheet that is inconsistent about its own capitals — which is all of them.
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const SCHOOLS = [
  { name: 'C172', data: 'components/Flight/c172Data.js', eps: 'C172_EPS', poster: 'components/Flight/c172Poster.js', key: 'C172_POSTER' },
  { name: 'T-44C', data: 'components/T44C/t44cData.js', eps: 'T44C_EPS', poster: 'components/T44C/t44cPoster.js', key: 'T44C_POSTER' },
  // The normal checklists ride on the same poster: every Hollywood and Normal Memory Items step
  // must be clickable too, and a step two targets answer in halves ("ITT and N1") must add up.
  { name: 'T-44C Hollywood', data: 'components/T44C/t44cNormals.js', eps: 'T44C_HOLLYWOOD', poster: 'components/T44C/t44cPoster.js', key: 'T44C_POSTER' },
  { name: 'T-44C memory normals', data: 'components/T44C/t44cNormals.js', eps: 'T44C_MEMORY_NORMALS', poster: 'components/T44C/t44cPoster.js', key: 'T44C_POSTER' },
  { name: 'T-54A', data: 'components/T54A/t54aData.js', eps: 'T54A_EPS', poster: 'components/T54A/t54aPoster.js', key: 'T54A_POSTER' },
  { name: 'TH-73A', data: 'components/TH73A/th73aData.js', eps: 'TH73A_EPS', poster: 'components/TH73A/th73aPoster.js', key: 'TH73A_POSTER' },
];

let findings = 0;

for (const school of SCHOOLS) {
  const eps = load(school.data)[school.eps];
  const poster = load(school.poster)[school.key];
  const aliases = aliasesFrom(poster);
  const records = [
    ...(poster.regions || []).flatMap((r) => r.spots || []),
    ...(poster.actions || []),
  ];

  const noControl = [];
  const noSetting = [];
  const cannotFinish = [];

  // Can the EP be finished by clicking, one click a step? This walks the page's own rule — the
  // open step from stepFlow.js, the record found by the same matcher, the same `actionFor` — and
  // fails if the walk stalls or leaves a step unanswered. NO CONTROL proves every step has
  // something that claims it; this proves the sequence works, which is where the two remaining
  // ways to get it wrong live: a target standing for two controls has to answer with the one the
  // open step names, and two steps running on one control have to be two clicks, not one that
  // rewrites the other.
  const walk = (ep) => {
    const steps = ep.rows.filter((r) => r.id);
    const answers = Object.fromEntries(steps.map((s) => [s.id, s.text]));
    const data = {};
    const ids = steps.map((s) => s.id);
    for (let click = 0; click <= steps.length; click += 1) {
      const target = openStep(ids, { value: (f) => data[f], result: () => '', answer: (f) => answers[f] });
      if (!target) break;
      // The whole step, setting included: a record answers only the settings it lists for a
      // control (`matches` → `settingOk`), which is how two targets share one control word.
      const text = answers[target];
      const want = controlOf(text);
      const rec = records.find((r) => matches(r, text, aliases));
      if (!rec) return `${ep.title} :: nothing claims "${text}"`;
      const action = actionFor(rec, want, aliases);
      const ok = sameControl(text, action, aliases) && settingOk(settingsFor(rec, action, aliases), text);
      if (clickOutcome(ok ? 1 : 0, 1) !== FILL) {
        return `${ep.title} :: clicking ${rec.label || rec.action} answers "${action}", not "${want}"`;
      }
      // A watched step is the control plus one click on each gauge or light it names.
      const step = steps.find((s) => s.id === target);
      if (step.watch) {
        if (fillsFor(rec, action, aliases)) return `${ep.title} :: "${want}" both watches and is split with fills`;
        const unseen = step.watch.filter((w) => !records.some((r) => matches(r, w, aliases)));
        if (unseen.length) return `${ep.title} :: "${want}" watches ${unseen.join(', ')}, which nothing on the poster answers`;
        data[target] = answers[target];
        continue;
      }
      // A step answered in pieces needs one click per piece, so the walk collects every record
      // that supplies part of it and fails if the pieces do not add up to the step's own text.
      const piece = fillsFor(rec, action, aliases);
      if (!piece) { data[target] = answers[target]; continue; }
      const pieces = records
        .filter((r) => matches(r, text, aliases))
        .map((r) => fillsFor(r, actionFor(r, want, aliases), aliases))
        .filter(Boolean);
      const whole = [...new Set(pieces)]
        .sort((x, y) => answers[target].indexOf(x) - answers[target].indexOf(y)).join(' ');
      if (norm(whole) !== norm(answers[target])) {
        return `${ep.title} :: the pieces of "${want}" do not add up — got "${whole}"`;
      }
      data[target] = answers[target];
    }
    const left = ids.filter((f) => !data[f]);
    return left.length ? `${ep.title} :: ${left.length} step(s) never filled` : null;
  };

  for (const ep of eps) {
    const stall = walk(ep);
    if (stall) cannotFinish.push(stall);

    const steps = ep.rows.filter((r) => r.id);
    steps.forEach((step) => {
      // On the bare control first, then on the whole step. A record answers only the settings it
      // lists for a control, so a step whose control is claimed but whose setting nobody lists is
      // NO SETTING, and since the page's own matcher refuses it, it is as unclickable as NO
      // CONTROL; the two are told apart only so the finding says which file to open.
      for (const w of step.watch || []) {
        if (!records.some((r) => matches(r, w, aliases))) noControl.push(`${ep.title} :: ${step.text} (watches ${w})`);
      }
      const control = controlOf(step.text);
      const claimants = records.filter((r) => matches(r, control, aliases));
      if (!claimants.length) {
        noControl.push(`${ep.title} :: ${step.text}`);
        return;
      }
      if (!claimants.some((r) => matches(r, step.text, aliases))) {
        // Through valuesFor, because a target standing for two controls carries a settings list
        // per control and reading `values` straight would compare this step against the other's.
        const values = claimants.flatMap((r) => valuesFor(r, actionFor(r, control, aliases), aliases));
        noSetting.push(`${ep.title} :: ${step.text}\n          record lists: ${values.join(' | ') || '(nothing)'}`);
      }
    });
  }

  const hotspots = records.filter((r) => r.box).length;
  const steps = eps.reduce((n, ep) => n + ep.rows.filter((r) => r.id).length, 0);
  console.log(`\n${school.name}: ${steps} steps, ${hotspots} hotspots, ${records.length - hotspots} buttons`);

  for (const [label, list] of [['NO CONTROL', noControl], ['NO SETTING', noSetting], ['CANNOT FINISH', cannotFinish]]) {
    if (!list.length) {
      console.log(`  ok   ${label}`);
      continue;
    }
    findings += list.length;
    console.log(`  FAIL ${label} (${list.length})`);
    for (const line of list) console.log(`        ${line}`);
  }
}

console.log(findings ? `\n${findings} finding(s)` : '\nEvery step has something to click.');
process.exit(findings ? 1 : 0);
