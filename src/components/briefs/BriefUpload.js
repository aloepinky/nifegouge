import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthor, setAuthor } from '../serverApi';
import { Line } from '../discuss/edit/fields';
import { preparePdfWorker } from '../discuss/jppt/pdfWorker';
import { loadTextItems } from '../discuss/jppt/pdfText';
import { parseBriefGuide } from './parseBriefGuide';
import { publishBrief, saveBrief, fetchBrief, rememberBrief } from './briefApi';
import BriefView from './BriefView';
import { diffBriefs, diffSummary } from './briefDiff';
import { PROGRAMS, programName, programOf } from '../programs';
import { useBriefsBase } from './paths';

// Upload a briefing guide and publish the briefs it prints. The PDF is read in this browser
// and never leaves it; only the briefs are sent.
//
// A guide already on the site is replaced rather than duplicated: each brief found is matched
// to the one with the same id (the upload names a brief by its stages, `fam-vnav-inav`), and
// publishing it saves a new revision there, so its address and its history carry on.

const MAX_BYTES = 25 * 1024 * 1024;
const NEW = '__new__';

// The date the guide's own header prints ("10 Mar 2025"), as a date box wants it.
function isoDate(source) {
  const at = new Date((source && source.date) || '');
  if (Number.isNaN(at.getTime())) return '';
  return at.toISOString().slice(0, 10);
}

const words = (text) => (text || '').toLowerCase().match(/[a-z0-9]+/g) || [];

// Which brief on the site is this one a new edition of? The stages it is for are what say so:
// `FAM / VNAV / INAV` against `FAM, VNAV and INAV`, whatever the wing has retitled it to.
// Half the words have to be shared, so an edition that genuinely adds a brief matches nothing.
function bestMatch(brief, candidates) {
  const mine = new Set(words(brief.short || brief.title));
  let best = null;
  let bestScore = 0;
  candidates.forEach((entry) => {
    const theirs = new Set(words(entry.short || entry.title));
    const shared = [...mine].filter((w) => theirs.has(w)).length;
    const score = (2 * shared) / (mine.size + theirs.size || 1);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  });
  return bestScore >= 0.5 ? best : null;
}

// One brief as it will look. Where it is replacing a brief already on the site, it is drawn
// against that one: everything this edition adds, changes or drops is marked, and every block
// carrying a change starts open, since a change nobody can see is not a preview of anything.
function Preview({ brief, against }) {
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState({});

  useEffect(() => {
    setCurrent(null);
    setError('');
    if (!against) return undefined;
    let live = true;
    fetchBrief(against).then(
      (record) => { if (live) setCurrent(record.brief); },
      (err) => { if (live) setError(`The brief on the site could not be read, so this is the new one on its own. ${err.message}`); },
    );
    return () => { live = false; };
  }, [against]);

  const compared = useMemo(() => (current ? diffBriefs(current, brief) : null), [current, brief]);
  const shownDoc = compared ? compared.doc : brief;
  // Marked blocks start open; anything else the reader opens for themselves.
  const expanded = useMemo(() => {
    const out = {};
    if (compared) Object.keys(compared.marks).forEach((id) => { out[id] = true; });
    return { ...out, ...open };
  }, [compared, open]);

  if (against && !current && !error) {
    return <div className="brief-upload-preview"><p className="brief-status">Reading the brief on the site…</p></div>;
  }

  return (
    <div className="brief-upload-preview">
      {error && <p className="discuss-editor-warn">{error}</p>}
      {compared && (
        <div className="brief-diff-summary">
          <p><strong>Changes:</strong> {diffSummary(compared)}</p>
          <p className="discuss-editor-hint">
            Additions are marked new, rewrites are marked changed, and removals are struck
            through.
          </p>
        </div>
      )}
      <BriefView
        brief={shownDoc}
        expanded={expanded}
        onToggle={(id) => setOpen((o) => ({ ...o, [id]: !expanded[id] }))}
        firstLetter={false}
        diff={compared ? compared.marks : null}
      />
    </div>
  );
}

function BriefUpload({ index, school: startingSchool, onPublished }) {
  const base = useBriefsBase();
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [found, setFound] = useState(null); // { briefs, warnings }
  const [choices, setChoices] = useState({}); // brief index -> { include, target }
  const [preview, setPreview] = useState(null);
  const [author, setAuthorField] = useState(getAuthor);
  const [unit, setUnit] = useState('');
  const [date, setDate] = useState('');
  const [school, setSchool] = useState(startingSchool);
  const program = programOf(school) || PROGRAMS[0];
  const [summary, setSummary] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  const read = async () => {
    if (!file) return;
    setError('');
    if (file.size > MAX_BYTES) {
      setError('That file is over 25 MB. Check it is the right PDF.');
      return;
    }
    let stop = () => {};
    try {
      setProgress('Opening the PDF');
      stop = await preparePdfWorker();
      const pages = await loadTextItems(await file.arrayBuffer(), (p, total) => setProgress(`Reading page ${p} of ${total}`));
      const out = parseBriefGuide(pages);
      if (!out.briefs.length) {
        setError(out.warnings.join(' ') || 'No brief was found in this PDF.');
        return;
      }
      setFound(out);
      // A new edition of a guide replaces the briefs it supersedes rather than publishing a
      // second copy of each, so every brief found is matched to the one it replaces: by
      // address first, then by the stages it is for, which is what changes when a wing
      // reissues a brief under a new name.
      //
      // What is not matched starts unticked, because a guide also prints briefs the site does
      // not want — the Solo guide is read at the ODO's desk rather than briefed from memory,
      // and is deliberately not published.
      const taken = new Set();
      setChoices(Object.fromEntries(out.briefs.map((b, i) => {
        const match = index.find((e) => !taken.has(e.id) && e.id === b.id)
          || bestMatch(b, index.filter((e) => !taken.has(e.id)));
        if (match) taken.add(match.id);
        return [i, { include: !index.length || !!match, target: match ? match.id : NEW }];
      })));
      // What the guide says about itself. The Primary guide prints its instruction and date as
      // a running head, and the wing follows from the instruction; the NIFE guide dates itself
      // in the footer and names no unit. Whatever it does not say is left to be typed, and
      // every box can be corrected before anything is published.
      const said = out.briefs[0];
      setUnit((u) => u || (said.source && said.source.unit) || '');
      setDate((d) => d || isoDate(said.source));
      setSchool(said.school || startingSchool);
      setSummary('');
      setResults(null);
    } catch (err) {
      setError(`This PDF could not be read. ${err.message || ''}`.trim());
    } finally {
      stop();
      setProgress(null);
    }
  };

  const publishAll = async () => {
    setBusy(true);
    setAuthor(author.trim());
    const meta = { author: author.trim(), summary: summary.trim() || 'Generated from the briefing guide' };
    const out = [];
    for (let i = 0; i < found.briefs.length; i += 1) {
      const choice = choices[i];
      if (!choice.include) continue;
      // Every brief carries the guide it came out of — whose it is and when it was published —
      // and the school whose tab it belongs on.
      const parsed = found.briefs[i];
      const brief = {
        ...parsed,
        school: program.label,
        aircraft: program.aircraft,
        source: { ...parsed.source, unit: unit.trim(), date },
      };
      try {
        let id;
        if (choice.target === NEW) {
          ({ id } = await publishBrief(brief, meta));
        } else {
          // The newest revision, read now rather than from the index this page loaded with.
          const current = await fetchBrief(choice.target);
          ({ id } = await saveBrief(choice.target, current.rev, { ...brief, id: choice.target }, meta));
        }
        rememberBrief(await fetchBrief(id));
        out.push({ ok: true, id, title: brief.short || brief.title });
      } catch (err) {
        out.push({ ok: false, title: brief.short || brief.title, message: err.message });
      }
    }
    setResults(out);
    setBusy(false);
    onPublished();
  };

  if (results) {
    return (
      <section className="discuss-editor discuss-upload">
        <h3>Published</h3>
        <ul className="brief-upload-results">
          {results.map((r) => (
            <li key={r.title}>
              {r.ok
                ? <Link to={`${base}/${r.id}`}>{r.title}</Link>
                : <span className="discuss-editor-warn">{r.title}: not published. {r.message}</span>}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (!found) {
    return (
      <section className="discuss-editor discuss-upload">
        <h3>Upload a briefing guide</h3>
        <p className="discuss-editor-hint">
          Upload briefing guide PDF to either create a new brief or replace an outdated one.
          The PDF stays on your computer.
        </p>
        <div className="discuss-editor-field">
          <label className="discuss-editor-label" htmlFor="brief-file">Briefing guide PDF</label>
          {/* The browser's own file control says "Choose file" and "No file chosen"; this is
              the same control with the page's words on it. */}
          <div className="brief-file">
            <input
              id="brief-file"
              className="brief-file-input"
              type="file"
              accept="application/pdf,.pdf"
              disabled={!!progress}
              onChange={(e) => setFile(e.target.files && e.target.files[0])}
            />
            <label className="brief-file-button" htmlFor="brief-file">Upload file</label>
            <span className="brief-file-name">{file ? file.name : 'No file uploaded'}</span>
          </div>
        </div>
        <div className="discuss-editor-buttons">
          <button type="button" className="discuss-editor-save" disabled={!file || !!progress} onClick={read}>
            {progress ? 'Reading…' : 'Upload'}
          </button>
          {progress && <span className="discuss-upload-progress" role="status">{progress}</span>}
        </div>
        {error && <p className="discuss-editor-warn">{error}</p>}
      </section>
    );
  }

  const chosen = found.briefs.filter((_, i) => choices[i].include).length;
  return (
    <section className="discuss-editor discuss-upload">
      <h3>{found.briefs.length === 1 ? 'One brief found' : `${found.briefs.length} briefs found`}</h3>
      {index.length > 0 && (
        <p className="discuss-editor-hint">
          Select replace to update an outdated brief. Untick a brief to not publish it.
        </p>
      )}
      {found.warnings.length > 0 && (
        <>
          <p className="discuss-editor-hint">Check these before publishing; they can be fixed with Edit afterwards.</p>
          <ul className="discuss-editor-problems">
            {found.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </>
      )}
      {found.briefs.map((b, i) => {
        const choice = choices[i];
        const set = (patch) => setChoices((c) => ({ ...c, [i]: { ...c[i], ...patch } }));
        const items = b.sections.reduce((n, s) => n + s.items.length, 0);
        const replacing = choice.include && choice.target !== NEW;
        return (
          <div key={b.id} className="brief-upload-row">
            <label className="brief-upload-include">
              <input type="checkbox" checked={choice.include} onChange={(e) => set({ include: e.target.checked })} />
              {' '}<strong>{b.short}</strong>
            </label>
            <span className="brief-upload-meta">{b.title}: {b.sections.length} sections, {items} items</span>
            <select
              className="discuss-editor-line brief-edit-select"
              value={choice.target}
              disabled={!choice.include}
              onChange={(e) => set({ target: e.target.value })}
              aria-label="Where it goes"
            >
              <option value={NEW}>Publish as a new brief</option>
              {index.map((e) => <option key={e.id} value={e.id}>Replace {e.short || e.title}</option>)}
            </select>
            <button type="button" className="brief-link" onClick={() => setPreview(preview === i ? null : i)}>
              {preview === i ? 'hide preview' : replacing ? 'preview the changes' : 'preview'}
            </button>
            {preview === i && <Preview brief={b} against={replacing ? choice.target : null} />}
          </div>
        );
      })}
      <div className="discuss-editor-actions">
        <div className="discuss-editor-pair">
          <div>
            <label className="discuss-editor-label" htmlFor="brief-up-author">Your name</label>
            <Line id="brief-up-author" value={author} onChange={setAuthorField} placeholder="optional" maxLength={40} />
          </div>
          <div>
            <label className="discuss-editor-label" htmlFor="brief-up-unit">Wing/Squadron</label>
            <Line id="brief-up-unit" value={unit} onChange={setUnit} placeholder="Whose guide this is" maxLength={40} />
          </div>
          <div>
            <label className="discuss-editor-label" htmlFor="brief-up-date">Publication date</label>
            <Line id="brief-up-date" type="date" value={date} onChange={setDate} />
          </div>
          <div>
            {/* The same choice, and the same wording, as the program dropdown in the top bar:
                it decides which tab these briefs appear on. */}
            <label className="discuss-editor-label" htmlFor="brief-up-school">School</label>
            <select
              id="brief-up-school"
              className="discuss-editor-line"
              value={program.id}
              onChange={(e) => setSchool(PROGRAMS.find((p) => p.id === e.target.value).label)}
            >
              {/* Only the schools with a Briefs tab: a brief filed under one without is a
                  brief nobody can reach. See `briefs` in programs.js. */}
              {PROGRAMS.filter((p) => p.briefs).map((p) => <option key={p.id} value={p.id}>{programName(p)}</option>)}
            </select>
          </div>
        </div>
        <div className="discuss-editor-field">
          <label className="discuss-editor-label" htmlFor="brief-up-summary">Description</label>
          <Line id="brief-up-summary" value={summary} onChange={setSummary} maxLength={200} />
        </div>
        <div className="discuss-editor-buttons">
          <button
            type="button"
            className="discuss-editor-save"
            disabled={!chosen || !unit.trim() || !date || busy}
            onClick={publishAll}
            title={!unit.trim() || !date ? 'Say whose guide this is and when it was made' : ''}
          >
            {busy ? 'Publishing…' : `Publish ${chosen === 1 ? 'it' : `these ${chosen}`}`}
          </button>
          <button type="button" className="discuss-editor-cancel" disabled={busy} onClick={() => setFound(null)}>
            Start over
          </button>
        </div>
      </div>
    </section>
  );
}

export default BriefUpload;
