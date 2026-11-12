import React, { useEffect, useMemo, useRef, useState } from 'react';
import { T44C_HOLLYWOOD } from './t44cNormals';
import { scriptFor, isMine, commandOf, endsLine } from './voiceScript';

// Every Hollywood checklist but the two start procedures (the user, 2026-11-12).
const CHECKLISTS = T44C_HOLLYWOOD.filter((p) => !p.id.startsWith('start-'));

// Voice Checklists (the user, 2026-11-12): the Hollywood checklists read aloud for one student,
// to repeat them in the static trainer or a maintenance aircraft. The student takes a seat; the
// computer says every line of the other seat (and the observer's) and listens for the student's,
// moving on when they stop talking or say the line's last word. No comms, no engine model.
//
// Speech out is the browser's speechSynthesis (works offline). Speech in is its
// SpeechRecognition (Chrome, Edge, Safari), which may need a signal; without it, or where the
// browser has none, Next and the space bar move on instead.
//
// The recogniser runs the whole time (stopping it per call made an iPhone ding at every turn).
// If a start is refused, a "Tap to listen" button starts it from the student's own tap.
//
// "Go on when I":
//   * stop talking (the default): the microphone is opened once for the run, as a call opens
//     it, and its level is watched, moving on once the student has spoken and then been quiet
//     for the wait. No words are recognised. It works through Bluetooth earbuds, where an
//     iPhone's recogniser, starting and stopping, dings and hears nothing (the user's
//     Powerbeats Pro, 2026-11-12; the user wears them for their mic).
//   * say my call: the browser's speech recogniser, which also hears "say again", "back" and
//     "skip" and moves on at the line's last word.
//   * press my earbud: the page plays a loop of silence, which gives it the earbud's presses
//     (Media Session); nothing listens.
//   * tap Next.
//
// Everything runs off refs (`live`, `at`, `tok`): the speech engine calls back long after the
// render that started it. `tok` is bumped by every move the student makes, so a callback from a
// line that has been left does nothing.

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
const UA = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const IOS = /iP(hone|ad|od)/.test(UA) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canEarbud = typeof navigator !== 'undefined' && 'mediaSession' in navigator;
const canMic = typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  && typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
const ADVANCE = [
  ['voice', 'stop talking'],
  ['words', 'say my call (hears "say again", "back", "skip")'],
  ['earbud', 'press my earbud'],
  ['tap', 'tap Next'],
];
const OFFERED = ADVANCE.filter(([k]) => (k !== 'voice' || canMic) && (k !== 'words' || Recognition)
  && (k !== 'earbud' || canEarbud));

// The voice level watch: what counts as speech is a level well over the room's (tracked while
// quiet), held for STEADY ms; ECHO ms after the computer stops speaking are ignored, for a
// phone speaker heard by its own microphone.
const TICK = 30;
const STEADY = 120;
const ECHO = 300;

// A second of silence as a WAV, looped while the earbud is the Next button.
function silentWav() {
  const rate = 8000;
  const d = new DataView(new ArrayBuffer(44 + rate));
  const w = (o, str) => [...str].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); d.setUint32(4, 36 + rate, true); w(8, 'WAVE'); w(12, 'fmt ');
  d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
  d.setUint32(24, rate, true); d.setUint32(28, rate, true); d.setUint16(32, 1, true); d.setUint16(34, 8, true);
  w(36, 'data'); d.setUint32(40, rate, true);
  for (let i = 0; i < rate; i += 1) d.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([d.buffer], { type: 'audio/wav' }));
}

const KEY = 't44cVoice';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private window */ } };

const WAITS = [0.5, 1, 1.5, 2, 2.5, 3];
const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
const SEAT_NAME = { PF: 'PF', PM: 'PM', OBS: 'OBS' };

// The best-sounding voices first: the neural ones (Edge, Windows 11), the downloaded Premium,
// Enhanced and Siri ones (iPhone, Mac), Google's (Chrome), then the rest, US English first. The
// old local voices (Microsoft David) sound robotic and trail silence after every line. An
// iPhone lists a downloaded voice under the same name as its compact one ("Tom" twice); only
// the voiceURI (com.apple.voice.enhanced.en-US.Tom) tells them apart, so a voice is known by it.
const RANK = [/natural|neural/i, /premium/i, /enhanced/i, /siri/i, /^google us english/i, /google/i,
  /samantha|ava|allison|susan|aria|jenny|guy|tom|evan|zoe|nathan|joelle/i];
// The macOS and iOS novelty voices, by name, and the Eloquence voices (Rocko, Grandma) by
// family. Not the com.apple.speech.synthesis family as a whole: real voices are filed there
// too, and cutting it hid them (Tom, the user, 2026-11-12). "Show every voice" shows the lot.
const GAG_FAMILY = /eloquence/i;
const NOVELTY = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|pipe organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|fred|kathy|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|deranged|hysterical|princess)\b/i;
const idOf = (v) => v.voiceURI || v.name;
const tag = (v) => `${v.name} ${v.voiceURI || ''}`;
const rank = (v) => {
  const i = RANK.findIndex((re) => re.test(tag(v)));
  return (i < 0 ? RANK.length : i) * 2 + (/en-US/i.test(v.lang) ? 0 : 1);
};
const voiceLabel = (v) => {
  const kind = /premium/i.test(v.voiceURI) ? 'Premium' : /enhanced/i.test(v.voiceURI) ? 'Enhanced' : '';
  const name = kind && !new RegExp(kind, 'i').test(v.name) ? `${v.name} (${kind})` : v.name;
  return /en-US/i.test(v.lang) ? name : `${name}, ${v.lang}`;
};
// English voices, the gags left out; `all`, every voice the browser offers, English first.
function englishVoices(all = false) {
  if (!canSpeak) return [];
  const list = window.speechSynthesis.getVoices();
  if (all) return [...list].sort((a, b) => (/^en/i.test(b.lang) - /^en/i.test(a.lang)) || rank(a) - rank(b));
  return list
    .filter((v) => /^en/i.test(v.lang) && !NOVELTY.test(v.name) && !GAG_FAMILY.test(v.voiceURI || ''))
    .sort((a, b) => rank(a) - rank(b));
}

export default function VoiceChecklists() {
  const saved = useMemo(load, []);
  const scripts = useMemo(() => CHECKLISTS.map(scriptFor), []);
  const [seat, setSeat] = useState(saved.seat === 'PM' ? 'PM' : 'PF');
  const [chain, setChain] = useState(saved.chain !== false);
  const [hide, setHide] = useState(!!saved.hide);
  const [wait, setWait] = useState(WAITS.includes(saved.wait) ? saved.wait : 1);
  const [speed, setSpeed] = useState(SPEEDS.includes(saved.speed) ? saved.speed : 1.25);
  const [voiceName, setVoiceName] = useState(saved.voice || '');
  const [allVoices, setAllVoices] = useState(!!saved.allVoices);
  const [voices, setVoices] = useState(() => englishVoices(!!saved.allVoices));
  const [view, setView] = useState({ proc: 0, pos: 0 });
  const [status, setStatus] = useState('idle'); // idle | speaking | listening | reading | paused | done
  const [heard, setHeard] = useState('');
  const [deafErr, setDeaf] = useState(!Recognition); // can't listen here: Next moves on
  const [advance, setAdvance] = useState(OFFERED.some(([k]) => k === saved.advance) ? saved.advance
    : OFFERED.length ? OFFERED[0][0] : 'tap');
  // `deaf`: the speech recogniser is off (every way of going on but "say my call").
  const deaf = deafErr || advance !== 'words';
  const hears = advance === 'voice' || (advance === 'words' && !deafErr);
  const [message, setMessage] = useState('');
  const [mic, setMic] = useState('off'); // off | on | tap (refused: needs the student's tap)

  useEffect(() => save({ seat, chain, hide, wait, speed, advance, allVoices, voice: voiceName }),
    [seat, chain, hide, wait, speed, advance, allVoices, voiceName]);
  useEffect(() => setVoices(englishVoices(allVoices)), [allVoices]);

  useEffect(() => {
    if (!canSpeak) return undefined;
    const update = () => setVoices(englishVoices(live.current.allVoices));
    window.speechSynthesis.addEventListener('voiceschanged', update);
    // The list may have arrived between the first render and this listener.
    // Safari doesn't always say when it has its list, so look again a few times.
    update();
    const tries = [250, 1000, 3000].map((ms) => setTimeout(update, ms));
    return () => { tries.forEach(clearTimeout); window.speechSynthesis.removeEventListener('voiceschanged', update); };
  }, []);

  const live = useRef({});
  Object.assign(live.current, { seat, chain, wait, speed, voices, voiceName, deaf, advance, allVoices });
  const at = useRef({ proc: 0, pos: 0 });
  const tok = useRef(0);
  const timer = useRef(null);
  const silence = useRef(null);
  const rec = useRef(null);
  const running = useRef(false);
  const speaking = useRef(false);
  const listening = useRef(null); // { token, from, text }
  const resultsLen = useRef(0);
  const recState = useRef('idle'); // idle | starting | on
  const everOn = useRef(false);
  const restarts = useRef(0);
  const utterance = useRef(null);
  const wake = useRef(null);

  const lineAt = (p = at.current) => scripts[p.proc][p.pos];
  const moveTo = (proc, pos) => { at.current = { proc, pos }; setView({ proc, pos }); };

  const quiet = () => {
    tok.current += 1;
    clearTimeout(timer.current);
    clearTimeout(silence.current);
    listening.current = null;
    speaking.current = false;
    // Only when something is speaking: Chrome can drop a line spoken straight after a cancel.
    if (canSpeak && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) window.speechSynthesis.cancel();
  };

  const voiceFor = (s) => {
    const list = live.current.voices;
    if (!list.length) return null;
    const want = live.current.voiceName;
    const main = list.find((v) => idOf(v) === want) || list.find((v) => v.name === want) || list[0];
    // The observer is a second voice where there is one, so the two can be told apart.
    if (s === 'OBS') return list.find((v) => v.name !== main.name && /en-US/i.test(v.lang)) || main;
    return main;
  };

  const speak = (l, token, then) => {
    setStatus('speaking');
    if (!canSpeak) { timer.current = setTimeout(then, 800); return; }
    const u = new SpeechSynthesisUtterance(l.say);
    const v = voiceFor(l.seat);
    if (v) u.voice = v;
    u.lang = (v && v.lang) || 'en-US';
    u.rate = live.current.speed;
    u.pitch = l.seat === 'OBS' ? 0.85 : 1;
    const end = () => {
      speaking.current = false;
      if (vad.current) vad.current.quietUntil = performance.now() + ECHO;
      if (tok.current === token) timer.current = setTimeout(then, 40);
    };
    u.onend = end;
    u.onerror = end;
    utterance.current = u; // held, or some browsers drop it before onend
    speaking.current = true;
    window.speechSynthesis.speak(u);
  };

  const listen = (token) => {
    setStatus('listening');
    setHeard('');
    listening.current = { token, from: resultsLen.current, text: '' };
    restarts.current = 0;
  };

  // Plays the line the position is on, then the next, until a line is the student's.
  const play = () => {
    quiet();
    const token = tok.current;
    const { proc, pos } = at.current;
    const l = lineAt();
    if (!l) {
      if (live.current.chain && proc + 1 < scripts.length) {
        setStatus('reading');
        timer.current = setTimeout(() => { if (tok.current === token) { moveTo(proc + 1, 0); play(); } }, 900);
      } else {
        setStatus('done');
        stop();
      }
      return;
    }
    if (l.kind === 'act') {
      setStatus('reading');
      timer.current = setTimeout(() => { if (tok.current === token) { moveTo(proc, pos + 1); play(); } }, 600);
    } else if (isMine(l, live.current.seat)) {
      listen(token);
    } else {
      const say = () => speak(l, token, () => { moveTo(proc, pos + 1); play(); });
      if (l.after) {
        setStatus('waiting');
        timer.current = setTimeout(() => { if (tok.current === token) say(); }, l.after * 1000);
      } else say();
    }
  };

  const stepStart = (lines, pos) => {
    let i = pos;
    while (i > 0 && lines[i - 1].step === lines[pos].step) i -= 1;
    return i;
  };

  const again = () => {
    const { proc, pos } = at.current;
    const lines = scripts[proc];
    let i = Math.min(pos, lines.length - 1);
    if (isMine(lines[i], live.current.seat) || lines[i].kind === 'act') {
      while (i > 0 && (isMine(lines[i], live.current.seat) || lines[i].kind === 'act')) i -= 1;
    }
    moveTo(proc, i);
    play();
  };

  const back = () => {
    const { proc, pos } = at.current;
    const lines = scripts[proc];
    const here = stepStart(lines, Math.min(pos, lines.length - 1));
    if (here > 0) moveTo(proc, stepStart(lines, here - 1));
    else if (proc > 0) moveTo(proc - 1, stepStart(scripts[proc - 1], scripts[proc - 1].length - 1));
    else moveTo(0, 0);
    play();
  };

  const next = () => {
    const { proc, pos } = at.current;
    if (pos < scripts[proc].length) moveTo(proc, pos + 1);
    play();
  };

  const heardDone = (token) => {
    const L = listening.current;
    if (!L || L.token !== token || tok.current !== token) return;
    const cmd = commandOf(L.text);
    if (cmd === 'again') again();
    else if (cmd === 'back') back();
    else if (cmd === 'pause') pause();
    else next();
  };

  const wantRec = () => running.current && !live.current.deaf;

  const makeRec = () => {
    const r = new Recognition();
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.onstart = () => {
      if (rec.current !== r) return; // replaced by Tap to listen
      recState.current = 'on';
      everOn.current = true;
      resultsLen.current = 0;
      if (listening.current) listening.current.from = 0;
      setMic('on');
    };
    r.onresult = (e) => {
      if (rec.current !== r) return; // replaced by Tap to listen
      resultsLen.current = e.results.length;
      const L = listening.current;
      if (!L || speaking.current) return;
      let text = '';
      for (let i = L.from; i < e.results.length; i += 1) text += `${e.results[i][0].transcript} `;
      text = text.trim();
      if (!text) return;
      L.text = text;
      setHeard(text);
      clearTimeout(silence.current);
      const l = lineAt();
      const delay = commandOf(text) ? 400 : endsLine(text, l) ? 250 : live.current.wait * 1000;
      silence.current = setTimeout(() => heardDone(L.token), delay);
    };
    r.onerror = (e) => {
      if (rec.current !== r) return; // replaced by Tap to listen
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        if (everOn.current) {
          setMic('tap'); // it worked before: the phone wants a tap to start it again
        } else {
          setDeaf(true);
          setMessage('The microphone is blocked. Allow it for this site in your browser settings, or press Next after each of your calls.');
        }
      } else if (e.error === 'network') {
        setDeaf(true);
        setMessage('Listening needs a signal here, so press Next after each of your calls.');
      } else if (e.error === 'audio-capture') {
        setMic('tap');
      }
    };
    // The browser stops listening on its own now and then; start again while it's wanted.
    r.onend = () => {
      if (rec.current !== r) return; // replaced by Tap to listen
      recState.current = 'idle';
      setMic((m) => (m === 'tap' ? m : 'off'));
      if (wantRec() && restarts.current < 30) {
        restarts.current += 1;
        startRec();
      }
    };
    return r;
  };

  function startRec() {
    if (!Recognition || live.current.deaf || recState.current !== 'idle') return;
    if (!rec.current) rec.current = makeRec();
    recState.current = 'starting';
    try {
      rec.current.start();
    } catch {
      recState.current = 'idle';
      setMic('tap');
    }
  }

  function abortRec() {
    if (rec.current && recState.current !== 'idle') { try { rec.current.abort(); } catch { /* not started */ } }
  }

  const stopRec = () => abortRec();

  // The student's own tap, which a phone accepts where a start on its own was refused.
  const tapToListen = () => {
    setMic('off');
    restarts.current = 0;
    abortRec();
    // A fresh recogniser: a refused one can stay refused.
    rec.current = null;
    recState.current = 'idle';
    startRec();
  };

  const lockScreen = async () => {
    try { if (navigator.wakeLock) wake.current = await navigator.wakeLock.request('screen'); } catch { /* refused */ }
  };

  // The level watch ("stop talking").
  const vad = useRef(null);
  const meter = useRef(null);
  const watchLevel = (v, an, buf) => {
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    const loud = rms > Math.max(v.noise * 3, 0.006);
    if (!loud) v.noise = v.noise * 0.97 + rms * 0.03;
    if (meter.current) meter.current.style.transform = `scaleX(${Math.min(1, rms / 0.08).toFixed(3)})`;
    const L = listening.current;
    const now = performance.now();
    if (!L || speaking.current || now < v.quietUntil) return;
    if (loud) {
      L.loud = (L.loud || 0) + TICK;
      L.lastVoice = now;
      if (L.loud >= STEADY && !L.spoke) { L.spoke = true; setHeard('Hearing you'); }
    }
    if (L.spoke && now - L.lastVoice > live.current.wait * 1000) heardDone(L.token);
  };
  function startVad() {
    if (live.current.advance !== 'voice' || vad.current || !canMic) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC(); // made inside the tap, or a phone keeps it silent
    ctx.resume().catch(() => {});
    const v = { ctx, stream: null, timer: null, noise: 0.003, quietUntil: 0 };
    vad.current = v;
    setMic('starting');
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .then((stream) => {
        if (vad.current !== v) { stream.getTracks().forEach((t) => t.stop()); return; }
        v.stream = stream;
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Float32Array(an.fftSize);
        v.timer = setInterval(() => watchLevel(v, an, buf), TICK);
        setMic('on');
      })
      .catch(() => {
        if (vad.current === v) stopVad();
        setMic('blocked');
        setMessage('The microphone is blocked. Allow it for this site in your browser settings, or press Next after each of your calls.');
      });
  }
  function stopVad() {
    const v = vad.current;
    if (!v) return;
    vad.current = null;
    clearInterval(v.timer);
    if (v.stream) v.stream.getTracks().forEach((t) => t.stop());
    v.ctx.close().catch(() => {});
    setMic('off');
  }

  const earbud = useRef(null);
  const startEarbud = () => {
    if (live.current.advance !== 'earbud' || earbud.current) return;
    const a = new Audio(silentWav());
    a.loop = true;
    a.play().catch(() => {});
    earbud.current = a;
    if (!canEarbud) return;
    const ms = navigator.mediaSession;
    try { ms.metadata = new window.MediaMetadata({ title: 'T-44C checklists' }); } catch { /* none */ }
    // One press (play or pause), two (next track) or three (previous track).
    const go = () => { if (earbud.current && earbud.current.paused) earbud.current.play().catch(() => {}); live.current.tap(); };
    [['play', go], ['pause', go], ['nexttrack', go], ['previoustrack', () => live.current.back()]]
      .forEach(([act, fn]) => { try { ms.setActionHandler(act, fn); } catch { /* unsupported */ } });
  };
  const stopEarbud = () => {
    const a = earbud.current;
    if (!a) return;
    a.pause();
    URL.revokeObjectURL(a.src);
    earbud.current = null;
    if (canEarbud) {
      ['play', 'pause', 'nexttrack', 'previoustrack']
        .forEach((act) => { try { navigator.mediaSession.setActionHandler(act, null); } catch { /* unsupported */ } });
    }
  };

  const stop = () => {
    running.current = false;
    stopRec();
    stopVad();
    if (wake.current) { wake.current.release().catch(() => {}); wake.current = null; }
  };

  const start = () => {
    running.current = true;
    setMessage('');
    setMic('off');
    startRec();
    startVad();
    startEarbud();
    lockScreen();
    // An iPhone speaks for a page only once the page has spoken inside a tap. Every checklist
    // now opens on the student's own call, so the first real line comes later, from the
    // microphone's side: a silent line said here, in the tap, unlocks the rest.
    if (canSpeak) {
      const unlock = new SpeechSynthesisUtterance(' ');
      unlock.volume = 0;
      window.speechSynthesis.speak(unlock);
    }
    if (!lineAt()) moveTo(at.current.proc, 0);
    play(); // inside the click, which some browsers need before they will speak
  };

  function pause() {
    quiet();
    stop();
    setStatus('paused');
  }

  const reset = (proc) => {
    quiet();
    stop();
    stopEarbud();
    moveTo(proc, 0);
    setHeard('');
    setStatus('idle');
  };

  // The tap for when listening is off or mishears: whatever is going on, on to the next line.
  const tap = () => {
    if (!running.current) { start(); return; }
    next();
  };

  const jump = (pos) => {
    moveTo(at.current.proc, pos);
    if (running.current) play();
  };

  // The wake lock goes when the page is hidden; take it again on return.
  useEffect(() => {
    const back2 = () => { if (running.current && document.visibilityState === 'visible') lockScreen(); };
    document.addEventListener('visibilitychange', back2);
    return () => document.removeEventListener('visibilitychange', back2);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName)) return;
      if (e.key === ' ') { e.preventDefault(); live.current.tap(); }
      else if (e.key === 'Escape') live.current.pause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  live.current.tap = tap;
  live.current.pause = pause;
  live.current.back = () => (running.current ? back() : null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { quiet(); stop(); stopEarbud(); }, []);

  const current = useRef(null);
  useEffect(() => {
    if (current.current) current.current.scrollIntoView({ block: 'nearest' });
  }, [view]);

  const lines = scripts[view.proc];
  const now = lines[view.pos];
  const mineNow = now && isMine(now, seat);
  const showText = (l, i) => !(hide && isMine(l, seat) && i >= view.pos);
  const busy = ['speaking', 'listening', 'reading', 'waiting'].includes(status);
  const listeningNow = status === 'listening';
  const statusText = {
    idle: 'Ready',
    speaking: now ? `${SEAT_NAME[now.seat]}` : '',
    listening: 'Your call',
    reading: '',
    waiting: now ? `${SEAT_NAME[now.seat]}` : '',
    paused: 'Paused',
    done: 'Checklist complete',
  }[status];
  const micText = advance === 'earbud' ? 'Press your earbud'
    : !hears ? 'Press Next after your call'
      : mic === 'on' ? 'Listening' : mic === 'tap' || mic === 'blocked' ? '' : 'Mic starting';
  const primary = busy
    ? { label: 'Next', onClick: tap }
    : { label: status === 'paused' ? 'Resume' : status === 'done' ? 'Again' : 'Start',
      onClick: status === 'done' ? () => { moveTo(view.proc, 0); start(); } : start };

  return (
    <div className="t44c-voice">
      <div className="t44c-voice-top">
        <select className="t44c-voice-pick" aria-label="Checklist" value={view.proc}
          onChange={(e) => reset(Number(e.target.value))}>
          {CHECKLISTS.map((p, i) => <option key={p.id} value={i}>{p.title}</option>)}
        </select>
        <span className="t44c-voice-seat" role="group" aria-label="Your seat">
          {['PF', 'PM'].map((s2) => (
            <button key={s2} type="button" aria-pressed={seat === s2} className={seat === s2 ? 'is-on' : ''}
              onClick={() => { setSeat(s2); reset(view.proc); }}>
              {s2}
            </button>
          ))}
        </span>
      </div>

      <details className="t44c-voice-settings">
        <summary>Settings</summary>
        <div className="t44c-voice-settings-body">
          <label>
            <input type="checkbox" checked={chain} onChange={(e) => setChain(e.target.checked)} />
            Go on to the next checklist
          </label>
          <label>
            <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />
            Hide my calls
          </label>
          <label>
            Go on when I
            <select value={advance} onChange={(e) => { setAdvance(e.target.value); reset(view.proc); }}>
              {OFFERED.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          {advance === 'earbud' && (
            <p>
              Press once or twice for the next call, three times to go back. Nothing listens in
              this mode.
            </p>
          )}
          {hears && (
            <label>
              Wait after I stop talking
              <select value={wait} onChange={(e) => setWait(Number(e.target.value))}>
                {WAITS.map((w) => <option key={w} value={w}>{w} s</option>)}
              </select>
            </label>
          )}
          {canSpeak && (
            <label>
              Speed
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((v) => <option key={v} value={v}>{v}×</option>)}
              </select>
            </label>
          )}
          {voices.length > 0 && (
            <label>
              Voice
              <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)}>
                <option value="">Best available ({voiceLabel(voices[0])})</option>
                {voices.map((v) => <option key={idOf(v)} value={idOf(v)}>{voiceLabel(v)}</option>)}
              </select>
            </label>
          )}
          {canSpeak && (
            <label>
              <input type="checkbox" checked={allVoices} onChange={(e) => setAllVoices(e.target.checked)} />
              Show every voice ({voices.length} {allVoices ? 'on this device' : 'shown'})
            </label>
          )}
          {IOS && (
            <p>
              For a better voice on an iPhone, download one under Settings, Accessibility, Read
              &amp; Speak (Spoken Content on older iPhones), Voices, English. Then close Safari and
              open this page again. Siri&apos;s own voices can&apos;t be used by a web page.
            </p>
          )}
        </div>
      </details>

      {!canMic && !Recognition && <p className="t44c-voice-note">This browser can&apos;t listen, so press Next after each of your calls.</p>}
      {!canSpeak && <p className="t44c-voice-note">This browser can&apos;t speak, so the calls are shown only.</p>}
      {message && <p className="t44c-voice-note" role="status">{message}</p>}

      <div className={`t44c-voice-now${mineNow && busy ? ' is-mine' : ''}`}>
        <div className="t44c-voice-status">
          <span aria-live="polite">{statusText}</span>
          {listeningNow && (
            <span className="t44c-voice-mic">
              {advance === 'voice' && mic === 'on' && <span className="t44c-voice-meter"><span ref={meter} /></span>}
              {micText}
            </span>
          )}
        </div>
        <div className="t44c-voice-line">
          {now ? (
            <span className={now.kind === 'act' ? 't44c-voice-act' : ''}>
              {status === 'waiting' ? '…' : showText(now, view.pos) ? now.text : 'Your call'}
            </span>
          ) : (
            <span>{CHECKLISTS[view.proc].title} complete</span>
          )}
        </div>
        <div className="t44c-voice-heard">
          {listeningNow && heard ? `Heard: ${heard}` : ''}
          {status === 'idle' && (advance === 'words'
            ? 'Say your call when it is yours. Say "say again", "back" or "skip" any time.'
            : advance === 'voice' ? 'Say your call when it is yours. The next one follows when you stop talking.'
              : advance === 'earbud' ? 'Say your call, then press your earbud.' : 'Say your call, then press Next.')}
        </div>
        {listeningNow && mic === 'tap' && advance === 'words' && !deafErr && (
          <button type="button" className="t44c-voice-listen" onClick={tapToListen}>Tap to listen</button>
        )}
        <button type="button" className="t44c-voice-main" onClick={primary.onClick}>{primary.label}</button>
        <div className="t44c-voice-buttons">
          <button type="button" onClick={busy ? pause : () => reset(view.proc)}>{busy ? 'Pause' : 'Restart'}</button>
          <button type="button" onClick={() => (running.current ? again() : null)} disabled={!busy}>Say again</button>
          <button type="button" onClick={() => (running.current ? back() : null)} disabled={!busy}>Back</button>
        </div>
      </div>

      <ol className="t44c-voice-list">
        {lines.map((l, i) => (
          <li key={`${l.step}-${i}`} ref={i === view.pos ? current : null}
            className={[
              i === view.pos ? 'is-now' : '', i < view.pos ? 'is-past' : '',
              isMine(l, seat) ? 'is-mine' : '', l.kind === 'act' ? 'is-act' : '',
            ].filter(Boolean).join(' ')}>
            <button type="button" onClick={() => jump(i)}>
              <span className="t44c-voice-who">{isMine(l, seat) ? 'You' : SEAT_NAME[l.seat]}</span>
              <span>{showText(l, i) ? l.text : 'Your call'}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
