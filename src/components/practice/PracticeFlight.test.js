import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import PracticeFlightPage from './PracticeFlight';

jest.mock('./PracticeMap', () => () => <div aria-label="Practice map" />);
jest.mock('../courserules/courseRulesApi', () => ({
  fetchCourseRules: () => Promise.resolve(null),
}));

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('practiceFlightNotice', '1');
  window.matchMedia = jest.fn(() => ({ matches: true }));
  Element.prototype.scrollIntoView = jest.fn();
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

test('readback retains the earlier pilot and controller lines in the exchange', () => {
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
});
