#!/usr/bin/env node
//
// After a paste from the spot editor (?spots), puts the committed poster file back with only the
// boxes changed.
//
// The editor's "Copy data file" writes the regions array from the object in memory, so pasting
// it keeps every box and field but loses every comment inside the array, and those comments are
// where each target's reasoning lives. This reads the pasted file for its boxes, takes the last
// committed version for everything else, and moves each box to where the paste put it, matched by
// region and label. Nothing but the numbers inside `box: [...]` changes.
//
// It stops without writing if the paste added, removed or renamed a spot: that is a change to the
// data rather than a re-placing, and it wants a person to look.
//
//     node tools/merge-spot-boxes.js src/components/T44C/t44cPoster.js T44C_POSTER
//
// Then check the diff: it should touch box values only.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadSrc } = require('./lib/loadSrc');

const [rel, key] = process.argv.slice(2);
if (!rel || !key) {
  console.error('usage: node tools/merge-spot-boxes.js <poster file> <export name>');
  process.exit(2);
}
const ROOT = path.join(__dirname, '..');
const file = path.resolve(ROOT, rel);
const gitPath = path.relative(ROOT, file).split(path.sep).join('/');
const committed = execFileSync('git', ['show', `HEAD:${gitPath}`], { cwd: ROOT, encoding: 'utf8' });

// The committed text has to sit beside the real file to be loaded, so its relative imports
// resolve. It is removed straight after.
const temp = path.join(path.dirname(file), `zz-merge-spot-boxes-${process.pid}.tmp.js`);
fs.writeFileSync(temp, committed);
let pasted;
let head;
try {
  pasted = loadSrc(file)[key];
  head = loadSrc(temp)[key];
} finally {
  fs.unlinkSync(temp);
}

const fmt = (b) => `[${b.join(', ')}]`;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let text = committed;
let moved = 0;
let problems = 0;

for (const rg of head.regions) {
  const theirs = ((pasted.regions || []).find((r) => r.id === rg.id) || {}).spots || [];
  const names = (list) => list.map((s) => s.label).sort().join(' | ');
  if (names(theirs) !== names(rg.spots)) {
    console.error(`${rg.id}: the paste adds, removes or renames a spot\n  committed: ${names(rg.spots)}\n  pasted:    ${names(theirs)}`);
    problems += 1;
    continue;
  }
  for (const s of rg.spots) {
    const t = theirs.find((x) => x.label === s.label);
    if (fmt(t.box) === fmt(s.box)) continue;
    const re = new RegExp(`box: \\[[^\\]]*\\](,(?:\\s*id: [^,]+,)?\\s*label: ['"]${esc(s.label)}['"])`);
    if (!re.test(text)) {
      console.error(`${rg.id}: cannot find the box for "${s.label}" in the committed file`);
      problems += 1;
      continue;
    }
    text = text.replace(re, `box: ${fmt(t.box)}$1`);
    moved += 1;
    console.log(`${rg.id.padEnd(10)} ${s.label.padEnd(32)} ${fmt(s.box)} -> ${fmt(t.box)}`);
  }
}

if (problems) {
  console.error(`\n${problems} problem(s); nothing written.`);
  process.exit(1);
}
fs.writeFileSync(file, text);
console.log(`\n${moved} box(es) moved; comments and every other field kept.`);
