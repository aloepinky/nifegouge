// Arrow keys move between the blanks of a limits sheet, the way they move between the cells of
// a spreadsheet. Every school's sheet is bespoke markup (see CLAUDE.md), so this reads nothing
// from the markup but which block (table, list, section) a blank is in: it takes the blanks'
// positions on screen and goes to the nearest one in the direction pressed. Up and Down stay in
// the blank's own column (the one that overlaps it horizontally) while the column goes on in
// the same block, then step to the block directly above or below; Left and Right stay in its
// own row. So a grid of engine limits walks as a grid, and a two-column sheet does not jump
// across the gutter when a nearer blank sits over there.
//
// Left and Right only leave a blank from its edge — the caret at the start or the end of what
// is typed, or nothing typed — so the keys still edit a half-typed answer. Up and Down always
// move, since a one-line box has nowhere for them to go.
//
// `onKeyDown` handlers call it first and let it say whether it took the key.

const DIRS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

const overlaps = (a, b, axis) => (axis === 'x'
  ? a.left < b.right && b.left < a.right
  : a.top < b.bottom && b.top < a.bottom);

const centre = (r, axis) => (axis === 'x' ? (r.left + r.right) / 2 : (r.top + r.bottom) / 2);

// The block of the sheet a blank sits in: the engine grid, the notes list, one banner's rows on
// the T-44C sheet, one of Primary's tables. Every sheet builds its blocks from these elements,
// so no sheet has to say where its sections are.
const SECTION = 'table, ul, ol, section, fieldset';
const sectionOf = (el, container) => (el.closest(SECTION) || container);

// The blank to move to from `from`, among `inputs`, in direction [dx, dy]; null if none.
//
// Left and Right stay in the blank's own row. Up and Down stay in its own column while the
// column goes on inside the same section, so a grid walks as a grid, and at the section's edge
// go to the section directly above or below: its last or first row, at the closest column.
// Without that rule a column with no blank in the next section skipped that whole section for
// the one after it.
export function nextInput(from, inputs, [dx, dy], container) {
  const cur = from.getBoundingClientRect();
  // The axis of travel, and the one the candidate must share a row or column on.
  const along = dx ? 'x' : 'y';
  const across = dx ? 'y' : 'x';
  const sign = dx || dy;
  const home = sectionOf(from, container);

  // Every blank ahead in the direction of travel, with how far ahead it starts (from this
  // blank's leading edge, with a hair of tolerance so a touching neighbour counts) and how far
  // off this blank's row or column its centre sits.
  const ahead = [];
  for (const el of inputs) {
    if (el === from) continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    const gap = sign > 0
      ? (along === 'x' ? r.left - cur.right : r.top - cur.bottom)
      : (along === 'x' ? cur.left - r.right : cur.top - r.bottom);
    if (gap < -2) continue;
    ahead.push({ el, r, gap, off: Math.abs(centre(r, across) - centre(cur, across)), inLine: overlaps(cur, r, across) });
  }
  // Nearest first, and at the same distance the one most nearly in line.
  const nearest = (list) => list.reduce((best, c) => (
    !best || c.gap < best.gap - 1 || (Math.abs(c.gap - best.gap) <= 1 && c.off < best.off) ? c : best
  ), null);

  if (dx) {
    const hit = nearest(ahead.filter((c) => c.inLine));
    return hit ? hit.el : null;
  }

  // The blank on the first row ahead among `list` (the row nearest this blank) at the closest
  // column: in line with this one if that row has such a blank, else the nearest across.
  const rowHit = (list) => {
    if (!list.length) return null;
    const edge = sign > 0
      ? Math.min(...list.map((c) => c.r.top))
      : Math.max(...list.map((c) => c.r.bottom));
    const row = list.filter((c) => Math.abs((sign > 0 ? c.r.top : c.r.bottom) - edge) <= 3);
    return row.find((c) => c.inLine) || row.reduce((b, c) => (!b || c.off < b.off ? c : b), null);
  };

  // Inside the blank's own section. A table is a grid, and the move follows the column past a
  // row with nothing in it (a dashed cell). A list is lines, and the move goes to the next line
  // at the closest blank: the notes under the T-44C grid put their blanks wherever the sentence
  // does, and following a "column" there skipped seven notes.
  const inHome = ahead.filter((c) => sectionOf(c.el, container) === home);
  const same = home.tagName === 'TABLE' ? nearest(inHome.filter((c) => c.inLine)) : rowHit(inHome);
  if (same) return same.el;

  // Off the end of the section: the section directly ahead is the one holding the nearest
  // blank ahead that sits under (or over) this section, and the move lands on its first row at
  // the closest column. "Under this section", not this blank: Primary's airspeed table ends
  // beside the starter table's middle, and the nearest blank below its last row is over there,
  // when the section directly below is the prohibited manoeuvres under it.
  const span = home.getBoundingClientRect();
  const under = ahead.filter((c) => sectionOf(c.el, container) !== home && overlaps(span, c.r, 'x'));
  const lead = nearest(under.length ? under : ahead.filter((c) => sectionOf(c.el, container) !== home));
  if (!lead) return null;
  const next = sectionOf(lead.el, container);
  const hit = rowHit(ahead.filter((c) => sectionOf(c.el, container) === next));
  return hit ? hit.el : null;
}

// Whether Left or Right would move the caret rather than leave the blank.
function caretCanMove(el, dx) {
  if (!el.value) return false;
  const { selectionStart, selectionEnd } = el;
  if (selectionStart === null || selectionStart === undefined) return false;
  if (selectionStart !== selectionEnd) return true;
  return dx < 0 ? selectionStart > 0 : selectionEnd < el.value.length;
}

// Handles an arrow key pressed in one of `container`'s blanks. Returns true if it moved.
export default function arrowMove(e, container = e.currentTarget) {
  const dir = DIRS[e.key];
  const el = e.target;
  if (!dir || !el || el.tagName !== 'INPUT' || e.altKey || e.ctrlKey || e.metaKey) return false;
  if (dir[0] && caretCanMove(el, dir[0])) return false;
  const inputs = [...container.querySelectorAll('input')]
    .filter((i) => !i.disabled && !i.readOnly && i.type !== 'hidden' && i.type !== 'checkbox' && i.type !== 'radio');
  const to = nextInput(el, inputs, dir, container);
  if (!to) return false;
  e.preventDefault();
  to.focus();
  if (to.select) to.select();
  return true;
}
