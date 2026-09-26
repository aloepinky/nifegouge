import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSyllabus } from './SyllabusContext';
import { fitLines } from './flowText';

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
  simcheck: 'roundrect',
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
          <Label text={n.label} w={n.w} shape={SHAPE[n.kind]}
                 x={round(n.x + n.w / 2)} y={round(n.y + n.h / 2)} />
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

// The legend's captions are laid out here, not by the tracer, so a traced VIEWBOX covers the
// key shapes and knows nothing about how far right the words beside them reach.
const LEGEND_GAP = 6;
const LEGEND_CAPTION = 62;

// A legend may be laid out in more than one column: Delta prints one, both T-44C charts print
// two. Each column's captions sit beside that column's own keys, because one caption x for the
// whole legend stacks every caption of the narrower column on top of the wider one's.
const LEGEND_COLUMN = 24;

function legendColumns(legend) {
  const columns = [];
  [...legend].sort((a, b) => a.x - b.x).forEach((k) => {
    const open = columns[columns.length - 1];
    if (open && k.x - open.x <= LEGEND_COLUMN) open.keys.push(k);
    else columns.push({ x: k.x, keys: [k] });
  });
  return columns.map((c) => ({
    keys: c.keys,
    captionX: round(Math.max(...c.keys.map((k) => k.x + k.w)) + LEGEND_GAP),
  }));
}

// How far right the legend reaches. A column whose captions are printed inside the keys needs
// no room beside them, which is what keeps the frame off the rest of the chart.
const legendRight = (legend) => Math.max(...legendColumns(legend).map((c) => (
  c.keys.some((k) => !k.inside) ? c.captionX + LEGEND_CAPTION : Math.max(...c.keys.map((k) => k.x + k.w))
)));

// A label centred in its shape, on as many lines as it takes (`fitLines` decides where it
// breaks). The first line is lifted by half the block's height so the whole of it is centred
// rather than hanging below the middle.
export function Label({ text, x, y, w, shape }) {
  const lines = fitLines(text, w, shape);
  if (lines.length === 1) return <text className="discuss-flow-label" x={x} y={y}>{lines[0]}</text>;
  return (
    <text className="discuss-flow-label" x={x} y={y}>
      {lines.map((line, i) => (
        <tspan key={`${i}:${line}`} x={x} dy={i === 0 ? `${-((lines.length - 1) / 2)}em` : '1em'}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

// Widen a viewBox to fit its legend's captions. A chart whose legend sits at its own right
// edge loses them otherwise — both T-44C charts put it there, where Delta's sits well inside
// the boxes and is unaffected.
function fitLegend(viewBox, legend) {
  if (!viewBox || !legend || !legend.length) return viewBox;
  const box = viewBox.split(/\s+/).map(Number);
  if (box.length !== 4 || !box.every(Number.isFinite)) return viewBox;
  const [x, y, w, h] = box;
  const need = legendRight(legend);
  return need > x + w ? [x, y, round(need - x), h].join(' ') : viewBox;
}

export function Legend({ legend }) {
  const pad = 7;
  const x = Math.min(...legend.map((k) => k.x)) - pad;
  const y = Math.min(...legend.map((k) => k.y)) - pad;
  const bottom = Math.max(...legend.map((k) => k.y + k.h)) + pad;
  return (
    <g className="discuss-flow-legend">
      <rect className="discuss-flow-legend-frame"
            x={round(x)} y={round(y)} width={round(legendRight(legend) - x)} height={round(bottom - y)} />
      {legendColumns(legend).flatMap((c) => c.keys.map((k) => (
        <g key={k.kind}>
          <Shape kind={k.kind} x={k.x} y={k.y} w={k.w} h={k.h}
                 className={`discuss-flow-node discuss-flow-node--${k.kind}`} />
          {k.inside ? (
            <Label text={k.label} w={k.w} shape={k.shape}
                   x={round(k.x + k.w / 2)} y={round(k.y + k.h / 2)} />
          ) : (
            <text className="discuss-flow-legend-label" x={c.captionX} y={round(k.y + k.h / 2)}>
              {k.label}
            </text>
          )}
        </g>
      )))}
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

// `flow` defaults to the syllabus's course flow. A syllabus that splits also draws one chart
// per community, and passes that chart here with the community's name as `label`; the two
// render through the same component because they are the same figure, differing only in which
// part of the course they cover. `titleId` keeps the accessible title unique when a page shows
// both.
function CourseFlow({ flow: flowProp = null, label = null, titleId = 'discuss-flow-title' }) {
  const s = useSyllabus();
  const flow = flowProp || s.flow;
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

  const viewBox = fitLegend(flow.VIEWBOX, flow.LEGEND);
  // A community chart is a smaller figure than the course flow, and is drawn to the same scale
  // so the two read as two figures of one publication rather than the small one blown up to
  // fill the column.
  const wide = Number((s.flow && s.flow.VIEWBOX ? s.flow.VIEWBOX : viewBox).split(/\s+/)[2]);
  const mine = Number(viewBox.split(/\s+/)[2]);
  const scaled = label && wide > 0 && mine > 0 && mine < wide;

  return (
    <div className="discuss-flow">
      <svg
        className={`discuss-flow-svg${scaled ? ' discuss-flow-svg--community' : ''}`}
        style={scaled ? { '--flow-scale': round(mine / wide) } : undefined}
        viewBox={viewBox}
        aria-labelledby={titleId}
      >
        <title id={titleId}>
          {label
            ? `${s.name} course flow for ${label}: the training blocks this community flies after the course splits. Each box opens that block’s discuss items.`
            : `${s.name} course flow: every training block in sequence, with its ground training prerequisites. Each box opens that block’s discuss items.`}
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

      {/* The publication the chart was traced from, and nothing else. A legend explaining that
          links are links and faded boxes are not told the reader what the chart had already
          shown them. A community chart is captioned by its own picker, so it carries none. */}
      {!label && s.source && <p className="discuss-flow-source">{s.source}.</p>}
    </div>
  );
}

export default CourseFlow;
