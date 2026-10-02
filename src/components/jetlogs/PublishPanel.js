import React, { useState } from 'react';
import { getAuthor, setAuthor } from '../serverApi';
import { GROUP_NAMES, folderOptions } from './groups';
import { describeParams } from './params';
import { publishJetLog, saveJetLog } from './jetlogApi';
import {
  ConfirmButton, ERROR, Field, INPUT, LABEL, NOTE, PRIMARY, SECONDARY,
} from './controls';

// Publishing a new jet log, and replacing one that is already shared. One panel: the two
// differ only in whether there is a revision to save against.
//
// The name is saved before the request goes out, so it is still remembered when a publish
// fails and the person tries again.

// The sentinel the two dropdowns use for their "new one" row. It can never collide with a
// real name, which is what lets a group or folder be called anything at all.
const NEW = '__new__';

function PublishPanel({ mode, loadedLog, logs, params, capture, onDone, onBack }) {
  const replacing = mode === 'replace';
  const [name, setName] = useState(replacing ? loadedLog.name : '');
  const [group, setGroup] = useState(replacing ? loadedLog.group || '' : GROUP_NAMES[0]);
  const [newGroup, setNewGroup] = useState('');
  const [folder, setFolder] = useState(replacing ? loadedLog.folder || '' : '');
  const [newFolder, setNewFolder] = useState('');
  const [author, setAuthorField] = useState(getAuthor);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(null);

  // The known groups plus any the corpus has grown, so a group somebody else invented is
  // pickable rather than something you have to spell again.
  const groupNames = [...new Set([...GROUP_NAMES, ...logs.map((l) => l.group).filter(Boolean)])];
  const chosenGroup = group === NEW ? newGroup.trim() : group;
  const folders = folderOptions(chosenGroup, logs);
  const chosenFolder = folder === NEW ? newFolder.trim() : folder;

  // Replacing with a different filing moves the jet log. Said out loud, because Replace on its
  // own does not suggest it, and the record leaves its old folder when it happens.
  const moving = replacing && (
    chosenGroup !== (loadedLog.group || '') || chosenFolder !== (loadedLog.folder || '')
  );

  const ready = name.trim() && chosenGroup && chosenFolder && summary.trim() && !busy;
  const riding = describeParams(params);

  // A publish that would make a second jet log of the same name in the same folder is usually
  // a Replace the person did not realise they wanted. Said, not blocked: two folders may
  // legitimately hold the same name.
  const twin = !replacing && logs.find((l) => (
    l.name.toLowerCase() === name.trim().toLowerCase()
    && (l.group || '') === chosenGroup
    && (l.folder || '') === chosenFolder
  ));

  const send = async (baseRev) => {
    const log = capture({
      id: replacing ? loadedLog.id : undefined,
      name: name.trim(),
      group: chosenGroup,
      folder: chosenFolder,
    });
    setAuthor(author.trim());
    return baseRev == null
      ? publishJetLog(log, { author: author.trim(), summary: summary.trim() })
      : saveJetLog(loadedLog.id, baseRev, log, { author: author.trim(), summary: summary.trim() });
  };

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      const out = await send(replacing ? loadedLog.rev : null);
      onDone({
        id: out.id,
        rev: out.rev,
        name: name.trim(),
        group: chosenGroup,
        folder: chosenFolder,
      });
    } catch (err) {
      if (err.status === 409) {
        setConflict(err.data && err.data.rev);
        setBusy(false);
        return;
      }
      setError(`Not published. ${err.message}`);
      setBusy(false);
    }
  };

  // Someone else got there first. There is nothing to merge in a jet log — the flight plan on
  // screen is the whole document — so overwriting is offered rather than "load theirs and redo
  // your edits", which cannot be done here. History keeps their revision either way.
  const overwrite = async () => {
    setBusy(true);
    setError('');
    try {
      const out = await send(conflict);
      onDone({
        id: out.id, rev: out.rev, name: name.trim(), group: chosenGroup, folder: chosenFolder,
      });
    } catch (err) {
      setError(`Not published. ${err.message}`);
      setBusy(false);
      setConflict(null);
    }
  };

  if (conflict) {
    return (
      <div>
        <div style={{fontWeight: 'bold', fontSize: '0.9em', marginBottom: '8px'}}>
          Somebody published this jet log while you had it open
        </div>
        <div style={NOTE}>
          Revision {conflict} is on the site now. Your flight plan on screen is untouched.
          Publishing yours keeps theirs in the history, where it can be restored.
        </div>
        <div style={{display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap'}}>
          <ConfirmButton
            label="Publish mine over it"
            question={`Publish over revision ${conflict}?`}
            onConfirm={overwrite}
            style={PRIMARY}
          />
          <button type="button" style={SECONDARY} onClick={onBack}>Leave it</button>
        </div>
        {error && <div style={ERROR}>{error}</div>}
      </div>
    );
  }

  return (
    <div>
      {/* No heading here: the card's own title says which of the two this is. */}
      <Field label="Name">
        <input
          style={INPUT}
          value={name}
          maxLength={60}
          placeholder="Delta I3101"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Group">
        <select
          style={INPUT}
          value={groupNames.includes(group) ? group : NEW}
          onChange={(e) => { setGroup(e.target.value); setFolder(''); setNewFolder(''); }}
        >
          {groupNames.map((g) => <option key={g} value={g}>{g}</option>)}
          <option value={NEW}>New Group…</option>
        </select>
        {group === NEW && (
          <input
            style={{...INPUT, marginTop: '4px'}}
            value={newGroup}
            maxLength={40}
            placeholder="Name of the new group"
            autoFocus
            onChange={(e) => setNewGroup(e.target.value)}
          />
        )}
      </Field>

      <Field label="Folder">
        <select
          style={INPUT}
          value={folder === NEW || folders.includes(folder) ? folder : ''}
          onChange={(e) => setFolder(e.target.value)}
        >
          {/* Nothing is chosen until it is chosen. Defaulting to the first folder files a jet
              log somewhere nobody picked, and defaulting to New Folder hides the list. */}
          <option value="" disabled>Choose a folder…</option>
          {folders.map((f) => <option key={f} value={f}>{f}</option>)}
          <option value={NEW}>New Folder…</option>
        </select>
        {folder === NEW && (
          <input
            style={{...INPUT, marginTop: '4px'}}
            value={newFolder}
            maxLength={40}
            placeholder="Name of the new folder"
            autoFocus
            onChange={(e) => setNewFolder(e.target.value)}
          />
        )}
      </Field>

      {moving && (
        <div style={{...NOTE, marginTop: 0, marginBottom: '12px'}}>
          This also moves it out of {loadedLog.group} / {loadedLog.folder}. The jet log keeps its
          history; it just stops being listed there.
        </div>
      )}

      <Field label="Your name (optional)">
        <input
          style={INPUT}
          value={author}
          maxLength={40}
          onChange={(e) => setAuthorField(e.target.value)}
        />
      </Field>

      <Field label={replacing ? 'What changed' : 'Brief description'}>
        <input
          style={INPUT}
          value={summary}
          maxLength={200}
          placeholder={replacing ? 'New KRKP arrival' : 'Route for the new scenario'}
          onChange={(e) => setSummary(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
      </Field>

      {riding && (
        <div style={NOTE}>
          Saved with this route: {riding}. Your start fuel, STTO and reserve stay yours.
        </div>
      )}

      {twin && (
        <div style={NOTE}>
          There is already a jet log called "{twin.name}" in {chosenGroup} / {chosenFolder}.
          Publishing makes a second one; Replace changes that one.
        </div>
      )}

      <div style={{display: 'flex', gap: '8px', marginTop: '14px', alignItems: 'center'}}>
        <button
          type="button"
          style={{...PRIMARY, opacity: ready ? 1 : 0.5, cursor: ready ? 'pointer' : 'default'}}
          disabled={!ready}
          title={ready ? undefined : `A name, a folder and a ${replacing ? 'line about what changed' : 'brief description'}`}
          onClick={submit}
        >
          {busy ? 'Publishing…' : replacing ? 'Replace' : 'Publish'}
        </button>
        <button type="button" style={SECONDARY} onClick={onBack}>Cancel</button>
      </div>

      <div style={{...LABEL, marginTop: '10px', color: '#999'}}>
        Publishes permanently on the site for anyone to see.
      </div>

      {error && <div style={ERROR}>{error}</div>}
    </div>
  );
}

export default PublishPanel;
