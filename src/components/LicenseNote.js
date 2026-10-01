import React from 'react';

// The one line every form that publishes community writing carries: what the words are
// released under. Shown where the contribution is made, which is what makes it a term of it.
export const CONTENT_LICENSE_URL = 'https://github.com/aloevinger/nifegouge/blob/main/LICENSE-CONTENT.md';

export default function LicenseNote({ className = 'discuss-editor-hint', style }) {
  return (
    <p className={className} style={style}>
      What you publish is shared under{' '}
      <a href={CONTENT_LICENSE_URL} target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>,
      so anyone may reuse it with credit.
    </p>
  );
}
