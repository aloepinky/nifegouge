import React, { useState } from 'react';

// An action that asks first, in the page: the button turns into its question with a confirm
// and a Keep. Never window.confirm, which cannot say what is about to happen and belongs to no
// row. The same idea as ConfirmButton in discuss/edit/fields.js, styled for this page.

export const smallButton = (bg, fg = 'var(--on-brand)', border = 'none') => ({
  padding: '5px 12px',
  backgroundColor: bg,
  color: fg,
  border,
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '13px',
});

export default function Confirm({ label, question, confirmLabel, onConfirm, style, disabled }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return <button type="button" style={style} disabled={disabled} onClick={() => setAsking(true)}>{label}</button>;
  }
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontSize: '13px', color: 'var(--ink)' }}>
      <span>{question}</span>
      <button type="button" style={style} onClick={() => { setAsking(false); onConfirm(); }}>{confirmLabel}</button>
      <button type="button" style={smallButton('var(--surface)', 'var(--ink-strong)', '1px solid var(--line-brand)')} onClick={() => setAsking(false)}>Keep</button>
    </span>
  );
}
