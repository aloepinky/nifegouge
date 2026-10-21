#!/usr/bin/env node
//
// After a paste from the spot editor (?spots), puts the committed poster file back with only the
// boxes changed.
//
// The editor's "Copy data file" writes the regions array from the object in memory, so pasting
// it keeps every box and field but loses every comment inside the array, and those comments are
// where each target's reasoning lives. It also writes helper calls out flat and an imported
// image as its build URL. This reads the pasted file for its boxes, takes the last committed
// version for everything else, and moves each box to where the paste put it. Nothing but the
// numbers of a box changes.
//
// A pasted spot is paired with a committed one by `id` where the spot has one, else by label (the
// nth spot of a label with the nth pasted one), within its region. A box is found in the
// committed text as the region's nth array of four numbers, so a box written as a helper's
// argument (the T-54A's `gauge([...], ...)`) moves as well as one written `box: [...]`.
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
const sameBox = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
let text = committed;
let moved = 0;
let problems = 0;

// Each region's stretch of the committed text: from its `id: '<region>',` (followed by its
// `label`, which a spot's id never is) to the next region's. A box is only looked for inside its
// own region, so two regions using one label cannot trade boxes.
const starts = [];
let from = 0;
for (const rg of head.regions) {
  const re = new RegExp(`\\bid:\\s*['"]${esc(rg.id)}['"],\\s*\\n\\s*label:`, 'g');
  re.lastIndex = from;
  const m = re.exec(text);
  if (!m) {
    console.error(`${rg.id}: cannot find the region in the committed file`);
    process.exit(1);
  }
  starts.push(m.index);
  from = m.index + 1;
}

// The box literals in a region, in source order: every array of four numbers. They must be
// exactly the region's boxes in order, or the file is laid out in a way this cannot read, and it
// says so rather than guess.
const NUM = '-?\\d*\\.?\\d+(?:e-?\\d+)?';
const BOX = new RegExp(`\\[\\s*${NUM}\\s*,\\s*${NUM}\\s*,\\s*${NUM}\\s*,\\s*${NUM}\\s*\\]`, 'g');
const edits = [];

head.regions.forEach((rg, k) => {
  const theirs = ((pasted.regions || []).find((r) => r.id === rg.id) || {}).spots || [];
  const names = (list) => list.map((s) => s.label).sort().join(' | ');
  if (names(theirs) !== names(rg.spots)) {
    console.error(`${rg.id}: the paste adds, removes or renames a spot\n  committed: ${names(rg.spots)}\n  pasted:    ${names(theirs)}`);
    problems += 1;
    return;
  }
  const start = starts[k];
  const end = k + 1 < starts.length ? starts[k + 1] : text.length;
  const found = [...text.slice(start, end).matchAll(BOX)]
    .map((m) => ({ at: start + m.index, len: m[0].length, box: JSON.parse(m[0]) }));
  if (found.length < rg.spots.length || !rg.spots.every((s, i) => sameBox(found[i].box, s.box))) {
    console.error(`${rg.id}: its boxes in the committed file are not one per spot, in order`);
    problems += 1;
    return;
  }

  const taken = new Set();
  rg.spots.forEach((s, i) => {
    const j = theirs.findIndex((x, n) => !taken.has(n)
      && (s.id ? x.id === s.id : !x.id && x.label === s.label));
    if (j < 0) {
      console.error(`${rg.id}: no pasted spot for "${s.label}"${s.id ? ` (${s.id})` : ''}`);
      problems += 1;
      return;
    }
    taken.add(j);
    const t = theirs[j];
    if (sameBox(t.box, s.box)) return;
    edits.push({ ...found[i], to: fmt(t.box) });
    moved += 1;
    console.log(`${rg.id.padEnd(10)} ${(s.id || s.label).padEnd(32)} ${fmt(s.box)} -> ${fmt(t.box)}`);
  });
});

if (problems) {
  console.error(`\n${problems} problem(s); nothing written.`);
  process.exit(1);
}
for (const e of edits.sort((a, b) => b.at - a.at)) {
  text = text.slice(0, e.at) + e.to + text.slice(e.at + e.len);
}
// git hands the committed text back with LF; keep the line endings the file on disk had.
const crlf = fs.readFileSync(file, 'utf8').includes('\r\n');
fs.writeFileSync(file, crlf ? text.replace(/\r?\n/g, '\r\n') : text);
console.log(`\n${moved} box(es) moved; comments and every other field kept.`);
