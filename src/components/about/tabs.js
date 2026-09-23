import { PROGRAM_TABS, shownTabs, DRAFT } from '../programs';

// An About page's index is the program's own tab list (programs.js), in the order the top bar
// offers it, so the two can never fall out of step. The About page supplies only what the nav
// does not carry — the icon, the one-line blurb and the paragraphs — keyed by the tab's path.
//
// The About tab itself is left out: it is the page you are already on.
export function aboutTabs(programId, content) {
  return shownTabs(PROGRAM_TABS[programId])
    .filter((tab) => !tab.to.endsWith('/about'))
    .map((tab) => {
      const written = content[tab.to];
      if (!written) {
        // A page added to the nav and not yet written about. It is left out rather than shown
        // with an empty panel; the warning is how whoever added it finds out.
        if (DRAFT) console.warn(`About page (${programId}): nothing written for ${tab.to}`);
        return null;
      }
      return { name: tab.label, path: tab.to, ...written };
    })
    .filter(Boolean);
}
