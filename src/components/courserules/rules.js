// The course rules document (lambda/discussApi/courseRules.mjs) as the page uses it. Pure: no
// React, so the seed tool and the tests can load it.
//
// The page's map and route graph stay in CourseRulesFeatures.js; the words come from the
// server. `withText` puts the two together into the shape the page has always read, so the path
// builder, the quiz and the popups go on reading `customDescription`, `questions`, `answers`
// and `comms` off a feature.
//
// Everything a reader typed is escaped before it becomes HTML. `**bold**` and `[[blank]]` are
// the only markup, applied after escaping.

export const MARK = /\[\[([^[\]]+)\]\]/g;

export const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// One line of text as HTML: escaped, then **bold**, then a quiz blank as bold (the words a
// student is asked for are the ones the rule shows in bold).
export function inlineHtml(text) {
  return escapeHtml(text || '')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(MARK, '<b>$1</b>');
}

// Text with the blank marks taken out, for anywhere that is not the rule itself.
export const unmark = (text) => String(text || '').replace(MARK, '$1');

// A rule's paragraphs as one block of HTML: a subheading underlined, as the manual sets it.
export function ruleHtml(rule) {
  return (rule || [])
    .map((p) => (p.heading ? `<u>${inlineHtml(p.text)}</u>` : inlineHtml(p.text)))
    .join('<br/>');
}

// The quiz a rule makes: one question per paragraph with a blank in it. A question is the
// paragraph with each blank as a run of underscores as long as its answer (the quiz draws a
// blank that wide) and the bold markers dropped; its answers are the marked words in order.
export function quizOf(rule) {
  const questions = [];
  const answers = [];
  (rule || []).forEach((p) => {
    const marked = [...p.text.matchAll(MARK)].map((m) => m[1]);
    if (!marked.length) return;
    questions.push(p.text
      .replace(MARK, (m, word) => '_'.repeat(Math.max(4, Math.min(12, word.length))))
      .replace(/\*\*([^*]+)\*\*/g, '$1'));
    answers.push(marked);
  });
  return { questions, answers };
}

// A question with its blanks, as HTML for the quiz: text escaped, revealed answers filled in.
export function questionHtml(question, answers, revealed) {
  if (!question) return { html: '', totalBlanks: 0 };
  const pieces = question.split(/(_{2,})/);
  let blank = 0;
  const html = pieces.map((piece) => {
    if (!/^_{2,}$/.test(piece)) return escapeHtml(piece);
    const i = blank;
    blank += 1;
    const answer = (answers || [])[i] || '';
    return revealed.includes(i) && answer
      ? `<span class="cr-quiz-answer">${escapeHtml(answer)}</span>`
      : `<span class="cr-quiz-blank" style="min-width: ${piece.length * 8}px"></span>`;
  }).join('');
  return { html, totalBlanks: blank };
}

// An airfield card as the popup's HTML.
export function cardHtml(card) {
  if (!card) return '';
  const blocks = (card.blocks || []).map((b) => {
    const head = b.heading ? `<b${b.warning ? ' class="cr-card-warning"' : ''}>${inlineHtml(b.heading)}</b>` : '';
    const lines = (b.lines || []).map(inlineHtml).join('<br/>');
    return `<p>${head}${head && lines ? '<br/>' : ''}${lines}</p>`;
  }).join('');
  return `<div class="cr-card"><div class="cr-card-title">${inlineHtml(card.title)}</div>${blocks}</div>`;
}

// The page's features with the document's words on them.
export function withText(features, doc) {
  const legs = (doc && doc.legs) || {};
  const airfields = (doc && doc.airfields) || {};
  const out = {};
  Object.entries(features).forEach(([id, f]) => {
    const leg = legs[id] || {};
    const { questions, answers } = quizOf(leg.rule);
    out[id] = {
      ...f,
      rule: leg.rule || [],
      customDescription: ruleHtml(leg.rule),
      questions,
      answers,
      comms: leg.comms || [],
      examples: leg.examples || [],
      card: airfields[id] || null,
    };
  });
  return out;
}

// What a leg is, for comparing two versions of it.
export const legKey = (doc, id) => JSON.stringify([
  (doc && doc.legs && doc.legs[id]) || null,
  (doc && doc.airfields && doc.airfields[id]) || null,
]);

// The other legs whose rule reads word for word as this one's (Mustang areas 1 and 2 share
// one, and so do a runway's two directions).
export function sameWording(doc, id) {
  const rule = doc && doc.legs && doc.legs[id] && doc.legs[id].rule;
  if (!rule || !rule.length) return [];
  const key = JSON.stringify(rule);
  return Object.keys(doc.legs).filter((k) => k !== id && JSON.stringify(doc.legs[k].rule || null) === key);
}

// `doc` with one leg's edit applied: the leg (rule, calls, examples), its airfield card, and
// the same rule onto each of `also`.
export function applyEdit(doc, id, { leg, card }, also = []) {
  const next = { ...doc, legs: { ...doc.legs }, airfields: { ...doc.airfields } };
  const clean = Object.fromEntries(Object.entries(leg || {}).filter(([, v]) => v && (!Array.isArray(v) || v.length)));
  if (Object.keys(clean).length) next.legs[id] = clean;
  else delete next.legs[id];
  if (card) next.airfields[id] = card;
  also.forEach((other) => {
    const rest = { ...(next.legs[other] || {}) };
    if (clean.rule) rest.rule = clean.rule;
    else delete rest.rule;
    next.legs[other] = rest;
  });
  return next;
}

// The legs and cards two documents disagree on.
export function changedLegs(a, b) {
  const ids = new Set([
    ...Object.keys((a && a.legs) || {}), ...Object.keys((b && b.legs) || {}),
    ...Object.keys((a && a.airfields) || {}), ...Object.keys((b && b.airfields) || {}),
  ]);
  return [...ids].filter((id) => legKey(a, id) !== legKey(b, id));
}
