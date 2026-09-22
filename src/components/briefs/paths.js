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
