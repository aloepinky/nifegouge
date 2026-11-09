import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PracticeFlightPage from './PracticeFlight';
import { fetchCourseRules } from '../courserules/courseRulesApi';
import { crFeatures } from '../CourseRulesFeatures';
import { labelOf } from './legs';
import * as engine from './engine';
import { MANEUVERS, blockFor, ft } from './highWork';

jest.mock('./PracticeMap', () => () => <div aria-label="Practice map" />);
jest.mock('../courserules/courseRulesApi', () => ({
  fetchCourseRules: jest.fn(),
}));

beforeEach(() => {
  fetchCourseRules.mockResolvedValue(null);
  window.localStorage.clear();
  window.localStorage.setItem('practiceFlightNotice', '1');
  window.matchMedia = jest.fn(() => ({ matches: true }));
  window.scrollBy = jest.fn();
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

test('mobile flight info can be expanded without losing the current flight', () => {
  window.matchMedia = jest.fn((query) => ({ matches: query === '(max-width: 760px)' }));
  render(<PracticeFlightPage />);
  const toggle = screen.getByRole('button', { name: 'Settings and info Expand ▾' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(toggle.textContent).toContain('Collapse ▴');
  expect(window.scrollTo).toHaveBeenCalledWith({ top: window.scrollY, behavior: 'instant' });
  finishBrief('13L');
  expect(screen.getByRole('combobox', { name: 'Flight mode' }).value).toBe('practice');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.getByRole('region', { name: 'Voice exchange' })).toBeTruthy();
});

test('mobile navigation returns to the card without the open flight log scrolling the page', () => {
  window.matchMedia = jest.fn((query) => ({ matches: query === '(max-width: 760px)' }));
  render(<PracticeFlightPage />);
  finishBrief();
  const log = document.querySelector('.pf-log');
  expect(log.open).toBe(false);
  log.open = true;
  fireEvent(log, new Event('toggle'));
  window.scrollBy.mockClear();
  Element.prototype.scrollIntoView.mockClear();
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  expect(window.scrollBy).toHaveBeenCalledTimes(1);
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  window.scrollBy.mockClear();
  fireEvent.change(screen.getByRole('textbox', { name: 'Callsign number' }), { target: { value: '812' } });
  expect(window.scrollBy).not.toHaveBeenCalled();
  fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
  expect(window.scrollBy).toHaveBeenCalledTimes(1);
});

test('desktop navigation does not move the page to the card', () => {
  window.matchMedia = jest.fn((query) => ({ matches: query === '(min-width: 761px)' }));
  render(<PracticeFlightPage />);
  finishBrief();
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  expect(window.scrollBy).not.toHaveBeenCalled();
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

test.each(['Before Landing', 'Climb', 'Pre-Stalling, Spinning, and Aerobatic'])('checklist request %s uses a plain answer in Practice and Quiz', (answer) => {
  const initial = { ...engine.start(null), at: 0, segments: [], steps: [
    { kind: 'checklist', who: 'you', text: answer, answer: [answer], phase: 'Pattern',
      ref: { work: 'Checklist Study Guide', loc: answer } },
    { kind: 'reply', plain: true, who: 'ip', text: 'Checklist requested', phase: 'Pattern' },
  ] };
  jest.spyOn(engine, 'start').mockReturnValueOnce(initial);
  render(<PracticeFlightPage />);
  jest.restoreAllMocks();
  expect(screen.getByText('Which checklist do you call for now?')).toBeTruthy();
  expect(document.querySelector('.pf-worked-answer').textContent).toBe(answer);
  expect(screen.queryByRole('region', { name: 'Voice exchange' })).toBeNull();
  expect(screen.queryByText('Pilot', { exact: true })).toBeNull();
  const mode = screen.getByRole('combobox', { name: 'Flight mode' });
  fireEvent.change(mode, { target: { value: 'quiz' } });
  expect(document.querySelector('.pf-worked-answer')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
  expect(document.querySelector('.pf-worked-answer').textContent).toBe(answer);
  expect(screen.queryByRole('region', { name: 'Voice exchange' })).toBeNull();
  expect(screen.getByText(`Source: Checklist Study Guide, ${answer}`)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  expect(screen.getByText('Checklist requested')).toBeTruthy();
});

test.each(['gWarm', 'spin', 'elpStall'])('Practice separates current altitude from the %s setup and keeps Quiz interactive', (maneuver) => {
  const initial = {
    ...engine.start(null),
    steps: [
      { kind: 'choose', choose: 'altitude', maneuver, phase: 'Working area' },
      { kind: 'reply', plain: true, who: 'ip', text: 'Ready for G-Warm', phase: 'Working area' },
    ],
    at: 0, segments: [], alt: 14200, block: blockFor('KINGS 4', 'high'),
  };
  jest.spyOn(engine, 'start').mockReturnValueOnce(initial);
  render(<PracticeFlightPage />);
  jest.restoreAllMocks();
  expect(screen.queryByRole('textbox', { name: 'Setup altitude' })).toBeNull();
  const worked = engine.practiceAnswer(initial);
  expect(screen.getByText(worked.label).className).toBe('pf-worked-answer');
  expect(screen.getByText('Current altitude').closest('.pf-setup--altitude')).toBeTruthy();
  expect(screen.getByText(`Next maneuver: ${MANEUVERS[maneuver].label}`)).toBeTruthy();
  expect(screen.getByText(`Before the ${MANEUVERS[maneuver].label.toLowerCase()}:`)).toBeTruthy();
  const mode = screen.getByRole('combobox', { name: 'Flight mode' });
  fireEvent.change(mode, { target: { value: 'quiz' } });
  expect(screen.getByRole('textbox', { name: 'Setup altitude' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Set up' })).toBeTruthy();
  expect(screen.getByText(`Where do you set up for the ${MANEUVERS[maneuver].label.toLowerCase()}?`)).toBeTruthy();
  fireEvent.change(mode, { target: { value: 'practice' } });
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  expect(screen.getByText('Ready for G-Warm')).toBeTruthy();
  expect(within(screen.getByLabelText('What to fly now')).getByText(`${ft(Number(worked.id))} MSL`)).toBeTruthy();
  fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
  expect(screen.queryByRole('textbox', { name: 'Setup altitude' })).toBeNull();
  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  expect(screen.getByText('Ready for G-Warm')).toBeTruthy();
});

test('rules show prose without duplicate summaries and keep quiz blanks and the top readout', async () => {
  const id = Object.keys(crFeatures).find((key) => labelOf(key) === 'KNGP Rusty Departures 31R');
  expect(id).toBeTruthy();
  fetchCourseRules.mockResolvedValue({
    doc: { legs: { [id]: { rule: [
      { text: 'HDG [[315°]]. When clear of pattern:' },
      { text: 'Turn direct to [[PT RUSTY]]. Climb and maintain [[2500\']] MSL and [[200]] KIAS.' },
    ] } } },
  });
  await act(async () => { render(<PracticeFlightPage />); });
  finishBrief('31R');
  fireEvent.click(screen.getByRole('button', { name: 'Departure', exact: true }));
  for (let i = 0; i < 20 && !document.querySelector('.pf-rule'); i++) {
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  }
  const paragraphs = document.querySelectorAll('.pf-rule-para');
  expect(paragraphs).toHaveLength(2);
  expect(paragraphs[0].textContent).toBe('HDG 315°. When clear of pattern:');
  expect(paragraphs[0].querySelector('.pf-rule-summary')).toBeNull();
  expect(paragraphs[1].querySelector('.pf-rule-summary')).toBeNull();
  expect(paragraphs[1].textContent).toContain('Turn direct to PT RUSTY.');
  expect(within(screen.getByLabelText('What to fly now')).getByText('direct PT RUSTY')).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: 'Flight mode' }), { target: { value: 'quiz' } });
  expect(document.querySelector('.pf-rule-summary')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reveal all', exact: true }));
  expect(document.querySelectorAll('.pf-rule-blank')).toHaveLength(0);
  expect(document.querySelector('.pf-rule-summary')).toBeNull();
  expect(document.querySelector('.pf-rule').textContent).toContain('Turn direct to PT RUSTY.');
});

function finishBrief(rwy, wind) {
  fireEvent.click(screen.getByRole('button', { name: 'High work first' }));
  fireEvent.click(screen.getByRole('button', { name: 'KINGS 4' }));
  if (rwy) fireEvent.change(screen.getByRole('combobox', { name: 'Wind' }), { target: { value: rwy } });
  if (wind) fireEvent.change(screen.getByRole('spinbutton', { name: 'Wind direction' }), { target: { value: wind } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }));
}

test('callsign box beside Squadron updates the number and squawk, validates edits and survives Restart', () => {
  render(<PracticeFlightPage />);
  finishBrief();
  const number = screen.getByRole('textbox', { name: 'Callsign number' });
  expect(screen.getByRole('combobox', { name: 'Squadron' }).nextElementSibling).toBe(number);
  expect(number.value).toBe('');
  expect(number.getAttribute('placeholder')).toBe('Callsign #');
  number.focus();
  fireEvent.change(number, { target: { value: '812' } });
  expect(number.value).toBe('812');
  expect(document.activeElement).toBe(number);
  expect(screen.getByText('5612', { exact: true })).toBeTruthy();
  const sign = screen.getByRole('combobox', { name: 'Squadron' }).value;
  expect(screen.getByText(`${sign} 812`, { exact: true })).toBeTruthy();
  fireEvent.change(number, { target: { value: '9' } });
  expect(screen.getByText(`${sign} 812`, { exact: true })).toBeTruthy();
  fireEvent.change(number, { target: { value: '749' } });
  expect(screen.getByText('5549', { exact: true })).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: 'Squadron' }), { target: { value: 'Boomer' } });
  expect(screen.getByText('Boomer 749', { exact: true })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Restart', exact: true }));
  expect(number.value).toBe('749');
  fireEvent.click(screen.getByRole('button', { name: 'Restart', exact: true }));
  expect(number.value).toBe('749');
});

test.each(['High work first', 'Low work first'])('%s asks for working area before weather', (order) => {
  render(<PracticeFlightPage />);
  fireEvent.click(screen.getByRole('button', { name: order }));
  expect(screen.getByText('Which working area is being planned for?')).toBeTruthy();
  expect(screen.queryByRole('combobox', { name: 'Wind' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'KINGS 4' }));
  expect(screen.getByRole('combobox', { name: 'Wind' })).toBeTruthy();
  fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
  expect(screen.getByText('Which working area is being planned for?')).toBeTruthy();
});

test('read-through shows both sides and one Next advances the exchange', () => {
  render(<PracticeFlightPage />);
  finishBrief();
  const mode = screen.getByRole('combobox', { name: 'Flight mode' });
  expect(mode.value).toBe('practice');
  expect(within(mode).getByRole('option', { name: 'Practice Mode' })).toBeTruthy();
  expect(within(mode).getByRole('option', { name: 'Quiz Mode' })).toBeTruthy();
  const exchange = screen.getByRole('region', { name: 'Voice exchange' });
  expect(within(exchange).getAllByText('Two Pins In')).toHaveLength(2);
  expect(within(exchange).getByText('Pilot')).toBeTruthy();
  expect(within(exchange).getByText('IP')).toBeTruthy();
  expect(within(exchange).getByText('At the aircraft')).toBeTruthy();
  expect(within(exchange).getByText('Intercom')).toBeTruthy();
  expect(screen.queryByText('Exchange')).toBeNull();
  expect(screen.queryByRole('button', { name: /Reveal/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  expect(screen.getByText('Switching ATIS', { exact: false })).toBeTruthy();
});

test('mode selection switches without restarting and restores the original reveal controls', () => {
  render(<PracticeFlightPage />);
  finishBrief();
  const mode = screen.getByRole('combobox', { name: 'Flight mode' });
  fireEvent.change(mode, { target: { value: 'quiz' } });
  expect(screen.queryByRole('region', { name: 'Voice exchange' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
  expect(within(screen.getByRole('region', { name: 'Voice exchange' })).getAllByText('Two Pins In')).toHaveLength(1);
  fireEvent.change(mode, { target: { value: 'practice' } });
  expect(within(screen.getByRole('region', { name: 'Voice exchange' })).getAllByText('Two Pins In')).toHaveLength(2);
});

test('the wind: a runway draws one within 20 degrees, a random pick draws afresh, typed wind is kept', () => {
  render(<PracticeFlightPage />);
  expect(screen.queryByRole('combobox', { name: 'Wind' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'High work first' }));
  fireEvent.click(screen.getByRole('button', { name: 'KINGS 4' }));
  const pick = screen.getByRole('combobox', { name: 'Wind' });
  const wind = screen.getByRole('spinbutton', { name: 'Wind direction' });
  expect(pick.value).toBe('every');
  expect(pick.querySelectorAll('optgroup')).toHaveLength(2);
  fireEvent.change(pick, { target: { value: '31R' } });
  expect(Math.abs(Number(wind.value) - 310)).toBeLessThanOrEqual(20);
  // Picking random again, or New wind, draws a new wind.
  const random = jest.spyOn(Math, 'random');
  fireEvent.change(pick, { target: { value: 'once' } });
  fireEvent.click(screen.getByRole('button', { name: 'New wind' }));
  expect(random.mock.calls.length).toBeGreaterThan(0);
  random.mockRestore();
  fireEvent.change(pick, { target: { value: '13R' } });
  fireEvent.change(wind, { target: { value: '140' } });
  expect(screen.getByText(/Wind 140 at \d+ knots, runway 13R, South Flow\./)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }));
  expect(screen.queryByRole('combobox', { name: 'Wind' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  expect(within(screen.getByRole('region', { name: 'Voice exchange' })).getByText(/wind 140.*runway 13R/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  fireEvent.click(screen.getByRole('button', { name: 'High work first' }));
  fireEvent.click(screen.getByRole('button', { name: 'KINGS 4' }));
  expect(screen.getByRole('combobox', { name: 'Wind' }).value).toBe('13R');
});

test('recovery asks for a wind-favored landing runway without offering different weather', () => {
  render(<PracticeFlightPage />);
  finishBrief('13L');
  fireEvent.click(screen.getByRole('button', { name: 'Recovery', exact: true }));
  // Asked once the ATIS home is copied.
  for (let i = 0; i < 40 && !screen.queryByText('Which KNGP runway for landing?'); i++) {
    const next = screen.queryByRole('button', { name: /Next/ });
    if (next) fireEvent.click(next);
    else fireEvent.click(document.querySelector('.pf-choices button'));
  }
  expect(screen.getByText('Which KNGP runway for landing?')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Same as departure (13L)' })).toBeTruthy();
  expect(screen.getByText('Runway', { exact: true })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '13R', exact: true }));
  expect(screen.queryByRole('spinbutton', { name: 'Wind direction' })).toBeNull();
  expect(screen.queryByText('Which KNGP runway for landing?')).toBeNull();
  fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
  expect(screen.getByText('Which KNGP runway for landing?')).toBeTruthy();
});

test('an outlying field gets its weather, then its runway by that wind', async () => {
  const field = Object.keys(crFeatures).find((key) => crFeatures[key].name === 'KNGT');
  fetchCourseRules.mockResolvedValue({ doc: {
    legs: {}, airfields: { [field]: { blocks: [{ heading: 'ASOS', lines: ['VHF 119.1MHz'] }] } },
  } });
  await act(async () => { render(<PracticeFlightPage />); });
  finishBrief('13L', '130');
  fireEvent.click(screen.getByRole('button', { name: 'Transit', exact: true }));
  // Skipped through, it tells Goliad's weather, then its runway for that wind; not the legs
  // flown or the maneuvers.
  const told = document.querySelector('.pf-skipped').textContent;
  expect(told).toMatch(/Goliad automated weather observation\. Wind 130.*Runway 11/);
  expect(told).not.toMatch(/GOOFTWAR|G-Warm|Flew/);
});

test('right arrow uses read-through and left arrow restores the whole exchange', () => {
  render(<PracticeFlightPage />);
  finishBrief();
  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  expect(screen.getByText('Switching ATIS', { exact: false })).toBeTruthy();
  fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
  expect(within(screen.getByRole('region', { name: 'Voice exchange' })).getAllByText('Two Pins In')).toHaveLength(2);
});

test('radio exchange keeps its channel and speaker labels separate from the words', () => {
  render(<PracticeFlightPage />);
  finishBrief();
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  const exchange = screen.getByRole('region', { name: 'Voice exchange' });
  expect(within(exchange).getByText('CH 1 UHF')).toBeTruthy();
  expect(within(exchange).getByText('Pilot')).toBeTruthy();
  expect(within(exchange).getAllByText('ATIS')).toHaveLength(2);
  expect(within(exchange).getByText(/Copy ATIS and verify/)).toBeTruthy();
  expect(screen.getAllByText(/Copy ATIS and verify/)).toHaveLength(1);
  expect(within(exchange).getByText('Switching ATIS')).toBeTruthy();
  expect(within(exchange).getByText('Generated comms')).toBeTruthy();
});

test('whole clearance conversation appears at once and Next leaves it', () => {
  render(<PracticeFlightPage />);
  finishBrief();
  for (let i = 0; i < 12 && !screen.queryByText(/read-back correct/); i++) {
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  }
  const exchange = screen.getByRole('region', { name: 'Voice exchange' });
  expect(within(exchange).getByText(/read-back correct/)).toBeTruthy();
  expect(within(exchange).getByText(/ready to copy/)).toBeTruthy();
  expect(within(exchange).getByText(/VFR flight following/)).toBeTruthy();
  expect(within(exchange).getAllByText('Pilot').length).toBeGreaterThan(1);
  expect(within(exchange).getAllByText('CLR')).toHaveLength(2);
  expect(screen.queryByText('Intercom')).toBeNull();
  expect(within(exchange).getByText('Switching Clearance')).toBeTruthy();
  expect(within(exchange).getByText(/If your flight profile/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  expect(within(screen.getByRole('region', { name: 'Voice exchange' })).queryByText(/read-back correct/)).toBeNull();
  fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
  expect(within(screen.getByRole('region', { name: 'Voice exchange' })).getByText(/read-back correct/)).toBeTruthy();
});

test('procedure panel keeps table values visible when reading and hidden in Quiz', () => {
  render(<PracticeFlightPage />);
  finishBrief();
  fireEvent.click(screen.getByRole('button', { name: 'Takeoff', exact: true }));
  for (let i = 0; i < 20 && !screen.queryByRole('region', { name: 'FAM FTI: Takeoff' }); i++) {
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  }
  const panel = screen.getByRole('region', { name: 'FAM FTI: Takeoff' });
  expect(within(panel).getByRole('table')).toBeTruthy();
  expect(within(panel).getByText('60 KIAS')).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: 'Flight mode' }), { target: { value: 'quiz' } });
  expect(within(panel).queryByText('60 KIAS')).toBeNull();
  expect(within(panel).getByRole('table')).toBeTruthy();
});
