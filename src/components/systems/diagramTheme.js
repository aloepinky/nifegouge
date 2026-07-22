// Shared light theme for the T-6B systems diagrams (hyds / elec / prop).
// Diagrams build their palette as `const C = { ...THEME, ...LOCAL }` where
// LOCAL holds only genuinely per-system colors (fluid lines, bus colors, metal).

const warningText   = '#cc2222';
const warningBg     = 'rgba(180,30,30,0.10)';
const warningBorder = '#cc3333';

const cautionText   = '#b07800';
const cautionBg     = 'rgba(160,100,0,0.10)';
const cautionBorder = '#b07800';

const advisoryText   = '#2d7a2d';
const advisoryBg     = 'rgba(30,120,30,0.10)';
const advisoryBorder = '#3a7a3a';

export const THEME = {
  bg:       '#f0f3f6',
  box:      '#ffffff',
  boxAlt:   '#e8ecf0',
  stroke:   '#9aaabb',
  text:     '#1a2f42',
  muted:    '#60788a',

  warningText, warningBg, warningBorder,
  cautionText, cautionBg, cautionBorder,
  advisoryText, advisoryBg, advisoryBorder,

  // EICAS message severities (aliases of the status colors above)
  eicasWarning: warningText,   eicasWarningBg: warningBg,   eicasWarningBorder: warningBorder,
  eicasCaution: cautionText,   eicasCautionBg: cautionBg,   eicasCautionBorder: cautionBorder,
  eicasAdvisory: advisoryText, eicasAdvisoryBg: advisoryBg, eicasAdvisoryBorder: advisoryBorder,

  // Site-teal accent family (PSM primaries #01202C / #003B4F)
  accentDeep: '#01202C',
  accent:     '#003B4F',

  // Briefing-modal UI (quote boxes, EP badges, landing notes)
  quoteBoxBg:     'rgba(0,59,79,0.05)',
  quoteBoxBorder: '#5b8496',
  epBadgeBg:      'rgba(0,59,79,0.10)',
  epBadgeBorder:  '#5b8496',
  epBadgeText:    '#003B4F',
  landingBg:      'rgba(0,59,79,0.05)',
  landingBorder:  '#003B4F',
  landingText:    '#01202C',

  // Sim-fault buttons
  simWarnBg:     '#b42525',
  simWarnBorder: '#8f1a1a',
  simWarnText:   '#ffffff',
  simCautBg:     '#b07800',
  simCautBorder: '#8a5f00',
  simCautText:   '#2e2000',

  // Instrument faces — deliberately dark: real cockpit gauges/annunciators
  // have dark faces, and the yellow/green arc bands need them to read.
  gaugeFace:      '#0a0a0a',
  gaugeFaceInner: '#080f18',
  gaugeBezel:     '#2e3e52',
  gaugeText:      '#c8d8e8',
  gaugeTick:      '#6a8a9a',
  panelFace:      '#080f18',

  // Electrical wiring (shared by elec + prop): saturated colored conductor
  // with white animated dashes riding on it — same idiom as the hyds pipes.
  wireLive: '#b8a000',
  wireDim:  '#a08a00',
  wireDead: '#8b9cad',
  wireDash: '#ffffff',
};

export const DIAGRAM_FONT = "'Courier New', monospace";

// Base animation for the shared live-wire idiom (elec + prop). The elec
// diagram appends its extra reverse/dim variants to this string.
export const WIRE_KEYFRAMES = `
  @keyframes wireFlow { to { stroke-dashoffset: -12; } }
  .wire-anim { stroke-dasharray: 8 4; animation: wireFlow 0.9s linear infinite; }
`;
