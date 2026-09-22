import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getAuthor } from '../serverApi';
import { ConfirmButton } from '../discuss/edit/fields';
import { briefHistory, briefRevision, restoreBrief, fetchBrief, rememberBrief } from './briefApi';
import BriefView from './BriefView';
import { useBriefsBase } from './paths';

// One brief's revisions. Nothing is ever deleted, so this is how a bad edit is undone: view
// any version, and restore any but the newest, which publishes it again on top.

const when = (iso) => {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

function useRestore(id) {
  const base = useBriefsBase();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const restore = async (rev) => {
    setError('');
    try {
      await restoreBrief(id, rev, { author: getAuthor() });
      rememberBrief(await fetchBrief(id));
      navigate(`${base}/${id}`);
    } catch (err) {
      setError(`Not restored. ${err.message}`);
    }
  };
  return { restore, error };
}

function RevisionView({ id, rev, latestRev }) {
  const base = useBriefsBase();
  const [state, setState] = useState({ status: 'loading' });
  const { restore, error } = useRestore(id);
  useEffect(() => {
    let alive = true;
    briefRevision(id, rev).then(
      (revision) => { if (alive) setState({ status: 'ready', revision }); },
      (err) => { if (alive) setState({ status: 'error', error: err }); },
    );
    return () => { alive = false; };
  }, [id, rev]);

  if (state.status === 'loading') return <p className="brief-status">Loading version {rev}…</p>;
  if (state.status === 'error') return <p className="discuss-editor-warn">{state.error.message}</p>;
  const { revision } = state;
  return (
    <>
      <div className="discuss-revision-banner">
        <p>
          <strong>Version {rev}</strong>, {when(revision.updatedAt)}
          {revision.author ? ` by ${revision.author}` : ''}: {revision.summary || 'no summary'}.
          {' '}This is an old version; the brief on the site may differ.
        </p>
        <div className="discuss-draft-actions">
          <Link to={`${base}/${id}/history`}>Back to the history</Link>
          {rev !== latestRev && (
            <ConfirmButton
              label="Restore this version"
              question={`Publish version ${rev} again as the current brief?`}
              confirmLabel="Restore"
              onConfirm={() => restore(rev)}
            />
          )}
        </div>
        {error && <p className="discuss-editor-warn">{error}</p>}
      </div>
      <BriefView brief={revision.brief} expanded={{}} onToggle={() => {}} firstLetter={false} />
    </>
  );
}

function BriefHistory({ id, title }) {
  const base = useBriefsBase();
  const [params] = useSearchParams();
  const [state, setState] = useState({ status: 'loading' });
  const { restore, error } = useRestore(id);
  const rev = Number(params.get('rev'));

  useEffect(() => {
    let alive = true;
    briefHistory(id).then(
      (data) => { if (alive) setState({ status: 'ready', data }); },
      (err) => { if (alive) setState({ status: 'error', error: err }); },
    );
    return () => { alive = false; };
  }, [id]);

  if (state.status === 'loading') return <p className="brief-status">Loading the history…</p>;
  if (state.status === 'error') return <p className="discuss-editor-warn">{state.error.message}</p>;
  const { data } = state;

  if (Number.isInteger(rev) && rev > 0) return <RevisionView id={id} rev={rev} latestRev={data.latestRev} />;

  return (
    <div className="brief-history">
      <p className="brief-status">
        History of <Link to={`${base}/${id}`}>{title || id}</Link>.
        Restore reverts the brief to that version.
      </p>
      {error && <p className="discuss-editor-warn">{error}</p>}
      <div className="discuss-table-wrap">
        <table className="discuss-table discuss-history">
          <thead>
            <tr><th>Version</th><th>When</th><th>Who</th><th>What changed</th><th /></tr>
          </thead>
          <tbody>
            {data.revisions.map((r) => (
              <tr key={r.rev} className={r.rev === data.latestRev ? 'discuss-history-current' : undefined}>
                <td><Link to={`?rev=${r.rev}`}>{r.rev}</Link></td>
                <td>{when(r.createdAt)}</td>
                <td>{r.author || <span className="discuss-inert">anonymous</span>}</td>
                <td>{r.summary}</td>
                <td className="discuss-history-actions">
                  {r.rev === data.latestRev ? (
                    <span className="discuss-inert">current</span>
                  ) : (
                    <ConfirmButton
                      className="discuss-history-restore"
                      label="Restore"
                      question={`Publish version ${r.rev} again?`}
                      confirmLabel="Restore"
                      onConfirm={() => restore(r.rev)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BriefHistory;
