// Where a chart label breaks.
//
// The publication sets a label on more than one line where one will not fit: the P-8 chart
// prints SERVICE-SPECIFIC / COURSE FLOW in its box, and the legend prints "Ground Training" and
// "Flight Support" inside their keys. So a label that does not fit wraps rather than running
// out across the chart.
//
// Width is estimated at about half the type size per character. The text is drawn by the
// browser and never measured — measuring would mean rendering, reading back and re-rendering on
// every chart — so this is a guess, and it wants to stay a forgiving one: a label broken when
// it would have fitted looks worse than one that overruns by a hair.
//
// It lives apart from CourseFlow.js because that file imports react-router-dom, whose v7
// exports map CRA 5's Jest resolver cannot read, so nothing that imports it can be tested.
// Keeping the pure part in its own file is the same move stats.js made.

const CHAR_W = 6.6 * 0.5;

// How much of a shape a line of text can use is not its full width: an ellipse curves away
// from its own bounding box and a hexagon's ends are cut off, which is why the publication
// wraps "Flight Support" inside a hexagon wider than the box holding "Check Flight".
const USABLE = { ellipse: 0.78, hex6: 0.7, oct8: 0.78, circle: 0.7 };

// Break where the two halves come out most even, which is how the publication breaks its own
// two-line labels, then break again where a half is still too long. A SINGLE WORD is never
// broken: an event id is one token, and FAM4301- over 4 reads worse than the overrun does.
export function fitLines(text, w, shape) {
  const room = shape in USABLE ? w * USABLE[shape] : w - 2;
  const whole = String(text);
  const words = whole.split(' ');
  if (whole.length * CHAR_W <= room || words.length < 2) return [whole];
  let at = 1;
  words.forEach((_, i) => {
    if (i === 0) return;
    const here = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    const best = Math.abs(words.slice(0, at).join(' ').length - words.slice(at).join(' ').length);
    if (here < best) at = i;
  });
  return [words.slice(0, at).join(' '), words.slice(at).join(' ')]
    .flatMap((line) => fitLines(line, w, shape));
}

export default fitLines;
