import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSyllabus } from './SyllabusContext';

// The JPPT course-flow chart, clickable. Geometry comes from the syllabus being shown —
// FLOW.js for Delta, traced from the publication, or a generated syllabus's own flow; this
// file only decides what each box points at and how it reads.
//
// A box is a training block, not an event — the figure draws FAM4301-4 as one box — so a box
// with several events opens its block page and a lone event with a page of its own goes
// straight there. Flow connectors navigate nowhere: they are the figure's own off-page jump
// notation, so clicking one lights up the others sharing its letter and leaves the reading of
// the figure to the student.

// Shape follows from `kind`, because that is how the publication's legend keys it: a Flight is
// a thin rectangle and a Check Flight a thick one, a P/P Exam is a thick ellipse and Ground
// Training a thin one. One mapping, both directions.
export const SHAPE = {
  flight: 'rect',
  check: 'rect',
  sim: 'roundrect',
  ground: 'ellipse',
  cai: 'oct8',
  support: 'hex6',
  exam: 'ellipse',
  jump: 'circle',
};

// Vertex fractions measured off the traced paths rather than eyeballed: the hexagon's points
// sit a quarter of the way in, the octagon's corners are cut at 0.2925 of each side, and the
// rounded rectangle's radius is 0.0828 of its width.
const HEX_INSET = 0.2497;
const OCT_INSET = 0.2925;
const ROUND_RX = 0.0828;
const ROUND_RY = 0.248;

export function poly(pts) {
  return pts.map((p) => `${round(p[0])},${round(p[1])}`).join(' ');
}

export function round(v) {
  return Math.round(v * 100) / 100;
}

export function Shape({ kind, x, y, w, h, className }) {
  switch (SHAPE[kind]) {
    case 'circle':
      return <circle className={className} cx={x + w / 2} cy={y + h / 2} r={w / 2} />;
    case 'ellipse':
      return <ellipse className={className} cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} />;
    case 'roundrect':
      return (
        <rect className={className} x={x} y={y} width={w} height={h}
              rx={round(w * ROUND_RX)} ry={round(h * ROUND_RY)} />
      );
    case 'hex6':
      return (
        <polygon className={className} points={poly([
          [x + w * HEX_INSET, y], [x + w * (1 - HEX_INSET), y],
          [x + w, y + h / 2],
          [x + w * (1 - HEX_INSET), y + h], [x + w * HEX_INSET, y + h],
          [x, y + h / 2],
        ])} />
      );
    case 'oct8':
      return (
        <polygon className={className} points={poly([
          [x + w * OCT_INSET, y], [x + w * (1 - OCT_INSET), y],
          [x + w, y + h * OCT_INSET], [x + w, y + h * (1 - OCT_INSET)],
          [x + w * (1 - OCT_INSET), y + h], [x + w * OCT_INSET, y + h],
          [x, y + h * (1 - OCT_INSET)], [x, y + h * OCT_INSET],
        ])} />
      );
    default:
      return <rect className={className} x={x} y={y} width={w} height={h} />;
  }
}

// Where a box goes. Only events the JPPT gives discuss items go anywhere at all — the
// academics, exams and ground training are drawn for sequence, not as destinations. That is
// decided per event, not per block: G01 briefs one item, on G0102, and its other seven boxes
// have nothing to open. A single event with items lands on its own page; a box of several
// lands on the block, which always has its JPPT metadata to show.
export function target(s, node) {
  if (!s.hasDiscussItems(node.block)) return null;
  const events = node.events || [];
  const briefed = events.filter((id) => s.getEvent(id));
  if (events.length && !briefed.length) return null;
  if (events.length === 1) return s.eventPath(events[0]);
  return node.block && s.getBlock(node.block) ? s.blockPath(node.block) : null;
}

function writtenCount(s, node) {
  return (node.events || []).filter((id) => s.getEvent(id)).length;
}

// What hovering says. Every box is named, whether or not it is a link — a box that goes
// nowhere still has to answer "what is this". The last clause is the honest part: it is what
// makes the chart a map of what is still unwritten.
function describe(s, node) {
  const events = node.events || [];
  const block = s.getBlock(node.block);
  const name = events.length === 1
    ? (s.syllabusEvent(events[0]) || {}).title
    : block && block.title;
  const bits = [node.label];
  if (name) bits.push(name);
  const media = block && block.media;
  if (media) bits.push(media);
  if (events.length > 1) bits.push(`${events.length} events`);
  if (!target(s, node)) bits.push('no discuss items');
  else bits.push(writtenCount(s, node) === 0 ? 'no page yet' : `${writtenCount(s, node)} with a page`);
  return bits.join(' — ');
}

// Static chrome — edges, boxes, legend — is built once per syllabus rather than on every
// render, so selecting a flow connector reconciles only the circles.
function buildChrome(s, flow) {
  const nodes = flow.NODES || [];
  const legend = flow.LEGEND || [];
  const boxes = nodes.filter((n) => n.kind !== 'jump');

  const edgeEls = (flow.EDGES || []).map((e, i) => (
    <polyline
      key={`${e.from}>${e.to}>${i}`}
      className="discuss-flow-edge"
      points={poly(e.points)}
      markerEnd="url(#discuss-flow-arrow)"
    />
  ));

  // Faded boxes paint first. Boxes are stacked edge to edge, so wherever two share a border the
  // later one's stroke wins it, and a pale outline drawn over a link's border reads as the link
  // being faded too. Linked boxes always come last; the sort is stable, so figure order holds
  // within each group.
  const boxEls = boxes
    .map((n) => ({ n, to: target(s, n) }))
    .sort((a, b) => (a.to ? 1 : 0) - (b.to ? 1 : 0))
    .map(({ n, to }) => {
      // Three states, and they must stay distinguishable: a block that carries no discuss items
      // is context and reads as complete; a block that carries them but has no page yet is a
      // gap and reads as one. Collapsing the two would make the coverage map lie.
      const cls = [
        'discuss-flow-node',
        `discuss-flow-node--${n.kind}`,
        !to ? 'discuss-flow-node--inert' : '',
        to && writtenCount(s, n) === 0 ? 'discuss-flow-node--thin' : '',
      ].join(' ');
      const text = describe(s, n);
      const body = (
        <>
          {/* <title> is the hover tooltip; aria-label is the accessible name. Both are needed —
              without the label, the name would be the tooltip *plus* the visible <text>, which
              says the event id twice. */}
          <title>{text}</title>
          <Shape kind={n.kind} x={n.x} y={n.y} w={n.w} h={n.h} className={cls} />
          <text className="discuss-flow-label" x={round(n.x + n.w / 2)} y={round(n.y + n.h / 2)}>
            {n.label}
          </text>
        </>
      );
      return to ? (
        <Link key={n.id} to={to} className="discuss-flow-hit" aria-label={text}>{body}</Link>
      ) : (
        <g key={n.id}>{body}</g>
      );
    });

  return {
    edgeEls,
    boxEls,
    legendEls: legend.length ? <Legend legend={legend} /> : null,
    jumps: nodes.filter((n) => n.kind === 'jump'),
  };
}

export function Legend({ legend }) {
  const captionX = round(Math.max(...legend.map((k) => k.x + k.w)) + 6);
  const pad = 7;
  const x = Math.min(...legend.map((k) => k.x)) - pad;
  const y = Math.min(...legend.map((k) => k.y)) - pad;
  const bottom = Math.max(...legend.map((k) => k.y + k.h)) + pad;
  return (
    <g className="discuss-flow-legend">
      <rect className="discuss-flow-legend-frame"
            x={round(x)} y={round(y)} width={round(captionX + 62 - x)} height={round(bottom - y)} />
      {legend.map((k) => (
        <g key={k.kind}>
          <Shape kind={k.kind} x={k.x} y={k.y} w={k.w} h={k.h}
                 className={`discuss-flow-node discuss-flow-node--${k.kind}`} />
          <text className="discuss-flow-legend-label" x={captionX} y={round(k.y + k.h / 2)}>
            {k.label}
          </text>
        </g>
      ))}
    </g>
  );
}

export function ArrowDefs() {
  return (
    <defs>
      <marker
        id="discuss-flow-arrow"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        markerUnits="userSpaceOnUse"
        orient="auto"
      >
        <path className="discuss-flow-arrowhead" d="M 0 1.4 L 9 5 L 0 8.6 z" />
      </marker>
    </defs>
  );
}

function CourseFlow() {
  const s = useSyllabus();
  const flow = s.flow;
  const [letter, setLetter] = useState(null);
  const chrome = useMemo(() => buildChrome(s, flow || {}), [s, flow]);

  const toggle = useCallback((next) => {
    setLetter((cur) => (cur === next ? null : next));
  }, []);

  const onKey = useCallback((event, next) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle(next);
    } else if (event.key === 'Escape') {
      setLetter(null);
    }
  }, [toggle]);

  if (!flow || !flow.NODES || !flow.NODES.length) return null;

  return (
    <div className="discuss-flow">
      <svg
        className="discuss-flow-svg"
        viewBox={flow.VIEWBOX}
        aria-labelledby="discuss-flow-title"
      >
        <title id="discuss-flow-title">
          {s.name} course flow: every training block in sequence, with its ground training
          prerequisites. Each box opens that block’s discuss items.
        </title>
        <ArrowDefs />

        <g>{chrome.edgeEls}</g>
        <g>{chrome.boxEls}</g>

        {chrome.jumps.map((n) => {
          const on = letter === n.letter;
          const text = `Flow connector ${n.letter} (${n.role}) — highlights every ${n.letter}`;
          return (
            <g
              key={n.id}
              className={`discuss-flow-jump${on ? ' discuss-flow-jump--on' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={text}
              onClick={() => toggle(n.letter)}
              onKeyDown={(e) => onKey(e, n.letter)}
            >
              <title>{text}</title>
              <Shape kind="jump" x={n.x} y={n.y} w={n.w} h={n.h}
                     className="discuss-flow-node discuss-flow-node--jump" />
              <text className="discuss-flow-letter"
                    x={round(n.x + n.w / 2)} y={round(n.y + n.h / 2)}>
                {n.letter}
              </text>
            </g>
          );
        })}

        {chrome.legendEls}
      </svg>

      <p className="discuss-flow-source">
        {s.source ? `${s.source}. ` : ''}Only blocks the JPPT gives discuss items are links; the
        rest are drawn for sequence. Tinted blocks have no page yet.
      </p>
    </div>
  );
}

export default CourseFlow;
