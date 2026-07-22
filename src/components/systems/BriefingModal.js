// ─────────────────────────────────────────────────────────────────────────────
//  Shared NATOPS briefing modal for the systems diagrams (hyds / elec / prop).
//  Each diagram passes its own { verbatim, numbers, eicas, eps } data objects
//  (see *ModalData.js). Colors come straight from THEME — no diagram overrides
//  any modal color, so there is no theme prop.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { THEME, DIAGRAM_FONT } from './diagramTheme';

const C = THEME;
const FONT = DIAGRAM_FONT;

// conditionalSteps: procedure lines starting with "If" or ending with ":" render
//   as unnumbered italic conditions between the numbered steps (elec/prop EPs);
//   off, the whole procedure is a plain numbered list (hyds EPs).
// sortMemoryFirst: list ★ MEMORY EPs before the rest.
// valueMinWidth: min width of the VALUE column in the numbers table.
export default function BriefingModal({
  tab, onClose, verbatim, numbers, eicas, eps,
  conditionalSteps = false, sortMemoryFirst = false, valueMinWidth = 180,
}) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const eicasColor = (type) => {
    if (type === 'warning')  return { bg: C.eicasWarningBg,  border: C.eicasWarningBorder,  label: C.eicasWarning };
    if (type === 'advisory') return { bg: C.eicasAdvisoryBg, border: C.eicasAdvisoryBorder, label: C.eicasAdvisory };
    return { bg: C.eicasCautionBg, border: C.eicasCautionBorder, label: C.eicasCaution };
  };

  const sectionStyle = {
    background: 'rgba(0,0,0,0.03)',
    border: `0.5px solid ${C.stroke}`,
    borderRadius: 5,
    padding: '10px 14px',
    marginBottom: 10,
  };

  const headingStyle = { fontSize: 11, color: C.muted, letterSpacing: '0.06em', marginBottom: 14 };

  const renderProcedure = (steps) => {
    if (!conditionalSteps) {
      return (
        <ol style={{ margin: 0, paddingLeft: 18, color: C.text, fontSize: 11, lineHeight: 1.8 }}>
          {steps.map((step, j) => <li key={j}>{step}</li>)}
        </ol>
      );
    }
    let count = 0;
    return (
      <div style={{ fontSize: 11, lineHeight: 1.8 }}>
        {steps.map((step, j) => {
          if (/^if\b/i.test(step.trim()) || step.trim().endsWith(':')) {
            return (
              <div key={j} style={{ color: C.muted, fontStyle: 'italic', margin: '4px 0 2px', paddingLeft: 8, borderLeft: `2px solid ${C.stroke}` }}>
                {step}
              </div>
            );
          }
          count++;
          const text = step.replace(/^\d+\.\s*/, '');
          return (
            <div key={j} style={{ color: C.text, display: 'flex', gap: 8, paddingLeft: 4, alignItems: 'baseline' }}>
              <span style={{ color: C.muted, fontSize: 10, minWidth: 14, flexShrink: 0, textAlign: 'right' }}>{count}.</span>
              <span>{text}</span>
            </div>
          );
        })}
      </div>
    );
  };

  let content = null;

  if (tab === 'verbatim') {
    content = (
      <>
        <div style={headingStyle}>{verbatim.heading}</div>
        <div style={{
          ...sectionStyle,
          background: C.quoteBoxBg,
          border: `0.5px solid ${C.quoteBoxBorder}`,
          fontStyle: 'italic',
          color: C.text,
          fontSize: 12,
          lineHeight: 1.75,
          marginBottom: 18,
        }}>
          {verbatim.quote}
        </div>
      </>
    );
  }

  if (tab === 'numbers') {
    content = (
      <>
        <div style={headingStyle}>{numbers.heading}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, background: 'transparent' }}>
          <thead>
            <tr>
              <th style={{ color: C.muted, textAlign: 'left', padding: '4px 8px', borderBottom: `0.5px solid ${C.stroke}`, fontWeight: 400, letterSpacing: '0.08em', fontSize: 10, background: 'transparent' }}>VALUE</th>
              <th style={{ color: C.muted, textAlign: 'left', padding: '4px 8px', borderBottom: `0.5px solid ${C.stroke}`, fontWeight: 400, letterSpacing: '0.08em', fontSize: 10, background: 'transparent' }}>MEANING</th>
            </tr>
          </thead>
          <tbody>
            {numbers.items.map((row, i) => {
              if (row.section) {
                return (
                  <tr key={i}>
                    <td colSpan={2} style={{ padding: '10px 8px 4px', color: C.muted, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', borderBottom: `0.5px solid ${C.stroke}44`, textTransform: 'uppercase' }}>
                      {row.section}
                    </td>
                  </tr>
                );
              }
              const rowColor = row.highlight === 'warning' ? C.eicasWarning   : row.highlight ? C.eicasCaution   : C.text;
              const rowBg    = row.highlight === 'warning' ? C.eicasWarningBg : row.highlight ? C.eicasCautionBg : 'transparent';
              return (
                <tr key={i} style={{ background: rowBg }}>
                  <td style={{ padding: '8px 8px', borderBottom: `0.5px solid ${C.stroke}44`, color: rowColor, fontWeight: 700, whiteSpace: 'nowrap', verticalAlign: 'top', minWidth: valueMinWidth }}>
                    {row.value}
                  </td>
                  <td style={{ padding: '8px 8px', borderBottom: `0.5px solid ${C.stroke}44`, color: C.muted, lineHeight: 1.6 }}>
                    {row.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>
    );
  }

  if (tab === 'eicas') {
    content = (
      <>
        <div style={headingStyle}>{eicas.heading}</div>
        {eicas.items.map((msg) => {
          const col = eicasColor(msg.color);
          return (
            <div key={msg.label} style={{ ...sectionStyle, background: col.bg, border: `0.5px solid ${col.border}`, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.14em', color: col.label, marginBottom: 8 }}>
                {msg.label}
              </div>
              <div style={{ marginBottom: 5 }}>
                <span style={{ color: C.muted, fontSize: 9, letterSpacing: '0.08em' }}>CAUSE — </span>
                <span style={{ color: C.text, fontSize: 11, lineHeight: 1.6 }}>{msg.cause}</span>
              </div>
              <div>
                <span style={{ color: C.muted, fontSize: 9, letterSpacing: '0.08em' }}>RESPONSE — </span>
                <span style={{ color: C.text, fontSize: 11, lineHeight: 1.6 }}>{msg.response}</span>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  if (tab === 'eps') {
    const items = sortMemoryFirst
      ? [...eps.items].sort((a, b) => (b.memory ? 1 : 0) - (a.memory ? 1 : 0))
      : eps.items;
    content = (
      <>
        <div style={headingStyle}>{eps.heading}</div>
        {items.map((ep, i) => (
          <div key={ep.title} style={{ ...sectionStyle, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: ep.subtitle ? 6 : 10 }}>
              <span style={{ background: C.epBadgeBg, border: `0.5px solid ${C.epBadgeBorder}`, color: C.epBadgeText, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, letterSpacing: '0.1em' }}>
                EP {i + 1}
              </span>
              <span style={{ fontWeight: 700, color: C.text, fontSize: 11, letterSpacing: '0.1em' }}>
                {ep.title}
              </span>
              {ep.memory && (
                <span style={{ background: C.eicasWarningBg, border: `0.5px solid ${C.eicasWarningBorder}`, color: C.eicasWarning, fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 3, letterSpacing: '0.1em' }}>
                  ★ MEMORY
                </span>
              )}
            </div>
            {ep.subtitle && (
              <div style={{ color: C.muted, fontSize: 10, fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 }}>
                {ep.subtitle}
              </div>
            )}
            {ep.indications && ep.indications.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: C.muted, fontSize: 9, letterSpacing: '0.1em', marginBottom: 4 }}>INDICATIONS</div>
                <ul style={{ margin: 0, paddingLeft: 16, color: C.muted, fontSize: 11, lineHeight: 1.7 }}>
                  {ep.indications.map((ind, j) => <li key={j}>{ind}</li>)}
                </ul>
              </div>
            )}
            <div style={{ marginBottom: ep.landing ? 8 : 0 }}>
              <div style={{ color: C.muted, fontSize: 9, letterSpacing: '0.1em', marginBottom: 4 }}>PROCEDURE</div>
              {renderProcedure(ep.procedure)}
            </div>
            {ep.landing && (
              <div style={{ marginTop: 8, padding: '5px 10px', background: C.landingBg, borderLeft: `2px solid ${C.landingBorder}`, color: C.landingText, fontSize: 10, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, letterSpacing: '0.08em', color: C.muted, fontSize: 9 }}>LANDING CRITERIA — </span>
                {ep.landing}
              </div>
            )}
          </div>
        ))}
      </>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bg,
          border: `1px solid ${C.stroke}`,
          borderRadius: 7,
          width: '100%', maxWidth: 680,
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          fontFamily: FONT,
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ overflowY: 'auto', padding: '14px 18px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 16, lineHeight: 1, padding: '0 4px' }}
            >×</button>
          </div>
          {content}
        </div>
        <div style={{
          padding: '6px 18px', borderTop: `0.5px solid ${C.stroke}`,
          color: C.muted, fontSize: 8, letterSpacing: '0.08em', flexShrink: 0,
        }}>
          CLICK OUTSIDE OR PRESS ESC TO CLOSE
        </div>
      </div>
    </div>
  );
}
