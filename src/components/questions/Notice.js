import React, { useCallback, useEffect, useRef, useState } from 'react';

// A one-line message at the top of the page, in place of the browser's alert(): it says what
// happened without stopping the student, and clears itself after a few seconds.

const STYLES = {
  info: { background: '#e6f2f5', border: '1px solid #7fb3c2', color: '#003B4F' },
  error: { background: '#fdecea', border: '1px solid #e0a39c', color: '#8e1c12' },
};

export function useNotice() {
  const [notice, setNotice] = useState(null);
  const timer = useRef(null);

  const show = useCallback((text, kind = 'info') => {
    clearTimeout(timer.current);
    setNotice({ text, kind });
    timer.current = setTimeout(() => setNotice(null), kind === 'error' ? 9000 : 5000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const element = notice && (
    <div
      role={notice.kind === 'error' ? 'alert' : 'status'}
      style={{
        ...STYLES[notice.kind],
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '6px',
        marginBottom: '12px',
        fontSize: '14px',
      }}
    >
      <span>{notice.text}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setNotice(null)}
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px', padding: 0 }}
      >
        ×
      </button>
    </div>
  );

  return [element, show];
}
