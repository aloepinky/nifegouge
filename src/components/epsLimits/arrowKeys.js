// Arrow keys move between the blanks of a limits sheet, the way they move between the cells of
// a spreadsheet. Every school's sheet is bespoke markup (see CLAUDE.md), so this reads nothing
// from the markup: it takes the blanks' positions on screen and goes to the nearest one in the
// direction pressed. Up and Down stay in the blank's own column (the one that overlaps it
// horizontally), Left and Right in its own row, so a grid of engine limits walks as a grid and
// a two-column sheet does not jump across the gutter when a nearer blank sits over there.
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

// The blank to move to from `from`, among `inputs`, in direction [dx, dy]; null if none.
export function nextInput(from, inputs, [dx, dy]) {
  const cur = from.getBoundingClientRect();
  // The axis of travel, and the one the candidate must share a row or column on.
  const along = dx ? 'x' : 'y';
  const across = dx ? 'y' : 'x';
  const sign = dx || dy;
  let best = null;
  let bestGap = Infinity;
  let bestOff = Infinity;
  for (const el of inputs) {
    if (el === from) continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    if (!overlaps(cur, r, across)) continue;
    // How far ahead it starts, measured from this blank's leading edge; a hair of tolerance so
    // a neighbour whose border touches ours still counts as ahead.
    const gap = sign > 0
      ? (along === 'x' ? r.left - cur.right : r.top - cur.bottom)
      : (along === 'x' ? cur.left - r.right : cur.top - r.bottom);
    if (gap < -2) continue;
    const off = Math.abs(centre(r, across) - centre(cur, across));
    if (gap < bestGap - 1 || (Math.abs(gap - bestGap) <= 1 && off < bestOff)) {
      best = el;
      bestGap = gap;
      bestOff = off;
    }
  }
  return best;
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
  const to = nextInput(el, inputs, dir);
  if (!to) return false;
  e.preventDefault();
  to.focus();
  if (to.select) to.select();
  return true;
}
