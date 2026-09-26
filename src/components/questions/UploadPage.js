import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthor, setAuthor } from '../serverApi';
import { loadApproved, sendQuestions } from './questionsApi';
import { activeSections, formLectures, inUse, useSections } from './sections';
import { likelyDuplicate, parseUpload, problemsWith } from './parseUpload';
import { smallButton } from './Confirm';

// /nife/questions/upload: many questions at once, from a spreadsheet paste, a CSV file or a
// Quizlet export (parseUpload.js reads all three). Every row is shown to be checked and
// corrected before anything is sent, and what is sent goes to community review like any
// single submission. The topic and lecture are chosen once for the batch; a row can differ.

const BATCH = 100;
const faint = { fontSize: '12px', color: '#777' };
const box = { width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: '14px', border: '1px solid #bbb', borderRadius: '5px' };
const WRONG = ['incorrectAnswer1', 'incorrectAnswer2', 'incorrectAnswer3'];

// A row's topic column, where it has one, as a section: by id or by name.
function sectionFor(sections, topic) {
  const t = (topic || '').trim().toLowerCase();
  if (!t) return null;
  return sections.find((s) => !s.retired && (s.id === t || s.name.toLowerCase() === t)) || null;
}

export default function UploadPage() {
  const { sections } = useSections();
  const [live, setLive] = useState([]);
  const [text, setText] = useState('');
  const [format, setFormat] = useState('auto');
  const [rows, setRows] = useState([]);
  const [include, setInclude] = useState([]);
  const [detected, setDetected] = useState('');
  const [topic, setTopic] = useState('');
  const [lecture, setLecture] = useState('');
  const [author, setAuthorName] = useState(getAuthor);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { loadApproved().then(setLive).catch(() => {}); }, []);

  const topics = activeSections(sections);
  useEffect(() => {
    if (!topic && topics.length) setTopic(topics[0].id);
  }, [topic, topics]);
  const section = sections.find((s) => s.id === topic);
  const lectures = formLectures(section);
  const liveInUse = useMemo(() => live.filter(inUse(sections)), [live, sections]);

  // Every row as it would be sent: its own topic and lecture where it has them, the batch's
  // where it does not.
  const prepared = useMemo(() => rows.map((row) => {
    const own = sectionFor(sections, row.topic);
    const rowSection = own || section;
    const valid = (id) => formLectures(rowSection).some((l) => l.id === String(id));
    // A lecture chosen on the row stands, "No lecture" included; otherwise the row's own column,
    // then the batch's.
    let rowLecture;
    if (row.lectureSet) rowLecture = valid(row.lecture) ? String(row.lecture) : '';
    else if (row.lecture && valid(row.lecture)) rowLecture = String(row.lecture);
    else rowLecture = own ? '' : lecture;
    const problems = problemsWith(row);
    if (row.topic && !own) problems.push(`"${row.topic}" is not one of the topics.`);
    return {
      ...row,
      topicId: rowSection ? rowSection.id : '',
      lectureId: rowLecture,
      problems,
      duplicate: likelyDuplicate(row, liveInUse),
    };
  }), [rows, sections, section, lecture, liveInUse]);

  const read = (value, fmt = format) => {
    setText(value);
    setResult(null);
    const out = parseUpload(value, fmt === 'auto' ? {} : { format: fmt });
    setDetected(out.format);
    setRows(out.rows);
    // A row is ticked unless something is wrong with it or it looks like one already in the quiz.
    setInclude(out.rows.map((r) => problemsWith(r).length === 0 && !likelyDuplicate(r, liveInUse)));
  };

  const readFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => read(String(reader.result || ''));
    reader.readAsText(file);
  };

  const setRow = (i, change) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...change } : r)));
  const sendable = prepared.map((r, i) => include[i] && r.problems.length === 0 && r.topicId);
  const count = sendable.filter(Boolean).length;

  const send = async () => {
    setBusy(true);
    setAuthor(author.trim());
    const picked = prepared.map((r, i) => ({ r, i })).filter(({ i }) => sendable[i]);
    const payload = ({ r }) => ({
      topic: r.topicId, lecture: r.lectureId, question: r.question, correctAnswer: r.correctAnswer,
      incorrectAnswer1: r.incorrectAnswer1, incorrectAnswer2: r.incorrectAnswer2, incorrectAnswer3: r.incorrectAnswer3,
      explanation: r.explanation,
    });
    const sent = new Set();
    const refused = new Map(); // row index -> the server's reason
    let failed = '';
    try {
      for (let at = 0; at < picked.length; at += BATCH) {
        const chunk = picked.slice(at, at + BATCH);
        const out = await sendQuestions(chunk.map(payload), author.trim());
        out.submitted.forEach(({ index }) => sent.add(chunk[index].i));
        out.refused.forEach(({ index, error }) => refused.set(chunk[index].i, error));
      }
    } catch (err) {
      failed = err.message;
    }
    // What went is taken off the page; what was refused stays, marked with the reason, to be
    // fixed and sent again.
    setRows((rs) => rs.map((r, i) => ({ ...r, serverError: refused.get(i) || '' })).filter((_, i) => !sent.has(i)));
    setInclude((inc) => inc.filter((_, i) => !sent.has(i)));
    setResult({ sent: sent.size, refused: refused.size, failed });
    setBusy(false);
  };

  return (
    <div className="questions-container" style={{ textAlign: 'left' }}>
      <Link to="/nife/questions" style={{ color: '#003B4F', fontSize: '14px' }}>← Back to the questions</Link>
      <h2 style={{ color: '#01202C', margin: '10px 0 6px' }}>Upload questions</h2>
      <p style={{ fontSize: '14px', color: '#333', marginTop: 0 }}>
        Paste rows copied from a spreadsheet, paste a Quizlet export, or choose a CSV file. A
        spreadsheet's columns are Question, Correct answer, Wrong answer 1 to 3, Lecture and
        Explanation, in that order unless the first row names them. Check every question below
        before sending: each one goes to community review like any other.
      </p>

      <textarea
        aria-label="Paste questions"
        style={{ ...box, minHeight: '120px', fontFamily: 'monospace', fontSize: '13px' }}
        placeholder="Paste here"
        value={text}
        onChange={(e) => read(e.target.value)}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', margin: '8px 0 16px', fontSize: '14px' }}>
        <label>
          Or a file: <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={(e) => readFile(e.target.files[0])} style={{ width: 'auto' }} />
        </label>
        <label>
          Read it as{' '}
          <select value={format} onChange={(e) => { setFormat(e.target.value); if (text) read(text, e.target.value); }}>
            <option value="auto">{detected ? `Automatic (${detected === 'quizlet' ? 'Quizlet' : 'spreadsheet'})` : 'Automatic'}</option>
            <option value="table">Spreadsheet or CSV</option>
            <option value="quizlet">Quizlet export</option>
          </select>
        </label>
      </div>

      {result && (
        <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '6px', background: result.refused || result.failed ? '#fdecea' : '#e6f2f5', color: result.refused || result.failed ? '#8e1c12' : '#003B4F', fontSize: '14px' }}>
          {result.sent} question{result.sent === 1 ? '' : 's'} sent for community review.
          {result.refused > 0 && <div>{result.refused} could not be sent. They are still above, each marked with the reason.</div>}
          {result.failed && <div>Sending stopped: {result.failed} Anything not sent is still above.</div>}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
            <label>
              Topic{' '}
              <select value={topic} onChange={(e) => { setTopic(e.target.value); setLecture(''); }}>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            {lectures.length > 0 && (
              <label>
                Lecture{' '}
                <select value={lecture} onChange={(e) => setLecture(e.target.value)}>
                  <option value="">No lecture</option>
                  {lectures.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
            )}
            <span style={faint}>for every row that does not name its own.</span>
          </div>

          <div style={{ ...faint, marginBottom: '8px' }}>
            {rows.length} read. {count} ticked to send.{' '}
            <button type="button" style={smallButton('white', '#01202C', '1px solid #01202C')} onClick={() => setInclude(prepared.map((r) => r.problems.length === 0))}>Tick all that can go</button>{' '}
            <button type="button" style={smallButton('white', '#01202C', '1px solid #01202C')} onClick={() => setInclude(prepared.map(() => false))}>Untick all</button>
          </div>

          {prepared.map((r, i) => {
            const rowSection = sections.find((s) => s.id === r.topicId);
            const rowLectures = formLectures(rowSection);
            return (
              <div key={i} style={{ border: '1px solid #d5dde0', borderLeft: `4px solid ${r.problems.length ? '#c62828' : include[i] ? '#003B4F' : '#ccc'}`, borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', background: 'white' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <input
                    type="checkbox"
                    aria-label={`Send row ${i + 1}`}
                    checked={!!include[i] && r.problems.length === 0}
                    disabled={r.problems.length > 0}
                    onChange={(e) => setInclude((inc) => inc.map((v, j) => (j === i ? e.target.checked : v)))}
                    style={{ width: '18px', minWidth: '18px', flex: '0 0 18px', padding: 0 }}
                  />
                  <strong style={{ fontSize: '13px', color: '#01202C' }}>Row {i + 1}</strong>
                  <span style={faint}>{rowSection ? rowSection.name : 'No topic'}</span>
                  {rowLectures.length > 0 && (
                    <select aria-label={`Lecture for row ${i + 1}`} value={r.lectureId} onChange={(e) => setRow(i, { lecture: e.target.value, lectureSet: true })} style={{ fontSize: '12px' }}>
                      <option value="">No lecture</option>
                      {rowLectures.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  )}
                </div>
                <textarea aria-label="Question" style={{ ...box, minHeight: '40px' }} value={r.question} onChange={(e) => setRow(i, { question: e.target.value })} />
                <input aria-label="Correct answer" style={{ ...box, marginTop: '4px', borderColor: '#7cb58a' }} value={r.correctAnswer} onChange={(e) => setRow(i, { correctAnswer: e.target.value })} placeholder="Correct answer" />
                {WRONG.map((k, n) => (
                  <input key={k} aria-label={`Wrong answer ${n + 1}`} style={{ ...box, marginTop: '4px' }} value={r[k]} onChange={(e) => setRow(i, { [k]: e.target.value })} placeholder={`Wrong answer ${n + 1}`} />
                ))}
                <textarea aria-label="Explanation" style={{ ...box, marginTop: '4px', minHeight: '32px' }} value={r.explanation} onChange={(e) => setRow(i, { explanation: e.target.value })} placeholder="Why is this the answer? (optional)" />
                {r.problems.length > 0 && <div style={{ color: '#c62828', fontSize: '13px', marginTop: '6px' }}>{r.problems.join(' ')}</div>}
                {r.serverError && <div style={{ color: '#c62828', fontSize: '13px', marginTop: '6px' }}>Not sent: {r.serverError}</div>}
                {r.borrowed && (
                  <div style={{ color: '#8a5a00', fontSize: '13px', marginTop: '6px' }}>
                    Quizlet has no wrong answers, so these were taken from other cards. Check they are really wrong for this question.
                  </div>
                )}
                {r.duplicate && (
                  <div style={{ color: '#003B4F', fontSize: '13px', marginTop: '6px' }}>
                    Looks like a question already in the quiz: “{r.duplicate.question.question}” (✓ {r.duplicate.question.correctAnswer}). Left unticked; tick it if it is different.
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ borderTop: '2px solid #01202C', paddingTop: '12px', display: 'grid', gap: '8px' }}>
            <input aria-label="Your name" style={box} placeholder="Your name (optional)" value={author} maxLength={40} onChange={(e) => setAuthorName(e.target.value)} />
            <div>
              <button type="button" style={smallButton(count && !busy ? '#01202C' : '#9aa7ab')} disabled={!count || busy} onClick={send}>
                {busy ? 'Sending…' : `Send ${count} question${count === 1 ? '' : 's'} for review`}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
