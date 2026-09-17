import React, { useEffect, useState } from 'react';

// The few controls the jet log library needs, in this page's inline-style idiom.
//
// The discuss editor has all of these, but every one of them is styled from `discuss-editor-*`
// classes in style.css, and the jet log page styles inline — borrowing them would mean either
// an unstyled form or a second class vocabulary in the stylesheet for one modal.

export const LABEL = {
  display: 'block', fontSize: '0.72em', color: '#666', marginBottom: '3px',
  letterSpacing: '0.03em',
};

export const INPUT = {
  width: '100%', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px',
  fontSize: '0.85em', boxSizing: 'border-box',
};

export const PRIMARY = {
  background: '#003B4F', color: 'white', border: 'none', borderRadius: '4px',
  padding: '6px 14px', fontSize: '0.85em', fontWeight: 'bold', cursor: 'pointer',
};

export const SECONDARY = {
  background: 'white', color: '#003B4F', border: '1px solid #c9d6dc', borderRadius: '4px',
  padding: '6px 12px', fontSize: '0.85em', cursor: 'pointer',
};

export const ERROR = { fontSize: '0.78em', color: '#b91c1c', marginTop: '6px' };
export const NOTE = { fontSize: '0.78em', color: '#666', marginTop: '6px', lineHeight: 1.45 };
export const QUIET = { fontSize: '0.8em', color: '#aaa', marginBottom: '8px' };

export function Field({ label, hint, children }) {
  return (
    <div style={{marginBottom: '10px'}}>
      <label style={LABEL}>{label}</label>
      {children}
      {hint && <div style={{fontSize: '0.7em', color: '#999', marginTop: '2px'}}>{hint}</div>}
    </div>
  );
}

// Asks in the page rather than in a browser dialog, which cannot say what is about to be lost
// and would block the modal besides.
export function ConfirmButton({ label, question, onConfirm, style, title }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 12000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!armed) {
    return (
      <button type="button" title={title} style={style || SECONDARY} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <span style={{display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
      <span style={{fontSize: '0.78em', color: '#666'}}>{question}</span>
      <button type="button" style={PRIMARY} onClick={() => { setArmed(false); onConfirm(); }}>
        Yes
      </button>
      <button type="button" style={SECONDARY} onClick={() => setArmed(false)}>No</button>
    </span>
  );
}

// Escape closes whatever is open, the way the discuss editors do.
export function useEscape(onEscape) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onEscape(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEscape]);
}

export function when(date) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch (err) {
    return '';
  }
}
