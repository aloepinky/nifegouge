import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FlowEditor from './FlowEditor';
import { ConfirmButton, Line } from '../edit/fields';
import { getSyllabus, rememberSyllabus, saveSyllabus, getAuthor } from '../discussApi';
import { DISCUSS_BASE, DELTA_ID } from '../SyllabusContext';

// Correct a syllabus's course flow — Delta Primary's or an uploaded one. Anyone can; every
// save is a new revision, so a bad one can be rolled back. An unsaved edit is kept in this
// browser against the revision it started from, and a save that would overwrite someone
// else's newer revision is refused.

const baseFor = (id) => (id === DELTA_ID ? DISCUSS_BASE : `${DISCUSS_BASE}/s/${id}`);

const draftKey = (id) => `discuss-flow-draft-${id}`;

function readDraft(id, rev) {
  try {
    const raw = window.localStorage.getItem(draftKey(id));
    const draft = raw ? JSON.parse(raw) : null;
    return draft && draft.baseRev === rev ? draft : null;
  } catch (err) {
    return null;
  }
}

function writeDraft(id, draft) {
  try {
    if (draft) window.localStorage.setItem(draftKey(id), JSON.stringify(draft));
    else window.localStorage.removeItem(draftKey(id));
  } catch (err) {
    // Not fatal: the edit just does not survive a refresh.
  }
}

function EditFlowPage({ record: initialRecord }) {
  const navigate = useNavigate();
  const [record, setRecord] = useState(initialRecord);
  const [draft] = useState(() => readDraft(initialRecord.id, initialRecord.rev));
  const [name, setName] = useState((draft && draft.name) || record.name);
  const [editorKey, setEditorKey] = useState(0);
  const [initialDoc, setInitialDoc] = useState((draft && draft.doc) || record.doc);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(false);
  const base = baseFor(record.id);

  const onCommit = useCallback((doc) => {
    if (doc === record.doc) return;
    writeDraft(record.id, { baseRev: record.rev, doc, name });
  }, [name, record.doc, record.id, record.rev]);

  const save = async (doc) => {
    setSaving(true);
    setError(null);
    try {
      const { rev } = await saveSyllabus(record.id, record.rev, doc, name.trim() || record.name, {
        author: getAuthor(),
        summary: 'Edited the course flow',
      });
      rememberSyllabus({ ...record, rev, doc, name: name.trim() || record.name });
      writeDraft(record.id, null);
      navigate(base);
    } catch (err) {
      if (err.status === 409) {
        setConflict(true);
        setError('Someone saved a newer version of this flow while you were editing. Your changes are kept in this browser.');
      } else {
        setError(`Not saved. ${err.message}`);
      }
      setSaving(false);
    }
  };

  const loadNewest = async () => {
    try {
      const newest = await getSyllabus(record.id);
      if (!newest) throw new Error('It is no longer published.');
      rememberSyllabus(newest);
      writeDraft(record.id, null);
      setRecord(newest);
      setName(newest.name);
      setInitialDoc(newest.doc);
      setEditorKey((k) => k + 1);
      setConflict(false);
      setError(null);
    } catch (err) {
      setError(`Could not load the newest version. ${err.message}`);
    }
  };

  return (
    <div className="discuss-layout discuss-layout--plain discuss-layout--wide">
      <article className="discuss-page">
        <header className="discuss-head">
          <p className="discuss-crumb"><Link to={base}>{record.name}</Link></p>
          <h1>Edit the course flow</h1>
          <p className="discuss-lede">
            Revision {record.rev}. Fix the chart to match the publication; saving publishes it
            for everyone.
          </p>
        </header>

        {draft && editorKey === 0 && (
          <p className="discuss-editor-hint">Restored your unsaved changes from this browser.</p>
        )}

        <div className="discuss-editor-field discuss-upload-name">
          <label className="discuss-editor-label" htmlFor="flow-name">Name in the syllabus list</label>
          <Line id="flow-name" value={name} onChange={setName} />
        </div>

        <FlowEditor
          key={editorKey}
          initial={initialDoc}
          onCommit={onCommit}
          onSave={save}
          saveLabel="Save"
          saving={saving}
          error={error}
        >
          {conflict && (
            <ConfirmButton
              label="Load the newest version"
              question="Discard your changes and load it?"
              confirmLabel="Load it"
              className="discuss-editor-cancel"
              onConfirm={loadNewest}
            />
          )}
          <ConfirmButton
            label="Discard changes"
            question="Discard your unsaved changes?"
            confirmLabel="Discard"
            className="discuss-editor-cancel"
            onConfirm={() => {
              writeDraft(record.id, null);
              navigate(base);
            }}
          />
        </FlowEditor>
      </article>
    </div>
  );
}

export default EditFlowPage;
