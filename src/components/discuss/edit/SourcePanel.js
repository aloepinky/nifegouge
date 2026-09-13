// The item as data, for reading or copying out.
//
// Publishing goes through the server now, so nothing here needs pasting anywhere. What the
// panel is still for: seeing exactly what a page holds (an id, a refs array, a flag) without
// opening every editor, and carrying a page or a section somewhere else as JSON. The changed
// view shows only the sections that differ from the published revision.
//
// Uses the app's global `.modal` / `.modal-content` pattern, as Questions.js and TW4Docs.js
// do. The inline-style modals are scoped to src/components/systems/**.
import React, { useState } from 'react';

const pretty = (value) => JSON.stringify(value, null, 2);

function changedSections(item, published) {
  const before = new Map(((published && published.sections) || []).map((s) => [s.id, pretty(s)]));
  return (item.sections || [])
    .filter((s) => before.get(s.id) !== pretty(s))
    .map((s) => ({ id: s.id, title: s.title, text: pretty(s) }));
}

function SourcePanel({ item, published, onClose }) {
  const [view, setView] = useState('file');
  const [copied, setCopied] = useState(false);

  const changed = changedSections(item, published);
  const text =
    view === 'file'
      ? pretty(item)
      : changed.length
        ? changed.map((c) => `// ${c.title}\n${c.text}`).join('\n\n')
        : 'No section differs from the published page.';

  const copy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => setCopied(true),
        () => setCopied(false)
      );
    }
  };

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content discuss-source-panel">
        <button type="button" className="close-button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>
          Source for <code>{item.slug}</code>
        </h2>

        <p className="discuss-editor-hint">
          The page as the site stores it. Nothing here needs pasting anywhere: Publish sends
          it. The heading and prose rules the editor leaves to the linter are checked when you
          publish, and again by <code>node tools/discuss-lint.js --slug={item.slug}</code>.
        </p>

        <div className="discuss-source-tabs">
          <button
            type="button"
            className={view === 'file' ? 'is-on' : ''}
            onClick={() => {
              setView('file');
              setCopied(false);
            }}
          >
            Whole page
          </button>
          <button
            type="button"
            className={view === 'changed' ? 'is-on' : ''}
            onClick={() => {
              setView('changed');
              setCopied(false);
            }}
          >
            Changed sections ({changed.length})
          </button>
          <button type="button" className="discuss-source-copy" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <pre className="discuss-source-text">
          <code>{text}</code>
        </pre>
      </div>
    </div>
  );
}

export default SourcePanel;
