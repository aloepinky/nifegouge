import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PracticeFlightPage from './PracticeFlight';
import { fetchCourseRules } from '../courserules/courseRulesApi';
import { crFeatures } from '../CourseRulesFeatures';
import { labelOf } from './legs';

jest.mock('./PracticeMap', () => () => <div aria-label="Practice map" />);
jest.mock('../courserules/courseRulesApi', () => ({
  fetchCourseRules: jest.fn(),
}));

beforeEach(() => {
  fetchCourseRules.mockResolvedValue(null);
  window.localStorage.clear();
  window.localStorage.setItem('practiceFlightNotice', '1');
  window.matchMedia = jest.fn(() => ({ matches: true }));
  Element.prototype.scrollIntoView = jest.fn();
});

test('rule summaries are separated from prose and do not interrupt a trailing introduction', async () => {
  const id = Object.keys(crFeatures).find((key) => labelOf(key) === 'KNGP Rusty Departures 31R');
  expect(id).toBeTruthy();
  fetchCourseRules.mockResolvedValue({
    doc: { legs: { [id]: { rule: [
      { text: 'HDG [[315°]]. When clear of pattern:' },
      { text: 'Turn direct to [[PT RUSTY]]. Climb and maintain [[2500\']] MSL and [[200]] KIAS.' },
    ] } } },
  });
  await act(async () => { render(<PracticeFlightPage />); });
  fireEvent.change(screen.getByRole('combobox', { name: 'KNGP runway' }), { target: { value: '31R' } });
  finishBrief();
  fireEvent.click(screen.getByRole('button', { name: 'Departure', exact: true }));
  for (let i = 0; i < 20 && !document.querySelector('.pf-rule'); i++) {
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  }
  const paragraphs = document.querySelectorAll('.pf-rule-para');
  expect(paragraphs).toHaveLength(2);
  expect(paragraphs[0].textContent).toBe('HDG 315°. When clear of pattern:');
  expect(paragraphs[0].querySelector('.pf-rule-summary')).toBeNull();
  const summary = paragraphs[1].querySelector('.pf-rule-summary');
  expect(summary.textContent).toContain('direct PT RUSTY');
  expect(summary.textContent).not.toContain('315');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Quiz' }));
  expect(document.querySelector('.pf-rule-summary')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reveal all', exact: true }));
  expect(document.querySelectorAll('.pf-rule-blank')).toHaveLength(0);
  expect(document.querySelector('.pf-rule-summary').textContent).toContain('direct PT RUSTY');
});

function finishBrief() {
  fireEvent.click(screen.getByRole('button', { name: 'High work first' }));
  fireEvent.click(screen.getByRole('button', { name: 'KINGS 4' }));
}

test('read-through shows both sides and one Next advances the exchange', () => {
  render(<PracticeFlightPage />);
  finishBrief();
  expect(screen.getByRole('checkbox', { name: 'Quiz' }).checked).toBe(false);
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

test('Quiz toggles without restarting and restores the original reveal controls', () => {
  render(<PracticeFlightPage />);
  finishBrief();
  const quiz = screen.getByRole('checkbox', { name: 'Quiz' });
  fireEvent.click(quiz);
  expect(screen.queryByRole('region', { name: 'Voice exchange' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
  expect(within(screen.getByRole('region', { name: 'Voice exchange' })).getAllByText('Two Pins In')).toHaveLength(1);
  fireEvent.click(quiz);
  expect(within(screen.getByRole('region', { name: 'Voice exchange' })).getAllByText('Two Pins In')).toHaveLength(2);
});

test('runway selection restarts the flight and remains selected after Restart', () => {
  render(<PracticeFlightPage />);
  finishBrief();
  const runway = screen.getByRole('combobox', { name: 'KNGP runway' });
  expect(runway.querySelectorAll('optgroup')).toHaveLength(2);
  fireEvent.change(runway, { target: { value: '31R' } });
  expect(screen.getByRole('button', { name: 'High work first' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  expect(runway.value).toBe('31R');
  fireEvent.change(runway, { target: { value: '' } });
  expect(runway.value).toBe('');
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
  fireEvent.click(screen.getByRole('checkbox', { name: 'Quiz' }));
  expect(within(panel).queryByText('60 KIAS')).toBeNull();
  expect(within(panel).getByRole('table')).toBeTruthy();
});
