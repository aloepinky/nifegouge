import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FlowEditor from './FlowEditor';
import { ConfirmButton, Line } from '../edit/fields';
import { parseJppt } from '../jppt/parseJppt';
import { preparePdfWorker } from '../jppt/pdfWorker';
import { publishSyllabus, rememberSyllabus, getAuthor } from '../discussApi';
import { DISCUSS_BASE } from '../SyllabusContext';
import { useDiscussData } from '../DiscussData';
import { itemList } from '../registry';
import { protectedPhrases } from '../jppt/matchItems';

// Submit a new JPPT: pick the PDF, let the browser read it, fix the course flow, publish.
//
// Nothing leaves the browser until Publish. The PDF itself is never uploaded: it is parsed
// here, and only the generated syllabus is sent. Until then the work in progress is kept in
// localStorage, so a refresh or a closed tab does not throw away an hour of fixing arrows.

const DRAFT_KEY = 'discuss-jppt-draft';
const MAX_BYTES = 25 * 1024 * 1024;

function readDraft() {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function writeDraft(draft) {
  try {
    if (draft) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch (err) {
    // Private mode or a full quota: the upload still works, it just does not survive a refresh.
  }
}

function UploadPage() {
  const navigate = useNavigate();
  const { delta, matcher } = useDiscussData();
  const [saved, setSaved] = useState(readDraft);
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [work, setWork] = useState(null); // { name, doc, warnings }
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);

  useEffect(() => {
    if (work) writeDraft({ ...work, savedAt: new Date().toISOString() });
  }, [work]);

  const onCommit = useCallback((doc) => {
    setWork((w) => (w && w.doc !== doc ? { ...w, doc } : w));
  }, []);

  const read = async () => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError('That file is over 25 MB. A JPPT is usually 1 to 3 MB; check it is the right PDF.');
      return;
    }
    let stop = () => {};
    try {
      setProgress('Opening the PDF');
      stop = await preparePdfWorker();
      const data = await file.arrayBuffer();
      const { doc, warnings } = await parseJppt(data, setProgress, {
        matcher,
        phrases: protectedPhrases(delta.events, itemList()),
      });
      const title = name.trim() || doc.source.instruction || file.name.replace(/\.pdf$/i, '');
      setWork({ name: title, doc, warnings });
      setSaved(null);
    } catch (err) {
      setError(`This PDF could not be read. ${err.message || ''}`.trim());
    } finally {
      stop();
      setProgress(null);
    }
  };

  const publish = async (doc) => {
    const title = (work.name || '').trim();
    if (!title) {
      setPublishError('Give the syllabus a name for the dropdown first.');
      return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      const { id, rev } = await publishSyllabus(title, doc, { author: getAuthor(), summary: 'Uploaded' });
      rememberSyllabus({ id, rev, name: title, doc, updatedAt: new Date().toISOString() });
      writeDraft(null);
      navigate(`${DISCUSS_BASE}/s/${id}`);
    } catch (err) {
      setPublishError(`Not published. ${err.message} Your work is saved in this browser; try again.`);
      setPublishing(false);
    }
  };

  const discard = () => {
    writeDraft(null);
    setSaved(null);
    setWork(null);
    setFile(null);
  };

  return (
    <div className="discuss-layout discuss-layout--plain discuss-layout--wide">
      <article className="discuss-page">
        <header className="discuss-head">
          <p className="discuss-crumb"><Link to={DISCUSS_BASE}>Discussion Items</Link></p>
          <h1>Submit a new JPPT</h1>
          <p className="discuss-lede">
            Upload the JPPT PDF and its course flow chart and syllabus are generated here. Check
            the chart against the publication, fix anything the generator got wrong, then publish
            it to the syllabus list.
          </p>
        </header>

        {!work && saved && (
          <div className="discuss-editor-notice">
            <p>
              You have an unpublished upload, <strong>{saved.name}</strong>, from{' '}
              {new Date(saved.savedAt).toLocaleString()}.
            </p>
            <div className="discuss-editor-buttons">
              <button type="button" className="discuss-editor-save" onClick={() => setWork(saved)}>
                Continue it
              </button>
              <ConfirmButton
                label="Discard it"
                question="Discard the unpublished upload?"
                confirmLabel="Discard"
                className="discuss-editor-cancel"
                onConfirm={discard}
              />
            </div>
          </div>
        )}

        {!work && (
          <section className="discuss-editor discuss-upload">
            <div className="discuss-editor-field">
              <label className="discuss-editor-label" htmlFor="jppt-file">JPPT PDF</label>
              <input
                id="jppt-file"
                type="file"
                accept="application/pdf,.pdf"
                disabled={!!progress}
                onChange={(e) => setFile(e.target.files && e.target.files[0])}
              />
            </div>
            <div className="discuss-editor-field">
              <label className="discuss-editor-label" htmlFor="jppt-name">Name in the syllabus list</label>
              <p className="discuss-editor-hint">Optional now; defaults to the instruction number.</p>
              <Line id="jppt-name" value={name} onChange={setName} placeholder="e.g. Delta Primary (2025)" />
            </div>
            <div className="discuss-editor-buttons">
              <button
                type="button"
                className="discuss-editor-save"
                disabled={!file || !!progress}
                title={file ? '' : 'Choose a PDF first'}
                onClick={read}
              >
                {progress ? 'Reading…' : 'Generate'}
              </button>
              {progress && <span className="discuss-upload-progress" role="status">{progress}</span>}
            </div>
            {error && <p className="discuss-editor-warn">{error}</p>}
          </section>
        )}

        {work && (
          <>
            <div className="discuss-editor-field discuss-upload-name">
              <label className="discuss-editor-label" htmlFor="jppt-name-edit">Name in the syllabus list</label>
              <Line
                id="jppt-name-edit"
                value={work.name}
                onChange={(v) => setWork((w) => ({ ...w, name: v }))}
              />
              {work.doc.source && work.doc.source.citation && (
                <p className="discuss-editor-hint">Read from {work.doc.source.citation}.</p>
              )}
            </div>
            <FlowEditor
              initial={work.doc}
              warnings={work.warnings}
              onCommit={onCommit}
              onSave={publish}
              saveLabel="Publish"
              saving={publishing}
              error={publishError}
            >
              <ConfirmButton
                label="Start over"
                question="Discard this upload and every change to it?"
                confirmLabel="Discard"
                className="discuss-editor-cancel"
                onConfirm={discard}
              />
            </FlowEditor>
          </>
        )}
      </article>
    </div>
  );
}

export default UploadPage;
