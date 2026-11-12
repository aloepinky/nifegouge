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
// Everything runs off refs (`live`, `at`, `tok`): the speech engine calls back long after the
// render that started it. `tok` is bumped by every move the student makes, so a callback from a
// line that has been left does nothing.

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

const KEY = 't44cVoice';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private window */ } };

const WAITS = [0.5, 1, 1.5, 2, 2.5, 3];
const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
const SEAT_NAME = { PF: 'PF', PM: 'PM', OBS: 'OBS' };

// The best-sounding voices first: the neural ones (Edge, Windows 11), the downloaded Siri,
// Premium and Enhanced ones (iPhone, Mac), Google's (Chrome), then the rest, US English first.
// The old local voices (Microsoft David) sound robotic and trail silence after every line.
const RANK = [/natural|neural/i, /premium|enhanced|siri/i, /^google us english/i, /google/i,
  /samantha|ava|allison|susan|aria|jenny|guy/i];
const rank = (v) => {
  const i = RANK.findIndex((re) => re.test(v.name));
  return (i < 0 ? RANK.length : i) * 2 + (/en-US/i.test(v.lang) ? 0 : 1);
};
function englishVoices() {
  if (!canSpeak) return [];
  return window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)).sort((a, b) => rank(a) - rank(b));
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
  const [voices, setVoices] = useState(englishVoices);
  const [view, setView] = useState({ proc: 0, pos: 0 });
  const [status, setStatus] = useState('idle'); // idle | speaking | listening | reading | paused | done
  const [heard, setHeard] = useState('');
  const [deaf, setDeaf] = useState(!Recognition); // no listening: Next moves on
  const [message, setMessage] = useState('');

  useEffect(() => save({ seat, chain, hide, wait, speed, voice: voiceName }), [seat, chain, hide, wait, speed, voiceName]);

  useEffect(() => {
    if (!canSpeak) return undefined;
    const update = () => setVoices(englishVoices());
    window.speechSynthesis.addEventListener('voiceschanged', update);
    // The list may have arrived between the first render and this listener.
    update();
    const again = setTimeout(update, 1000);
    return () => { clearTimeout(again); window.speechSynthesis.removeEventListener('voiceschanged', update); };
  }, []);

  const live = useRef({});
  Object.assign(live.current, { seat, chain, wait, speed, voices, voiceName, deaf });
  const at = useRef({ proc: 0, pos: 0 });
  const tok = useRef(0);
  const timer = useRef(null);
  const silence = useRef(null);
  const rec = useRef(null);
  const running = useRef(false);
  const speaking = useRef(false);
  const listening = useRef(null); // { token, from, text }
  const resultsLen = useRef(0);
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
    const main = list.find((v) => v.name === live.current.voiceName) || list[0];
    // The observer is a second voice where there is one, so the two can be told apart.
    if (s === 'OBS') return list.find((v) => v !== main && /en-US/i.test(v.lang)) || main;
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
      speak(l, token, () => { moveTo(proc, pos + 1); play(); });
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

  const startRec = () => {
    if (!Recognition || live.current.deaf) return;
    if (!rec.current) {
      const r = new Recognition();
      r.lang = 'en-US';
      r.continuous = true;
      r.interimResults = true;
      r.onstart = () => {
        resultsLen.current = 0;
        if (listening.current) listening.current.from = 0;
      };
      r.onresult = (e) => {
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
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setDeaf(true);
          setMessage('The microphone is blocked, so press Next or the space bar after each of your calls.');
        } else if (e.error === 'network') {
          setDeaf(true);
          setMessage('Listening needs a signal here, so press Next or the space bar after each of your calls.');
        }
      };
      // The browser stops listening on its own now and then; start again while running.
      r.onend = () => {
        if (running.current && !live.current.deaf) {
          try { r.start(); } catch { /* already started */ }
        }
      };
      rec.current = r;
    }
    try { rec.current.start(); } catch { /* already started */ }
  };

  const stopRec = () => {
    if (rec.current) { try { rec.current.stop(); } catch { /* not started */ } }
  };

  const lockScreen = async () => {
    try { if (navigator.wakeLock) wake.current = await navigator.wakeLock.request('screen'); } catch { /* refused */ }
  };

  const stop = () => {
    running.current = false;
    stopRec();
    if (wake.current) { wake.current.release().catch(() => {}); wake.current = null; }
  };

  const start = () => {
    running.current = true;
    setMessage('');
    startRec();
    lockScreen();
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { quiet(); stop(); }, []);

  const current = useRef(null);
  useEffect(() => {
    if (current.current) current.current.scrollIntoView({ block: 'nearest' });
  }, [view]);

  const lines = scripts[view.proc];
  const now = lines[view.pos];
  const mineNow = now && isMine(now, seat);
  const showText = (l, i) => !(hide && isMine(l, seat) && i >= view.pos);
  const busy = status === 'speaking' || status === 'listening' || status === 'reading';
  const statusText = {
    idle: 'Press Start',
    speaking: now ? `${SEAT_NAME[now.seat]} speaking` : '',
    listening: deaf ? 'Your call, then press Next' : 'Your call',
    reading: '',
    paused: 'Paused',
    done: 'Checklist complete',
  }[status];

  return (
    <div className="t44c-voice">
      <div className="t44c-voice-bar">
        <label>
          Checklist
          <select value={view.proc} onChange={(e) => reset(Number(e.target.value))}>
            {CHECKLISTS.map((p, i) => <option key={p.id} value={i}>{p.title}</option>)}
          </select>
        </label>
        <span className="t44c-voice-seat" role="group" aria-label="Your seat">
          Your seat
          {['PF', 'PM'].map((s) => (
            <button key={s} type="button" aria-pressed={seat === s} className={seat === s ? 'is-on' : ''}
              onClick={() => { setSeat(s); reset(view.proc); }}>
              {s}
            </button>
          ))}
        </span>
        <label>
          <input type="checkbox" checked={chain} onChange={(e) => setChain(e.target.checked)} />
          Go on to the next checklist
        </label>
        <label>
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />
          Hide my calls
        </label>
        {!deaf && (
          <label title="How long you stop talking before the next call">
            Wait
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
        {voices.length > 1 && (
          <label>
            Voice
            <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)}>
              <option value="">Best available</option>
              {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
          </label>
        )}
      </div>

      <p className="t44c-voice-help">
        Pick your seat and press Start. The other seat&apos;s calls are read out loud.
        {deaf
          ? ' Say your call and press Next or the space bar.'
          : ' Say your call when it is your turn and the next one follows when you stop talking. Say "say again", "back" or "skip" at any time. Earbuds work best.'}
      </p>
      {!Recognition && (
        <p className="t44c-voice-note">This browser can&apos;t listen. Chrome, Edge and Safari can.</p>
      )}
      {!canSpeak && <p className="t44c-voice-note">This browser can&apos;t speak, so the calls are shown only.</p>}
      {message && <p className="t44c-voice-note" role="status">{message}</p>}

      <div className={`t44c-voice-now${mineNow && busy ? ' is-mine' : ''}`}>
        <div className="t44c-voice-status" aria-live="polite">{statusText}</div>
        <div className="t44c-voice-line">
          {now ? (
            <>
              <span className="t44c-voice-who">{isMine(now, seat) ? 'You' : SEAT_NAME[now.seat]}</span>
              <span className={now.kind === 'act' ? 't44c-voice-act' : ''}>
                {showText(now, view.pos) ? now.text : 'Your call'}
              </span>
            </>
          ) : (
            <span>{CHECKLISTS[view.proc].title} complete</span>
          )}
        </div>
        <div className="t44c-voice-heard">{status === 'listening' && heard ? `Heard: ${heard}` : ''}</div>
        <div className="t44c-voice-buttons">
          {busy
            ? <button type="button" onClick={pause}>Pause</button>
            : <button type="button" className="is-main" onClick={status === 'done' ? () => { moveTo(view.proc, 0); start(); } : start}>
                {status === 'paused' ? 'Resume' : status === 'done' ? 'Again' : 'Start'}
              </button>}
          <button type="button" onClick={tap} className={busy ? 'is-main' : ''}>Next</button>
          <button type="button" onClick={() => (running.current ? again() : null)} disabled={!busy}>Say again</button>
          <button type="button" onClick={() => (running.current ? back() : null)} disabled={!busy}>Back</button>
          <button type="button" onClick={() => reset(view.proc)}>Restart</button>
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
