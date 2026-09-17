import { getItemMeta } from './registry';

// "Any previously discussed maneuver" and its two relatives are lists, not pages. Writing
// one out by hand goes stale the next time an event is added, which is the failure the
// registry split exists to prevent — so they are generated here from the syllabus's events
// and flow order, and the item file carries only a `generated` spec.
//
// What counts as a maneuver is a `maneuver: true` flag on the item itself. It has to be a
// flag rather than a derivation: the JPPT does not classify its discuss items, and every
// rule that looks right — "everything a flight event briefs", "everything with a profile" —
// sweeps in half the knowledge items.
//
// I4490's item is "any previously discussed *item*", not maneuver, and it is a fourth user
// of this file. `{ all: true }` drops the maneuver filter and takes everything the earlier
// events briefed. It is a different question from the maneuver lists, not a superset of one
// of them, so it gets its own noun and its own heading rather than reusing theirs.

// Items briefed strictly before `beforeId`, optionally restricted to one stage, and by
// default only the maneuvers. Deduped: an item recurring across events is one link, at its
// first appearance. `href` rows are skipped — they have no page to link to.
function collect(syllabus, beforeId, stage, all) {
  // Syllabus order, which is JPPT flow order and not numeric order: the block array keeps
  // it, so the events flattened from it are in the order a student actually meets them.
  const order = syllabus.blocks.flatMap((b) => b.events.map((e) => e.id));
  const cutoff = order.indexOf(beforeId);
  const seen = new Set();
  const out = [];
  order.forEach((eid, i) => {
    if (cutoff !== -1 && i >= cutoff) return;
    const se = syllabus.syllabusEvent(eid);
    if (!se) return;
    if (stage && se.stage !== stage) return;
    const row = syllabus.getEvent(eid);
    if (!row) return;
    row.items.forEach((r) => {
      if (!r.slug || seen.has(r.slug)) return;
      const meta = getItemMeta(r.slug);
      if (!meta) return;
      // A generated list never contains another generated list.
      if (meta.generated) return;
      if (!all && !meta.maneuver) return;
      seen.add(r.slug);
      out.push({ item: meta, event: se });
    });
  });
  return out;
}

// One group per event the list is generated against. With `?from=` that is the one event;
// on the canonical URL it is every event listing the item, because the answer genuinely
// differs between them — F4290 gets the Formation stage, CS4101 gets the whole course.
export function generatedFor(item, fromEventId, syllabus) {
  const spec = item && item.generated;
  if (!spec || !syllabus) return null;
  const from = fromEventId && syllabus.syllabusEvent(fromEventId);
  const order = syllabus.blocks.flatMap((b) => b.events.map((e) => e.id));
  const anchors = from
    ? [from]
    : syllabus.eventsListing(item.slug)
      .map((e) => syllabus.syllabusEvent(e.id))
      .filter(Boolean)
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const groups = anchors.map((anchor) => ({
    anchor,
    noun: spec.all ? 'item' : 'maneuver',
    // A Capstone event links every maneuver in the syllabus rather than its own stage's,
    // since recombining the whole course is what the stage is for. An explicit
    // `spec.stage` wins, which is how the familiarization variant stays scoped to FAM.
    entries: collect(
      syllabus,
      anchor.id,
      spec.stage || (anchor.stage === 'CS' ? null : anchor.stage),
      spec.all,
    ),
  }));
  return from ? groups : stack(groups);
}

// On the canonical URL the per-event lists mostly repeat each other: FAM4490 briefs the same
// maneuvers as FAM4304, and CS4102 the same as CS4101. A list identical to an earlier one is
// dropped, so it is headed by the first event that gets it. A list that contains every earlier
// list shows only what it adds, under "All of the above and the following"; one that does not
// (F4290 is the Formation stage alone, not FAM plus F) keeps its whole list. `entries` stays
// the full list either way, which is what a random pick draws from.
function stack(groups) {
  const key = (g) => g.entries.map((e) => e.item.slug).sort().join(' ');
  const kept = [];
  groups.forEach((g) => {
    if (!kept.some((k) => key(k) === key(g))) kept.push(g);
  });
  const above = new Set();
  return kept.map((g) => {
    const slugs = new Set(g.entries.map((e) => e.item.slug));
    const includesAbove = above.size > 0 && [...above].every((s) => slugs.has(s));
    const added = includesAbove ? g.entries.filter((e) => !above.has(e.item.slug)) : g.entries;
    slugs.forEach((s) => above.add(s));
    return { ...g, includesAbove, added };
  });
}

export default generatedFor;
