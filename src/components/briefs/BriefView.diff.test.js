import React from 'react';
import { render, screen } from '@testing-library/react';
import BriefView from './BriefView';
import { diffBriefs } from './briefDiff';

// The preview of a brief that replaces one on the site: what the marks look like once drawn.

const current = {
  title: 'BRIEFING GUIDE',
  sections: [
    {
      id: 'wx',
      title: 'WEATHER',
      column: 1,
      items: [
        { id: 'wx-1', label: 'Local area', text: 'Brief current METARs.' },
        { id: 'wx-2', label: 'Winds', text: 'Brief the winds.' },
      ],
    },
  ],
};

const next = {
  title: 'BRIEFING GUIDE',
  sections: [
    {
      id: 'wx',
      title: 'WEATHER',
      column: 1,
      items: [
        { id: 'wx-1', label: 'Local area', text: 'Brief current METARs and TAFs.' },
        { id: 'wx-3', label: 'Icing', text: 'Brief the freezing level.' },
      ],
    },
  ],
};

function draw() {
  const out = diffBriefs(current, next);
  const expanded = Object.fromEntries(Object.keys(out.marks).map((id) => [id, true]));
  return render(
    <BriefView
      brief={out.doc}
      expanded={expanded}
      onToggle={() => {}}
      firstLetter={false}
      diff={out.marks}
    />,
  );
}

test('what the edition drops is on screen as dropped, and what it adds as added', () => {
  draw();

  // The rewritten line, with the one it replaced still there and marked as gone. `del` and
  // `ins` are what say so to somebody who cannot see the styling.
  expect(screen.getByText('Brief current METARs.').tagName).toBe('DEL');
  expect(screen.getByText('Brief current METARs and TAFs.').tagName).toBe('INS');

  // One item rewritten, one gone, one new — in the order the old brief had them.
  expect(screen.getAllByText(/^changed$|^removed$|^new$/).map((t) => t.textContent))
    .toEqual(['changed', 'removed', 'new']);
});

test('nothing is marked when a brief is drawn on its own', () => {
  render(<BriefView brief={next} expanded={{ 'wx-1': true }} onToggle={() => {}} firstLetter={false} />);
  expect(screen.queryByText(/^changed$|^removed$|^new$/)).toBeNull();
  expect(screen.getByText('Brief current METARs and TAFs.').tagName).not.toBe('INS');
});
