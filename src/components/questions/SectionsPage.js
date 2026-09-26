import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthor, readMirror, setAuthor } from '../serverApi';
import { loadApproved } from './questionsApi';
import { lectureIdFor, restoreSections, saveSections, sectionIdFor, sectionsHistory } from './sections';
import Confirm, { smallButton } from './Confirm';

// /nife/questions/sections: the topics and lectures the quiz is sorted into, for anyone to
// change as NIFE's syllabus changes. The whole list is one document: edit it here, say what you
// changed, save, and it is a new revision; History restores any earlier one.
//
// A topic or lecture that has been saved is never deleted, only retired, because questions are
// filed under it; the server refuses a save that drops one. A topic or lecture added in this
// sitting and not yet saved can simply be removed. A new topic's id follows its name until the
// first save, then stays, so a later rename does not move its questions.

const clone = (v) => JSON.parse(JSON.stringify(v));
const strip = (sections) => sections.map(({ isNew, ...s }) => ({
  ...s,
  lectures: s.lectures.map(({ isNew: _, ...l }) => l),
}));

const input = { padding: '6px 8px', fontSize: '15px', border: '1px solid #bbb', borderRadius: '5px', minWidth: 0 };
const faint = { fontSize: '12px', color: '#777' };

function Arrows({ index, count, onMove }) {
  const arrow = { ...smallButton('white', '#01202C', '1px solid #bbb'), padding: '2px 8px' };
  return (
    <span style={{ display: 'inline-flex', gap: '4px' }}>
      <button type="button" style={arrow} disabled={index === 0} title="Move up" onClick={() => onMove(index, index - 1)}>↑</button>
      <button type="button" style={arrow} disabled={index === count - 1} title="Move down" onClick={() => onMove(index, index + 1)}>↓</button>
    </span>
  );
}

const moved = (list, from, to) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export default function SectionsPage() {
  const [saved, setSaved] = useState(null); // { rev, doc }
  const [draft, setDraft] = useState(null);
  const [counts, setCounts] = useState({});
  const [open, setOpen] = useState(() => new Set());
  const [summary, setSummary] = useState('');
  const [author, setAuthorName] = useState(getAuthor);
  const [message, setMessage] = useState(null); // { text, kind, conflict? }
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    const data = await readMirror('questions/nife/sections.json');
    setSaved(data && data.doc ? { rev: data.rev, doc: data.doc } : { rev: 0, doc: null });
    setDraft(data && data.doc ? clone(data.doc.sections) : null);
    setHistory(null);
  }, []);

  useEffect(() => {
    load().catch(() => setMessage({ text: 'Could not load the topics. Check your connection.', kind: 'error' }));
    loadApproved().then((qs) => {
      const c = {};
      for (const q of qs) {
        const t = (q.topic || '').toLowerCase();
        c[t] = c[t] || { total: 0 };
        c[t].total += 1;
        if (q.lecture) c[t][String(q.lecture)] = (c[t][String(q.lecture)] || 0) + 1;
      }
      setCounts(c);
    }).catch(() => {});
  }, [load]);

  const dirty = useMemo(() => saved && saved.doc && draft && JSON.stringify(strip(draft)) !== JSON.stringify(saved.doc.sections), [saved, draft]);

  const setSection = (i, change) => setDraft((d) => d.map((s, j) => (j === i ? { ...s, ...change } : s)));
  const setLecture = (i, k, change) => setDraft((d) => d.map((s, j) => (
    j === i ? { ...s, lectures: s.lectures.map((l, m) => (m === k ? { ...l, ...change } : l)) } : s
  )));

  const renameSection = (i, name) => setDraft((d) => d.map((s, j) => {
    if (j !== i) return s;
    if (!s.isNew) return { ...s, name };
    const taken = d.filter((_, k) => k !== i).map((o) => o.id);
    return { ...s, name, id: sectionIdFor(name, taken) };
  }));

  const addSection = () => setDraft((d) => {
    const taken = d.map((s) => s.id);
    const next = [...d, { id: sectionIdFor('New topic', taken), name: 'New topic', lectures: [], isNew: true }];
    setOpen((o) => new Set(o).add(next.length - 1));
    return next;
  });

  const addLecture = (i) => setDraft((d) => d.map((s, j) => {
    if (j !== i) return s;
    const id = lectureIdFor(s.lectures);
    return { ...s, lectures: [...s.lectures, { id, name: `Lecture ${id}`, isNew: true }] };
  }));

  const save = async () => {
    setBusy(true);
    setMessage(null);
    setAuthor(author.trim());
    try {
      const out = await saveSections(saved.rev, { school: 'NIFE', sections: strip(draft) }, { author: author.trim(), summary: summary.trim() });
      setSummary('');
      await load();
      setMessage({ text: `Saved as revision ${out.rev}. The quiz uses it from the next page load.`, kind: 'info' });
    } catch (err) {
      if (err.status === 409) {
        setMessage({ text: 'Someone saved the topics while you were editing. Load theirs, then make your change again.', kind: 'error', conflict: true });
      } else {
        setMessage({ text: err.message, kind: 'error' });
      }
    }
    setBusy(false);
  };

  const openHistory = async () => {
    setShowHistory(!showHistory);
    if (!history) {
      try {
        setHistory(await sectionsHistory());
      } catch (err) {
        setMessage({ text: err.message, kind: 'error' });
      }
    }
  };

  const restore = async (rev) => {
    setMessage(null);
    try {
      const out = await restoreSections(rev, { author: author.trim() });
      await load();
      setShowHistory(false);
      setMessage({ text: `Revision ${rev} restored as revision ${out.rev}. Anything added since it is kept, retired.`, kind: 'info' });
    } catch (err) {
      setMessage({ text: err.message, kind: 'error' });
    }
  };

  const toggle = (i) => setOpen((o) => {
    const next = new Set(o);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  });

  return (
    <div className="questions-container" style={{ textAlign: 'left' }}>
      <Link to="/nife/questions" style={{ color: '#003B4F', fontSize: '14px' }}>← Back to the questions</Link>
      <h2 style={{ color: '#01202C', margin: '10px 0 6px' }}>Topics and lectures</h2>
      <p style={{ fontSize: '14px', color: '#333', marginTop: 0 }}>
        The topics and lectures the quiz is sorted into. Anyone can change them when the syllabus
        changes, and every change is kept in History, where it can be undone. A topic or lecture
        that has been saved can't be deleted, because questions are filed under it: retire it to
        take it out of the quiz, and bring it back the same way.
      </p>

      {message && (
        <div style={{ padding: '8px 12px', borderRadius: '6px', margin: '10px 0', fontSize: '14px', background: message.kind === 'error' ? '#fdecea' : '#e6f2f5', color: message.kind === 'error' ? '#8e1c12' : '#003B4F' }}>
          {message.text}
          {message.conflict && (
            <button type="button" style={{ ...smallButton('#01202C'), marginLeft: '10px' }} onClick={() => { setMessage(null); load(); }}>
              Load the newest
            </button>
          )}
        </div>
      )}

      {!saved && <div style={faint}>Loading…</div>}
      {saved && !saved.doc && <div style={{ fontSize: '14px' }}>The topic list has not been set up yet.</div>}

      {draft && draft.map((s, i) => {
        const c = counts[s.id] || { total: 0 };
        const isOpen = open.has(i);
        return (
          <div key={`${s.id}-${i}`} style={{ border: '1px solid #d5dde0', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', background: s.retired ? '#f4f4f4' : 'white' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <Arrows index={i} count={draft.length} onMove={(from, to) => setDraft((d) => moved(d, from, to))} />
              <input aria-label="Topic name" style={{ ...input, flex: '1 1 160px', fontWeight: 'bold', color: s.retired ? '#888' : '#01202C' }} value={s.name} maxLength={40} onChange={(e) => renameSection(i, e.target.value)} />
              <span style={faint}>
                {c.total} question{c.total === 1 ? '' : 's'}{s.retired ? ' • retired, not in the quiz' : ''}{s.isNew ? ' • new' : ''}
              </span>
              <button type="button" style={smallButton('white', '#01202C', '1px solid #01202C')} onClick={() => toggle(i)}>
                {isOpen ? 'Hide lectures' : `Lectures (${s.lectures.length})`}
              </button>
              {s.isNew ? (
                <button type="button" style={smallButton('white', '#8e1c12', '1px solid #8e1c12')} onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>Remove</button>
              ) : (
                <button type="button" style={smallButton(s.retired ? '#01202C' : 'white', s.retired ? 'white' : '#5a0000', '1px solid #5a0000')} onClick={() => setSection(i, { retired: s.retired ? undefined : true })}>
                  {s.retired ? 'Bring back' : 'Retire'}
                </button>
              )}
            </div>

            {isOpen && (
              <div style={{ marginTop: '10px', paddingLeft: '12px', borderLeft: '3px solid #e3eaec' }}>
                {s.lectures.length === 0 && <div style={faint}>No lectures. Questions in this topic are not split by lecture.</div>}
                {s.lectures.map((l, k) => (
                  <div key={`${l.id}-${k}`} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <Arrows index={k} count={s.lectures.length} onMove={(from, to) => setSection(i, { lectures: moved(s.lectures, from, to) })} />
                    <input aria-label="Lecture name" style={{ ...input, flex: '1 1 160px', color: l.retired ? '#888' : '#222' }} value={l.name} maxLength={60} onChange={(e) => setLecture(i, k, { name: e.target.value })} />
                    <span style={faint}>{c[l.id] || 0} question{c[l.id] === 1 ? '' : 's'}{l.retired ? ' • retired' : ''}</span>
                    {l.isNew ? (
                      <button type="button" style={smallButton('white', '#8e1c12', '1px solid #8e1c12')} onClick={() => setSection(i, { lectures: s.lectures.filter((_, m) => m !== k) })}>Remove</button>
                    ) : (
                      <button type="button" style={smallButton('white', '#5a0000', '1px solid #5a0000')} onClick={() => setLecture(i, k, { retired: l.retired ? undefined : true })}>
                        {l.retired ? 'Bring back' : 'Retire'}
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" style={smallButton('white', '#01202C', '1px solid #01202C')} onClick={() => addLecture(i)}>+ Add lecture</button>
              </div>
            )}
          </div>
        );
      })}

      {draft && (
        <>
          <button type="button" style={{ ...smallButton('white', '#01202C', '1px solid #01202C'), marginBottom: '16px' }} onClick={addSection}>+ Add topic</button>

          <div style={{ borderTop: '2px solid #01202C', paddingTop: '12px', display: 'grid', gap: '8px' }}>
            <input aria-label="What did you change?" style={input} placeholder="What did you change? (required)" value={summary} maxLength={200} onChange={(e) => setSummary(e.target.value)} />
            <input aria-label="Your name" style={input} placeholder="Your name (optional)" value={author} maxLength={40} onChange={(e) => setAuthorName(e.target.value)} />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" style={smallButton(dirty && summary.trim() && !busy ? '#01202C' : '#9aa7ab')} disabled={!dirty || !summary.trim() || busy} onClick={save}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              {dirty && (
                <Confirm label="Discard changes" question="Throw away your changes?" confirmLabel="Discard" style={smallButton('white', '#8e1c12', '1px solid #8e1c12')} onConfirm={() => setDraft(clone(saved.doc.sections))} />
              )}
              <span style={faint}>{dirty ? (summary.trim() ? '' : 'Say what you changed to save.') : 'No changes.'}</span>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button type="button" style={smallButton('white', '#01202C', '1px solid #01202C')} onClick={openHistory}>
              {showHistory ? 'Hide history' : 'History'}
            </button>
            {showHistory && history && (
              <div style={{ marginTop: '10px' }}>
                {history.revisions.map((h) => (
                  <div key={h.rev} style={{ padding: '8px 0', borderTop: '1px solid #e3eaec', fontSize: '13px' }}>
                    <div>
                      <strong>Revision {h.rev}</strong>{' '}
                      <span style={faint}>{new Date(h.createdAt).toLocaleString()}{h.author ? ` • ${h.author}` : ''}</span>
                    </div>
                    <div style={{ color: '#333' }}>{h.summary}</div>
                    {h.rev !== history.latestRev && (
                      <div style={{ marginTop: '4px' }}>
                        <Confirm
                          label="Restore this revision"
                          question={`Make revision ${h.rev} current? Anything added since is kept, retired.`}
                          confirmLabel="Restore"
                          style={smallButton('#01202C')}
                          onConfirm={() => restore(h.rev)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
