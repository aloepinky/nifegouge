// Shared theme for the T-6B systems diagrams (hyds / elec / prop / oil / fuel / obogs).
// Diagrams build their palette as `const C = { ...THEME, ...LOCAL }` where
// LOCAL holds only genuinely per-system colors (fluid lines, bus colors, metal).
//
// Page chrome, boxes, text and status tints are `var(--sys-*)` references into the
// token blocks at the top of src/style.css, so the diagrams follow the site's light and
// dark themes: the light values there are the colours these diagrams were drawn with. A
// var() string works anywhere a colour does, SVG presentation attributes included, but
// it cannot take an alpha suffix (`${C.text}22` is not a colour), so a translucent
// variant is its own token (rule) and only a literal below may be suffixed that way.
//
// Literal on purpose: the saturated status fills on the sim buttons, the instrument
// faces (dark in both themes, as in the cockpit), the energized-wire yellow and the
// white flow dashes.

const warningText   = 'var(--sys-warning-text)';
const warningBg     = 'var(--sys-warning-bg)';
const warningBorder = 'var(--sys-warning-border)';

const cautionText   = 'var(--sys-caution-text)';
const cautionBg     = 'var(--sys-caution-bg)';
const cautionBorder = 'var(--sys-caution-border)';

const advisoryText   = 'var(--sys-advisory-text)';
const advisoryBg     = 'var(--sys-advisory-bg)';
const advisoryBorder = 'var(--sys-advisory-border)';

export const THEME = {
  bg:       'var(--sys-bg)',
  box:      'var(--sys-box)',
  boxAlt:   'var(--sys-box-alt)',
  stroke:   'var(--sys-stroke)',
  rule:     'var(--sys-rule)',     // a stroke at quarter strength: table rules in the briefing modal
  text:     'var(--sys-text)',
  muted:    'var(--sys-muted)',

  warningText, warningBg, warningBorder,
  cautionText, cautionBg, cautionBorder,
  advisoryText, advisoryBg, advisoryBorder,

  // Opaque fills for a symbol that has tripped. The *Bg values above are translucent
  // overlays for modal panels; a schematic symbol sits on top of pipes and needs to
  // cover them, so these are the solid equivalents.
  warningTint: 'var(--sys-warning-tint)',
  cautionTint: 'var(--sys-caution-tint)',

  // EICAS message severities (aliases of the status colors above)
  eicasWarning: warningText,   eicasWarningBg: warningBg,   eicasWarningBorder: warningBorder,
  eicasCaution: cautionText,   eicasCautionBg: cautionBg,   eicasCautionBorder: cautionBorder,
  eicasAdvisory: advisoryText, eicasAdvisoryBg: advisoryBg, eicasAdvisoryBorder: advisoryBorder,

  // Site-teal accent family (PSM primaries #01202C / #003B4F). `accent` and `accentDeep`
  // are fills (a lit button, a selected switch) and stay navy in both themes, like the
  // site's buttons; `accentInk` is the same teal as text, a stroke or a border, and
  // lightens in dark mode where navy on navy would vanish.
  accentDeep: '#01202C',
  accent:     '#003B4F',
  accentInk:  'var(--sys-accent-ink)',

  // Briefing-modal UI (quote boxes, EP badges, landing notes)
  quoteBoxBg:     'var(--sys-quote-bg)',
  quoteBoxBorder: 'var(--sys-quote-border)',
  epBadgeBg:      'var(--sys-badge-bg)',
  epBadgeBorder:  'var(--sys-badge-border)',
  epBadgeText:    'var(--sys-badge-text)',
  landingBg:      'var(--sys-landing-bg)',
  landingBorder:  'var(--sys-landing-border)',
  landingText:    'var(--sys-landing-text)',

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

  // Energized wire on every diagram (Notation.js `El`), elec and prop included.
  signalLive: '#ffe500',

  // wireLive: the electrical page's switch, relay and button highlight (gold reads as
  // text on white where signalLive would not). wireDead: an unpowered symbol.
  // wireDash: the white dashes riding on the fluid lines (hyds, fuel, oil, obogs).
  wireLive: '#b8a000',
  wireDead: '#8b9cad',
  wireDash: '#ffffff',
};

export const DIAGRAM_FONT = "'Courier New', monospace";
