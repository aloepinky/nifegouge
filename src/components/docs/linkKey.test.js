import { linkKey, isWebLink } from './linkKey';

test('share parameters, fragments and trailing slashes do not make a new link', () => {
  expect(linkKey('https://quizlet.com/891055105/nife-stan-exam-practice-test-flash-cards/?i=5opwjl&x=1jqt'))
    .toBe(linkKey('https://quizlet.com/891055105/nife-stan-exam-practice-test-flash-cards/?i=216r4y&x=1jqt'));
  expect(linkKey('https://docs.google.com/document/d/abc/edit?usp=sharing'))
    .toBe(linkKey('https://docs.google.com/document/d/abc/edit?tab=t.0#heading=h.3nks37akw3dp'));
  expect(linkKey('https://www.example.com/a/')).toBe(linkKey('http://example.com/a'));
});

test('parameters that name the page still tell links apart', () => {
  expect(linkKey('https://www.youtube.com/watch?v=one')).not.toBe(linkKey('https://www.youtube.com/watch?v=two'));
  expect(linkKey('https://quizlet.com/1/a')).not.toBe(linkKey('https://quizlet.com/2/a'));
});

test('only web addresses are links', () => {
  expect(isWebLink('https://quizlet.com/1')).toBe(true);
  expect(isWebLink('http://example.com')).toBe(true);
  // eslint-disable-next-line no-script-url -- the test is that this is refused
  expect(isWebLink('javascript:alert(1)')).toBe(false);
  expect(isWebLink('data:text/html,hi')).toBe(false);
  expect(isWebLink('quizlet.com/1')).toBe(false);
});
