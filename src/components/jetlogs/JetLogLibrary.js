import React, { useCallback, useMemo, useState } from 'react';
import { foldersFor, groupsFrom } from './groups';
import { loadJetLog, prefetchJetLog, useJetLogIndex } from './jetlogApi';
import PublishPanel from './PublishPanel';
import HistoryPanel from './HistoryPanel';
import { ERROR, INPUT, NOTE, PRIMARY, QUIET, SECONDARY, useEscape } from './controls';

// Preset Jet Logs: the shared corpus, and the presets kept in this browser.
//
// The shared list is drawn from jetlogs/index.json, which carries only a name, a filing and a
// mode. A jet log's document is fetched when it is applied, and prefetched when a row is
// pointed at.

const OVERLAY = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const CARD = {
  background: 'white', borderRadius: '8px', padding: '24px 28px',
  minWidth: '320px', maxWidth: '460px', maxHeight: '80vh', overflowY: 'auto',
  boxShadow: '0 6px 24px rgba(0,0,0,0.3)', color: '#333',
};

const SECTION = {
  fontSize: '0.7em', fontWeight: 'bold', color: '#888', marginBottom: '6px',
  letterSpacing: '0.05em',
};

const MODE_CHIP = (mode) => ({
  fontSize: '0.65em', padding: '1px 5px', borderRadius: '3px',
  background: mode === 'VFR' ? '#1e40af' : '#444', color: 'white', flexShrink: 0,
});

function JetLogLibrary({
  onClose, onApply, onPublished, capture, loadedLog, params,
  localPresets, onSaveLocal, onDeleteLocal,
}) {
  const index = useJetLogIndex();
  const [view, setView] = useState('list');
  const [historyFor, setHistoryFor] = useState(null);
  // Which folders are open. Empty is every folder shut, which is how this list has always
  // opened: the corpus is long and a student is after one event's route.
  const [opened, setOpened] = useState(() => new Set());
  const [presetName, setPresetName] = useState('');
  const [saveError, setSaveError] = useState('');
  const [applyError, setApplyError] = useState('');
  const [applying, setApplying] = useState('');
  const [notice, setNotice] = useState('');

  useEscape(onClose);

  const logs = index.logs;

  // Folders start collapsed, as they always have: the corpus is long and a student is after
  // one event's route.
  const tree = useMemo(() => groupsFrom(logs).map((group) => ({
    group,
    folders: foldersFor(group, logs).map((folder) => ({
      folder,
      key: `${group}/${folder}`,
      logs: logs
        .filter((l) => (l.group || '') === group && (l.folder || '') === folder)
        .sort((a, b) => a.name.localeCompare(b.name)),
    })),
  })), [logs]);

  const isOpen = useCallback((key) => opened.has(key), [opened]);

  const toggle = (key) => setOpened((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const apply = async (entry) => {
    setApplying(entry.id);
    setApplyError('');
    try {
      const record = await loadJetLog(entry.id);
      if (!record) {
        setApplyError(`${entry.name} could not be found on the server.`);
        setApplying('');
        return;
      }
      onApply(record.log, {
        id: entry.id,
        rev: record.rev,
        name: record.log.name,
        group: record.log.group || '',
        folder: record.log.folder || '',
      });
    } catch (err) {
      setApplyError(err.message);
      setApplying('');
    }
  };

  const saveLocal = () => {
    const problem = onSaveLocal(presetName);
    setSaveError(problem || '');
    if (!problem) setPresetName('');
  };

  // The jet log on screen is now that record's newest revision, so the page adopts it and a
  // second Replace saves against the right revision. Nothing is re-applied: the plan on screen
  // is already what was published.
  const published = (meta) => {
    index.reload();
    setView('list');
    setNotice(`Published. "${meta.name}" is on the site.`);
    onPublished(meta);
  };

  let body;
  if (view === 'publish' || view === 'replace') {
    body = (
      <PublishPanel
        mode={view}
        loadedLog={loadedLog}
        logs={logs}
        params={params}
        capture={capture}
        onDone={published}
        onBack={() => setView('list')}
      />
    );
  } else if (view === 'history') {
    body = (
      <HistoryPanel
        entry={historyFor}
        onApply={onApply}
        onBack={() => setView('list')}
        // Applying closes the library, so the restored jet log is what is on screen.
        onRestored={(log, meta) => { index.reload(); onApply(log, meta); }}
      />
    );
  } else {
    body = (
      <>
        <div style={SECTION}>SHARED JET LOGS</div>

        {index.status === 'loading' && <div style={QUIET}>Loading…</div>}
        {index.status === 'error' && (
          <div style={ERROR}>
            The shared jet logs could not be loaded. {index.error.message}{' '}
            <button type="button" style={{...SECONDARY, padding: '2px 8px'}} onClick={index.reload}>
              Try again
            </button>
          </div>
        )}

        {index.status === 'ready' && tree.map(({ group, folders }) => (
          <div key={group} style={{marginBottom: '8px'}}>
            <div style={{fontSize: '0.78em', fontWeight: 'bold', color: '#003B4F',
              padding: '3px 2px'}}>
              {group}
            </div>
            {!folders.length && <div style={{...QUIET, paddingLeft: '10px'}}>None yet.</div>}
            {folders.map(({ folder, key, logs: rows }) => (
              <div key={key} style={{marginBottom: '2px', paddingLeft: '10px'}}>
                <div
                  onClick={() => toggle(key)}
                  style={{display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                    fontSize: '0.78em', fontWeight: '600', color: '#444', padding: '3px 2px',
                    userSelect: 'none', borderRadius: '3px'}}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                >
                  <span style={{fontSize: '0.85em', width: '8px', display: 'inline-block'}}>
                    {isOpen(key) ? '▾' : '▸'}
                  </span>
                  {folder}
                  <span style={{color: '#aaa', fontWeight: 'normal'}}>({rows.length})</span>
                </div>
                {isOpen(key) && (
                  <div style={{marginTop: '2px'}}>
                    {rows.map((entry) => (
                      <div
                        key={entry.id}
                        style={{display: 'flex', alignItems: 'center', gap: '8px',
                          marginBottom: '4px', padding: '2px 0 2px 14px'}}
                        onPointerEnter={() => prefetchJetLog(entry.id)}
                      >
                        <span style={MODE_CHIP(entry.mode)}>{entry.mode}</span>
                        <span
                          style={{fontSize: '0.85em', cursor: 'pointer', flex: 1}}
                          onClick={() => apply(entry)}
                        >
                          {entry.name}
                          {applying === entry.id && <span style={{color: '#999'}}> …</span>}
                        </span>
                        <button
                          type="button"
                          style={{background: 'none', border: 'none', color: '#999',
                            fontSize: '0.7em', cursor: 'pointer', padding: '2px 4px'}}
                          title={`Every version of ${entry.name}`}
                          onClick={() => { setHistoryFor(entry); setView('history'); }}
                        >
                          history
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {applyError && <div style={ERROR}>{applyError}</div>}

        <hr style={{margin: '10px 0', borderColor: '#e5e7eb'}} />

        <div style={SECTION}>MY JET LOGS</div>
        <div style={{...QUIET, marginBottom: '6px'}}>Kept in this browser only.</div>
        {localPresets.length === 0 && <div style={QUIET}>None saved yet.</div>}
        {localPresets.map((p) => (
          <div key={p.id} style={{display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '6px', padding: '3px 0'}}>
            <span style={MODE_CHIP(p.mode)}>{p.mode}</span>
            <span
              style={{flex: 1, fontSize: '0.85em', cursor: 'pointer'}}
              onClick={() => onApply(p, null)}
            >
              {p.name}
            </span>
            <button
              type="button"
              onClick={() => onDeleteLocal(p.id)}
              style={{fontSize: '0.7em', padding: '1px 5px', background: '#fee2e2',
                border: '1px solid #fca5a5', borderRadius: '3px', cursor: 'pointer',
                flexShrink: 0}}
            >
              ✕
            </button>
          </div>
        ))}

        <hr style={{margin: '12px 0', borderColor: '#e5e7eb'}} />

        <div style={{fontSize: '0.75em', color: '#666', marginBottom: '6px'}}>
          Save the jet log on screen:
        </div>
        <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>
          <input
            value={presetName}
            onChange={(e) => { setPresetName(e.target.value); setSaveError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') saveLocal(); }}
            placeholder="Name…"
            style={{...INPUT, flex: 1, minWidth: '120px'}}
          />
          <button type="button" style={SECONDARY} onClick={saveLocal}>Keep in this browser</button>
        </div>
        {saveError && <div style={ERROR}>{saveError}</div>}

        <div style={{display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap'}}>
          <button type="button" style={PRIMARY} onClick={() => setView('publish')}>
            Publish to shared…
          </button>
          {loadedLog && (
            <button type="button" style={SECONDARY} onClick={() => setView('replace')}>
              Replace "{loadedLog.name}"…
            </button>
          )}
        </div>
        <div style={NOTE}>
          Publishing puts a jet log on the site for everyone. Replacing keeps every earlier
          version in its history.
        </div>
      </>
    );
  }

  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={CARD} onClick={(e) => e.stopPropagation()}>
        <div style={{fontWeight: 'bold', fontSize: '1em', marginBottom: '14px',
          textAlign: 'center', letterSpacing: '0.05em'}}>
          JET LOGS
        </div>
        {notice && view === 'list' && (
          <div style={{fontSize: '0.8em', color: '#166534', marginBottom: '10px'}}>{notice}</div>
        )}
        {body}
      </div>
    </div>
  );
}

export default JetLogLibrary;
