import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuiltInSyllabus } from './DiscussData';
import { itemList, useItemIndexVersion } from './registry';
import { prefetchItem } from './discussApi';
import { rowSearchable } from './SyllabusContext';
import { useDiscussBase } from './paths';

// Jump straight to an event, a block or a discuss item. The index is built from the Delta
// syllabus and the item index, so there is nothing to keep in step with the pages themselves;
// it is rebuilt when either changes (a page created, an event list edited).
//
// An item is searchable under every wording the JPPT gives it as well as its own title: N4101
// writes "VFR field entry - departure (AIM)" where N3101 writes "VFR field entry/departure
// (AIM)", and a student typing either should land on the one page.

const MAX_RESULTS = 10;

function norm(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildIndex(delta, items, base) {
  const rows = [];

  // Only events and blocks that carry discuss items are indexed. The academics, exams and
  // ground training are not searchable, because there is nothing in them to find.
  delta.briefedEvents().forEach((e) => {
    // An event with no page of its own still resolves — to its block, which always has its
    // JPPT metadata to show. Better than a link into a not-found.
    const written = !!delta.getEvent(e.id);
    // A briefed block can hold events the JPPT names no items for (G01's, bar G0102).
    if (!written) return;
    rows.push({
      kind: 'event',
      key: `e:${e.id}`,
      label: e.id,
      sub: e.title,
      to: written ? `${base}/e/${e.id}` : `${base}/b/${e.block}`,
      written,
      terms: [norm(e.id), norm(e.title)],
    });
  });

  delta.blocks.filter(delta.hasDiscussItems).forEach((b) => {
    rows.push({
      kind: 'block',
      key: `b:${b.id}`,
      label: b.id,
      sub: b.title,
      to: `${base}/b/${b.id}`,
      written: true,
      terms: [norm(b.id), norm(b.title), norm(b.blkName)].filter(Boolean),
    });
  });

  const aliases = {};
  // `href` rows have no slug and no page, but they are still JPPT items a student searches
  // for by name — "hung start" has to find something. They are indexed once, by label,
  // pointing where the content actually lives.
  const links = {};
  // Label-only rows have no page either, but the event that names them does.
  const unwritten = {};
  delta.events.forEach((event) => {
    event.items.forEach((row) => {
      if (row.href) {
        if (rowSearchable(row)) links[row.label] = row.href;
        return;
      }
      if (!row.slug) {
        if (!unwritten[row.label]) unwritten[row.label] = event.id;
        return;
      }
      aliases[row.slug] = aliases[row.slug] || [];
      if (!aliases[row.slug].includes(row.label)) aliases[row.slug].push(row.label);
    });
  });

  Object.keys(links).forEach((label) => {
    rows.push({
      kind: 'item',
      key: `l:${label}`,
      label,
      sub: null,
      to: links[label],
      written: true,
      terms: [norm(label)],
    });
  });

  Object.keys(unwritten).forEach((label) => {
    rows.push({
      kind: 'item',
      key: `u:${label}`,
      label,
      sub: 'no page yet',
      to: `${base}/e/${unwritten[label]}`,
      written: false,
      terms: [norm(label)],
    });
  });

  items.forEach((item) => {
    rows.push({
      kind: 'item',
      key: `i:${item.slug}`,
      slug: item.slug,
      aircraft: item.aircraft,
      label: item.title,
      sub: item.stub ? 'not written' : null,
      to: `${base}/${item.slug}`,
      written: !item.stub,
      terms: [norm(item.title), ...(aliases[item.slug] || []).map(norm)],
    });
  });

  return rows;
}

// Prefix beats word-start beats anywhere, so typing "n31" puts N3101 above anything that
// merely contains it.
function score(row, q) {
  let best = 99;
  for (const term of row.terms) {
    if (!term) continue;
    if (term.startsWith(q)) best = Math.min(best, 0);
    else if (term.includes(` ${q}`) || term.includes(`-${q}`) || term.includes(`/${q}`)) {
      best = Math.min(best, 1);
    } else if (term.includes(q)) best = Math.min(best, 2);
  }
  return best;
}

const KIND_ORDER = { item: 0, event: 1, block: 2 };
const KIND_LABEL = { item: 'item', event: 'event', block: 'block' };

// What a result calls itself: the aircraft, then what kind of thing it is — "C172 item",
// "T-6B event". The aircraft comes off the page's own index entry where it has one, and off
// the syllabus otherwise, so a result always names the corpus that answered.
const kindLabel = (row, aircraft) => [row.aircraft || aircraft, KIND_LABEL[row.kind]].filter(Boolean).join(' ');

function search(index, query) {
  const q = norm(query);
  if (q.length < 2) return [];
  const hits = [];
  for (const row of index) {
    const s = score(row, q);
    if (s < 99) hits.push({ row, s });
  }
  hits.sort((a, b) => (
    a.s - b.s
    || KIND_ORDER[a.row.kind] - KIND_ORDER[b.row.kind]
    || a.row.label.localeCompare(b.row.label)
  ));
  return hits.slice(0, MAX_RESULTS).map((h) => h.row);
}

function SearchBox() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const delta = useBuiltInSyllabus();
  const base = useDiscussBase();
  const version = useItemIndexVersion();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const index = useMemo(() => buildIndex(delta, itemList(), base), [delta, version, base]);
  const results = useMemo(() => search(index, query), [index, query]);
  const showing = open && results.length > 0;

  const go = useCallback((row) => {
    if (!row) return;
    setOpen(false);
    setQuery('');
    if (inputRef.current) inputRef.current.blur();
    navigate(row.to);
  }, [navigate]);

  const onChange = useCallback((e) => {
    setQuery(e.target.value);
    setActive(0);
    setOpen(true);
  }, []);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!showing) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }, [showing, results, active, go]);

  return (
    <div className="discuss-search">
      <input
        ref={inputRef}
        className="discuss-search-input"
        type="text"
        value={query}
        placeholder="Search events, blocks, items"
        aria-label="Search events, blocks and discussion items"
        autoComplete="off"
        role="combobox"
        aria-expanded={showing}
        aria-controls="discuss-search-results"
        aria-activedescendant={showing ? `discuss-search-opt-${active}` : undefined}
        onChange={onChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showing && (
        <ul
          className="discuss-search-results"
          id="discuss-search-results"
          role="listbox"
          // Keep the input focused through the click, so onBlur does not tear the list down
          // before the selection lands.
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.map((row, i) => (
            <li
              key={row.key}
              id={`discuss-search-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`discuss-search-result${i === active ? ' discuss-search-result--active' : ''}`}
              onMouseEnter={() => {
                setActive(i);
                if (row.slug) prefetchItem(row.slug);
              }}
              onClick={() => go(row)}
            >
              <span className="discuss-search-kind">{kindLabel(row, delta.aircraft)}</span>
              <span className="discuss-search-label">{row.label}</span>
              {row.sub && <span className="discuss-search-sub">{row.sub}</span>}
              {!row.written && row.kind === 'event' && (
                <span className="discuss-tag">not written</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchBox;
