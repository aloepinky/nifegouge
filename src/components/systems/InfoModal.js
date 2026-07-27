// ─────────────────────────────────────────────────────────────────────────────
//  Shared component-detail modal for the systems diagrams (hyds / elec / prop / fuel).
//  Opened by clicking a component in a schematic; each diagram passes one record from
//  its own *_INFO map (see *ModalData.js) — { title, items, photos } — plus its palette.
//
//  Lived inside hyds/HydraulicModalData.js until the fourth diagram was built, which
//  meant a data file exported a React component and three sibling features imported it
//  across from hyds/. Same component, just given its own module beside BriefingModal.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, memo } from 'react';
import { THEME, DIAGRAM_FONT } from './diagramTheme';

const FONT = DIAGRAM_FONT;

// The modal reads only bg/stroke/text/muted, so a diagram's own `C` palette satisfies
// `theme` with no adapter — and THEME itself is the sensible default.
function InfoModalBase({ title, items = [], photos = [], onClose, theme = THEME }) {
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setPhotoIdx(i => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft')  setPhotoIdx(i => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, photos.length]);

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
          background: theme.bg,
          border: `0.5px solid ${theme.stroke}`,
          borderRadius: 7,
          width: '100%', maxWidth: 480,
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          fontFamily: FONT,
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowY: 'auto', padding: '14px 18px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.14em', color: theme.text }}>
              {title?.toUpperCase()}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: theme.muted, fontSize: 16, lineHeight: 1, padding: '0 0 0 12px', flexShrink: 0,
              }}
            >×</button>
          </div>

          {items.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 14, color: theme.muted, fontSize: 11, lineHeight: 1.8 }}>
              {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          )}

          {photos.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {/* Photo */}
              <div style={{ position: 'relative', borderRadius: 4, overflow: 'hidden', border: `0.5px solid ${theme.stroke}` }}>
                <img
                  src={photos[photoIdx].src}
                  alt={photos[photoIdx].caption ?? ''}
                  style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'contain' }}
                />
                {/* Prev / Next buttons */}
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)} style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 36,
                      background: 'rgba(0,0,0,0.30)', border: 'none', cursor: 'pointer',
                      color: theme.text, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>‹</button>
                    <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)} style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0, width: 36,
                      background: 'rgba(0,0,0,0.30)', border: 'none', cursor: 'pointer',
                      color: theme.text, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>›</button>
                  </>
                )}
              </div>
              {/* Caption + counter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                <span style={{ fontSize: 9, color: theme.muted, letterSpacing: '0.06em' }}>
                  {photos[photoIdx].caption}
                </span>
                {photos.length > 1 && (
                  <span style={{ fontSize: 9, color: theme.muted, letterSpacing: '0.06em' }}>
                    {photoIdx + 1} / {photos.length}
                  </span>
                )}
              </div>
              {/* Dot indicators */}
              {photos.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 6 }}>
                  {photos.map((_, i) => (
                    <div key={i} onClick={() => setPhotoIdx(i)} style={{
                      width: 5, height: 5, borderRadius: '50%', cursor: 'pointer',
                      background: i === photoIdx ? theme.text : theme.stroke,
                    }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          padding: '6px 18px', borderTop: `0.5px solid ${theme.stroke}`,
          color: theme.muted, fontSize: 8, letterSpacing: '0.08em', flexShrink: 0,
        }}>
          CLICK OUTSIDE OR PRESS ESC TO CLOSE
        </div>
      </div>
    </div>
  );
}

// Memoized for the same reason as BriefingModal: the diagrams with animation loops
// (fuel at 20 Hz, prop's oil animation at frame rate) re-render this on every tick while
// it is open. title/items/photos come straight off a module-scope *_INFO map and `theme`
// is a module constant, so the bail-out holds wherever the caller keeps onClose stable.
export const InfoModal = memo(InfoModalBase);

