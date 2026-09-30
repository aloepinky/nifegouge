import React, { useState, useEffect } from 'react';
import { useOutdatedVotes, OutdatedBadge, OutdatedControl } from './Outdated';

// The Documents and Useful Links page, one component for every school (Docs.js is NIFE's,
// TW4Docs.js Primary's). What differs is `school`:
//
//   program       the lists' `program` on the server; left out for NIFE, whose requests have
//                 never carried one
//   topics        the topic filter, `all` first
//   defaultTopic  what the upload and link forms start on
//   offerAll      whether a document or link may be filed under `all` itself
//   storage       the localStorage keys for this browser's votes, kept as each page first wrote them

function DocsPage({ school }) {
  const { program, topics, defaultTopic, offerAll, storage } = school;
  const query = program ? `?program=${program}` : '';
  const pickable = offerAll ? topics : topics.filter(t => t.value !== 'all');

  // Document states
  const [docs, setDocs] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
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
  const [filteredLinks, setFilteredLinks] = useState([]);

  // Track voted items - stores 'good', 'bad', or null
  const [votedDocs, setVotedDocs] = useState(() => {
    const saved = localStorage.getItem(storage.votedDocs);
    return saved ? JSON.parse(saved) : {};
  });
  const [votedLinks, setVotedLinks] = useState(() => {
    const saved = localStorage.getItem(storage.votedLinks);
    return saved ? JSON.parse(saved) : {};
  });

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

  useEffect(() => {
    fetchDocuments();
    fetchLinks();
  }, []);

  useEffect(() => {
    filterDocuments();
    filterLinks();
  }, [docs, selectedTopic, searchTerm, sortBy]);

  useEffect(() => {
    filterLinks();
  }, [usefulLinks, selectedTopic, searchTerm]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/get-documents${query}`);
      const data = await response.json();

      if (data.success) {
        setDocs(data.documents || []);
      } else {
        setError('Failed to load documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
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

  const filterDocuments = () => {
    let filtered = [...docs];

    if (selectedTopic !== 'all') {
      filtered = filtered.filter(doc => doc.topic === selectedTopic || doc.topic === 'all');
    }

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        (doc.fileName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      if (a.topic === 'all' && b.topic !== 'all') return 1;
      if (a.topic !== 'all' && b.topic === 'all') return -1;

      if (sortBy === 'votes') {
        const aVotes = (a.upvotes || 0) - (a.downvotes || 0);
        const bVotes = (b.upvotes || 0) - (b.downvotes || 0);
        if (aVotes !== bVotes) return bVotes - aVotes;
        return (a.fileName || '').localeCompare(b.fileName || '');
      } else if (sortBy === 'alphabetical') {
        return (a.fileName || '').localeCompare(b.fileName || '');
      }

      return 0;
    });

    setFilteredDocs(filtered);
  };

  const filterLinks = () => {
    let filtered = [...usefulLinks];

    if (selectedTopic !== 'all') {
      filtered = filtered.filter(link => link.topic === selectedTopic || link.topic === 'all');
    }

    if (searchTerm) {
      filtered = filtered.filter(link =>
        link.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLinks(filtered);
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      alert('Please select a file');
      return;
    }

    if (uploadFile.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

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
        alert('Document uploaded successfully!');
        setUploadFile(null);
        setUploadTopic(defaultTopic);
        setShowUploadModal(false);
        fetchDocuments();
      } else {
        console.error('Failed to confirm upload:', confirmData.error);
        alert('Document uploaded but failed to save metadata. Please contact support.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const openPreview = async (doc, forceNewTab = false) => {
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
        alert('Failed to open document');
      }
    } catch (error) {
      console.error('Error getting document URL:', error);
      alert('Failed to open document');
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
      alert('Please fill in all fields');
      return;
    }

    try {
      new URL(linkUrl);
    } catch (e) {
      alert('Please enter a valid URL');
      return;
    }

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
        alert('Link submitted successfully!');
        setLinkUrl('');
        setLinkTitle('');
        setLinkTopic(defaultTopic);
        setShowLinkModal(false);
        fetchLinks();
      } else {
        alert('Failed to submit link: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error submitting link:', error);
      alert('Failed to submit link. Please try again.');
    }
  };

  const voteOnDocument = async (docId, voteType) => {
    try {
      await fetch(`${API_BASE_URL}/vote-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, voteType, program })
      });
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const voteOnLink = async (linkId, voteType) => {
    try {
      await fetch(`${API_BASE_URL}/vote-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, voteType, program })
      });
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  // Good/bad gouge. A browser holds at most one vote per entry: clicking it again takes it back,
  // and clicking the other one moves it. The server only counts, so taking a vote back sends
  // the opposite vote and moving one sends the new vote twice.
  const vote = async (kind, key, choice) => {
    const docs = kind === 'docs';
    const voted = docs ? votedDocs : votedLinks;
    const setVoted = docs ? setVotedDocs : setVotedLinks;
    const setItems = docs ? setDocs : setUsefulLinks;
    const idOf = docs ? (d) => d.docId : (l) => l.linkId || l.id;
    const send = (type) => (docs ? voteOnDocument(key, type) : voteOnLink(key, type));
    const opposite = choice === 'good' ? 'bad' : 'good';
    const [mine, theirs] = choice === 'good' ? ['upvotes', 'downvotes'] : ['downvotes', 'upvotes'];

    const currentVote = voted[key];
    const isUnvoting = currentVote === choice;

    const newVoted = { ...voted };
    if (isUnvoting) {
      delete newVoted[key];
    } else {
      newVoted[key] = choice;
    }
    setVoted(newVoted);
    localStorage.setItem(docs ? storage.votedDocs : storage.votedLinks, JSON.stringify(newVoted));

    setItems(prev => prev.map(item => {
      if (idOf(item) !== key) return item;
      if (isUnvoting) return { ...item, [mine]: (item[mine] || 0) - 1, [theirs]: (item[theirs] || 0) };
      if (currentVote === opposite) {
        return { ...item, [mine]: (item[mine] || 0) + 1, [theirs]: Math.max(0, (item[theirs] || 0) - 1) };
      }
      return { ...item, [mine]: (item[mine] || 0) + 1 };
    }));

    if (isUnvoting) {
      await send(opposite);
    } else if (currentVote === opposite) {
      await send(choice);
      await send(choice);
    } else {
      await send(choice);
    }
  };

  const getFileIcon = (mimeType, fileName) => {
    if (!mimeType && fileName) {
      const ext = fileName.split('.').pop().toLowerCase();
      if (ext === 'pdf') return '📄';
      if (['doc', 'docx'].includes(ext)) return <img src="/images/Google_Docs.svg" alt="" style={{ transform: 'scale(0.5)' }} />;
      if (['xls', 'xlsx'].includes(ext)) return <img src="/images/Google_Sheets.svg" alt="" style={{ transform: 'scale(0.5)' }} />;
      if (['ppt', 'pptx'].includes(ext)) return <img src="/images/Google_Slides.svg" alt="" style={{ transform: 'scale(0.5)' }} />;
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
      if (['mp4', 'avi', 'mov'].includes(ext)) return '🎥';
    }

    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('presentation')) return <img src="/images/Google_Slides.svg" alt="" style={{ transform: 'scale(0.5)' }} />;
    if (mimeType.includes('spreadsheet')) return <img src="/images/Google_Sheets.svg" alt="" style={{ transform: 'scale(0.5)' }} />;
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('document') || mimeType.includes('msword')) return <img src="/images/Google_Docs.svg" alt="" style={{ transform: 'scale(0.5)' }} />;
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
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="docs-container">
        <h1>Documents</h1>
        <div style={{ textAlign: 'center', padding: '50px', color: '#d32f2f' }}>
          <p>Error loading documents: {error}</p>
          <button onClick={fetchDocuments} style={{ marginTop: '20px' }}>
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

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button
            onClick={() => setShowUploadModal(true)}
            className="submit-link-btn"
          >
            📤 Upload Document
          </button>
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

          <button onClick={fetchDocuments} className="docs-refresh-btn">
            Refresh
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div className="docs-count">
            Showing {filteredDocs.length} of {docs.length} documents
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '14px', color: '#666' }}>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
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
                      {topics.find(t => t.value === doc.topic)?.label || 'Other'}
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
                </div>

                <div className="doc-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openPreview(doc, true)}
                    className="doc-action-btn open-btn"
                    title="Open in new tab"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <img
                      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAQElEQVR42qXKwQkAIAxDUUdxtO6/RBQkQZvSi8I/pL4BoGw/XPkh4XigPmsUgh0626AjRsgxHTkUThsG2T/sIlzdTsp52kSS1wAAAABJRU5ErkJggg=="
                      alt=""
                      style={{ width: '10px', height: '10px' }}
                    />
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
            onClick={() => setShowLinkModal(true)}
            className="submit-link-btn"
          >
            🔗 Submit Link
          </button>

          <div className="links-list">
            {filteredLinks.length === 0 ? (
              <div className="links-empty">
                <p>No links found</p>
              </div>
            ) : (
              filteredLinks.map(link => (
                <div key={link.linkId || link.id} className="link-item">
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
                        {topics.find(t => t.value === link.topic)?.label || 'All Topics'}
                      </span>
                      <span className="link-url">{new URL(link.url).hostname}</span>
                      <span className="link-date">{formatDate(link.submittedAt)}</span>
                      <OutdatedBadge item={link} />
                    </div>
                    <OutdatedControl
                      item={link}
                      vote={outdatedLinks.votes[link.linkId]}
                      onVote={(choice, note) => outdatedLinks.cast(link.linkId, choice, note)}
                    />
                  </div>
                  <div className="link-actions">
                    <button
                      onClick={() => vote('links', link.linkId || link.id, 'good')}
                      className={`link-action-btn good-btn ${votedLinks[link.linkId || link.id] === 'good' ? 'selected' : ''}`}
                    >
                      👍
                    </button>
                    <button
                      onClick={() => vote('links', link.linkId || link.id, 'bad')}
                      className={`link-action-btn bad-btn ${votedLinks[link.linkId || link.id] === 'bad' ? 'selected' : ''}`}
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

            <div style={{
              backgroundColor: '#f0f8ff',
              border: '1px solid #01202C',
              borderRadius: '6px',
              padding: '12px',
              margin: '15px 0',
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#333'
            }}>
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

            <div style={{
              backgroundColor: '#f0f8ff',
              border: '1px solid #01202C',
              borderRadius: '6px',
              padding: '12px',
              margin: '15px 0',
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#333'
            }}>
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
                <img
                  src={previewUrl}
                  alt={previewFileName}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={previewFileName}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DocsPage;
