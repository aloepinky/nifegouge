import React, { useState, useEffect, useRef } from 'react';
import { useOutdatedVotes, OutdatedBadge, OutdatedControl, readVotes } from './Outdated';
import { linkKey, isWebLink, hostOf } from './linkKey';

// The Documents and Useful Links page, one component for every school (Docs.js is NIFE's,
// TW4Docs.js Primary's). What differs is `school`:
//
//   program       the lists' `program` on the server; left out for NIFE, whose requests have
//                 never carried one
//   topics        the topic filter, `all` first
//   defaultTopic  what the upload and link forms start on
//   offerAll      whether a document or link may be filed under `all` itself
//   storage       the localStorage keys for this browser's votes, kept as each page first wrote them

// How long "Document uploaded" or "Link submitted" stays beside its button; .docs-notice fades
// it out over the last second.
const NOTICE_MS = 4000;

function DocsPage({ school }) {
  const { program, topics, defaultTopic, offerAll, storage } = school;
  const query = program ? `?program=${program}` : '';
  const pickable = offerAll ? topics : topics.filter(t => t.value !== 'all');

  // Document states
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('votes');

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewMimeType, setPreviewMimeType] = useState('');
  const [uploadTopic, setUploadTopic] = useState(defaultTopic);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkTopic, setLinkTopic] = useState(defaultTopic);

  // Links states
  const [usefulLinks, setUsefulLinks] = useState([]);

  // Messages, shown where they happened rather than in a pop-up: a form's problem inside the
  // form (which stays open), a row's problem on the row until that row is tried again, and a
  // success beside the section's button for NOTICE_MS.
  const [uploadMessage, setUploadMessage] = useState('');
  const [linkMessage, setLinkMessage] = useState('');
  const [rowMessages, setRowMessages] = useState({});
  const [notice, setNotice] = useState(null);
  const noticeTimer = useRef(null);

  const rowMessage = (id, text) => setRowMessages(prev => {
    const next = { ...prev };
    if (text) next[id] = text;
    else delete next[id];
    return next;
  });

  const announce = (section, text) => {
    clearTimeout(noticeTimer.current);
    setNotice({ section, text });
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  };

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const openUpload = () => {
    setUploadMessage('');
    setShowUploadModal(true);
  };

  const openLinkForm = () => {
    setLinkMessage('');
    setShowLinkModal(true);
  };

  // Track voted items - stores 'good', 'bad', or null
  const [votedDocs, setVotedDocs] = useState(() => readVotes(storage.votedDocs));
  const [votedLinks, setVotedLinks] = useState(() => readVotes(storage.votedLinks));

  // REACT_APP_DOCS_API points the page at tools/docs-dev-server.mjs for local work.
  const API_BASE_URL = process.env.REACT_APP_DOCS_API || 'https://ms8qwr3ond.execute-api.us-east-2.amazonaws.com/prod';

  const outdatedDocs = useOutdatedVotes({
    apiBase: API_BASE_URL, endpoint: 'vote-document', idField: 'docId',
    storageKey: storage.outdatedDocs, setItems: setDocs,
  });
  const outdatedLinks = useOutdatedVotes({
    apiBase: API_BASE_URL, endpoint: 'vote-link', idField: 'linkId',
    storageKey: storage.outdatedLinks, setItems: setUsefulLinks,
  });

  // Load both lists once, when the page opens.
  useEffect(() => {
    fetchDocuments();
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The first load shows the loading screen; a refresh keeps the lists on screen until the new
  // ones arrive, and keeps the old ones if it fails.
  const fetchDocuments = async ({ quiet = false } = {}) => {
    if (!quiet) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/get-documents${query}`);
      const data = await response.json();

      if (data.success) {
        setDocs(data.documents || []);
      } else if (!quiet) {
        setError('Failed to load documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      if (!quiet) setError('Failed to load documents');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDocuments({ quiet: true }), fetchLinks()]);
    setRefreshing(false);
  };

  const fetchLinks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get-links${query}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setUsefulLinks(data.links || []);
      }
    } catch (error) {
      console.error('Error fetching links:', error);
    }
  };

  // Documents and links filter and sort alike: the topic picked, the search, then Sort by, votes
  // breaking ties by name. Entries filed under All Topics show under every topic, below the
  // topic's own; with All Topics picked, everything is one list in Sort by order.
  const filterAndSort = (items, nameOf) => {
    const search = searchTerm.toLowerCase();
    const score = (item) => (item.upvotes || 0) - (item.downvotes || 0);
    const general = (item) => selectedTopic !== 'all' && item.topic === 'all';
    return items
      .filter(item => selectedTopic === 'all' || item.topic === selectedTopic || item.topic === 'all')
      .filter(item => !search || (nameOf(item) || '').toLowerCase().includes(search))
      .sort((a, b) => {
        if (general(a) !== general(b)) return general(a) ? 1 : -1;
        if (sortBy === 'votes' && score(a) !== score(b)) return score(b) - score(a);
        return (nameOf(a) || '').localeCompare(nameOf(b) || '');
      });
  };

  const filteredDocs = filterAndSort(docs, doc => doc.fileName);

  const filteredLinks = filterAndSort(usefulLinks, link => link.title);

  const topicLabel = (value) => topics.find(t => t.value === value)?.label || 'Other';

  const handleFileUpload = async () => {
    if (!uploadFile) {
      setUploadMessage('Choose a file to upload.');
      return;
    }

    if (uploadFile.size > 50 * 1024 * 1024) {
      setUploadMessage('Files must be under 50 MB.');
      return;
    }

    setUploadMessage('');
    setUploading(true);
    let uploadData = null;

    try {
      const response = await fetch(`${API_BASE_URL}/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadFile.name,
          mimeType: uploadFile.type,
          topic: uploadTopic,
          fileSize: uploadFile.size,
          program,
        })
      });

      const data = await response.json();

      if (!data.success || !data.uploadUrl) {
        throw new Error(data.error || 'Failed to get upload URL');
      }

      uploadData = data;

      const uploadResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        body: uploadFile,
        headers: { 'Content-Type': uploadFile.type || 'application/octet-stream' }
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to S3');
      }

      const confirmResponse = await fetch(`${API_BASE_URL}/confirm-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: uploadData.docId,
          s3Key: uploadData.s3Key,
          metadata: {
            ...uploadData.metadata,
            uploadedBy: 'anonymous',
            program,
          }
        })
      });

      const confirmData = await confirmResponse.json();

      if (confirmData.success) {
        setUploadFile(null);
        setUploadTopic(defaultTopic);
        setShowUploadModal(false);
        announce('docs', 'Document uploaded.');
        fetchDocuments({ quiet: true });
      } else {
        console.error('Failed to confirm upload:', confirmData.error);
        setUploadMessage('The file uploaded but was not added to the list. Try again.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadMessage('The upload did not go through. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const openPreview = async (doc, forceNewTab = false) => {
    rowMessage(doc.docId, '');
    try {
      const response = await fetch(`${API_BASE_URL}/get-document-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: doc.docId, program })
      });

      const data = await response.json();

      if (data.success) {
        const canPreview = canPreviewFile(doc.fileName, doc.mimeType);

        if (!forceNewTab && canPreview) {
          setPreviewUrl(data.url);
          setPreviewFileName(doc.fileName);
          setPreviewMimeType(doc.mimeType);
          setShowPreviewModal(true);
        } else {
          window.open(data.url, '_blank');
        }
      } else {
        rowMessage(doc.docId, 'That document would not open. Try again.');
      }
    } catch (error) {
      console.error('Error getting document URL:', error);
      rowMessage(doc.docId, 'That document would not open. Try again.');
    }
  };

  const canPreviewFile = (fileName, mimeType) => {
    if (!fileName) return false;

    const ext = fileName.split('.').pop().toLowerCase();
    const previewableExtensions = [
      'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
      'txt', 'json', 'xml', 'csv', 'md', 'html', 'htm'
    ];

    const previewableMimeTypes = ['application/pdf', 'image/', 'text/'];

    const canPreviewByExt = previewableExtensions.includes(ext);
    const canPreviewByMime = mimeType && previewableMimeTypes.some(type => mimeType.includes(type));

    return canPreviewByExt || canPreviewByMime;
  };

  const handleLinkSubmission = async () => {
    if (!linkUrl || !linkTitle) {
      setLinkMessage('Fill in the link and its title.');
      return;
    }

    if (!isWebLink(linkUrl)) {
      setLinkMessage('Links start with http:// or https://');
      return;
    }

    // The server refuses a duplicate too; checking here says so before the round trip.
    const key = linkKey(linkUrl);
    const existing = usefulLinks.find(link => linkKey(link.url) === key);
    if (existing) {
      setLinkMessage(`Already listed as "${existing.title}".`);
      return;
    }

    setLinkMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/submit-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: linkUrl,
          title: linkTitle,
          topic: linkTopic,
          submittedBy: 'anonymous',
          program,
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLinkUrl('');
        setLinkTitle('');
        setLinkTopic(defaultTopic);
        setShowLinkModal(false);
        announce('links', 'Link submitted.');
        fetchLinks();
      } else if (response.status === 409) {
        setLinkMessage(`${data.error}.`);
      } else {
        setLinkMessage(data.error ? `${data.error}.` : 'The link did not go through. Try again.');
      }
    } catch (error) {
      console.error('Error submitting link:', error);
      setLinkMessage('The link did not go through. Try again.');
    }
  };

  const sendVote = async (endpoint, id, voteType) => {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...id, voteType, program })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || 'Vote failed');
  };

  // Good/bad gouge. A browser holds at most one vote per entry: clicking it again takes it back,
  // and clicking the other one moves it. The server only counts, so taking a vote back sends
  // the opposite vote and moving one sends the new vote twice. The page shows the vote at once
  // and puts back whatever the server did not count.
  const vote = async (kind, key, choice) => {
    const docs = kind === 'docs';
    const voted = docs ? votedDocs : votedLinks;
    const setVoted = docs ? setVotedDocs : setVotedLinks;
    const setItems = docs ? setDocs : setUsefulLinks;
    const storageKey = docs ? storage.votedDocs : storage.votedLinks;
    const idOf = docs ? (d) => d.docId : (l) => l.linkId;
    const send = (type) => (docs
      ? sendVote('vote-document', { docId: key }, type)
      : sendVote('vote-link', { linkId: key }, type));
    const opposite = choice === 'good' ? 'bad' : 'good';

    const currentVote = voted[key];
    const isUnvoting = currentVote === choice;

    // Moves this browser's vote for the entry from `from` to `to` (either may be none), on
    // screen and in storage.
    const show = (from, to) => {
      setVoted(prev => {
        const next = { ...prev };
        if (to) next[key] = to;
        else delete next[key];
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Only this browser's memory of the vote is lost.
        }
        return next;
      });
      const shift = { upvotes: 0, downvotes: 0 };
      if (from) shift[from === 'good' ? 'upvotes' : 'downvotes'] -= 1;
      if (to) shift[to === 'good' ? 'upvotes' : 'downvotes'] += 1;
      setItems(prev => prev.map(item => (idOf(item) !== key ? item : {
        ...item,
        upvotes: (item.upvotes || 0) + shift.upvotes,
        downvotes: (item.downvotes || 0) + shift.downvotes,
      })));
    };

    rowMessage(key, '');
    const target = isUnvoting ? undefined : choice;
    show(currentVote, target);

    const sends = isUnvoting ? [opposite] : currentVote === opposite ? [choice, choice] : [choice];
    let sent = 0;
    try {
      for (const type of sends) {
        await send(type);
        sent += 1;
      }
    } catch (error) {
      console.error('Error voting:', error);
      // Nothing counted: the old vote stands. A move half sent took the old vote back and
      // stopped there.
      show(target, sent === 0 ? currentVote : undefined);
      rowMessage(key, 'That vote did not go through. Try again.');
    }
  };

  const officeIcon = (name) => <img src={`/images/Google_${name}.svg`} alt="" />;

  const getFileIcon = (mimeType, fileName) => {
    if (!mimeType && fileName) {
      const ext = fileName.split('.').pop().toLowerCase();
      if (ext === 'pdf') return '📄';
      if (['doc', 'docx'].includes(ext)) return officeIcon('Docs');
      if (['xls', 'xlsx'].includes(ext)) return officeIcon('Sheets');
      if (['ppt', 'pptx'].includes(ext)) return officeIcon('Slides');
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
      if (['mp4', 'avi', 'mov'].includes(ext)) return '🎥';
    }

    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('presentation')) return officeIcon('Slides');
    if (mimeType.includes('spreadsheet')) return officeIcon('Sheets');
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('document') || mimeType.includes('msword')) return officeIcon('Docs');
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="docs-container">
        <h1>Documents</h1>
        <div className="docs-status">
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="docs-container">
        <h1>Documents</h1>
        <div className="docs-status docs-status--error">
          <p>Error loading documents: {error}</p>
          <button onClick={() => { fetchDocuments(); fetchLinks(); }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="docs-container">
        <h1>Documents</h1>

        <div className="docs-actions">
          <button
            onClick={openUpload}
            className="submit-link-btn"
          >
            📤 Upload Document
          </button>
          {notice?.section === 'docs' && (
            <span key={notice.text} className="docs-notice" role="status">{notice.text}</span>
          )}
        </div>

        <div className="docs-filters">
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="docs-filter-select"
          >
            {topics.map(topic => (
              <option key={topic.value} value={topic.value}>
                {topic.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search documents and links..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="docs-search-input"
          />

          <button onClick={refresh} className="docs-refresh-btn" disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="docs-toolbar">
          <div className="docs-count">
            Showing {filteredDocs.length} of {docs.length} documents
          </div>
          <div className="docs-sort">
            <label htmlFor="docs-sort-select">Sort by:</label>
            <select
              id="docs-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="votes">Votes</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>

        <div className="docs-list">
          {filteredDocs.length === 0 ? (
            <div className="docs-empty">
              <p>No documents found</p>
            </div>
          ) : (
            filteredDocs.map(doc => (
              <div key={doc.docId} className="doc-item" onClick={() => openPreview(doc)}>
                <div className="doc-icon">
                  {getFileIcon(doc.mimeType, doc.fileName)}
                </div>

                <div className="doc-info">
                  <h3 className="doc-name">{doc.fileName}</h3>
                  <div className="doc-meta">
                    <span className="doc-topic-badge">
                      {topicLabel(doc.topic)}
                    </span>
                    <span className="doc-size">{formatFileSize(doc.fileSize)}</span>
                    <span className="doc-date">{formatDate(doc.uploadedAt)}</span>
                    <OutdatedBadge item={doc} />
                  </div>
                  <OutdatedControl
                    item={doc}
                    vote={outdatedDocs.votes[doc.docId]}
                    onVote={(choice, note) => outdatedDocs.cast(doc.docId, choice, note)}
                  />
                  {rowMessages[doc.docId] && (
                    <div className="docs-row-message" role="status">{rowMessages[doc.docId]}</div>
                  )}
                </div>

                <div className="doc-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openPreview(doc, true)}
                    className="doc-action-btn open-btn"
                    title="Open in new tab"
                    aria-label="Open in new tab"
                  >
                    <span aria-hidden="true">↗</span>
                  </button>
                  <button
                    onClick={() => vote('docs', doc.docId, 'good')}
                    className={`doc-action-btn good-btn ${votedDocs[doc.docId] === 'good' ? 'selected' : ''}`}
                  >
                    Good Gouge
                  </button>
                  <button
                    onClick={() => vote('docs', doc.docId, 'bad')}
                    className={`doc-action-btn bad-btn ${votedDocs[doc.docId] === 'bad' ? 'selected' : ''}`}
                  >
                    Bad Gouge
                  </button>
                  <span className={`vote-score ${(doc.upvotes || 0) - (doc.downvotes || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(doc.upvotes || 0) - (doc.downvotes || 0) >= 0 ? '+' : ''}{(doc.upvotes || 0) - (doc.downvotes || 0)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="useful-links-section">
          <h2>Useful Links</h2>
          <button
            onClick={openLinkForm}
            className="submit-link-btn"
          >
            🔗 Submit Link
          </button>
          {notice?.section === 'links' && (
            <span key={notice.text} className="docs-notice" role="status">{notice.text}</span>
          )}

          <div className="links-list">
            {filteredLinks.length === 0 ? (
              <div className="links-empty">
                <p>No links found</p>
              </div>
            ) : (
              filteredLinks.map(link => (
                <div key={link.linkId} className="link-item">
                  <div className="link-icon">🔗</div>
                  <div className="link-info">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-title"
                    >
                      {link.title}
                    </a>
                    <div className="link-meta">
                      <span className="link-topic-badge">
                        {topicLabel(link.topic)}
                      </span>
                      <span className="link-url">{hostOf(link.url)}</span>
                      <span className="link-date">{formatDate(link.submittedAt)}</span>
                      <OutdatedBadge item={link} />
                    </div>
                    <OutdatedControl
                      item={link}
                      vote={outdatedLinks.votes[link.linkId]}
                      onVote={(choice, note) => outdatedLinks.cast(link.linkId, choice, note)}
                    />
                    {rowMessages[link.linkId] && (
                      <div className="docs-row-message" role="status">{rowMessages[link.linkId]}</div>
                    )}
                  </div>
                  <div className="link-actions">
                    <button
                      onClick={() => vote('links', link.linkId, 'good')}
                      className={`link-action-btn good-btn ${votedLinks[link.linkId] === 'good' ? 'selected' : ''}`}
                    >
                      👍
                    </button>
                    <button
                      onClick={() => vote('links', link.linkId, 'bad')}
                      className={`link-action-btn bad-btn ${votedLinks[link.linkId] === 'bad' ? 'selected' : ''}`}
                    >
                      👎
                    </button>
                    <span className={`vote-score ${(link.upvotes || 0) - (link.downvotes || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {(link.upvotes || 0) - (link.downvotes || 0) >= 0 ? '+' : ''}{(link.upvotes || 0) - (link.downvotes || 0)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && setShowUploadModal(false)}>
          <div className="modal-content">
            <span className="close-button" onClick={() => setShowUploadModal(false)}>&times;</span>
            <h2>Upload Document</h2>

            <div className="docs-form-note">
              Please double check the topic is correct and the file name is clear, descriptive, and concise.
              Preference for PDFs but all file types accepted. Strong preference for computer generated files
              that can be edited. Include a link to a Google Doc/Overleaf/etc. so others can iterate
              and update your work.
            </div>

            <div className="modal-form">
              <label>
                Topic Category:
                <select
                  value={uploadTopic}
                  onChange={(e) => setUploadTopic(e.target.value)}
                  className="modal-select"
                >
                  {pickable.map(topic => (
                    <option key={topic.value} value={topic.value}>
                      {topic.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Select File:
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="modal-file-input"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                />
              </label>

              {uploadFile && (
                <div className="file-preview">
                  <p>Selected: {uploadFile.name}</p>
                  <p>Size: {formatFileSize(uploadFile.size)}</p>
                </div>
              )}

              {uploadMessage && <div className="docs-form-message" role="status">{uploadMessage}</div>}

              <button
                onClick={handleFileUpload}
                className="modal-submit-btn"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Submission Modal */}
      {showLinkModal && (
        <div className="modal" onClick={(e) => e.target.className === 'modal' && setShowLinkModal(false)}>
          <div className="modal-content">
            <span className="close-button" onClick={() => setShowLinkModal(false)}>&times;</span>
            <h2>Submit Useful Link</h2>

            <div className="docs-form-note">
              Please double check the topic is correct, the Link Title is clear, descriptive, and concise,
              and that the link is not already present.
            </div>

            <div className="modal-form">
              <label>
                Link URL:
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="modal-input"
                />
              </label>

              <label>
                Link Title:
                <input
                  type="text"
                  placeholder="Be concise and descriptive"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="modal-input"
                />
              </label>

              <label>
                Topic Category:
                <select
                  value={linkTopic}
                  onChange={(e) => setLinkTopic(e.target.value)}
                  className="modal-select"
                >
                  {pickable.map(topic => (
                    <option key={topic.value} value={topic.value}>
                      {topic.label}
                    </option>
                  ))}
                </select>
              </label>

              {linkMessage && <div className="docs-form-message" role="status">{linkMessage}</div>}

              <button
                onClick={handleLinkSubmission}
                className="modal-submit-btn"
              >
                Submit Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showPreviewModal && (
        <div className="doc-preview-modal" onClick={(e) => e.target.className === 'doc-preview-modal' && setShowPreviewModal(false)}>
          <div className="doc-preview-content">
            <div className="doc-preview-header">
              <h2>{previewFileName}</h2>
              <button
                className="doc-preview-close"
                onClick={() => setShowPreviewModal(false)}
                title="Close preview"
              >
                ×
              </button>
            </div>
            <div className="doc-preview-body">
              {previewMimeType && previewMimeType.includes('image') ? (
                <img src={previewUrl} alt={previewFileName} />
              ) : (
                <iframe src={previewUrl} title={previewFileName} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DocsPage;
