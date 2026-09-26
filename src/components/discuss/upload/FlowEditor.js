import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CourseFlow, { Shape, SHAPE, ArrowDefs, Label, Legend, poly, round } from '../CourseFlow';
import { SyllabusContext, fromDoc } from '../SyllabusContext';
import { ConfirmButton, Line } from '../edit/fields';
import LinkReview from './LinkReview';
import { expand, blockOf } from '../jppt/flowExtract';
import {
  KINDS, addBlockFor, addNode, addPoint, branchEdge, checks, connect, fit, moveNode, movePoint, relabelNode,
  removePoint, joinEdge, removeEdge, removeNode, resizeNode, reverseEdge, setBriefed, updateBlock, updateNode,
} from './flowOps';

// The course-flow editor: the chart as the tracer produced it, with handles.
//
// It exists because the tracer is only as good as the figure it reads. Delta's needed three
// hand repairs; another JPPT may need more, or may print its chart as an image and need
// drawing from scratch. What it edits is the chart and the one fact about each block the chart
// shows, whether it carries discuss items. The Items tab is the one other thing it settles,
// because it is the other thing only a person can: which page a wording the generator could
// not place actually means. Everything else a syllabus holds is edited later, elsewhere.
//
// Whole documents go on the undo stack: every operation in flowOps.js returns a new one.

const HISTORY_LIMIT = 200;

function svgPoint(svg, event) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const ctm = svg.getScreenCTM();
  return ctm ? pt.matrixTransform(ctm.inverse()) : { x: 0, y: 0 };
}

const inField = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');

function useHistory(initial, onCommit) {
  const [state, setState] = useState({ stack: [initial], index: 0 });
  const doc = state.stack[state.index];

  const commit = useCallback((next) => {
    setState((s) => {
      const cur = s.stack[s.index];
      if (next === cur) return s;
      const stack = [...s.stack.slice(Math.max(0, s.index + 1 - HISTORY_LIMIT), s.index + 1), next];
      return { stack, index: stack.length - 1 };
    });
  }, []);
  const undo = useCallback(() => setState((s) => ({ ...s, index: Math.max(0, s.index - 1) })), []);
  const redo = useCallback(() => setState((s) => ({ ...s, index: Math.min(s.stack.length - 1, s.index + 1) })), []);

  useEffect(() => {
    if (onCommit) onCommit(doc);
  }, [doc, onCommit]);

  return { doc, commit, undo, redo, canUndo: state.index > 0, canRedo: state.index < state.stack.length - 1 };
}

function Field({ label, children, hint }) {
  return (
    <div className="discuss-editor-field">
      <span className="discuss-editor-label">{label}</span>
      {hint && <p className="discuss-editor-hint">{hint}</p>}
      {children}
    </div>
  );
}

function NodePanel({ doc, node, commit, onRemove }) {
  const block = doc.blocks.find((b) => b.id === node.block);
  const edgeCount = doc.flow.EDGES.filter((e) => e.from === node.id || e.to === node.id).length;
  const [label, setLabel] = useState(node.label);
  const [events, setEvents] = useState((node.events || []).join(', '));
  const [stage, setStage] = useState(doc.stages[0] ? doc.stages[0].id : '');
  useEffect(() => {
    setLabel(node.label);
    setEvents((node.events || []).join(', '));
  }, [node.id, node.label, node.events]);

  const applyEvents = () => {
    const ids = events.split(/[\s,]+/).filter(Boolean).flatMap((t) => expand(t.toUpperCase()));
    const unique = [...new Set(ids)];
    commit(updateNode(doc, node.id, { events: unique, block: node.block || (unique[0] ? blockOf(unique[0]) : undefined) }));
  };

  if (node.kind === 'jump') {
    return (
      <div className="discuss-floweditor-panel">
        <h3>Flow connector</h3>
        <Field label="Letter" hint="Circles sharing a letter are one point on the figure.">
          <Line
            value={label}
            maxLength={2}
            onChange={(v) => setLabel(v.toUpperCase())}
            onBlur={() => label && label !== node.label && commit(relabelNode(doc, node.id, label))}
          />
        </Field>
        <p className="discuss-editor-hint">Role: {node.role} (from its arrows)</p>
        <ConfirmButton
          label="Delete connector"
          question={edgeCount ? `Delete it and its ${edgeCount} arrow${edgeCount > 1 ? 's' : ''}?` : 'Delete this connector?'}
          confirmLabel="Delete"
          className="discuss-editor-cancel"
          onConfirm={onRemove}
        />
      </div>
    );
  }

  return (
    <div className="discuss-floweditor-panel">
      <h3>Box</h3>
      <Field label="Label" hint="As the chart prints it. FAM4301-4 reads as FAM4301 to FAM4304.">
        <Line
          value={label}
          onChange={setLabel}
          onBlur={() => label && label !== node.label && commit(relabelNode(doc, node.id, label.trim()))}
        />
      </Field>
      <Field label="Category">
        <select
          className="discuss-editor-line"
          value={node.kind}
          onChange={(e) => commit(updateNode(doc, node.id, { kind: e.target.value }))}
        >
          {KINDS.map(([k, name]) => <option key={k} value={k}>{name}</option>)}
          {!KINDS.some(([k]) => k === node.kind) && <option value={node.kind}>{node.kind}</option>}
        </select>
      </Field>
      <Field label="Events">
        <Line value={events} onChange={setEvents} onBlur={applyEvents} />
      </Field>
      <Field label="Block">
        <Line
          value={node.block || ''}
          onChange={(v) => commit(updateNode(doc, node.id, { block: v.toUpperCase() || undefined }))}
        />
      </Field>

      {block ? (
        <>
          <label className="discuss-editor-check">
            <input
              type="checkbox"
              checked={!!block.briefed}
              onChange={(e) => commit(setBriefed(doc, block.id, e.target.checked))}
            />
            {' '}Carries discuss items
          </label>
          <p className="discuss-editor-hint">
            Applies to every box of {block.id}. Blocks that carry items are links; the rest are
            drawn faded.
          </p>
          <Field label="Block title">
            <Line value={block.title} onChange={(v) => commit(updateBlock(doc, block.id, { title: v }))} />
          </Field>
        </>
      ) : node.block && (
        <div className="discuss-editor-field">
          <p className="discuss-editor-warn">Block {node.block} is not in the syllabus text.</p>
          <div className="discuss-editor-field--inline">
            <select className="discuss-editor-line" value={stage} onChange={(e) => setStage(e.target.value)}>
              {doc.stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button
              type="button"
              className="discuss-editor-add"
              disabled={!stage}
              title={stage ? '' : 'The syllabus has no stages to add it to'}
              onClick={() => commit(addBlockFor(doc, node, stage))}
            >
              Add {node.block} to this stage
            </button>
          </div>
        </div>
      )}

      <div className="discuss-floweditor-size">
        W <input type="number" step="0.5" min="10" value={node.w}
                 onChange={(e) => commit(updateNode(doc, node.id, { w: Math.max(10, Number(e.target.value)) }))} />
        H <input type="number" step="0.5" min="10" value={node.h}
                 onChange={(e) => commit(updateNode(doc, node.id, { h: Math.max(10, Number(e.target.value)) }))} />
      </div>

      <ConfirmButton
        label="Delete box"
        question={edgeCount ? `Delete it and its ${edgeCount} arrow${edgeCount > 1 ? 's' : ''}?` : 'Delete this box?'}
        confirmLabel="Delete"
        className="discuss-editor-cancel"
        onConfirm={onRemove}
      />
    </div>
  );
}

function EdgePanel({ doc, index, corner, commit, onRemove, onRemoveCorner }) {
  const edge = doc.flow.EDGES[index];
  const name = (id) => {
    const n = doc.flow.NODES.find((x) => x.id === id);
    return n ? n.label : id;
  };
  return (
    <div className="discuss-floweditor-panel">
      <h3>Arrow</h3>
      <p className="discuss-editor-hint">
        {name(edge.from)} to {name(edge.to)}. Drag a corner to reroute it — the lines either side stay
        straight. The small hollow handle in the middle of a length adds a corner. The two ends slide
        around their own boxes and settle in the middle of a side.
      </p>
      {(edge.joinFrom || edge.joinTo) && (
        <p className="discuss-editor-hint">
          {edge.joinTo
            ? `Its head sits on another arrow rather than on ${name(edge.to)}, so the flow carries on down that arrow.`
            : `It leaves another arrow rather than ${name(edge.from)}, which is where that arrow starts.`}
          {' '}That end is not held to a box: drag it back onto the arrow if either of them moves.
        </p>
      )}
      <div className="discuss-editor-buttons">
        <button type="button" className="discuss-editor-add" onClick={() => commit(reverseEdge(doc, index))}>
          Reverse
        </button>
        <button
          type="button"
          className="discuss-editor-add"
          disabled={corner === null}
          title={corner === null ? 'Click a corner of the arrow first. The two ends belong to their boxes, and a last corner stays where its boxes have no square line between them.' : ''}
          onClick={onRemoveCorner}
        >
          Remove corner
        </button>
        <button type="button" className="discuss-editor-cancel" onClick={onRemove}>Delete arrow</button>
      </div>
    </div>
  );
}

function FlowEditor({
  initial, warnings = [], onCommit, onSave, saveLabel, saving, error, review = false, children,
}) {
  const { doc, commit, undo, redo, canUndo, canRedo } = useHistory(initial, onCommit);
  const [selection, setSelection] = useState(null);
  const [mode, setMode] = useState('select');
  const [connectFrom, setConnectFrom] = useState(null);
  const [drag, setDrag] = useState(null);
  const [tab, setTab] = useState('edit');
  const svgRef = useRef(null);

  // While dragging, the chart shows a live document; the history gets one entry on release.
  const shown = drag && drag.live ? drag.live : doc;
  const flow = shown.flow;

  const selectedNode = selection && selection.type === 'node' ? doc.flow.NODES.find((n) => n.id === selection.id) : null;
  const selectedEdge = selection && selection.type === 'edge' && doc.flow.EDGES[selection.index] ? selection.index : null;
  // Which corner of that arrow is in hand. An end belongs to its box and cannot be taken out,
  // so only a middle one counts as removable.
  const edgePoints = selectedEdge !== null ? doc.flow.EDGES[selectedEdge].points : null;
  const selectedCorner = edgePoints && selection.point > 0 && selection.point < edgePoints.length - 1
    ? selection.point
    : null;
  // Asked of the operation itself rather than judged here, so the control is grey in exactly
  // the cases the removal would refuse — a last corner between two boxes set on the diagonal,
  // which has no square line to fall back to.
  const canRemoveCorner = selectedCorner !== null
    && removePoint(doc, selectedEdge, selectedCorner) !== doc;

  const problems = useMemo(() => checks(doc), [doc]);
  const preview = useMemo(() => fromDoc({ id: 'preview', name: 'Preview', doc }), [doc]);
  const briefedOf = useMemo(() => new Set(doc.blocks.filter((b) => b.briefed).map((b) => b.id)), [doc.blocks]);
  const eventsWithItems = useMemo(() => new Set(doc.events.map((e) => e.id)), [doc.events]);
  // The items still resolving to nothing, which is the Items tab's whole subject: no tab when
  // the generator linked them all.
  const unlinked = useMemo(
    () => doc.events.reduce((n, e) => n + e.items.filter((r) => !r.slug && !r.href && !r.noPage).length, 0),
    [doc.events],
  );

  // Publishing a new syllabus is the end of a walk-through rather than a button sitting beside
  // the first screen. The chart and the items the generator could not place are both things
  // only a person can settle, and a Publish button available from the start is an invitation to
  // settle neither. With `review` on, the footer offers the next tab instead, and Publish
  // appears once the reader is standing on Preview, having been through what came before.
  // Editing a syllabus that is already up does not work this way: a one-arrow fix should not
  // cost a tour.
  const [seen, setSeen] = useState(() => new Set(['edit']));
  useEffect(() => { setSeen((s) => (s.has(tab) ? s : new Set([...s, tab]))); }, [tab]);
  const hasItemsTab = unlinked > 0 || tab === 'items';
  const steps = ['edit', ...(hasItemsTab ? ['items'] : []), 'preview'];
  const blocked = (t) => review
    && steps.slice(0, Math.max(0, steps.indexOf(t))).some((s) => !seen.has(s));
  const stepping = review && tab !== 'preview';
  const nextTab = steps[Math.min(steps.indexOf(tab) + 1, steps.length - 1)];
  const next = { tab: nextTab, label: nextTab === 'items' ? 'Next: the items' : 'Next: preview it' };

  const removeSelected = useCallback(() => {
    if (selectedNode) commit(removeNode(doc, selectedNode.id));
    else if (selectedEdge !== null) commit(removeEdge(doc, selectedEdge));
    setSelection(null);
  }, [commit, doc, selectedEdge, selectedNode]);

  useEffect(() => {
    const onKey = (e) => {
      if (inField(document.activeElement)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') {
        setSelection(null);
        setMode('select');
        setConnectFrom(null);
      } else if (selectedCorner !== null && (e.key === 'Delete' || e.key === 'Backspace')) {
        // A corner in hand is what Delete takes; the arrow itself goes from its own button.
        e.preventDefault();
        commit(removePoint(doc, selectedEdge, selectedCorner));
        setSelection({ type: 'edge', index: selectedEdge });
      } else if (selectedEdge !== null && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        removeSelected();
      } else if (selectedNode && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 0.5;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        commit(moveNode(doc, selectedNode.id, d[0], d[1]));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [commit, doc, redo, removeSelected, selectedCorner, selectedEdge, selectedNode, undo]);

  const startDrag = (event, payload) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const svg = svgRef.current;
    const p = svgPoint(svg, event);
    setDrag({ ...payload, x0: p.x, y0: p.y, live: null });
    try {
      svg.setPointerCapture(event.pointerId);
    } catch (err) {
      // No active pointer to capture (a synthetic event); moves still reach the svg.
    }
  };

  const onPointerMove = (event) => {
    if (!drag) return;
    const p = svgPoint(svgRef.current, event);
    const dx = p.x - drag.x0;
    const dy = p.y - drag.y0;
    let live = doc;
    if (drag.kind === 'node') live = moveNode(doc, drag.id, dx, dy);
    else if (drag.kind === 'resize') live = resizeNode(doc, drag.id, drag.corner, dx, dy);
    else if (drag.kind === 'point') live = movePoint(doc, drag.edge, drag.point, p.x, p.y);
    setDrag({ ...drag, live });
  };

  const onPointerUp = (event) => {
    if (!drag) return;
    const svg = svgRef.current;
    try {
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    } catch (err) {
      // nothing captured
    }
    if (drag.live && drag.live !== doc) commit(drag.live);
    setDrag(null);
  };

  // In connect mode either end may be a box or an existing arrow, so what is in hand is
  // `{ node }` or `{ edge, at }` rather than a bare id.
  const clickNode = (node) => {
    if (mode !== 'connect') {
      setSelection({ type: 'node', id: node.id });
      return;
    }
    if (!connectFrom) {
      setConnectFrom({ node: node.id });
      return;
    }
    if (connectFrom.node === node.id) return;
    const next = connectFrom.node
      ? connect(doc, connectFrom.node, node.id)
      : branchEdge(doc, connectFrom.edge, connectFrom.at, node.id);
    if (next !== doc) {
      commit(next);
      setSelection({ type: 'edge', index: next.flow.EDGES.length - 1 });
    }
    setConnectFrom(null);
    setMode('select');
  };

  const add = (kind) => {
    const [next, id] = addNode(doc, kind);
    commit(next);
    setSelection({ type: 'node', id });
    setMode('select');
  };

  const nodeClass = (n) => {
    const on = selection && selection.type === 'node' && selection.id === n.id;
    const from = !!connectFrom && connectFrom.node === n.id;
    // The published chart's rule: faded unless the block is briefed and one of the box's events
    // has items of its own.
    const faded = n.kind !== 'jump' && (
      !briefedOf.has(n.block)
      || ((n.events || []).length > 0 && !n.events.some((e) => eventsWithItems.has(e)))
    );
    return [
      'discuss-flow-node',
      `discuss-flow-node--${n.kind}`,
      faded ? 'discuss-flow-node--inert' : '',
      on || from ? 'discuss-floweditor-node--on' : '',
    ].join(' ');
  };

  const sel = selectedNode && (flow.NODES.find((n) => n.id === selectedNode.id) || selectedNode);
  const selEdge = selectedEdge !== null ? flow.EDGES[selectedEdge] : null;
  const HANDLE = 2.2;

  return (
    <div className="discuss-floweditor">
      <div className="discuss-floweditor-toolbar">
        <div className="discuss-floweditor-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'edit'}
                  className={tab === 'edit' ? 'is-on' : ''} onClick={() => setTab('edit')}>Edit</button>
          {hasItemsTab && (
            <button type="button" role="tab" aria-selected={tab === 'items'}
                    className={tab === 'items' ? 'is-on' : ''} onClick={() => setTab('items')}>
              Items{unlinked > 0 ? ` (${unlinked})` : ''}
            </button>
          )}
          <button type="button" role="tab" aria-selected={tab === 'preview'}
                  className={tab === 'preview' ? 'is-on' : ''}
                  disabled={blocked('preview')}
                  title={blocked('preview') ? 'Go through the items first' : ''}
                  onClick={() => setTab('preview')}>Preview</button>
        </div>
        {tab === 'edit' && (
          <div className="discuss-floweditor-tools">
            <button type="button" className="discuss-editor-add" onClick={() => add('flight')}>Add box</button>
            <button type="button" className="discuss-editor-add" onClick={() => add('jump')}>Add connector</button>
            <button
              type="button"
              className={`discuss-editor-add discuss-floweditor-connect${mode === 'connect' ? ' is-on' : ''}`}
              aria-pressed={mode === 'connect'}
              onClick={() => { setMode(mode === 'connect' ? 'select' : 'connect'); setConnectFrom(null); }}
            >
              {mode !== 'connect' ? 'Draw arrow'
                : !connectFrom ? 'Click where it starts — a box, or an arrow'
                  : connectFrom.node ? 'Click where it goes — a box, or an arrow'
                    : 'Click the box it runs to'}
            </button>
            <button type="button" className="discuss-editor-add" onClick={() => commit(fit(doc))}>Fit chart</button>
            <button type="button" className="discuss-editor-add" onClick={undo} disabled={!canUndo}
                    title={canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo'}>Undo</button>
            <button type="button" className="discuss-editor-add" onClick={redo} disabled={!canRedo}
                    title={canRedo ? 'Redo (Ctrl+Y)' : 'Nothing to redo'}>Redo</button>
          </div>
        )}
      </div>

      {tab === 'items' ? (
        <LinkReview doc={doc} onChange={commit} />
      ) : tab === 'preview' ? (
        <SyllabusContext.Provider value={preview}>
          <p className="discuss-editor-hint">
            The chart as it will publish. Links go nowhere until it is published.
          </p>
          <CourseFlow />
        </SyllabusContext.Provider>
      ) : (
        <div className="discuss-floweditor-body">
          <div className="discuss-floweditor-canvas">
            <svg
              ref={svgRef}
              className={`discuss-flow-svg discuss-floweditor-svg${mode === 'connect' ? ' is-connecting' : ''}`}
              viewBox={flow.VIEWBOX}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerDown={() => setSelection(null)}
            >
              <ArrowDefs />
              <g>
                {flow.EDGES.map((e, i) => {
                  const on = selectedEdge === i || (connectFrom && connectFrom.edge === i);
                  return (
                    // eslint-disable-next-line react/no-array-index-key
                    <g key={`${e.from}>${e.to}>${i}`}>
                      <polyline
                        className={`discuss-flow-edge${on ? ' discuss-floweditor-edge--on' : ''}`}
                        points={poly(e.points)}
                        markerEnd="url(#discuss-flow-arrow)"
                      />
                      <polyline
                        className="discuss-floweditor-edgehit"
                        points={poly(e.points)}
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          // An arrow can be either end of a new one, the way the publication
                          // draws a branch onto a trunk and a stub out of one.
                          if (mode === 'connect') {
                            const p = svgPoint(svgRef.current, ev);
                            if (!connectFrom) {
                              setConnectFrom({ edge: i, at: [p.x, p.y] });
                              return;
                            }
                            // Arrow to arrow says nothing, so only a box in hand draws here.
                            if (connectFrom.node) {
                              const next = joinEdge(doc, connectFrom.node, i, [p.x, p.y]);
                              if (next !== doc) {
                                commit(next);
                                setSelection({ type: 'edge', index: next.flow.EDGES.length - 1 });
                              }
                              setConnectFrom(null);
                              setMode('select');
                            }
                            return;
                          }
                          setSelection({ type: 'edge', index: i });
                        }}
                      />
                    </g>
                  );
                })}
              </g>
              <g>
                {flow.NODES.map((n) => (
                  <g
                    key={n.id}
                    className="discuss-floweditor-node"
                    onPointerDown={(ev) => {
                      clickNode(n);
                      if (mode === 'select') startDrag(ev, { kind: 'node', id: n.id });
                      else ev.stopPropagation();
                    }}
                  >
                    <title>{n.label}{n.block ? ` (${n.block})` : ''}</title>
                    <Shape kind={n.kind} x={n.x} y={n.y} w={n.w} h={n.h} className={nodeClass(n)} />
                    {n.kind === 'jump' ? (
                      <text className="discuss-flow-letter"
                            x={round(n.x + n.w / 2)} y={round(n.y + n.h / 2)}>
                        {n.letter}
                      </text>
                    ) : (
                      <Label text={n.label} w={n.w} shape={SHAPE[n.kind]}
                             x={round(n.x + n.w / 2)} y={round(n.y + n.h / 2)} />
                    )}
                  </g>
                ))}
              </g>
              {flow.LEGEND && flow.LEGEND.length > 0 && <Legend legend={flow.LEGEND} />}

              {sel && (
                <g className="discuss-floweditor-handles">
                  <rect className="discuss-floweditor-outline" x={sel.x - 1} y={sel.y - 1} width={sel.w + 2} height={sel.h + 2} />
                  {[['nw', sel.x, sel.y], ['ne', sel.x + sel.w, sel.y], ['sw', sel.x, sel.y + sel.h], ['se', sel.x + sel.w, sel.y + sel.h]].map(([corner, x, y]) => (
                    <rect
                      key={corner}
                      className={`discuss-floweditor-handle discuss-floweditor-handle--${corner}`}
                      x={x - HANDLE / 2}
                      y={y - HANDLE / 2}
                      width={HANDLE}
                      height={HANDLE}
                      onPointerDown={(ev) => startDrag(ev, { kind: 'resize', id: sel.id, corner })}
                    />
                  ))}
                </g>
              )}
              {selEdge && (
                <g className="discuss-floweditor-handles">
                  {/* A hollow handle at the middle of each segment adds a corner there; the
                      solid ones are the corners, dragged to reroute and double-clicked to take
                      out. An end is its box's and neither adds nor removes. */}
                  {selEdge.points.slice(0, -1).map(([x, y], j) => {
                    const [nx, ny] = selEdge.points[j + 1];
                    return (
                      <circle
                        // eslint-disable-next-line react/no-array-index-key
                        key={`mid-${j}`}
                        className="discuss-floweditor-midpoint"
                        cx={round((x + nx) / 2)}
                        cy={round((y + ny) / 2)}
                        r={HANDLE / 2}
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          commit(addPoint(doc, selectedEdge, j));
                        }}
                      >
                        <title>Add a corner here</title>
                      </circle>
                    );
                  })}
                  {selEdge.points.map(([x, y], j) => {
                    const corner = j > 0 && j < selEdge.points.length - 1;
                    const held = selectedCorner === j;
                    return (
                      <circle
                        // eslint-disable-next-line react/no-array-index-key
                        key={j}
                        className={`discuss-floweditor-point${held ? ' is-held' : ''}`}
                        cx={x}
                        cy={y}
                        r={HANDLE / 1.6}
                        onPointerDown={(ev) => {
                          setSelection({ type: 'edge', index: selectedEdge, point: j });
                          startDrag(ev, { kind: 'point', edge: selectedEdge, point: j });
                        }}
                      >
                        <title>{corner ? 'Corner — drag to move, or Remove corner' : 'End — drag it around its box'}</title>
                      </circle>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>

          <aside className="discuss-floweditor-side">
            {selectedNode && (
              <NodePanel
                key={selectedNode.id}
                doc={doc}
                node={selectedNode}
                commit={(next) => {
                  // A relabel can change the box's id; keep it selected under the new one.
                  const before = new Set(doc.flow.NODES.map((n) => n.id));
                  commit(next);
                  const renamed = next.flow.NODES.find((n) => !before.has(n.id));
                  if (renamed) setSelection({ type: 'node', id: renamed.id });
                }}
                onRemove={removeSelected}
              />
            )}
            {selectedEdge !== null && (
              <EdgePanel
                doc={doc}
                index={selectedEdge}
                corner={canRemoveCorner ? selectedCorner : null}
                commit={commit}
                onRemove={removeSelected}
                onRemoveCorner={() => {
                  commit(removePoint(doc, selectedEdge, selectedCorner));
                  setSelection({ type: 'edge', index: selectedEdge });
                }}
              />
            )}
            {!selection && (
              <div className="discuss-floweditor-panel">
                <p className="discuss-editor-hint">
                  Click a box, connector or arrow to edit it. Drag to move; arrow keys nudge
                  a selected box. Faded boxes are blocks without discuss items.
                </p>
              </div>
            )}

            {(warnings.length > 0 || problems.length > 0) && (
              <div className="discuss-floweditor-panel">
                <h3>Check before publishing</h3>
                <ul className="discuss-editor-problems">
                  {warnings.map((w) => <li key={`w:${w}`}>{w}</li>)}
                  {problems.map((p) => (
                    <li key={`p:${p.text}`}>
                      {p.id ? (
                        <button type="button" className="discuss-floweditor-jump"
                                onClick={() => setSelection({ type: 'node', id: p.id })}>
                          {p.text}
                        </button>
                      ) : p.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}

      <div className="discuss-editor-actions">
        {error && <p className="discuss-editor-warn">{error}</p>}
        <div className="discuss-editor-buttons">
          {stepping ? (
            <button type="button" className="discuss-editor-save" onClick={() => setTab(next.tab)}>
              {next.label}
            </button>
          ) : (
            <button type="button" className="discuss-editor-save" disabled={saving} onClick={() => onSave(fit(doc))}>
              {saving ? 'Saving…' : saveLabel}
            </button>
          )}
          {children}
        </div>
        {stepping && (
          <p className="discuss-editor-hint">
            {tab === 'edit'
              ? 'Check the chart against the publication first. Publishing comes at the end, on Preview.'
              : 'Settle what you want to settle here. Publishing comes at the end, on Preview.'}
          </p>
        )}
      </div>
    </div>
  );
}

export default FlowEditor;
