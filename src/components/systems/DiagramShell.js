// ─────────────────────────────────────────────────────────────────────────────
//  Shared page chrome for the T-6B systems diagrams (hyds / elec / prop / oil / fuel /
//  obogs).
//
//  Everything outside the SVG: the background, the centered card, the
//  briefing-tab grid, the sim-fault button grid, the attribution line, and the
//  BriefingModal overlay. Each diagram was built by copying the previous one, so this
//  block existed in several near-identical copies that had drifted apart — prop's card was
//  40px narrower, fuel had lost the attribution line entirely.
//
//  `briefingTab` lives here because it is purely chrome state. `infoKey` stays with each
//  diagram: it is driven by clicks on components inside the schematic.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { THEME, DIAGRAM_FONT } from './diagramTheme';
import BriefingModal from './BriefingModal';
import { HOT_STYLES } from './Hot';
import { SIGNAL_KEYFRAMES } from './Notation';

const C = THEME;
const FONT = DIAGRAM_FONT;

const TABS = [
  { id: 'verbatim', label: 'NATOPS Intro' },
  { id: 'numbers',  label: 'Numbers'  },
  { id: 'eicas',    label: 'EICAS'    },
  { id: 'eps',      label: 'EPs'      },
];

// Sim buttons name a severity rather than repeating three colors at every call site.
const SIM_KINDS = {
  warn:    { bg: C.simWarnBg, border: C.simWarnBorder, tc: C.simWarnText },
  caution: { bg: C.simCautBg, border: C.simCautBorder, tc: C.simCautText },
};

// Shared by both grids in the header, so the two halves stay the same shape.
const btnStyle = {
  padding: '7px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
  fontFamily: 'sans-serif', fontWeight: 600,
  minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const gridStyle = { display: 'grid', maxWidth: 'calc(50% - 4px)', minWidth: 0 };

/**
 * briefing — everything BriefingModal takes except `tab`/`onClose`: the four data objects
 *            plus its optional conditionalSteps / sortMemoryFirst / valueMinWidth.
 * sims     — [{ active, onClick, label, kind: 'warn'|'caution', col?, row?, bg? }].
 *            The label renders as `Sim ${label}`. col/row place a button in the 2-column
 *            grid — hyds and fuel both have three sims, so one row is short and the odd
 *            button gets pinned right. `bg` overrides just the lit background, for a fault
 *            whose own line color says more than the severity amber does.
 * keyframes — CSS string of the diagram's own fluid-line animations, injected once at
 *             card level. The hover ring and the signal-run chase come from the shell.
 * children  — the schematic, plus anything diagram-specific above it (hyds's legend row).
 *             May be a function receiving `{ openBriefing }` for schematics that link into
 *             a briefing tab from inside the SVG — fuel's and obogs's EICAS annunciators
 *             open the EICAS tab when clicked. A plain-JSX child cannot do this: the diagram renders the
 *             shell, so it is the parent and cannot read a context the shell provides.
 */
export default function DiagramShell({ briefing, sims = [], keyframes, children }) {
  const [briefingTab, setBriefingTab] = useState(null);
  // Stable identity so a memoized BriefingModal can bail out of the host diagram's
  // re-renders — fuel commits simulation state at 20 Hz behind an open modal.
  const closeBriefing = useCallback(() => setBriefingTab(null), []);
  const body = typeof children === 'function'
    ? children({ openBriefing: setBriefingTab })
    : children;

  return (
    // No minHeight: the background hugs the card. A 100vh floor left a band of empty
    // page under the shorter diagrams (obogs) before the site footer.
    <div style={{ background: C.bg, width: '100%', paddingBottom: 8 }}>
      <div style={{
        background: C.bg, borderRadius: 8, padding: 12,
        fontFamily: FONT, color: C.text,
        minWidth: 340, maxWidth: 900, margin: '0 auto',
      }}>
        {/* Shared rules first, then the diagram's own animations. Injecting these here
            means a schematic gets the hover cue by using <Hot> and the signal-run chase
            by using <El>, with nothing to remember. */}
        <style>{HOT_STYLES}{SIGNAL_KEYFRAMES}</style>
        {keyframes && <style>{keyframes}</style>}

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>

          {/* LEFT — briefing tabs (2×2 grid) */}
          <div style={{ ...gridStyle, gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {TABS.map(({ id, label }) => {
              const on = briefingTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setBriefingTab(t => (t === id ? null : id))}
                  style={{
                    ...btnStyle,
                    background: on ? C.accent : C.box,
                    border: `1px solid ${on ? C.accent : C.stroke}`,
                    color: on ? '#ffffff' : C.accent,
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* RIGHT — sim fault buttons. A lone button gets the full column rather than
              being squeezed into half of a two-column grid (prop). */}
          {sims.length > 0 && (
            <div style={{ ...gridStyle, gridTemplateColumns: sims.length > 1 ? '1fr 1fr' : '1fr', gap: 6 }}>
              {sims.map(({ active, onClick, label, kind = 'caution', col, row, bg }) => {
                const k = SIM_KINDS[kind];
                return (
                  <button key={label} onClick={onClick} style={{
                    ...btnStyle,
                    gridColumn: col, gridRow: row,
                    background: active ? (bg ?? k.bg) : C.box,
                    border: `1px solid ${active ? k.border : C.stroke}`,
                    color: active ? k.tc : C.muted,
                  }}>
                    {`Sim ${label}`}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Attribution ── */}
        <div style={{ textAlign: 'center', margin: '6px 0', fontSize: 9, letterSpacing: '0.12em', color: C.muted }}>
          IMAGES &amp; COMPONENT DESCRIPTIONS SOURCED FROM{' '}
          <span style={{ color: C.text, fontWeight: 700, letterSpacing: '0.14em' }}>T6BDRIVER.COM</span>
        </div>

        {body}

        {briefingTab && (
          <BriefingModal tab={briefingTab} onClose={closeBriefing} {...briefing} />
        )}
      </div>
    </div>
  );
}
