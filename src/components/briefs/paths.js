import { createContext, useContext } from 'react';

// Where the briefs page lives. `told` and `upload` are pages of their own beneath it, which is
// why the server refuses them as a brief's id.
//
// A school other than Primary mounts the same page at its own address (NIFE at /nife/briefs),
// so every link inside the page asks where it is rather than naming Primary's address. The
// default is Primary's, which is where the page has always been.
export const BRIEFS_BASE = '/tw4/briefs';

const BriefsBase = createContext(BRIEFS_BASE);

export const BriefsBaseProvider = BriefsBase.Provider;
export const useBriefsBase = () => useContext(BriefsBase);

// A squadron's briefs sit with its wing's on the briefs page: VT-3's under TW-5. The brief
// itself still says it is VT-3's, and an upload replaces only its own unit's briefs.
const SQUADRON_WINGS = {
  'VT-7': 'TW-1',
  'VT-9': 'TW-1',
  'VT-21': 'TW-2',
  'VT-22': 'TW-2',
  'VT-27': 'TW-4',
  'VT-28': 'TW-4',
  'VT-31': 'TW-4',
  'VT-35': 'TW-4',
  'VT-2': 'TW-5',
  'VT-3': 'TW-5',
  'VT-6': 'TW-5',
  'VT-4': 'TW-6',
  'VT-10': 'TW-6',
  'VT-86': 'TW-6',
};
export const wingOf = (unit) => SQUADRON_WINGS[(unit || '').toUpperCase()] || unit || '';
