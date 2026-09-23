import { createContext, useContext } from 'react';

// Where the Discussion Items tab lives.
//
// A school other than Primary mounts the same tab at its own address (NIFE at /nife/discuss),
// so every link inside it asks where it is rather than naming Primary's. The default is
// Primary's, which is where the tab has always been. Same shape as briefs/paths.js.
//
// `e`, `b`, `s`, `upload` and `edit` are pages of their own beneath this, which is why the
// server refuses them as a page's slug (RESERVED_SLUGS in lambda/discussApi/lint.mjs).
export const DISCUSS_BASE = '/tw4/discuss';

const DiscussBase = createContext(DISCUSS_BASE);

export const DiscussBaseProvider = DiscussBase.Provider;
export const useDiscussBase = () => useContext(DiscussBase);
