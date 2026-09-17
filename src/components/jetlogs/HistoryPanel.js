import React, { useEffect, useState } from 'react';
import { getAuthor } from '../serverApi';
import { jetLogHistory, jetLogRevision, restoreJetLog, rememberJetLog } from './jetlogApi';
import { ConfirmButton, ERROR, NOTE, PRIMARY, SECONDARY, when } from './controls';

// One jet log's revisions. Nothing is ever deleted, so this is how a wrong jet log is undone.
//
// Two different things can be done with an old revision. **Apply** puts it on the page without
// writing anything — a jet log cannot be read, only flown, so this is what "view" means here —
// and deliberately leaves the loaded revision alone, so a Replace afterwards still saves
// against the newest. **Restore** publishes it as a new revision on top, which keeps the
// history linear and leaves the restore itself undoable.

function HistoryPanel({ entry, onApply, onBack, onRestored }) {
  const [state, setState] = useState({ status: 'loading' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    jetLogHistory(entry.id).then(
      (data) => { if (alive) setState({ status: 'ready', data }); },
      (err) => { if (alive) setState({ status: 'error', error: err }); },
    );
    return () => { alive = false; };
  }, [entry.id]);

  const apply = async (rev) => {
    setBusy(`apply-${rev}`);
    setError('');
    try {
      const revision = await jetLogRevision(entry.id, rev);
      onApply(revision.log, null);
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  };

  // Restoring puts the old document back on the site, so it goes on the page too: otherwise the
  // page would still show the plan that was there a moment ago while the site showed another,
  // and the next Replace would quietly overwrite the restore.
  const restore = async (rev) => {
    setBusy(`restore-${rev}`);
    setError('');
    try {
      const out = await restoreJetLog(entry.id, rev, { author: getAuthor() });
      const record = await jetLogRevision(entry.id, out.rev);
      rememberJetLog({ ...record, id: entry.id });
      onRestored(record.log, {
        id: entry.id,
        rev: out.rev,
        name: record.log.name,
        group: record.log.group || '',
        folder: record.log.folder || '',
      });
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  };

  return (
    <div>
      <div style={{fontWeight: 'bold', fontSize: '0.9em', marginBottom: '4px'}}>
        {entry.name}
      </div>
      <div style={{...NOTE, marginTop: 0, marginBottom: '10px'}}>
        Every version ever published. Apply puts one on the page; Restore publishes it again as
        the current one.
      </div>

      {state.status === 'loading' && <div style={NOTE}>Loading…</div>}
      {state.status === 'error' && <div style={ERROR}>{state.error.message}</div>}

      {state.status === 'ready' && (
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.8em'}}>
          <tbody>
            {state.data.revisions.map((r) => {
              const current = r.rev === state.data.latestRev;
              return (
                <tr key={r.rev} style={{background: current ? '#f3f7f9' : undefined}}>
                  <td style={{padding: '5px 6px', verticalAlign: 'top', whiteSpace: 'nowrap',
                    borderTop: '1px solid #eee', color: '#666'}}>
                    {r.rev}{current && <span style={{color: '#003B4F'}}> ·now</span>}
                  </td>
                  <td style={{padding: '5px 6px', verticalAlign: 'top', borderTop: '1px solid #eee'}}>
                    <div>{r.summary || <span style={{color: '#aaa'}}>No summary</span>}</div>
                    <div style={{color: '#999', fontSize: '0.9em'}}>
                      {r.author || 'Anonymous'} · {when(r.createdAt)}
                    </div>
                  </td>
                  <td style={{padding: '5px 6px', verticalAlign: 'top', textAlign: 'right',
                    whiteSpace: 'nowrap', borderTop: '1px solid #eee'}}>
                    <button
                      type="button"
                      style={{...SECONDARY, padding: '3px 8px', fontSize: '0.95em'}}
                      disabled={!!busy}
                      onClick={() => apply(r.rev)}
                    >
                      {busy === `apply-${r.rev}` ? '…' : 'Apply'}
                    </button>
                    {!current && (
                      <span style={{marginLeft: '6px'}}>
                        <ConfirmButton
                          label="Restore"
                          question="Make this the current one?"
                          onConfirm={() => restore(r.rev)}
                          style={{...SECONDARY, padding: '3px 8px', fontSize: '0.95em'}}
                        />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {error && <div style={ERROR}>{error}</div>}

      <div style={{marginTop: '14px'}}>
        <button type="button" style={PRIMARY} onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

export default HistoryPanel;
