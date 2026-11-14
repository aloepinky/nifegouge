import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import T44CPractice from './T44CPractice';

jest.mock('./T44CMap', () => () => <div aria-label="Practice map" />);

const pick = (name) => fireEvent.click(screen.getByRole('button', { name }));
const right = () => act(() => { fireEvent.keyDown(window, { key: 'ArrowRight' }); });

function flyWithArrows(choose) {
  for (let i = 0; i < 600; i++) {
    if (screen.queryByRole('heading', { name: 'Flight complete' })) return true;
    const options = Array.from(document.querySelectorAll('.pf-card .pf-choice'));
    if (options.length) fireEvent.click(choose(options));
    else right();
  }
  return false;
}

// The last choice on offer finishes high work, leaves Cabaniss, and stops on the full stop.
const lastChoice = (options) => options[options.length - 1];

test.each(['North Seagull', 'South Seagull', 'Foxtrot 1', 'North Cheetah'])('%s draws every step, flown with the right arrow', (area) => {
  render(<T44CPractice />);
  pick(area);
  expect(flyWithArrows(lastChoice)).toBe(true);
});

test('a high work profile is picked in Preflight and flown without asking', () => {
  render(<T44CPractice />);
  fireEvent.change(screen.getByLabelText('High work profile'), { target: { value: 'FAM4201' } });
  pick('Foxtrot 1');
  expect(flyWithArrows(lastChoice)).toBe(true);
  expect(screen.getByText(/13 maneuvers flown/)).toBeTruthy();
});

test('Quiz Mode draws every step too', () => {
  render(<T44CPractice />);
  fireEvent.change(screen.getByLabelText('Flight mode'), { target: { value: 'quiz' } });
  pick('Central Seagull');
  expect(flyWithArrows(lastChoice)).toBe(true);
});
