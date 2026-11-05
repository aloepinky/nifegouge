import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PublishDialog from './PublishDialog';
import { saveItem } from '../discussApi';

// The publish step: a reported publication the page cites can be settled from it, which sends
// the report's id with the revision.

jest.mock('../discussApi', () => ({
  saveItem: jest.fn(() => Promise.resolve({ rev: 2 })),
  getAuthor: () => 'Tester',
  setAuthor: () => {},
}));

const item = { slug: 'loop', title: 'Loop', references: [] };

test('offers each reported publication, unticked, and sends the ones ticked', async () => {
  const onPublished = jest.fn();
  render(
    <PublishDialog
      slug="loop"
      baseRev={1}
      item={item}
      pubs={[{ id: 'dcde4cdc3deb10e9', name: 'FAM FTI' }, { id: 'aaaaaaaaaaaaaaaa', name: 'NATOPS Ch. 4' }]}
      onPublished={onPublished}
      onConflict={() => {}}
      onCancel={() => {}}
    />,
  );
  expect(screen.getByText('Publication reported updated')).toBeTruthy();
  const fam = screen.getByLabelText('FAM FTI is up to date on the site');
  expect(fam.checked).toBe(false);
  fireEvent.click(fam);
  fireEvent.change(screen.getByLabelText(/What changed/), { target: { value: 'Rev 5 torque' } });
  fireEvent.click(screen.getByText('Publish'));
  await waitFor(() => expect(onPublished).toHaveBeenCalled());
  expect(saveItem).toHaveBeenCalledWith('loop', 1, item, expect.objectContaining({ resolvePubs: ['dcde4cdc3deb10e9'] }));
});

test('says nothing about publications when none is reported', () => {
  render(<PublishDialog slug="loop" baseRev={1} item={item} onPublished={() => {}} onConflict={() => {}} onCancel={() => {}} />);
  expect(screen.queryByText('Publication reported updated')).toBeNull();
});
