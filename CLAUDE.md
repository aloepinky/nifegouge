# CLAUDE.md

Guidance for Claude Code in this repository. It is written for any agent working here: the
maintainer's, or one a contributor has set up by following `README.md`. The maintainer also keeps a
`CLAUDE.local.md` (gitignored) with deployment and AWS notes; if you have one, it applies too.

## Working for a contributor

Most people who contribute are naval aviators with no coding background, driving you in plain
language. Work accordingly:

- **Explain in their terms.** Say what changed on the page, not which component. Show them the change
  running at `http://localhost:3000` before calling it done, and tell them exactly where to click.
- **Work on a branch in their fork and finish with a pull request** against
  `aloevinger/nifegouge` `main`. Write the PR description in plain language: what was wrong, what it
  says now, and the publication, section and page that says so. Never push to this repository's
  `main`: a push there deploys the live site and the server.
- **Community content is not in this repository.** Discussion item pages, briefs, shared jet logs,
  NIFE questions, docs and links live on the server (see below). If the contributor wants to change
  one of those, tell them to click `[edit]` (or the equivalent) on pinksheetmafia.com instead; do not
  edit it through code.
- **A local copy reads and writes the live server.** `npm start` shows real content, and publishing
  anything from it publishes to the live site. Don't publish, vote or submit from a local copy unless
  the contributor means to change the live site.
- **Never run the admin tools or anything against production.** Scripts that take `X-Admin-Token` or
  AWS credentials are for the maintainer; a contributor won't have either, and shouldn't be asked for
  them.
- **The reference publications are not in the repository.** `_reference-docs/` is gitignored, so
  where a rule below points into it, you won't have it. Every factual change still needs a source:
  ask the contributor for the publication, section and page (a photo or PDF of the page is ideal),
  and read it before writing anything. If they can't supply one, don't make the change; say so in
  the PR instead.
- **Nothing marked CUI, FOUO or classified goes in**, in code, a commit, an image or a PR. If a
  contributor offers such a page as a source, decline it and explain why.

## Commands

```bash
npm start        # Dev server at http://localhost:3000
npm run build    # Production build → /build
npm test         # Tests (interactive watch mode)
```

On Windows PowerShell, set env vars first (`$env:PORT=3100; npm start`), never `VAR=x cmd`.

## What this is

**pinksheetmafia.com** — a free, community-built naval aviation training tool, deployed on Netlify
(`public/_redirects` is the SPA fallback). Programs: **NIFE** (C172, `/nife/*`), **TW4 Primary**
(T-6B, `/tw4/*`), **Advanced** (T-44C, `/t44c/*`, draft). Programs are listed in
`src/components/programs.js` and `TopNav.js`'s `TABS`.

## Architecture

- **Routing** (`App.js`): paths namespaced by program. Pages with tabs take a `:tab` param and
  navigate with `useNavigate`, not local state. Every page but the landing page is `React.lazy`;
  import new pages the same way. `discuss/warm.js` warms the Discuss mirror from the entry bundle and
  must repeat its syllabus ids/route prefixes rather than import them.
- **Draft tabs**: a flag like `discuss: 'draft'` must be read through `shown()`, never for truth
  (`'draft'` is truthy). Drafts are hidden from nav/About and guarded by `DRAFT` in `App.js`.
- **Big inline data files** (edit directly): `EPDivsData.js`, `QuadfoldData.js`,
  `CourseRulesFeatures.js`, `*ModalData.js`. `QuadfoldData.js.bak` is a backup — don't delete or import.
- **Runtime CSVs**: `public/TTC.csv`, `Cruise.csv`, `Airport Info.csv`, fetched in `TW4JetLog.js`
  and `Nav/JetLog.js`. `TW4JetLog.js` addresses cells as `r{row}c{col}`; alternate rows use `r200+`.
- **Sub-nav tabs**: `Nav.js` (Problem Generator / Jet Log), `Systems.js` (`TABS` config),
  EPs/Limits pages via `EPsLimitsShell.js`.
- **Styling**: all global classes in `src/style.css` (no CSS modules). The only inline-style
  exception is `src/components/systems/**` (computed from `THEME`). Primary colors `#01202C` and
  `#003B4F`, teal accents, light theme. No "AI vibes": no dark backgrounds, no neon, no triple
  coloring (bg/border/text in one color family).
- **Filesystem is case-insensitive NTFS.** Never create a file whose name differs from an existing
  one only by case — it overwrites it and breaks the Linux build.
- `leftovers.js` is a gitignored scratch file.

## Systems diagrams

Six systems (`hyds`, `prop`, `oil`, `elec`, `obogs`, `fuel`) in `src/components/systems/<system>/`:
`T6B*Diagram.js` (SVG, keyframes, sim state, interactivity) + `*ModalData.js` (**pure data, no
JSX**: text, EPs, EICAS, per-component `*_INFO`). Adding a system: the directory pair + one `TABS`
row in `Systems.js`.

Shared, at `systems/` root:
- `DiagramShell.js` — all chrome (background, card, briefing-tab grid, sim-fault grid, attribution,
  `BriefingModal`); owns `briefingTab`. A diagram passes `briefing`, `sims`, `keyframes` and its
  schematic as `children` (optionally a function receiving `{ openBriefing }`). Injects
  `HOT_STYLES` and `SIGNAL_KEYFRAMES`.
- `BriefingModal.js`, `InfoModal.js` — memoized; keep `onClose` stable.
- `Hot.js` (`<Hot>`, `<HotRing>`), `Notation.js` (`T`, `<Lbl>`, `<Ldr>`, `<El>`, `<Mech>`),
  `diagramTheme.js` (`THEME`, `DIAGRAM_FONT`, `WIRE_KEYFRAMES`). Fluid-line styles stay local.

**Ethos** — a quick-reference study tool that comes alive, not a simulator:
1. Follow the NATOPS figure's geometry; simplify by removing, never rearranging.
2. Cut anything that doesn't answer "what does this do, what breaks it, what do I see". No page
   furniture (pause buttons, sliders, on-canvas instructions).
3. Interactivity is the lesson: controls change the schematic; sim faults show indication and
   source. Compressed timings display the true published value counting down.
4. Every part has a `<Hot>` target; it opens a modal only if its `*_INFO` has `items` (else
   `{ title }` only). No padded modals, no orphan records/targets (except a part drawn several
   times, commented). Where the figure numbers parts, so does the diagram (oil). Descriptions from
   T6BDriver decks; NATOPS is the authority; EP steps from TO 1T-6B-1CL-1.
5. Voice: short, plain, lead with the number. Placards in caps as on the aircraft; modal prose in
   sentence case. Never round a figure. EP entries are checklist steps only. **EICAS entries are
   minimal**: `label` is the exact message (no severity — `color` has it); `cause` is one sentence;
   `response` names the EP and stops.

**Styling**: light theme only. `const C = { ...THEME, ...LOCAL }`. Red/amber/green only for
warning/caution/advisory (except hardware placarded that color, e.g. OBOGS levers). Flow-line `d`
is authored in flow direction. A line is colored only when its fluid is in it, and only segments
with real flow animate. Animate a valve only when something on the diagram commands it. Unknown
connections are plain `sense` lines, not wires. Each EICAS message gets its own wire entering level
with it. Dark fills only for instrument faces (gauges, screens). One flow idiom: saturated conductor
+ white dashes; signals use `El`. Static chrome built at module scope. `sims` entries carry
`col`/`row`. Legend only when >2–3 line functions (`fuel`, `elec`).

## Discussion Items

Community-edited pages distilling JPPT **Discuss Items** into what a student says at the brief table.
Code in `src/components/discuss/` (route shell `Discuss.js`, `ItemPage.js`, `EventHub.js`,
`BlockPage.js`, `CourseFlow.js`, `StageNav.js`, `SearchBox.js`, `GENERATED.js`,
`SyllabusContext.js`, `edit/`, `jppt/` parser, `upload/`), backend `lambda/discussApi/`.

### Server

- **Content lives on the server, not the repo.** Every item page and syllabus is a revisioned
  DynamoDB row written through `lambda/discussApi`, mirrored to S3 as gzipped JSON
  (`items/index.json`, `items/<slug>.json`, `syllabi/index.json`, `syllabi/<id>.json`). The site
  reads only the mirror (`cache: 'no-cache'`); no Lambda on the read path. A page edit is a POST
  `save-item`, not a repo edit. Archived seed files in `_reference-docs/.../discuss-items-archive/`
  are migration source only.
- **Local dev**:
  ```
  node tools/discuss-dev-server.js --reset
  DISCUSS_ADMIN_TOKEN=dev node tools/discuss-migrate.js --api=http://localhost:8787/discuss --mirror=http://localhost:8787/mirror --verify
  DISCUSS_ADMIN_TOKEN=dev node tools/jetlog-migrate.js  --api=http://localhost:8787/discuss --mirror=http://localhost:8787/mirror --verify
  ```
  then (PowerShell) `$env:REACT_APP_DISCUSS_API='http://localhost:8787/discuss'`,
  `$env:REACT_APP_DISCUSS_MIRROR='http://localhost:8787/mirror'`, `$env:PORT=3100`, `npm start`.
- **Writes are revisions.** `DiscussItems` (PK `slug`, SK `rev`; meta row at rev 0). A save is
  conditional on `baseRev` being newest → stale gets 409. Nothing is deleted; undo = restore from
  History. `DiscussSyllabi` (PK `syllabusId`, SK `rev`, `docJson`); Delta is `delta-primary`.
- **Open editing**: optional display name, required summary. Admin ops (`import-items`,
  `import-syllabus`, `hide-item`, `hide-syllabus`, `rebuild-index`, `tag-program`, `set-author`)
  need `X-Admin-Token`. A revision you publish for someone carries their name, never Claude's
  (`tools/discuss-set-author.js` corrects slips).
- **No lint on save** — the server checks shape only (ids, citations, figure alt, even table rows);
  prose rules in `tools/lib/discussRules.mjs` are CLI-only.
- **Every page and syllabus carries `aircraft` and `school`** (`requireProgram` in `http.mjs`);
  entered via `ProgramFields` (`edit/fields.js`), guessed by `guessProgram`. `DEFAULT_PROGRAM` is
  T-6B/Primary.
- **Create page** makes a stub and can relink an event row in the same request. **Figure upload**:
  WebP in browser → presigned PUT under `figures/<slug>/` (Safari refused).
- **Deploy**: one push to `main` deploys both Lambda and site. Function, tables, bucket and API
  route are created by hand once (`lambda/discussApi/README.md`).

### Mounts and programs

`Discuss` takes `base`, `school` and a built-in syllabus: Primary (`/tw4/discuss`, Delta), NIFE
(`/nife/discuss`), Advanced (`/t44c/discuss`, draft). A page is identified by (school, slug).
Advanced has two syllabi, `t44c-p8` (1542.168C, default) and `t44c-e2d` (1542.175D), both
`T-44C`/`Advanced`, sharing one corpus — never put the community in `school`. Seeded by
`tools/t44c-syllabus.js` (a new school can't be bootstrapped via the site because its built-in
syllabus is required).
- **A seed tool seeds once.** It publishes the whole generated document, so re-importing puts
  the traced chart back and throws away every hand repair — which is most of what the flow
  editor exists for. `t44c-syllabus.js` therefore has no `--replace` and stops on the server's
  409; after the seed, a correction is an ordinary revision made on the site.
  `discuss-migrate.js --overwrite` can still do this to Delta, whose chart also has hand repairs.

### Routes (`/tw4/discuss` shown)

`/` All Events (flow chart + nav) · `/e/:event` event hub · `/b/:block` block page · `/:item`
item page (canonical) · `/:item?from=N3101` with event context strip · `/:item/history`
(`?rev=N`) · `/upload` · `/edit` Delta flow editor · `/s/:syllabus` generated syllabus (with
`/b/`, `/e/`, `/edit`). Declare new routes before the `:item` catch-all. **An item has exactly one
URL**; event context is only `?from=`. Never route an item under an event. There is no flat item
index — items are reached via event, block or search.

### Syllabus model

- **One page per discuss item, never per event.** Pages are keyed by canonical slug; each event
  stores its own JPPT wording as the row `label`. An event owns no content.
- A syllabus document has `stages`, `blocks` (skeleton, each with `briefed`) and `events`. Stage and
  block are derived from the event id. Block array order is **JPPT flow order**, not numeric (FAM61
  before FAM13). A/B variants collapse to one event (`PR0102`). `doc.events[].block` is unreliable —
  read a block's events off `doc.blocks[].events[]`.
- **Special Syllabus Requirements**: `events[].ssr` (and `blocks[].ssr` when the JPPT gives one
  sentence for the whole block), verbatim from the block's `3.` section, shown on event and
  block pages. NIFE's two (C4101, C4102) are typed in `tools/discuss-jppt-fields.js`, since the
  MCG isn't a JPPT the parser reads.
- **Syllabus notes** are block-wide: a lettered list, stored as `blocks[].syllabusNotes` (one
  string per item, letters dropped) and shown lettered on the block page only. An event's own
  notes are the lines that start with its id (laid out like SSRs) → `events[].syllabusNotes`,
  shown on its event page. An id followed by a lowercase word ("FAM0201 has no…") is a block
  sentence. `tools/discuss-jppt-fields.js` rewrites both fields (and SSRs) on published
  syllabi from the PDFs, changing nothing else; before 2026-10-01 every event carried its whole
  block's notes run together, and Delta's were migration-era paraphrases.
- **Event row shapes**: `{ slug, label }` page; `{ href, label }` elsewhere on site (a "PSM tab");
  `{ label }` no page yet (tagged, offers Create page); `{ label, noPage: true }` deliberately no
  page (no tag, skipped by re-match). These two are different facts — never collapse them, never
  delete a row. `rowTo()` returns null for both; every consumer must tolerate that.
- **Briefed gate**: `hasDiscussItems()` / `briefedBlocksIn()` / `briefedEvents()` are the single
  gate — never re-derive. It's a per-block flag, not a rule (every derivation is wrong); correct it
  against that block's own JPPT entry only. An unbriefed block appears only (faded) on the flow chart;
  its block page still renders. Briefing is still per event within a block.

### Course-flow chart

Generated from the JPPT's flow figure (`tools/extract-jppt-flow.py` / `jppt/flowExtract.js`) —
regenerate, don't hand-edit fixtures; the live flow is edited in the flow editor.
- Three states that must stay distinct: has a page (full), items but no page (tinted, link), no
  items (faint, no link). Unlinked boxes paint first so links' borders win.
- A box is a block; a lone event with a row links straight to it, else the block page. `kind`
  decides shape and stroke weight; colour carries only coverage. A–F connectors navigate nowhere —
  clicking lights same-letter circles.
- Static chrome memoized per syllabus. The chart scrolls in `.discuss-flow` (`overflow-x: auto`,
  SVG `min-width`).
- **Multi-community syllabi** (T-44C): `doc.flow` stays the one course flow; `doc.postFlows` holds
  each community chart (`{ id, label, band, VIEWBOX, NODES, LEGEND, EDGES }`), picked by a second
  dropdown (remembered per syllabus) that drives the chart and course summary only.
  `syllabusStats(doc, platform)` counts that community's blocks and matches its Course Data row
  exactly-then-by-containment (ambiguous = none); a community with no row takes its band sibling's
  (E-6 → P-8), else shows none. `t44c.test.js` pins the published totals. Community charts have
  `LEGEND: []`, borrow the core chart's categories, and draw at the core scale.
- Legend captions may sit inside keys (`LEGEND[].inside`, centred and wrapped) and in multiple
  columns; `CourseFlow` widens the viewBox for captions.
- **A label that doesn't fit its shape wraps** (`discuss/flowText.js` `fitLines`, drawn by
  `CourseFlow`'s `Label`), breaking where the halves come out evenest, as the publication breaks
  SERVICE-SPECIFIC / COURSE FLOW and its inside captions. A **single word never breaks** — an
  event id is one token. Width is estimated at ~half the type size per character and a curved
  shape gets less of its box (`USABLE`); keep the estimate forgiving, since breaking a label
  that would have fitted looks worse than a hair of overrun. It lives apart from `CourseFlow.js`
  because that file imports react-router-dom, whose v7 exports map CRA 5's Jest cannot resolve —
  which is also why `App.test.js` fails to run.
- Tracer facts to preserve (in both Python and JS): separators are typed dashes; subpaths closed
  with `s`/`b` must count as closed; arrowheads that repeat their first point must dedupe it (else
  every arrow reverses); edge ends snap onto box sides and add an orthogonal step rather than make a
  diagonal. Never "simplify" the extractor into a regex sweep or dedupe arrowheads by position. Run it
  as `PYTHONIOENCODING=utf-8:replace python tools/extract-jppt-flow.py`.
- Landing tiles name a school's syllabi by what differs (`platformName`, `coveredBy`). A school
  whose syllabi run to different lengths gets a **course-length row of its own**, with the unit
  said once at the left and each figure centred over its own communities, parted by a rule
  (`.landing-weeks`); the list is plain commas, no "and". The two groups never wrap apart — the
  rule means "between" and would start a line.

### Generated syllabi (Submit a new JPPT)

- The PDF never leaves the browser; `jppt/parseJppt.js` produces the document. `pdfSource.js`
  (pdf-lib, `ParseSpeeds.Fastest`), `flowExtract.js` (line-for-line port of the Python —
  `jppt.test.js` requires it reproduce `FLOW.js` exactly; change both together), `pdfText.js` /
  `pdfWorker.js` (pdf.js **3.11 legacy**; 4.x breaks CRA 5), `syllabusExtract.js`,
  `courseLength.js`, `matchItems.js`.
- Extraction rules: media/title boundary is the media column's span; a range-only event id must
  appear in the block's own `2. Events` table; items split on commas outside parens, keeping known
  multi-comma wordings.
- All syllabi render via `fromDoc()` → `buildSyllabus()`. Delta is `builtIn: true` (keeps `?from=`).
  Item pages are shared (`/tw4/discuss/:slug`, never under `/s/`). `fromDoc` re-matches unmatched
  rows on load; Delta is never re-matched.
- `buildMatcher`: exact → plurals → spaces → token Dice ≥ 0.8 → containment. `suggest()` is a
  separate, looser, rarity-weighted pass for the **Items** tab (`upload/LinkReview.js`), never
  auto-linked. Keep the two stems separate. Items tab answers: pick a page, **New page**, **Link
  another page** (split into one row per page), **No page**; **Other page** hides the typed box.
- Upload is a walk-through: `FlowEditor review` → items → preview → **Publish** only on Preview.
  Editing a published syllabus saves from anywhere. Drafts in localStorage.
- Flow editor (`upload/FlowEditor.js`, `flowOps.js`, tested in `flowOps.test.js`): arrows stay
  orthogonal (dragging a corner drags neighbours, squaring a crooked segment too; ends slide on
  their box's sides). Mid-segment handles add corners; a corner is removed by selecting it and
  pressing Delete or **Remove corner** — **not** a double-click, because `setPointerCapture`
  retargets the pointer to the `<svg>` and the gesture fires once and then never again.
  - A dragged end **settles on the middle of a side**; one merely carried along by a corner's
    squaring must not, or the snap puts back the bend just taken out.
  - An end follows a corner only as far as its own box reaches, then holds — that slanted segment
    is the cue to add a corner. The **last** corner comes out only where the boxes overlap on an
    axis (re-laid as that straight line); on the diagonal it is refused, and the editor greys the
    control by asking `removePoint` whether it would do anything.
  - **Arrows meet other arrows**, at either end: I3501-2 puts its head on the trunk into I4401-3,
    and the stub into the E-2D's B connector leaves the trunk below G0701-2. `joinEdge` draws the
    first, `branchEdge` the second. `from`/`to` always stay **boxes** (`joinTo` takes the host's
    destination, `joinFrom` its source), or `orderBlocks` and the checks can't read the arrow;
    `joinFrom`/`joinTo` say only that one drawn end sits on an arrow, so `seatEnds` and `dragEnds`
    leave it alone and `removePoint` may move it.
  - A join meets its host **at a right angle** — alongside it reads as two arrows drawn on each
    other. The click picks only the length; along it the foot goes level with the box (one straight
    line, as the publication draws), else that length's middle. The host's own coordinate is taken
    **unsnapped**, or the join sits a tenth beside the line.
  - The connect button's wording changes twice mid-gesture, so it carries a `min-width`: without
    one the toolbar reflows under the pointer and the second click lands on the wrong thing.
- `checks()` asks every chart (core + `postFlows`) whether a block is drawn, or blocks after the
  split report as missing.

### Page content model and Manual of Style

An item page: `lede`, `numbers` infobox, `sections`, optional `seeAlso`, `references`, optional
`note`. Sections may have `subsections` (H3, same fields; two levels max). Every section, item and
number has a stable id (`cp-04`) — **add ids, never rename or renumber them**.

- **Lede** summarizes the page, no heading, and is not repeated in the body.
- **Headings**: sentence case, noun phrases, unique, unnumbered, no questions/second person/markup,
  don't restate the title. Titles are noun phrases even when the JPPT phrase isn't.
- **Hatnotes**: `section.main` / `section.further`. **Appendix order**: body, See also (internal,
  not already linked), References.
- **Page name vs label**: hatnotes/See also/search show the page `title`; an event hub and its
  prev/next strip show the row `label` (edited to read as a capitalized name). Two rows resolving to
  one page is normal.
- **Subsections**: demote a section whose scope is inside a sibling's; promote the members of a
  section that names a set. Keep original ids on the subsections when restructuring.
- **Squadron/wing material** goes in a section titled exactly as the `work` name (`TW-4 SOP`,
  `VT-27 SOP`, `VT-28 SOP`, `TW-4 Formation Supplement`, `TW-4 Briefing Guide`) — one per page. A
  minority of local material: one section last, but before `Common errors` (which is always last).
  Local throughout: SOP sections are the top level. Fleet-wide rules an SOP repeats stay in the body.
  CNAF 3710-only rules go under `CNAF 3710`; students are held to their own publications first.
- **`**bold**`** is the only inline markup (lede, paragraph and list text), for mnemonics.
- **Numbers**: `label` + `value`, terse, must contain digits, units spelled as spoken
  (`210 knots GS`). Consecutive same labels render once. Figures recalled in the air belong; ground
  calculation outputs don't. Box is content-sized — never fixed width, `table-layout: fixed` or
  `nowrap`.
- **Figures**: `{ id, src, alt, caption, refs }` or `images: [{ src, alt, label? }]` (carousel;
  never both). `alt` required and distinct from caption. Don't add before the file exists. A
  publication's own figure is cropped and uploaded as-is, captioned with its figure number — don't
  redraw.
- **Prose or list**: prose by default. Lists only for a parallel set, a sequence (`numbered: true`),
  or scan-under-pressure lookups. Consistent grammatical form; a >2-line bullet is a paragraph.
- **Link items**: any EP wording (incl. critical-action variants) is an `href` row to
  `/tw4/eps-limits`, displayed as "Any critical action emergency procedure", not searchable
  (`LINK_ROWS`). A named EP is a page with a `Procedure` section (`ep: true`, NATOPS steps verbatim,
  NWCs as `kind: 'warning'|'caution'|'note'` entries where NATOPS puts them; styles copy
  `NWC_BUBBLE_STYLES`). Shared procedures live on an umbrella page (`abnormal-starts`) with `main`
  hatnotes. Day/night emergency items are pages.
- **Generated items** ("any previously discussed maneuver" etc.) use a `generated` spec instead of
  `sections` (`true`, `{ stage }`, `{ all: true }`, `{ block: true }`), built by `GENERATED.js`
  from the reader's last-opened syllabus. CS spans all stages. Maneuvers are flagged
  `maneuver: true`. Never type the list into the page. A differently-worded question gets its own
  page.
- Night/variant items get their own page carrying only the deltas.

### Sourcing and prose

Writing a page is **compilation, not composition**. Every sentence is either (1) source text,
verbatim or trimmed, or (2) a plain structural sentence asserting nothing beyond a source. Anything
else is deleted.

- Keep the source's register and vocabulary (second person, prescriptive) — fidelity beats uniform
  voice.
- **Banned**: X-not-Y antithesis; verbless emphatic fragments; personifying aircraft/controls;
  editorial framing ("the point is", "note that", "in practice"…); unsourced comparative judgments;
  aphorisms; colloquial verbs (chase, grab, fight, ride…); tricolon/repetition for rhythm.
- Em dashes: prefer period/comma/colon in rendered text (advisory, not a ban).
- **No invented topic sentences or closing summaries.** Leave gaps between sourced facts unbridged.
  If a section needs composed prose, it lacks sources and shouldn't exist. The lede is assembled
  from source opening sentences.
- One item per page; sibling material gets a clause and a link at most.
- **Removals are rulings.** Read history summaries before rewriting; don't restore removed material.
  Retired content is in `RETIRED` in `discussRules.mjs` (lint `retired-content`); add an entry
  when a removal is a ruling.
- Conversion: FAM, F, N, CS stages and I21/22/31/32/61/62/63 are done; I41–I44 are not. A clean
  lint is not proof a page is compliant.

**Content ethos**: the JPPT sets the items (don't invent, merge or rephrase). Write less than feels
complete. **Order of work: start from the gouge** (`_reference-docs/T6b Primary/Discuss Items/`) for
scope, depth and order; take sentences from the publications; apply MOS; then cite every claim.
Authority: NATOPS > TO 1T-6B-1CL-1 > stage FTI > wing/squadron SOP > AIM/FIH. Fix gouge errors
against the publication. **The gouge is never cited, named or mentioned on the site.**

**Citations**: blocks carry `refs`; a section whose blocks share one ref collapses to a SOURCE line
(set `refs` on the section). Reference format:
- `{ n, work, loc, pages }` — the section and its **first** page only: `{ work: 'VNAV FTI', loc:
  '§403 — Chart Preparation', pages: 'p. 4-5' }`. § not ¶; no `§403.2`; no sub-parts in `loc`.
- NATOPS: `Ch. N — Section` (`Ch. 1 — Head Up Display (HUD)`, `Ch. 8-2 — …`, `Ch. A3 — …`).
- Dates come from `discuss/works.js`; set `date` only for an unlisted work or other edition.
- `work` has no document numbers and one unambiguous name (`Delta JPPT`, `VT-27 SOP`, never
  `JPPT` or `Squadron SOP`). One entry per section. Ranges use "to" (`pp. 4-5 to 4-9`).
- **Every block cites or carries `unsourced: '<why>'`** (≥10 words; section-level covers children).
  Never invent a citation. Stubs carry `sourcingLead`.

### Reading reference PDFs

`pdftotext -layout` for prose only. It silently loses glyphs (U+FFFD: degrees, **fractions**,
bullets), shears table columns, and returns nothing for image-only pages. `VT 27 SOP.pdf` /
`VT-28 SOP.pdf` are OCR — a finding aid only. **Every table, fraction and figure: render the page**
(`pdftoppm -f N -l N -r 150 -png in.pdf out`) and read it. NATOPS WARNING/CAUTION labels and daggers
are vector art — render to classify NWCs.

### Styling and edit layer

- Global `.discuss-` classes in `style.css`; no inline styles (the chart included). Site palette.
  Quiet ref markers. Numbers table and chart scroll in their own containers; the body never scrolls
  sideways. Inside `.sub-navbar`, style spans with two classes (`.discuss-search-result .discuss-search-x`).
- `edit/`: `[edit]` per heading/infobox, `[edit page] [history]` by the `<h1>`. Drafts in
  localStorage with `baseRev`, merged over the record in `ItemPage`, published via `PublishDialog`;
  409 keeps the draft. `PageEditor` embeds `SectionEditor`s and `NumbersEditor` (`embedded`, one
  Save). **Keep Save and Publish separate**; Save scrolls to and focuses the draft banner's Publish.
- UI words are for students: no rules, no maintainer vocabulary (stub, slug, hatnote, lint), no
  ids shown. "+ source" adds a reference where it's cited.
- **Ids**: never typed, never shown, never renumbered (`ids.js` scans the whole page). New section
  ids derive from the heading while `__new`, fixed on first save. References are the exception: `n`
  equals position, and reordering rewrites all `refs` (`remapRefs`).
- `validate.js` checks structure only — not a lint port. Errors block Save; warnings don't.
- No `window.confirm/alert` — `ConfirmButton`, `RowTools confirmRemove`; unavailable actions are
  disabled with the reason in `title`. One editor open at a time. `.discuss-editor` has `clear: both`.
  Drafts show only in `ItemPage`, never in nav/search.
- To do: a student-facing style guide page linked from editor footers.

## Shared jet logs

Community-edited presets on the same server/model (revisions, 409, no deletes). Transport in
`src/components/serverApi.js` (shared with `discussApi.js`); UI in `src/components/jetlogs/`;
ops in `lambda/discussApi/jetlogs.mjs`. Table `JetLogs` (PK `logId`, SK `rev`), mirrored to
`jetlogs/index.json` (name/filing/mode only) and `jetlogs/<id>.json` (fetched on apply, prefetched
on hover).
- Meta row stores name as `title` and filing in `flags` (`name`/`group`/`mode` are DynamoDB
  reserved words; `fakeAws.mjs` `RESERVED` mirrors that).
- Group → folder. `JETLOG_GROUPS` is a constant so empty groups exist; folders in curriculum order.
  Free text server-side (no enum). Group/folder live on the document, so restore/refile are revisions.
- `params` is an allowlist (`ROUTE_PARAM_KEYS`) — never capture the pilot's own fuel/STTO. Applying
  resets route params, then applies the log's.
- A 409 offers to publish over (one atomic document; history keeps both).
- `tools/jetlog-seed.json` is the migration record only; `import-jetlogs` stores documents verbatim.
- **My jet logs** stays localStorage-only.

## NIFE Questions

`/nife/questions`: a community quiz on the same server. Ops in `lambda/discussApi/questions.mjs`,
table `NIFEQuestions`, mirrored to `questions/nife/approved.json` and `pending.json`. UI in
`src/components/questions/` (`questionsApi.js` holds every server call); `Questions.js` keeps the
quiz. `node tools/questions-api-test.mjs` runs the ops against the fakes.
- `status` is the lifecycle (`pending`/`approved`/`rejected`/`merged`); nothing is deleted.
  The old function deleted rows, which is why pre-2026-09-24 edit lineage is gone.
- **A question keeps one id for life.** Approving an edit merges it in: the question takes the
  edit's words (`explanation` included), its score restarts at 0, and the old words and score go
  onto `history` (GET `question-history`). `replaced` rows are from the 2026-09-24/25 interim;
  `fold-replaced-questions` (admin, dry run by default) folds them into history.
- The server decides approval at net +5/−5; one vote per browser id, **never per IP** (a whole
  apartment complex shares one address). Downvotes never remove a live question.
- A pending vote is `approve`/`reject` (`better`/`worse` for edits). Before 2026-09-25 the
  thumbs sent `good`/`bad`, counted as rejections; the server now reads them as approve/reject.
- **Topics and lectures are a document** (`questionSections.mjs`, table `QuestionSections`,
  mirror `questions/nife/sections.json`, UI `questions/sections.js` + `SectionsPage`), anyone-edits
  with revisions like jet logs. A saved section or lecture id is never removed: the server
  refuses a save that drops one; retire it instead (hidden with its questions everywhere).
  Submit/edit are checked against the list. `TOPICS` in `questionsApi.js` is only the fallback.
- A quiz numbers and scores only the questions drawn at its start. After every 5th, one pending
  item may follow as an unscored "Bonus review" (`PendingCard`); it never replaces a drawn
  question. Review pending (`PendingQueue`) walks the whole queue. A live question at net ≤ −10
  prompts an edit once answered. `pending.json` carries `threshold`.
- Bulk upload (`/nife/questions/upload`, `parseUpload.js` + tests) reads spreadsheet paste, CSV and
  Quizlet exports into pending via `submit-questions` (≤100, shared `batchId`). A question has a
  link, `/nife/questions/q/<id>`. Explanations for disputed questions come from
  `tools/question-explanations-drafts.json` via `tools/questions-submit-explanations.mjs`, as edits
  (all 30 live since 2026-09-27). An explanation copies the NIFE guide's wording without quotation
  marks, cites a section (never a page), and uses no semicolons or dashes.
- **CORS preflight is answered by API Gateway, not the Lambda** (OPTIONS on `/discuss/{proxy+}`).
  A new request header needs the maintainer to add it to Access-Control-Allow-Headers and redeploy
  the stage, or browsers refuse the call ("Could not reach the server") while curl and the dev
  server work. Say so in the PR.
- Admin ops need `X-Admin-Token`; the panel (`?admin`) asks for it once. Its tabs: Pending
  (diffs, bulk), Live (hide, restore a version), Removed (put back, send back for a vote).
  `hidden` is a status; `tools/questions-report.mjs` lists duplicates, lowest scores, queue.

## Docs and Useful Links

`/nife/docs` (`Docs.js`) and `/tw4/docs` (`TW4Docs.js`) are one page, `docs/DocsPage.js`; each
file only passes its school's topics, program and localStorage keys (keep the keys as they are —
they hold the votes browsers have already cast).
Data is not in the repo: `lambda/submitDoc` over tables `NIFEDocuments` / `NIFELinks`, behind
API Gateway resources declared one path at a time (an unknown path 403s before reaching the
Lambda, so a new op is a console change — or a new `voteType` on an existing path).
- **Outdated votes** (`src/components/docs/Outdated.js`): anyone votes an entry outdated, *still
  useful* or *obsolete*, one vote per browser, through `vote-document` / `vote-link` with
  `voteType: 'outdated'`. Counts `outdatedUseful` / `outdatedObsolete`, latest reason
  `outdatedNote`, last vote `outdatedAt`. A vote of either kind shows the orange **Potentially
  Outdated** badge, and 3 votes in total (`CONFIRMED_AT`) a red **Outdated** one. Potentially
  Outdated clears 45 days after the last vote (`OUTDATED_FOR_DAYS`); Outdated never does; the list order is left alone. A useful
  vote cancels an obsolete one, and `get-*` stop listing an entry once obsolete − useful ≥ 3
  (`REMOVE_AT`, in the Lambda and the component both). Nothing is deleted.
- Links show `submittedAt`, docs `uploadedAt`: the date added, not the material's own date.
- Local: `node tools/docs-dev-server.mjs` (port 8788; copies the live lists read-only on first
  run, writes to gitignored `_docs-dev/`), then `$env:REACT_APP_DOCS_API='http://localhost:8788'`
  before `npm start`. Opening a document does not work locally (no S3).

## Briefs

`/tw4/briefs` (and `/nife/briefs` via `BriefsPage` with `base`, `school`, `told`). Code in
`src/components/briefs/`, ops in `lambda/discussApi/briefs.mjs` (table `Briefs`, PK `briefId`,
SK `rev`); same revision/409/history model. No seed — briefs come from uploading the guide.
- Document: `{ id, title, short, aircraft, school, order, note, source, sections: [{ id, title,
  column, break?, fixed?, text?, items: [{ id, label, fixed?, subtext?, text }] }] }`. Plain text;
  nesting is two-space indentation; `**bold**` only.
- `fixed` = always shown, not clickable (item or whole section). `subtext` = lines shown under an
  item's name.
- `parseBriefGuide.js` reads both the expanded guide (content) and the card (names/layout), matching
  by title then order; mismatches warn, never guess. OCR text → use `loadTextItems` raw runs. One
  general `readOutline` — never add a per-guide reader: a marker's style (`1.`, `(a)`, `i)`,
  bullet…) plus its indent and count decide its level, so TW-4, NIFE, T-44C and the TW-5 FWOP
  appendix (pp. 196-202) all read the same way; names by bold run, wraps by right margin, running
  heads/page numbers dropped by repetition. Untitled pages are one brief the uploader names.
  Cards (layout) are read by the same outline reader once `columnsOf` splits the gutters (side
  tables like TW-5's KIO list dropped); `fillCard` fills each card item from the guide by name
  (`nameScore`: acronyms, reordered words), at any depth, else by position. The upload takes an
  optional **abbreviated guide** file as the card — TW-5's expanded guide misnests its outline,
  so its card is the layout. Reading TW-4's guide and card as two uploads equals reading it whole
  (tested).
  `source.unit` rides in the index as `unit`; a school with 2+ units gets the wing dropdown
  (remembered as `briefUnit-<school>`), and upload never replaces across units. Bold lead-ins per card rules;
  `repeatsCard` makes card-duplicate items inert; `dropDuplicatedRules`.
- First-letter mode hides only unfixed item `text`; `briefWords` counts the same way.
- Editing is in place (`[edit]` per block, one publish bar). UI words: **Title**, **Text**,
  **Always Expanded** (`fixed`; ticking it on a section writes its items into the text box),
  **Subtitle** (`subtext`), **New Page** (`break`).
- A new edition replaces matching briefs (by id, then stages) as new revisions; unwanted briefs
  (Solo) left unticked. Replacement preview diffs via `briefDiff.js` (display only).
- `source` (`unit`, `date`, `publication`) required; filled from the guide where stated
  (`programFor`, `unitFrom`), otherwise blank — never guessed. School box = `programs.js` programs
  with `briefs: true`.

## EPs/Limits

Shared parts in `src/components/epsLimits/` (`EPsLimitsShell`, `EPDrill`, `useLimitsDrill`,
`CockpitPoster`, `ActionButtons`, `controlMatch`, `stepFlow`, `SpotEditor`), leaderboard in
`src/components/leaderboard/` + `lambda/discussApi/scores.mjs` (table `EPsLimitsScores`; add new
schools to `SCHOOLS` and redeploy). Data: NIFE `Flight/c172Data.js`, `c172Poster.js`,
`C172Limits.js`; Advanced `T44C/t44cData.js`, `t44cPoster.js`, `T44CLimits.js`. Grading in
`utils/answerUtils.js`. Tools: `tools/crop-posters.py`, `tools/check-posters.js` (acceptance test —
run after any poster/EP edit; fails on NO CONTROL, NO SETTING, CANNOT FINISH).

- **Primary (`TW4EPsLimits.js`, `TW4Cockpit.js`) is the reference and is left alone**; only its
  shell and leaderboard are shared. NIFE and Advanced use `EPDrill`.
- EP format: `{ id, title, rows }`; rows are steps `{ id, critical, concur?, text }` ("Control -
  SETTING"), `{ decision }` or `{ note }`.
- Games end only when all correct; leaderboard ranks time; every run a row; best per window (UTC).
- Look and behaviour match Primary: `.epl-*` copies Primary's inline styles value for value. Button
  row under Previous/Next: Order, Skip, All Answers, Check, Reset, (Auto NWC). Game mode shows only
  Check. Skip/Hint take the first empty or partial box. Enter checks. Markings persist until
  retyped/rechecked. Card hugs its steps; its slot is sized to the tallest EP by measuring.
- **NWCs**: `nwc` map keyed by step id (EP id = before the procedure); only critical-action NWCs,
  deliberately. Modal shows the whole procedure's numbered, closed chips; `nwcHints` optional.
  Modal is portalled — CSS hangs off `.epl-nwc-modal`. Three copies of the NWC box styles
  (`NWC_BUBBLE_STYLES`, `.epl-nwc--*`, `.discuss-nwc--*`) — change together.
- **Limits tables are bespoke per school**; behaviour via `useLimitsDrill(answers, groups)`. Sheets
  never reflow and never scroll sideways: fluid, no min/fixed width or nowrap; alignment read off
  `pdftohtml -xml` coordinates. `gradeLimit` keeps minus signs and reads ranges; `gradeAnswer`
  ignores order/stop words (stop-word-only keys compared literally).
- **Posters**: a control is `{ action, also, values, label, box? }`; with `box` a hotspot (fractions
  of the region image), without one a button. `values` lists every setting the EPs use; a click
  fills the open step's own answer or marks it red — it never cycles settings (`stepFlow.js`:
  `openStep`, `clickOutcome`, shared with Primary). `fill` adopts the target step's spelling.
  `also` = other spellings of one control; a target serving several steps uses `actions: [...]`
  and per-control `values` maps (`valuesFor`).
- **Never chop up a schematic**: regions are whole sub-panels; a too-small control means a bigger
  poster. Place panels where they are in the aircraft. Every panel a step touches is on screen.
  Hint/Skip `reveal` the region (a counter); CockpitPoster switches region during render.
- Posters show the aircraft students fly (C172P). Undrawn controls become buttons, never invented
  targets; an instrument the step is worked against may be a target, but never as a stand-in for an
  undrawn control. Check NATOPS before deciding a control isn't drawn. Boxes go on the control,
  not its region.
- `?spots[=region]` (dev) opens `SpotEditor`; `?boxes` outlines targets.
- T-44C: critical-action steps only, checked against NATOPS. Site
  follows NATOPS over the exam sheet in two places (`Firewall Valve`, `Prop Lever - Full Forward`);
  otherwise reproduces the sheet's style. 118 limits verified; three stored as min/max pairs.

## About pages and stats

`about/SchoolStats.js` + `about/stats.js`; each tab's `stats` in the page's `CONTENT`. Everything is
counted from data, never typed; missing figures are omitted, not zero. Flights/sims counted by
event number ≥2000. `pickCourseRows` chooses course-length rows per school. Server-side figures are
seeded from `about/serverStats.js` — **re-run `tools/about-stats.js` after publishing**. It loads
`stats.js` via `tools/lib/loadSrc.js` (Babel CJS, no JSX), so shared counting stays pure in
`stats.js`. `about/platforms.js` is a hand-kept per-aircraft table; to do: a single platform
registry.

## Tools

- `tools/convert-images.py` — PNG→WebP for `public/`, archives originals (Pillow; `--dry-run` first).
- `tools/discuss-inventory.js` — regenerates `discuss-inventory.md/.json` from the mirror; use it to
  sweep a new reference publication across all items. Never hand-edit.
- `tools/discuss-audit.js` (local, gitignored) — checks pages against the PDFs they cite (composed
  sentences, unsupported/off-page numbers). Advisory; findings mean "open the book".
- `tools/discuss-lint.js` — heading, prose, citation and id rules (`tools/lib/discussRules.mjs`).
  Flags: `--stage`, `--slug`, `--headings-only`, `--prose-only`, `--list`, `--from`, `--strict`.
  Errors: `unsourced-block`, `thin-justification`, `retired-content`, lost section ids. Prose rules
  are advisory, and a clean run isn't proof of compliance. `NOUN_ING` and `PROPER` are heading
  allowlists. **`--snapshot` writes `tools/discuss-ids.json`**: snapshot before an editing pass,
  never during.
- `tools/t44c-syllabus.js`, `tools/nife-syllabus.js` — seed syllabi via `import-syllabus`. They
  seed and do not republish; see Mounts and programs.
- `tools/extract-jppt-flow.py` — see Course-flow chart.
- `tools/weekly-report.mjs` — prints the weekly community-activity report that the `weeklyReport`
  Lambda emails on Sundays (`lambda/weeklyReport/report.mjs`, shared; setup in its README). Keeps
  its own vote snapshot in gitignored `_weekly-report/`, so local runs never change the email.
