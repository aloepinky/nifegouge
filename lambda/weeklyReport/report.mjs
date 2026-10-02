// The weekly community-activity report: what other people did on the site in the last week,
// read straight from the tables. Shared by the weeklyReport Lambda, which emails it every
// Sunday, and tools/weekly-report.mjs, which prints it locally. Nothing here writes.
//
// Every edit, submission and upload carries its own timestamp, so those are exact. Votes do not:
// a row keeps only its running totals. So the caller keeps the totals from the last run
// (`counts` in the result) and passes them back as `previous`; the report shows the increase.

import { ScanCommand } from '@aws-sdk/lib-dynamodb';

const SITE = 'https://pinksheetmafia.com';
const TIME_ZONE = 'America/Chicago';

const who = (name) => (name && name.trim() && name !== 'anonymous' ? name.trim() : 'anonymous');
const day = (iso) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TIME_ZONE });
const short = (s, n = 80) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A discuss page's stored key is `<school>/<slug>` (lambda/discussApi/namespace.mjs); the
// school's namespace is its route prefix on the site.
const DISCUSS_BASE = { primary: '/primary/discuss', nife: '/nife/discuss', advanced: '/t44c/discuss' };
function pageUrl(key) {
  const [ns, slug] = key.includes('/') ? key.split('/') : ['primary', key];
  return `${SITE}${DISCUSS_BASE[ns] || '/primary/discuss'}/${slug}`;
}

// `own`: author names whose activity is counted in one line per section rather than listed
// (yours and the seed tools'), so what other people did is what the report shows.
export async function buildReport({ db, days = 7, until = new Date(), own = ['Loevinger', 'migration'], previous = null }) {
  const SINCE = new Date(until.getTime() - days * 864e5).toISOString();
  const OWN = new Set(own.map((n) => n.trim().toLowerCase()).filter(Boolean));
  const isOwn = (name) => OWN.has(String(name || '').trim().toLowerCase());
  const inWeek = (iso) => Boolean(iso) && iso >= SINCE;

  async function scanAll(TableName, projection) {
    const params = { TableName };
    if (projection) {
      const names = {};
      params.ProjectionExpression = projection.map((f) => { names[`#${f}`] = f; return `#${f}`; }).join(', ');
      params.ExpressionAttributeNames = names;
    }
    const items = [];
    let ExclusiveStartKey;
    do {
      const page = await db.send(new ScanCommand({ ...params, ExclusiveStartKey }));
      items.push(...(page.Items || []));
      ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  }

  // Every revisioned table has the same two-row shape: rev 0 is the meta row with the title, each
  // rev >= 1 a revision with author, summary and createdAt (lambda/discussApi/store.mjs).
  async function revisions(TableName, key, extra = []) {
    const rows = await scanAll(TableName, [key, 'rev', 'title', 'author', 'summary', 'createdAt', ...extra]);
    const titles = new Map(rows.filter((r) => r.rev === 0).map((r) => [r[key], r.title]));
    // A discuss page moved from its bare slug to `<school>/<slug>` keeps a copy of its history
    // under both keys (namespace.mjs), so one save can appear twice. Keep the namespaced one.
    const seen = new Set();
    return rows
      .filter((r) => r.rev > 0 && inWeek(r.createdAt))
      .sort((a, b) => Number(String(b[key]).includes('/')) - Number(String(a[key]).includes('/')))
      .filter((r) => {
        const once = `${String(r[key]).split('/').pop()}|${r.rev}|${r.createdAt}`;
        if (seen.has(once)) return false;
        seen.add(once);
        return true;
      })
      .map((r) => ({ id: r[key], rev: r.rev, title: titles.get(r[key]) || r.name || r[key], author: who(r.author), summary: r.summary || '', at: r.createdAt }))
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  // Other people's revisions one per line; yours as a count.
  function editLines(list, { noun, nouns, made, changed, href }) {
    const theirs = list.filter((r) => !isOwn(r.author));
    const mine = list.length - theirs.length;
    const lines = theirs.map((r) => ({
      text: `${day(r.at)}  ${r.author}  ${r.rev === 1 ? made : changed} ${r.title}${r.summary ? ` — ${short(r.summary, 100)}` : ''}`,
      href: href && href(r),
    }));
    if (mine) lines.push({ text: `Your own: ${plural(mine, 'edit')} to ${plural(new Set(list.filter((r) => isOwn(r.author)).map((r) => r.id)).size, noun, nouns)}.`, quiet: true });
    return lines;
  }

  // ---------------------------------------------------------------------------------------------
  // Gather

  const [items, syllabi, briefs, jetLogs, sections, questions, docs, links, scores] = await Promise.all([
    revisions('DiscussItems', 'slug'),
    revisions('DiscussSyllabi', 'syllabusId', ['name']),
    revisions('Briefs', 'briefId'),
    revisions('JetLogs', 'logId'),
    revisions('QuestionSections', 'listId'),
    scanAll('NIFEQuestions', ['questionId', 'type', 'status', 'topic', 'question', 'submittedBy', 'submittedAt',
      'moderatedAt', 'moderatedBy', 'hiddenAt', 'rejectedReason', 'originalQuestionId', 'mergedInto',
      'upvotes', 'downvotes', 'approveCount', 'rejectCount', 'batchId']),
    scanAll('NIFEDocuments', ['docId', 'fileName', 'topic', 'program', 'uploadedAt', 'uploadedBy',
      'upvotes', 'downvotes', 'outdatedUseful', 'outdatedObsolete', 'outdatedAt', 'outdatedNote']),
    scanAll('NIFELinks', ['linkId', 'title', 'url', 'topic', 'program', 'submittedAt', 'submittedBy',
      'upvotes', 'downvotes', 'outdatedUseful', 'outdatedObsolete', 'outdatedAt', 'outdatedNote']),
    scanAll('EPsLimitsScores', ['board', 'runId', 'school', 'mode', 'playerName', 'createdAt', 'split']),
  ]);

  // ---------------------------------------------------------------------------------------------
  // Votes: the difference from the last run's totals

  const counts = {};
  for (const q of questions) {
    counts[`q:${q.questionId}`] = [q.upvotes || 0, q.downvotes || 0, q.approveCount || 0, q.rejectCount || 0];
  }
  for (const d of docs) counts[`d:${d.docId}`] = [d.upvotes || 0, d.downvotes || 0, d.outdatedUseful || 0, d.outdatedObsolete || 0];
  for (const l of links) counts[`l:${l.linkId}`] = [l.upvotes || 0, l.downvotes || 0, l.outdatedUseful || 0, l.outdatedObsolete || 0];

  // A total can fall: approving an edit restarts the question's score, and an admin can clear a
  // count. Only increases are counted as votes cast.
  function votesSince(prefix) {
    const out = [0, 0, 0, 0];
    if (!previous) return null;
    for (const [k, now] of Object.entries(counts)) {
      if (!k.startsWith(prefix)) continue;
      const was = previous.counts[k] || [0, 0, 0, 0];
      now.forEach((n, i) => { out[i] += Math.max(0, n - (was[i] || 0)); });
    }
    return out;
  }
  const questionVotes = votesSince('q:');
  const docVotes = votesSince('d:');
  const linkVotes = votesSince('l:');

  // ---------------------------------------------------------------------------------------------
  // Build the report as sections of lines, rendered twice: plain text and HTML.

  const report = [];
  const section = (title, lines, empty) => report.push({ title, lines: lines.length ? lines : [{ text: empty, quiet: true }] });

  // Discussion pages
  {
    const theirs = items.filter((r) => !isOwn(r.author));
    const lines = [];
    if (theirs.length) {
      const people = new Set(theirs.map((r) => r.author));
      lines.push({ text: `${plural(theirs.length, 'edit')} to ${plural(new Set(theirs.map((r) => r.id)).size, 'page')} by ${plural(people.size, 'person', 'people')}, ${theirs.filter((r) => r.rev === 1).length} new` });
    }
    lines.push(...editLines(items, { noun: 'page', made: 'created', changed: 'edited', href: (r) => pageUrl(r.id) }));
    section('Discussion pages', lines, 'No edits.');
  }

  // Syllabi, briefs, jet logs
  section('Syllabi', editLines(syllabi, { noun: 'syllabus', nouns: 'syllabi', made: 'published', changed: 'edited' }), 'No edits.');
  section('Briefs', editLines(briefs, { noun: 'brief', made: 'added', changed: 'edited' }), 'No edits.');
  section('Shared jet logs', editLines(jetLogs, { noun: 'jet log', made: 'added', changed: 'edited' }), 'No edits.');

  // NIFE questions
  {
    const submitted = questions.filter((q) => inWeek(q.submittedAt)).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    const decided = questions.filter((q) => inWeek(q.moderatedAt));
    const hidden = questions.filter((q) => q.status === 'hidden' && inWeek(q.hiddenAt));
    const tally = (list, test) => list.filter(test).length;
    const lines = [];
    const newOnes = submitted.filter((q) => q.type !== 'edit');
    const edits = submitted.filter((q) => q.type === 'edit');
    lines.push({ text: `${plural(newOnes.length, 'new question')} and ${plural(edits.length, 'suggested edit')} submitted` });
    const batches = new Set(submitted.filter((q) => q.batchId).map((q) => q.batchId));
    if (batches.size) lines.push({ text: `${plural(batches.size, 'bulk upload')} among them`, quiet: true });
    if (decided.length) {
      lines.push({ text: `Decided: ${tally(decided, (q) => ['approved', 'merged'].includes(q.status) || q.mergedInto)} approved, ${tally(decided, (q) => q.status === 'rejected')} rejected${tally(decided, (q) => q.rejectedReason === 'superseded') ? ` (${tally(decided, (q) => q.rejectedReason === 'superseded')} superseded by another edit)` : ''}` });
    }
    if (hidden.length) lines.push({ text: `${plural(hidden.length, 'question')} hidden` });
    if (questionVotes) {
      lines.push({ text: `Votes: ${questionVotes[0]} up and ${questionVotes[1]} down on live questions, ${questionVotes[2]} approve and ${questionVotes[3]} reject on pending` });
    } else {
      lines.push({ text: 'Votes: no earlier snapshot to compare with; counted from next week.', quiet: true });
    }
    const pendingNow = questions.filter((q) => q.status === 'pending').length;
    lines.push({ text: `${pendingNow} waiting for votes now`, quiet: true });
    const ownSubmitted = submitted.filter((q) => isOwn(q.submittedBy)).length;
    for (const q of submitted.filter((x) => !x.batchId && !isOwn(x.submittedBy))) {
      lines.push({ text: `${day(q.submittedAt)}  ${who(q.submittedBy)}  ${q.type === 'edit' ? 'edit' : 'new'} [${q.topic}] ${short(q.question, 90)}`, href: `${SITE}/nife/questions/q/${q.type === 'edit' && q.originalQuestionId ? q.originalQuestionId : q.questionId}` });
    }
    for (const id of batches) {
      const batch = submitted.filter((q) => q.batchId === id);
      if (isOwn(batch[0].submittedBy)) continue;
      lines.push({ text: `${day(batch[0].submittedAt)}  ${who(batch[0].submittedBy)}  bulk upload of ${plural(batch.length, 'question')}` });
    }
    if (ownSubmitted) lines.push({ text: `Your own: ${plural(ownSubmitted, 'submission')}.`, quiet: true });
    for (const r of sections.filter((x) => !isOwn(x.author))) lines.push({ text: `${day(r.at)}  ${r.author}  edited the topics and lectures${r.summary ? ` — ${short(r.summary, 100)}` : ''}`, href: `${SITE}/nife/questions` });
    section('NIFE questions', lines, '');
  }

  // Docs and useful links
  {
    const programName = (p) => (p === 'tw4primary' ? 'Primary' : p === 'nife' ? 'NIFE' : p || 'NIFE');
    const docsPath = (p) => (p === 'tw4primary' ? '/primary/docs' : '/nife/docs');
    const newDocs = docs.filter((d) => inWeek(d.uploadedAt)).sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
    const newLinks = links.filter((l) => inWeek(l.submittedAt)).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    const flagged = [...docs, ...links].filter((e) => inWeek(e.outdatedAt));
    const lines = [];
    for (const d of newDocs) lines.push({ text: `${day(d.uploadedAt)}  ${who(d.uploadedBy)}  uploaded ${d.fileName} (${programName(d.program)}, ${d.topic || 'no topic'})`, href: `${SITE}${docsPath(d.program)}` });
    for (const l of newLinks) lines.push({ text: `${day(l.submittedAt)}  ${who(l.submittedBy)}  added link ${short(l.title, 70)} (${programName(l.program)})`, href: l.url });
    for (const e of flagged) {
      lines.push({ text: `Voted outdated: ${short(e.fileName || e.title, 70)} (${e.outdatedUseful || 0} still useful, ${e.outdatedObsolete || 0} obsolete)${e.outdatedNote ? ` — ${short(e.outdatedNote, 80)}` : ''}` });
    }
    if (docVotes && linkVotes) {
      const up = docVotes[0] + linkVotes[0];
      const down = docVotes[1] + linkVotes[1];
      if (up || down) lines.push({ text: `Votes: ${up} up and ${down} down across documents and links`, quiet: true });
    }
    section('Docs and useful links', lines, 'Nothing added.');
  }

  // EP/Limits leaderboard
  {
    const runs = scores.filter((r) => !r.split && inWeek(r.createdAt));
    const lines = [];
    if (runs.length) {
      const bySchool = {};
      for (const r of runs) {
        const [school, mode] = String(r.board).split('#');
        const k = `${school} ${String(mode).replace(/_/g, ' ')}`;
        bySchool[k] = bySchool[k] || { runs: 0, players: new Set() };
        bySchool[k].runs += 1;
        bySchool[k].players.add(r.playerName);
      }
      for (const [k, v] of Object.entries(bySchool)) lines.push({ text: `${k}: ${plural(v.runs, 'run')} by ${plural(v.players.size, 'player')}` });
    }
    section('EP and limits leaderboard', lines, 'No runs.');
  }


  const range = `${day(SINCE)} to ${day(until.toISOString())}`;
  const text = [`Pink Sheet Mafia: community activity, ${range}`, '']
    .concat(...report.map((s) => [`== ${s.title} ==`, ...s.lines.filter((l) => l.text).map((l) => `  ${l.text}`), '']))
    .join('\n');

  // Inline styles: an email client drops a <style> block. Site palette, light only.
  const html = `<!doctype html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PSM weekly activity</title></head>
  <body style="margin:0;padding:24px 16px;background:#f4f7f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#01202C;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d5e0e4;border-radius:8px;padding:24px;">
  <h1 style="margin:0 0 4px;font-size:20px;color:#003B4F;">Community activity</h1>
  <p style="margin:0 0 20px;color:#5a6f78;font-size:14px;">${esc(range)}</p>
  ${report.map((s) => `<h2 style="margin:20px 0 8px;font-size:16px;color:#003B4F;border-bottom:1px solid #d5e0e4;padding-bottom:4px;">${esc(s.title)}</h2>
  <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.5;">
  ${s.lines.filter((l) => l.text).map((l) => `<li style="${l.quiet ? 'color:#5a6f78;list-style:none;margin-left:-18px;' : ''}">${l.href ? `<a href="${esc(l.href)}" style="color:#0f7c86;text-decoration:none;">${esc(l.text)}</a>` : esc(l.text)}</li>`).join('\n')}
  </ul>`).join('\n')}
  </div></body></html>
  `;

  return { subject: `PSM community activity, ${range}`, range, text, html, counts };
}
