# Figures wanted by the discuss items

Hand-written, not generated. One row per image that appears in the gouge briefing references
in `_reference-docs/Discuss Items/`, plus the pages a figure would help that have no image
behind them yet.

**Read this before adding a `figures` entry.** CLAUDE.md's rule is that images have to be
supplied, not extracted: the figures in NATOPS and the FTIs are copyrighted, which is why
`_reference-docs/` is gitignored and why the systems diagrams are redrawn rather than
reproduced. The gouge pastes those figures in; the site cannot. So most rows below are
`redraw` or `supply`, and only one has shipped.

Note what did ship instead. Where a gouge "figure" is really a table wearing a picture — the
formation visual signals, the ground handling signals, the engine operating limits, the ELP
key positions, the crosscheck instruments — the *drawing* is the publication's but the
signal, the number and the meaning are facts. Those were transcribed into `tables` blocks on
the item pages and the images were not reproduced. See `tools/discuss-inventory.md` for
where each one landed.

## Status

| | |
|---|---|
| `shipped` | in `public/discuss/` and referenced by a `figures` entry |
| `redraw` | the geometry is the content; redraw it as SVG or a new image, the way the systems diagrams are redrawn from the NATOPS figures |
| `supply` | needs an image the site is entitled to publish — a photograph, a screenshot of something we own, or original artwork |
| `transcribed` | the content shipped as a table instead; no image needed |

## In the gouge

| Figure | Source | Target item | Status |
|---|---|---|---|
| FAA "Airspace Guidance for Small UAS Operators" | BoomGloom VNAV p. 3, p. 15 | `airspace-classification` | **shipped** — FAA work, US Government, not subject to copyright |
| Formation visual signals, Figures B-1 … B-10 | BoomGloom F pp. 12–20, p. 34 | `visual-signals`, `hefoe` | transcribed. The 28 signals are three tables on `visual-signals` and the HEFOE code is a table on `hefoe`. A redrawn cockpit-gesture set would still help — the tables say *what* the signal is, not what it looks like |
| Ground handling signals, NATOPS Figure 8-4-1 (3 sheets) | BoomGloom FAM pp. 2–3 | `ground-handling-signals` | transcribed, same caveat. The page's `note` sends the reader to the figure for the shapes |
| Engine operating limits, NATOPS Figure 5-2 | BoomGloom FAM p. 150 | `natops-limitations` | transcribed |
| ELP key positions, FAM FTI Figure 7-2 | BoomGloom FAM p. 26, p. 131 | `emergency-landing-pattern` | transcribed |
| Crosscheck/performance instruments, I FTI Figure 2-1 | BoomGloom I p. 1 | `instrument-scan-patterns` | transcribed — and completed: the gouge's copy has three of the six rows |
| Airspace classification chart, VNAV FTI Figure 3-2 | BoomGloom VNAV p. 4, p. 16 | `airspace-classification` | transcribed |
| Cloud clearances, VNAV FTI Figure 3-4 | BoomGloom FAM p. 67, Guide FAM pp. 80–81 | `cloud-clearances` | transcribed |
| Aldis lamp signals, FAM FTI Figure 4-5 | BoomGloom FAM p. 165, p. 259, Guide FAM p. 181 | `aldis-lamp-signals` | transcribed |
| Aerobatic maneuver chart | BoomGloom FAM p. 238 | `aerobatic-maneuvers` | transcribed from the FTI's own entry parameters rather than from the gouge's chart |
| ELP pattern, FAM FTI Figure 7-3 | BoomGloom FAM p. 26 | `emergency-landing-pattern` | redraw — a plan view of the four keys with the WTD offsets. The one figure on this list that would most change a page |
| Holding entry sectors, standard and non-standard | BoomGloom I p. 24 | `holding-entry` | redraw — a circle, two chords and three labelled sectors. Pure geometry, no artwork in it |
| Vₙ diagram, NATOPS Figure 5-4 | BoomGloom FAM p. 226, p. 254 | `vn-diagram` | redraw — an SVG plot of published numbers (7.0 / −3.5 / 4.7 / −1.0 g, 244 and 316 KIAS) |
| Airspeed and Mach limitations, NATOPS Figure 5-3 | BoomGloom FAM p. 225 | `natops-limitations` | redraw, same shape as the Vₙ diagram. Lower value — the Numbers box already carries every figure on it |
| Takeoff and landing crosswind chart, NATOPS Figure A3-6 | BoomGloom FAM p. 47 | `crosswind-computations` | redraw as a polar plot, or drop: the page's worked example teaches the chart and the CR-2 does the job airborne |
| HUD symbology, labelled | BoomGloom FAM p. 51, p. 104, VNAV p. 7 | `hud` | supply — a screenshot of a HUD the site owns, or original artwork. The label set is the content and the underlying image is NATOPS's |
| HUD detail plates — pitch ladder, FPM/CDM, heading modes, AOA, tapes | BoomGloom FAM p. 52 (5 images) | `hud` | supply |
| Instrument Pattern A | BoomGloom CS p. 11, I p. 6 | `s-1-pattern` | redraw — numbered dots and a step list, no artwork |
| Instrument Pattern B | BoomGloom I p. 9 | `turn-pattern` | redraw, same |
| Aerobatic maneuver profiles — loop, wingover, barrel roll, aileron roll, Split-S, half Cuban eight, Immelmann | BoomGloom FAM pp. 227–234, pp. 241–248 | `loop`, `wingover`, `barrel-roll`, `aileron-roll`, `split-s`, `half-cuban-eight`, `immelmann` | redraw — the FTI's are 3D renders over terrain; a flat profile trace with the entry, apex and exit numbers on it teaches more and is ours |

## Not in the gouge, and flagged only

Per the working rule for this pass: pages that a figure would help, with no image behind them
in either gouge. **Do not prep a `figures` entry for any of these** — the row is the record
that somebody looked and found nothing to use.

| Item | What would help |
|---|---|
| `landing-pattern` | A plan view of the pattern with the abeam, 180, 90 and final numbers, matching the ELP figure's shape |
| `emergency-landing-pattern` | A second figure: the bow tie and 360 energy-dissipation patterns |
| `course-rules` pages, `olf-course-rules` | The course rules maps already exist elsewhere on the site; link rather than duplicate |
| `formation-position-corrections` | The parade, cruise and route sight pictures. This is the clearest case on the site of a page that cannot be written as prose |
| `hsi-orientation` | An HSI face with the bearing pointer, CDI and TO/FROM called out |
| `arcing`, `arc-radial-intercepts` | The 90° benchmark relationship — head on, above and below — as one small three-panel figure |
| `slip`, `crosswind-takeoff-and-landings` | The crab-to-slip transition seen from behind |
| `vfr-chart-preparation` | A sample route segment with the data box filled in. Needs a chart the site may publish |
| `jet-log` | A filled jet log. The site generates these, so this one is ours to make |
