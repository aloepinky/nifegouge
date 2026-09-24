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
//   NO SETTING      a record claims the control but does not list that setting. This no longer
//                   breaks the page — a click writes the step's own answer whatever the record
//                   says (src/components/epsLimits/stepFlow.js) — so it is an authoring check:
//                   a record whose settings do not cover the steps it claims is a record written
//                   against the wrong control, and this is what catches that. Compared the way
//                   gradeAnswer compares, which is to say case and punctuation are ignored —
//                   "CLOSED" answers a step written "Closed".
//   CANNOT FINISH   the EP cannot be clicked through end to end. NO CONTROL says every step has
//                   something that claims it; this walks the page's own rule and says the
//                   sequence actually works.
//
// Node, no dependencies, not part of the build. Exits non-zero on any finding.
//
//     node tools/check-posters.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src');

// The data files are ES modules that React compiles; node here is CommonJS. They are pure data
// apart from one helper, so they are evaluated with their imports and exports stripped — the
// same trick tools/discuss-migrate.js uses on the item files, and it works for the same reason.
function load(rel, extra = {}) {
  const src = fs.readFileSync(path.join(SRC, rel), 'utf8')
    .replace(/^\s*import[^;]*;$/gm, '')
    .replace(/^export\s+/gm, '');
  const sandbox = { ...extra, module: {}, exports: {} };
  vm.createContext(sandbox);
  const names = [...src.matchAll(/^(?:const|let|var|function)\s+([A-Za-z0-9_$]+)/gm)].map((m) => m[1]);
  vm.runInContext(`${src}\n;__out = { ${names.join(', ')} };`, sandbox);
  return sandbox.__out;
}

// The real matcher and the real step rule the page uses, not copies of them. A second
// implementation here would drift from the first and then this check would be confirming its own
// idea of what matches.
const { controlOf, sameControl, actionFor, matches, aliasesFrom, valuesFor, fillsFor } = load('components/epsLimits/controlMatch.js');
const { openStep, clickOutcome, FILL } = load('components/epsLimits/stepFlow.js');

// gradeAnswer lowercases and strips punctuation before comparing, so a record writing "CLOSED"
// correctly answers a step printed "Closed". Compare the same way or this reports a finding on
// every sheet that is inconsistent about its own capitals — which is all of them.
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const SCHOOLS = [
  { name: 'C172', data: 'components/Flight/c172Data.js', eps: 'C172_EPS', poster: 'components/Flight/c172Poster.js', key: 'C172_POSTER' },
  { name: 'T-44C', data: 'components/T44C/t44cData.js', eps: 'T44C_EPS', poster: 'components/T44C/t44cPoster.js', key: 'T44C_POSTER' },
];

let findings = 0;

for (const school of SCHOOLS) {
  const eps = load(school.data)[school.eps];
  const poster = load(school.poster, { aliasesFrom })[school.key];
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
      const want = controlOf(answers[target]);
      const rec = records.find((r) => matches(r, want, aliases));
      if (!rec) return `${ep.title} :: nothing claims "${want}"`;
      const action = actionFor(rec, want, aliases);
      if (clickOutcome(sameControl(answers[target], action, aliases) ? 1 : 0, 1) !== FILL) {
        return `${ep.title} :: clicking ${rec.label || rec.action} answers "${action}", not "${want}"`;
      }
      // A step answered in pieces needs one click per piece, so the walk collects every record
      // that supplies part of it and fails if the pieces do not add up to the step's own text.
      const piece = fillsFor(rec, action, aliases);
      if (!piece) { data[target] = answers[target]; continue; }
      const pieces = records
        .filter((r) => matches(r, want, aliases))
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
      const control = controlOf(step.text);
      const rec = records.find((r) => matches(r, control, aliases));
      if (!rec) {
        noControl.push(`${ep.title} :: ${step.text}`);
        return;
      }
      const setting = step.text.includes(' - ') ? step.text.split(' - ').slice(1).join(' - ') : '';
      // Through valuesFor, because a target standing for two controls carries a settings list per
      // control and reading `values` straight would compare this step against the other one's.
      const values = valuesFor(rec, control, aliases);
      if (setting && !values.some((v) => norm(v) === norm(setting))) {
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
