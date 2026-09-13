import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ItemPage from './ItemPage';
import { ConfirmButton } from './edit/fields';
import { itemHistory, itemRevision, restoreItem, refreshItem, getAuthor } from './discussApi';
import { getItemMeta } from './registry';
import { DISCUSS_BASE } from './SyllabusContext';

// Every revision of one page, newest first, with what changed and who changed it. Any
// revision can be viewed as the page it was, and any but the newest restored — which is a
// new revision whose content is the old one, so history stays a straight line.

function when(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function RevisionView({ slug, rev, latestRev, onRestore, restoring, error }) {
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    itemRevision(slug, rev).then(
      (revision) => { if (live) setState({ status: 'ready', revision }); },
      (err) => { if (live) setState({ status: 'error', error: err }); },
    );
    return () => { live = false; };
  }, [slug, rev]);

  if (state.status === 'loading') {
    return (
      <div className="discuss-layout discuss-layout--plain">
        <article className="discuss-page"><p className="discuss-empty">Loading revision {rev}…</p></article>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="discuss-layout discuss-layout--plain">
        <article className="discuss-page">
          <header className="discuss-head">
            <h1>No such revision</h1>
            <p className="discuss-lede">{state.error.message} <Link to={`${DISCUSS_BASE}/${slug}/history`}>Back to the history</Link></p>
          </header>
        </article>
      </div>
    );
  }
  const { revision } = state;
  const banner = (
    <div className="discuss-revision-banner">
      <p>
        <strong>Revision {rev} of {latestRev}</strong>, saved {when(revision.createdAt)}
        {revision.author ? ` by ${revision.author}` : ''}
        {revision.summary ? `: ${revision.summary}` : ''}.
        {rev === latestRev ? ' This is the current page.' : ' The current page may differ.'}
      </p>
      <div className="discuss-draft-actions">
        <Link to={`${DISCUSS_BASE}/${slug}/history`}>All revisions</Link>
        <Link to={`${DISCUSS_BASE}/${slug}`}>Current page</Link>
        {rev !== latestRev && (
          <ConfirmButton
            label={restoring ? 'Restoring…' : 'Restore this revision'}
            question={`Publish revision ${rev} as the current page?`}
            confirmLabel="Restore"
            onConfirm={() => onRestore(rev)}
          />
        )}
      </div>
      {error && <p className="discuss-editor-warn">{error}</p>}
    </div>
  );
  return (
    <ItemPage
      key={`${slug}@${rev}`}
      record={{ slug, rev, item: revision.item, author: revision.author, updatedAt: revision.createdAt }}
      readOnly
      banner={banner}
    />
  );
}

function HistoryPage({ slug }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const rev = Number(params.get('rev')) || null;
  const [state, setState] = useState({ status: 'loading' });
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState(null);
  const meta = getItemMeta(slug);

  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    itemHistory(slug).then(
      (data) => { if (live) setState({ status: 'ready', data }); },
      (err) => { if (live) setState({ status: err.status === 404 ? 'missing' : 'error', error: err }); },
    );
    return () => { live = false; };
  }, [slug]);

  const restore = async (target) => {
    setRestoring(true);
    setError(null);
    try {
      await restoreItem(slug, target, { author: getAuthor() });
      await refreshItem(slug);
      navigate(`${DISCUSS_BASE}/${slug}`);
    } catch (err) {
      setError(`Not restored. ${err.message}`);
      setRestoring(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <div className="discuss-layout discuss-layout--plain">
        <article className="discuss-page"><p className="discuss-empty">Loading history…</p></article>
      </div>
    );
  }
  if (state.status !== 'ready') {
    return (
      <div className="discuss-layout discuss-layout--plain">
        <article className="discuss-page">
          <header className="discuss-head">
            <h1>{state.status === 'missing' ? 'No such discussion item' : 'Could not load the history'}</h1>
            <p className="discuss-lede">
              {state.status === 'error' ? `${state.error.message} ` : ''}
              <Link to={DISCUSS_BASE}>Back to all discussion items</Link>
            </p>
          </header>
        </article>
      </div>
    );
  }

  const { data } = state;
  if (rev) {
    return (
      <RevisionView
        slug={slug}
        rev={rev}
        latestRev={data.latestRev}
        onRestore={restore}
        restoring={restoring}
        error={error}
      />
    );
  }

  const title = meta ? meta.title : slug;
  return (
    <div className="discuss-layout discuss-layout--plain">
      <article className="discuss-page">
        <header className="discuss-head">
          <p className="discuss-crumb"><Link to={`${DISCUSS_BASE}/${slug}`}>{title}</Link></p>
          <h1>History</h1>
          <p className="discuss-lede">
            {data.revisions.length} revision{data.revisions.length === 1 ? '' : 's'}. View any of them as the
            page it was; restoring one publishes it again as a new revision.
          </p>
        </header>
        {error && <p className="discuss-editor-warn">{error}</p>}
        <div className="discuss-table-wrap">
          <table className="discuss-table discuss-history">
            <thead>
              <tr>
                <th scope="col">Rev</th>
                <th scope="col">Saved</th>
                <th scope="col">By</th>
                <th scope="col">What changed</th>
                <th scope="col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.revisions.map((r) => (
                <tr key={r.rev} className={r.rev === data.latestRev ? 'discuss-history-current' : undefined}>
                  <th scope="row">{r.rev}</th>
                  <td>{when(r.createdAt)}</td>
                  <td>{r.author || <span className="discuss-inert">anonymous</span>}</td>
                  <td>{r.summary}</td>
                  <td className="discuss-history-actions">
                    <Link to={`${DISCUSS_BASE}/${slug}/history?rev=${r.rev}`}>view</Link>
                    {r.rev !== data.latestRev && (
                      <ConfirmButton
                        label={restoring ? 'restoring…' : 'restore'}
                        question={`Publish revision ${r.rev} as the current page?`}
                        confirmLabel="Restore"
                        className="discuss-history-restore"
                        onConfirm={() => restore(r.rev)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

export default HistoryPage;
