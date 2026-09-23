import React from 'react';
import { Link } from 'react-router-dom';
import { useDiscussBase } from './paths';

// The style guide, written for whoever is about to add a section to a page.
//
// It is a page on the site rather than a hint in the editor, because the editor's hints say
// what a box is for and stop there: a hint that explained the reference format would be
// longer than the field it sits under. Every rule here has to be readable by a student who
// has never edited the site before, so nothing in it names a file, a rule, a tool, or any
// word from this repository's vocabulary. If a sentence on this page reads like an
// instruction to whoever maintains the site, it is in the wrong place.
//
// The examples all name real pages and are linked. Keep them that way: an example someone can
// open settles an argument that a made-up one starts.

const SECTIONS = [
  { id: 'what-a-page-is-for', title: 'What a page is for' },
  { id: 'where-the-sentences-come-from', title: 'Where the sentences come from' },
  { id: 'headings', title: 'Headings' },
  { id: 'prose-or-a-list', title: 'Prose or a list' },
  { id: 'parts-of-a-section', title: 'Parts of a section' },
  { id: 'squadron-and-wing-rules', title: 'Squadron and wing rules' },
  { id: 'where-a-section-goes', title: 'Where a section goes' },
  { id: 'sources', title: 'Sources' },
  { id: 'numbers', title: 'Numbers' },
  { id: 'figures', title: 'Figures' },
  { id: 'bold', title: 'Bold' },
  { id: 'before-you-change-a-page', title: 'Before you change a page' },
];

// A page named as an example. Written once here so a retitled page is corrected in one place.
function Eg({ slug, children }) {
  const base = useDiscussBase();
  return <Link to={`${base}/${slug}`}>{children}</Link>;
}

// A right and a wrong way to write the same thing, side by side. Two lines, no prose between
// them: the pair is the explanation.
function Pair({ yes, no, note }) {
  return (
    <div className="discuss-guide-pair">
      <p className="discuss-guide-eg discuss-guide-eg--yes"><span>Write</span> {yes}</p>
      <p className="discuss-guide-eg discuss-guide-eg--no"><span>Not</span> {no}</p>
      {note && <p className="discuss-guide-note">{note}</p>}
    </div>
  );
}

function StyleGuide() {
  const base = useDiscussBase();
  return (
    <div className="discuss-layout">
      <nav className="discuss-toc" aria-label="Contents">
        <h2>Contents</h2>
        <ol>
          <li><a href="#top">(top)</a></li>
          {SECTIONS.map((s) => (
            <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>
          ))}
        </ol>
      </nav>

      <article className="discuss-page discuss-guide" id="top">
        <header className="discuss-head">
          <p className="discuss-crumb"><Link to={base}>Discussion Items</Link></p>
          <h1>Style guide</h1>
          <p className="discuss-lede">
            These pages are what a student says out loud at the brief table. This is how to write
            one: what goes in a section, how it is worded, and how to show where it came from.
            Nothing here has to be memorized before you start — the page you are fixing is
            already written this way, so follow what is around your edit.
          </p>
        </header>

        <section className="discuss-section" id="what-a-page-is-for">
          <h2>What a page is for</h2>
          <p className="discuss-para">
            A page answers one discuss item, the way you would answer it when the instructor
            asks. It is not an article about the topic and it is not the publication reprinted.
            Write less than feels complete: the sentences to cut are the ones that introduce,
            summarize or reassure, and what is left is the answer.
          </p>
          <p className="discuss-para">
            The shortest page on the site is <Eg slug="crosswind-touch-and-goes">Crosswind
            touch-and-goes</Eg>, and it is finished. Length is not the measure. If your section
            says something a student would say at the table, it is long enough.
          </p>
          <p className="discuss-para">
            Cover your own item and stop. Where a neighbouring item comes up, name it in a clause
            and link it rather than explaining it here — the student will get it on its own page,
            and two half-explanations of one topic drift apart the moment either is corrected.
          </p>
        </section>

        <section className="discuss-section" id="where-the-sentences-come-from">
          <h2>Where the sentences come from</h2>
          <p className="discuss-para">
            Every sentence on a page is one of two things: something a publication says, or a
            plain sentence that joins two things a publication says. There is no third kind.
            Writing a page is assembling it out of NATOPS, the checklist, the FTIs and the SOPs
            — not explaining the material in your own words.
          </p>
          <p className="discuss-para">
            Keep the publication's wording, including its vocabulary and its direct voice. Where
            the FTI says <em>you report the challenge, accomplish the required action, and state
            the appropriate response</em>, those are the words. A livelier verb or a more natural
            phrasing is a change to what the publication said.
          </p>
          <p className="discuss-para">
            The sentence most likely to be wrong on any page is the first one of a section,
            because an opening line written to introduce the material underneath it is, by
            definition, not from a publication. They are also where sweeping words get in —
            <em> always</em>, <em>every</em>, <em>all</em>. Open with the real content instead. A
            section may begin mid-detail, and that is fine. It ends when the sourced material
            ends: no closing summary.
          </p>
          <Pair
            yes="Maximum crosswind on a dry runway is 25 knots."
            no="Crosswind limits are among the most important numbers a student must know, and they vary by runway condition."
          />
          <p className="discuss-para">
            Where two facts sit next to each other and no publication says how they relate, leave
            them next to each other. A page that reads slightly disjointed is right; a page that
            flows because someone invented the connection is wrong. If you cannot write the
            section without making something up, there is not enough published about it, and the
            section should not exist.
          </p>
          <p className="discuss-para">None of these belongs in a sentence on a page:</p>
          <ul className="discuss-list">
            <li className="discuss-bullet">
              Framing: <em>the point is</em>, <em>what matters is</em>, <em>note that</em>,
              <em> keep in mind</em>, <em>in practice</em>, <em>ultimately</em>.
            </li>
            <li className="discuss-bullet">
              This-not-that: <em>confirmed by the gauge, not the light</em>. Say what it is.
            </li>
            <li className="discuss-bullet">
              Sentences with no verb, used for emphasis.
            </li>
            <li className="discuss-bullet">
              An aircraft that decides, wants, tries or refuses. Aircraft do none of those.
            </li>
            <li className="discuss-bullet">
              Judgments about what matters more, unless a publication makes the comparison.
            </li>
            <li className="discuss-bullet">
              Anything that sounds like a saying. If it is memorable rather than sourced, cut it.
            </li>
            <li className="discuss-bullet">
              Casual verbs where the publication has a technical one: chase, grab, fight, ride.
            </li>
          </ul>
        </section>

        <section className="discuss-section" id="headings">
          <h2>Headings</h2>
          <p className="discuss-para">
            A heading is an index entry, not a sentence. Name the subject in four words or fewer,
            in sentence case, and let the section say the rest.
          </p>
          <Pair yes="Magnetic course" no="Magnetic Course" note="Sentence case: only the first word and names are capitalized." />
          <Pair yes="Landmarks" no="Study the route" note="A name, not an instruction." />
          <Pair yes="Obstacle clearance" no="What about obstacles?" note="Never a question, and never you or your." />
          <p className="discuss-para">
            Two more: a heading is unique on its page, and it does not repeat the page's title. On{' '}
            <Eg slug="missed-approach">Missed approach</Eg> the sections are Continuation
            criteria, Procedure, Obstacle clearance, Early initiation and ATC requests — none of
            them says <em>missed approach</em>, because the title already did.
          </p>
        </section>

        <section className="discuss-section" id="prose-or-a-list">
          <h2>Prose or a list</h2>
          <p className="discuss-para">
            Paragraphs are the default. Use them whenever the sentences depend on each other — a
            rule and its example, a definition and its qualification, a method with a caveat. If{' '}
            <em>because</em>, <em>so</em> or <em>but</em> would fit between two statements, they
            belong in the same paragraph. <Eg slug="standard-time-corrections">Standard time
            corrections</Eg> is paragraphs end to end for that reason: every method is a rule, a
            worked example and a variation, and the example means nothing without the rule above
            it.
          </p>
          <p className="discuss-para">Write a list only when one of these is true:</p>
          <ul className="discuss-list">
            <li className="discuss-bullet">
              The elements are the same kind of thing and none depends on the one before —
              required equipment, the three landmark types, a set of EICAS messages.
            </li>
            <li className="discuss-bullet">
              The order is the content. Number it: a procedure's steps, a priority order.
            </li>
            <li className="discuss-bullet">
              It is looked up under time pressure rather than read through.
            </li>
          </ul>
          <p className="discuss-para">
            Inside a list, keep every element the same shape — all full sentences or all
            fragments, not a mix. Two things to watch for: a bullet running past two lines is a
            paragraph wearing a bullet, and a section of two or three short bullets is a
            paragraph someone chopped up. A section can hold both paragraphs and a list when part
            of it genuinely is a set.
          </p>
        </section>

        <section className="discuss-section" id="parts-of-a-section">
          <h2>Parts of a section</h2>
          <p className="discuss-para">
            A section can hold named parts, which show up indented under it in the contents. Use
            them when a topic has parts and none of them is a subject on its own. On{' '}
            <Eg slug="formation-position-corrections">Formation position corrections</Eg>,
            Correction method holds Correction order and Three-part corrections: two halves of
            one method rather than two topics.
          </p>
          <p className="discuss-para">
            The other case is a section that names a set and then spends a paragraph on each
            member. Those paragraphs should be the named parts.{' '}
            <Eg slug="out-of-control-flight">Out-of-control flight</Eg> has Categories holding
            Poststall gyrations, Incipient spins and Steady-state spins, so a student looking for
            the incipient spin finds it in the contents instead of reading past two paragraphs.
          </p>
          <p className="discuss-para">
            Named parts are as deep as it goes; there is no level below them. Everything on this
            page about headings applies to their headings too.
          </p>
        </section>

        <section className="discuss-section" id="squadron-and-wing-rules">
          <h2>Squadron and wing rules</h2>
          <p className="discuss-para">
            Where a rule comes from a squadron or wing publication rather than a fleet-wide one,
            it goes in a section of its own, titled with that publication exactly:{' '}
            <strong>TW-4 SOP</strong>, <strong>VT-27 SOP</strong>, <strong>VT-28 SOP</strong>,{' '}
            <strong>TW-4 Formation Supplement</strong>, <strong>TW-4 Briefing Guide</strong>. A
            student at the other squadron can then see at a glance which part of the page is
            theirs, instead of reading four paragraphs to find out the number belongs to somebody
            else.
          </p>
          <p className="discuss-para">
            <Eg slug="crosswind-limits">Crosswind limits</Eg> is NATOPS throughout and carries the
            wing's solo restrictions in a TW-4 SOP section at the end.{' '}
            <Eg slug="missed-approach">Missed approach</Eg> carries both squadrons, as VT-27 SOP
            and VT-28 SOP, because they publish the rule with different figures. Two squadrons
            with different numbers is two sections, never one paragraph carrying both.
          </p>
          <p className="discuss-para">
            Where most of a page is local — <Eg slug="scheduling">Scheduling</Eg> and{' '}
            <Eg slug="snivels">Snivels</Eg> — the squadron sections are the page and the topics
            are paragraphs inside them. Either way a page has one section per publication, not a
            VT-27 paragraph under every topic.
          </p>
          <p className="discuss-para">
            What stays in the body is a fleet-wide rule that an SOP happens to repeat. Cite the
            higher authority and leave it where it is; the section is for what the squadron or
            wing sets itself.
          </p>
        </section>

        <section className="discuss-section" id="where-a-section-goes">
          <h2>Where a section goes</h2>
          <p className="discuss-para">
            A page runs in this order: the opening summary, then the body sections, then squadron
            and wing sections, then Common errors if the page has one, then See also, then
            References. Nothing comes after References, and nothing comes after Common errors
            except those two — Common errors closes the maneuver.
          </p>
          <p className="discuss-para">
            The opening summary at the top of the page is not a section and has no heading. It
            summarizes the whole page, and it is built from the publications' own opening and
            definition sentences. A sentence that is in the summary is not repeated word for word
            further down: cut it from the section it came from, unless that would leave the
            section with nothing.
          </p>
          <p className="discuss-para">
            See also holds pages that are not already linked in the body, and nothing else.
          </p>
        </section>

        <section className="discuss-section" id="sources">
          <h2>Sources</h2>
          <p className="discuss-para">
            Every paragraph, list element, table and figure names the publication it came from.
            An uncited block is visibly uncited, which is how the next reader knows to go and
            check it. If nothing publishes what you wrote, that is the sign it should not be on
            the page.
          </p>
          <p className="discuss-para">
            Add the source where you are citing it: the citation box beside each block offers{' '}
            <strong>+ source</strong>, and typing it there adds it to the page's References and
            cites it on that block in one step. Three things go in:
          </p>
          <ul className="discuss-list">
            <li className="discuss-bullet">
              <strong>The publication</strong>, by the name people call it and nothing else:{' '}
              <em>NATOPS</em>, <em>I FTI</em>, <em>VNAV FTI</em>, <em>TW-4 SOP</em>,{' '}
              <em>VT-27 SOP</em>, <em>FIH</em>, <em>AIM</em>. No instruction number after it. Use
              the same spelling the rest of the site uses, so one publication does not end up
              under two names — the JPPT is <em>Delta JPPT</em>, because there is more than one.
            </li>
            <li className="discuss-bullet">
              <strong>The section</strong>, as the publication prints it: <em>§522 — Spin</em>.
              Use § rather than ¶, and stop at the number printed in the table of contents —
              never <em>§522.3</em>, whose numbering restarts inside every section and identifies
              nothing.
            </li>
            <li className="discuss-bullet">
              <strong>The page that section starts on</strong> — not the page your sentence is
              on. The same section then cites the same page everywhere on the site.
            </li>
          </ul>
          <p className="discuss-para">
            NATOPS numbers its chapters but not its sections, so it is cited by chapter and then
            the section's printed name: <em>NATOPS, Ch. 5 — Wind Limitations, p. 5-10</em>. The
            chapter is the page number's first half, so the appendices work the same way —{' '}
            <em>Ch. A3 — Takeoff and Landing Crosswind, p. A3-3</em>.
          </p>
          <p className="discuss-para">
            Every citation ends with the date of the edition:{' '}
            <em>NATOPS, Ch. 5 — Wind Limitations, p. 5-10, 01AUG23</em>. For the publications
            the site already knows, the date box shows it and you can leave it empty. Type one
            only for a publication it does not know, or when you are citing a different edition.
          </p>
          <p className="discuss-para">
            One entry per section: if two entries would read the same, they are one source cited
            twice. When everything in a section comes from one source, put the source on the
            section itself and it prints once at the foot instead of a marker after every bullet.
          </p>
          <p className="discuss-para">
            Where publications disagree, the order is NATOPS, then the emergency procedures
            checklist, then the stage's FTI, then the wing and squadron SOPs, then the AIM and
            FIH. You are graded against your own publications, so cite those even where the fleet
            instruction says more. Never round a published figure, and never attach a citation to
            a claim that publication does not actually make.
          </p>
        </section>

        <section className="discuss-section" id="numbers">
          <h2>Numbers</h2>
          <p className="discuss-para">
            The box at the top of a page holds figures a student has to have cold — recall, not
            working knowledge. Each row is a short label and a short value. A row that reads as a
            sentence belongs in a section instead.
          </p>
          <Pair yes="10% held 10 minutes · 1 minute" no="10% held for 10 minutes · This gives a one minute correction" />
          <Pair yes="210 knots GS" no="210 KGS" note="Spell the unit the way it is spoken." />
          <Pair yes="Minimum runway · 3000 feet" no="Checkpoint size · about a nickel" note="If the value has no digits, it is not a number." />
          <p className="discuss-para">
            A figure you work out on the ground stays in the section that explains it. A figure
            you reach for in the air belongs here even if it comes off another one: 21 knots is
            ten percent of 210, and both are in the box on{' '}
            <Eg slug="standard-time-corrections">Standard time corrections</Eg>, with the
            arithmetic explained below.
          </p>
          <p className="discuss-para">
            Two rows in a row about the same quantity keep the same label; the site prints it
            once and leaves the second blank.
          </p>
        </section>

        <section className="discuss-section" id="figures">
          <h2>Figures</h2>
          <p className="discuss-para">
            Where the publication prints the chart or diagram your item is about, use the
            publication's own figure: crop it out of the page and upload it. Do not redraw it —
            a redrawn figure is a second copy that can drift from the publication.
          </p>
          <p className="discuss-para">
            Caption it with the publication's figure number and title, and cite the section that
            refers to it. The description — the alt text — is separate from the caption and is
            required: it says what the image shows, for a reader who cannot see it. A figure can
            hold several images where a chart runs over more than one page, and the page shows
            them one at a time with arrows.
          </p>
        </section>

        <section className="discuss-section" id="bold">
          <h2>Bold</h2>
          <p className="discuss-para">
            Bold is for mnemonics, and that is all it is for — the C-R-A-F-T of a clearance
            readback on{' '}
            <Eg slug="clearance-and-departure-procedures">Clearance and departure
            procedures</Eg>, and the same shape wherever the letters are the lesson. There is no
            italic, no underline and no coloured text. Anything that wants more structure than a
            paragraph wants a named part instead.
          </p>
        </section>

        <section className="discuss-section" id="before-you-change-a-page">
          <h2>Before you change a page</h2>
          <p className="discuss-para">
            Read the page's history first. A revision whose summary says something was removed on
            purpose is a decision somebody made with the publication open, and finding that
            material again in the publication is not a reason to put it back.
          </p>
          <p className="discuss-para">
            Correcting a figure is the point of the exercise. The gouge these pages came from is
            student-maintained and it drifts — a limit from a superseded revision, a number
            transposed, a procedure that has changed. Check it against the publication, and where
            they disagree, the publication wins and the page cites it.
          </p>
          <p className="discuss-para">
            Saving keeps your edit in this browser only. Publishing is a separate step and is the
            one that changes the site. Nothing is ever deleted: every revision is kept, and a bad
            edit is undone by restoring the one before it from the history page.
          </p>
        </section>
      </article>
    </div>
  );
}

export default StyleGuide;
