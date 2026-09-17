// Where a jet log is filed: a group, then a folder inside it.
//
// The groups are a constant rather than something derived from the corpus, and that is the
// whole reason they exist as a level: an index built from records cannot name a group with no
// records in it, and Echo Syllabus Sims has to be somewhere to publish into before anything
// is there. A syllabus owns its own sims, so the group names the syllabus and the folder is
// the block; anything not tied to a syllabus event is gouge.
//
// Values are free text with the known ones offered, the way a page's aircraft and school are.
// Nothing on the server enforces this list: a folder that needed a Lambda deploy to exist is
// the friction the corpus moved off the repo to escape.

export const JETLOG_GROUPS = [
  {
    name: 'Delta Syllabus Sims',
    folders: ['VNAV', 'I3100', 'I3200', 'I6100', 'I6200', 'I6300'],
  },
  {
    name: 'Flight Gouge',
    folders: ['Local Flights', 'Capstone Flights'],
  },
  {
    name: 'Echo Syllabus Sims',
    folders: [],
  },
];

export const GROUP_NAMES = JETLOG_GROUPS.map((g) => g.name);

const knownFolders = (group) => {
  const hit = JETLOG_GROUPS.find((g) => g.name === group);
  return hit ? hit.folders : [];
};

// Known names in their own order, then anything the corpus carries that they do not, sorted.
// The order is curriculum order and not alphabetical — VNAV is flown before the I blocks, and
// a list that sorted would put it last.
function ordered(known, present) {
  const extra = [...present].filter((name) => !known.includes(name)).sort();
  return [...known, ...extra];
}

// Every group to draw: all three known ones, whether or not they hold anything, plus any the
// corpus names that the list does not.
export function groupsFrom(logs) {
  const present = new Set((logs || []).map((l) => l.group).filter(Boolean));
  return ordered(GROUP_NAMES, present);
}

// The folders of one group that actually hold a jet log. A known folder with nothing in it is
// not drawn — there is nothing in it to reach — while the group above it still is, which is
// what leaves a place to publish into.
export function foldersFor(group, logs) {
  const present = new Set(
    (logs || []).filter((l) => (l.group || '') === group).map((l) => l.folder || ''),
  );
  return ordered(knownFolders(group).filter((f) => present.has(f)), present).filter(Boolean);
}

// What the publish panel offers for a group: the known folders first, then the ones the
// corpus has grown, whether or not either is empty.
export function folderOptions(group, logs) {
  const present = new Set(
    (logs || []).filter((l) => (l.group || '') === group).map((l) => l.folder).filter(Boolean),
  );
  return ordered(knownFolders(group), present);
}
