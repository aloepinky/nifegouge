import React, { useState } from 'react';

// An action that asks first, in the page: the button turns into its question with a confirm
// and a Keep. Never window.confirm, which cannot say what is about to happen and belongs to no
// row. The same idea as ConfirmButton in discuss/edit/fields.js, styled for this page.

export const smallButton = (bg, fg = 'white', border = 'none') => ({
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
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontSize: '13px', color: '#333' }}>
      <span>{question}</span>
      <button type="button" style={style} onClick={() => { setAsking(false); onConfirm(); }}>{confirmLabel}</button>
      <button type="button" style={smallButton('white', '#01202C', '1px solid #01202C')} onClick={() => setAsking(false)}>Keep</button>
    </span>
  );
}
