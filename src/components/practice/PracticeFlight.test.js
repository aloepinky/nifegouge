import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  expect(screen.getAllByText('“Two Pins In”')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: /Reveal/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  expect(screen.getByText('Switching ATIS', { exact: false })).toBeTruthy();
});

test('Quiz toggles without restarting and restores the original reveal controls', () => {
  render(<PracticeFlightPage />);
  finishBrief();
  const quiz = screen.getByRole('checkbox', { name: 'Quiz' });
  fireEvent.click(quiz);
  expect(screen.queryByText('“Two Pins In”')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
  expect(screen.getAllByText('“Two Pins In”')).toHaveLength(1);
  fireEvent.click(quiz);
  expect(screen.getAllByText('“Two Pins In”')).toHaveLength(2);
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
  expect(screen.getAllByText('“Two Pins In”')).toHaveLength(2);
});
