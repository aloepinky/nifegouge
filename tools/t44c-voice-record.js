#!/usr/bin/env node
// Records the T-44C Voice Checklists lines with Amazon Polly (the user, 2026-11-12), so every
// phone hears the same natural voice instead of whatever its browser offers.
//
//   node tools/t44c-voice-record.js            what would be recorded, and what it would cost
//   node tools/t44c-voice-record.js --record   record the lines not yet recorded (needs
//                                               `aws sso login`; Polly bills per character)
//   node tools/t44c-voice-record.js --prune    also delete clips no line uses any more
//   node tools/t44c-voice-record.js --voices   list Polly's generative US English voices
//
// Each line the computer can say (src/components/T44C/voiceScript.js, every seat, since the
// student may sit either) is one MP3 in public/voice/t44c/, named by a hash of its voice and
// words, so a line already recorded is never paid for again: change a line in t44cNormals.js
// and only that line is recorded on the next run. src/components/T44C/voiceClips.json lists
// what exists; the page plays a clip where there is one and falls back to the browser's voice.
//
// Polly is called through the AWS CLI (no SDK dependency), the text passed in a UTF-8 file so
// that nothing non-ASCII is mangled on the command line.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadSrc } = require('./lib/loadSrc');

const ROOT = path.join(__dirname, '..');
const T44C = path.join(ROOT, 'src', 'components', 'T44C');
const OUT = path.join(ROOT, 'public', 'voice', 't44c');
const MANIFEST = path.join(T44C, 'voiceClips.json');

// One voice a seat, so the PM, the PF and the observer can be told apart.
const VOICES = { PM: 'Matthew', PF: 'Stephen', OBS: 'Ruth' };
const ENGINE = 'generative';
const REGION = 'us-east-1';
const PRICE_PER_MILLION = 30; // generative, aws.amazon.com/polly/pricing (2026-11-12)

const args = new Set(process.argv.slice(2));

function aws(argv) {
  const r = spawnSync('aws', argv, { encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status !== 0) throw new Error(`aws ${argv.slice(0, 2).join(' ')} failed:\n${r.stderr || r.stdout}`);
  return r.stdout;
}

// FNV-1a, 32 bits: a short stable file name for a voice and its words.
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

if (args.has('--voices')) {
  const out = aws(['polly', 'describe-voices', '--engine', ENGINE, '--language-code', 'en-US', '--region', REGION,
    '--query', 'Voices[].[Id,Gender]', '--output', 'text']);
  console.log(out.trim());
  process.exit(0);
}

const { T44C_HOLLYWOOD } = loadSrc(path.join(T44C, 't44cNormals.js'));
const { scriptFor } = loadSrc(path.join(T44C, 'voiceScript.js'));
const procs = T44C_HOLLYWOOD.filter((p) => !p.id.startsWith('start-'));

// Every spoken line, by seat and words.
const wanted = new Map();
for (const l of procs.flatMap(scriptFor)) {
  if (l.kind !== 'say' || !l.say) continue;
  const key = `${l.seat}|${l.say}`;
  if (wanted.has(key)) continue;
  const voice = VOICES[l.seat];
  wanted.set(key, { seat: l.seat, text: l.say, voice, file: `${hash(`${voice}|${ENGINE}|${l.say}`)}.mp3` });
}

fs.mkdirSync(OUT, { recursive: true });
const todo = [...wanted.values()].filter((c) => !fs.existsSync(path.join(OUT, c.file)));
const chars = todo.reduce((n, c) => n + c.text.length, 0);
const cost = (chars / 1e6) * PRICE_PER_MILLION;
console.log(`${wanted.size} lines, ${wanted.size - todo.length} already recorded, ${todo.length} to record`);
console.log(`${chars} characters to record: about $${cost.toFixed(3)} at $${PRICE_PER_MILLION} a million (${ENGINE})`);

if (args.has('--record') && todo.length) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'polly-'));
  const textFile = path.join(tmp, 'line.txt');
  todo.forEach((c, i) => {
    fs.writeFileSync(textFile, c.text, 'utf8');
    aws(['polly', 'synthesize-speech', '--engine', ENGINE, '--voice-id', c.voice, '--output-format', 'mp3',
      '--sample-rate', '24000', '--text-type', 'text', '--text', `file://${textFile}`, '--region', REGION,
      path.join(OUT, c.file)]);
    process.stdout.write(`\r${i + 1}/${todo.length} ${c.seat} ${c.text.slice(0, 50).padEnd(50)}`);
  });
  process.stdout.write('\n');
  fs.rmSync(tmp, { recursive: true, force: true });
}

// The manifest: only clips that exist, so a run cut short leaves the page using what it has.
const clips = {};
for (const [key, c] of [...wanted.entries()].sort()) {
  if (fs.existsSync(path.join(OUT, c.file))) clips[key] = c.file;
}
fs.writeFileSync(MANIFEST, `${JSON.stringify({ engine: ENGINE, voices: VOICES, clips }, null, 1)}\n`);
console.log(`${Object.keys(clips).length} clips listed in ${path.relative(ROOT, MANIFEST)}`);

const used = new Set(Object.values(clips));
const orphans = fs.readdirSync(OUT).filter((f) => f.endsWith('.mp3') && !used.has(f));
if (orphans.length) {
  if (args.has('--prune')) {
    orphans.forEach((f) => fs.unlinkSync(path.join(OUT, f)));
    console.log(`deleted ${orphans.length} clips no line uses`);
  } else {
    console.log(`${orphans.length} clips no line uses (--prune deletes them)`);
  }
}
