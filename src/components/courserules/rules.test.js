import {
  applyEdit, cardHtml, changedLegs, inlineHtml, questionHtml, quizOf, ruleHtml, sameWording, withText,
} from './rules';

const rule = [
  { text: 'Entry', heading: true },
  { text: 'Climb to [[2,500\']] MSL and contact [[Corpus Approach]].' },
  { text: 'Remain clear of the beach.' },
];

test('a rule makes one question per paragraph with a blank, answers in order', () => {
  const { questions, answers } = quizOf(rule);
  expect(questions).toEqual(['Climb to ______ MSL and contact ____________.']);
  expect(answers).toEqual([["2,500'", 'Corpus Approach']]);
});

test('the shown rule bolds the blanks and underlines a subheading', () => {
  expect(ruleHtml(rule)).toBe(
    '<u>Entry</u><br/>Climb to <b>2,500\'</b> MSL and contact <b>Corpus Approach</b>.<br/>Remain clear of the beach.',
  );
});

test('typed HTML is escaped everywhere it is drawn', () => {
  const evil = [{ text: '<img src=x onerror=alert(1)> [[<b>x</b>]] **bold**' }];
  const html = ruleHtml(evil);
  expect(html).not.toMatch(/<img/);
  expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  expect(html).toContain('<b>&lt;b&gt;x&lt;/b&gt;</b>');
  expect(html).toContain('<b>bold</b>');
  const { questions, answers } = quizOf(evil);
  const q = questionHtml(questions[0], answers[0], [0]);
  expect(q.totalBlanks).toBe(1);
  expect(q.html).not.toMatch(/<img|<b>x/);
  expect(inlineHtml('"quoted" & <tag>')).toBe('&quot;quoted&quot; &amp; &lt;tag&gt;');
  expect(cardHtml({ title: '<script>', blocks: [{ heading: 'WARNING!', warning: true, lines: ['a <b>'] }] }))
    .not.toMatch(/<script>|a <b>/);
});

test('a question reveals only the answers asked for', () => {
  const { html, totalBlanks } = questionHtml('At ____ then ____.', ['one', 'two'], [1]);
  expect(totalBlanks).toBe(2);
  expect(html).toContain('cr-quiz-blank');
  expect(html).toContain('>two<');
  expect(html).not.toContain('>one<');
});

const doc = {
  legs: {
    'Routes-Traffic Patterns-2': { rule: [{ text: 'Left traffic.' }] },
    'Routes-Traffic Patterns-3': { rule: [{ text: 'Left traffic.' }], comms: [{ text: 'Call.' }] },
    'Routes-Arrivals-4': { rule: [{ text: 'Other.' }] },
  },
  airfields: { 'Point-default-0': { title: 'KTFP', blocks: [] } },
};

test('legs with the same wording are found, and an edit can change them together', () => {
  expect(sameWording(doc, 'Routes-Traffic Patterns-2')).toEqual(['Routes-Traffic Patterns-3']);
  const next = applyEdit(doc, 'Routes-Traffic Patterns-2', { leg: { rule: [{ text: 'Right traffic.' }] } }, ['Routes-Traffic Patterns-3']);
  expect(next.legs['Routes-Traffic Patterns-3']).toEqual({ rule: [{ text: 'Right traffic.' }], comms: [{ text: 'Call.' }] });
  expect(doc.legs['Routes-Traffic Patterns-3'].rule[0].text).toBe('Left traffic.');
  expect(changedLegs(doc, next).sort()).toEqual(['Routes-Traffic Patterns-2', 'Routes-Traffic Patterns-3']);
});

test('an emptied leg leaves the document, and a card is kept', () => {
  const next = applyEdit(doc, 'Routes-Arrivals-4', { leg: { rule: [], comms: [] } });
  expect(next.legs['Routes-Arrivals-4']).toBeUndefined();
  expect(next.airfields['Point-default-0']).toEqual(doc.airfields['Point-default-0']);
});

test('the page features carry the words, and features without words carry none', () => {
  const features = withText({ 'Routes-Traffic Patterns-3': { name: '31' }, 'Point-default-0': { name: 'KTFP' } }, doc);
  expect(features['Routes-Traffic Patterns-3'].customDescription).toBe('Left traffic.');
  expect(features['Routes-Traffic Patterns-3'].comms).toEqual([{ text: 'Call.' }]);
  expect(features['Point-default-0'].card.title).toBe('KTFP');
  expect(features['Point-default-0'].questions).toEqual([]);
  expect(withText({ a: { name: 'x' } }, null).a.customDescription).toBe('');
});
