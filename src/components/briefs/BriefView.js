import React from 'react';
import { firstLetters } from './firstLetters';
import { ItemForm, SectionForm, keyOf, newSection } from './BriefEditor';

// One brief, drawn the way the guide's card lays it out: each card page is a two-column
// sheet, each section a grey-headed box, each item its name with whatever the card keeps under
// it. A brief is plain text throughout — see parseBriefGuide.js — and this is what turns that
// text back into the shape it was typed in: a line's leading spaces put it a level in, and its
// number hangs in the margin.
//
// `fixed` means always on screen and nothing to click, and it reads the same on an item as on
// a section: the block's text is simply shown. ORM and ATJ review are fixed items, Briefing
// items and the Debriefing guide are fixed sections. An item's `subtext` is the handful of
// lines the card keeps under a name whose words open behind it — Mission planning's NOTAMS,
// airfields, flight plan, Joker/Bingo — and is the only other thing drawn while closed.
//
// First-letter mode hides the words a student says and nothing else: names, fixed text and
// headings are the prompts and stay readable, and what is open stays open.
//
// `edit`, when given, is `{ openKey, open, close, update, doc }` — the page's working copy and
// a way to change it. It puts an edit link beside every heading and every item, and swaps a
// block for its form while that block is the one open.

// `**bold**` is the only markup, as on the discuss pages. The card sets one item bold — OCF
// procedures, brief it every flight — and its headings, which the page sets bold anyway.
export function inline(text) {
  if (typeof text !== 'string' || !text.includes('**')) return text;
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (
    // eslint-disable-next-line react/no-array-index-key
    i % 2 ? <strong key={i}>{part}</strong> : part
  ));
}

const LINE = /^(\s*)((?:\([0-9a-zA-Z]{1,2}\)|\d{1,2}\.|[a-zA-Z]\.)\s+)?([\s\S]*)$/;

// Plain text as the page prints it: every line at its own level, its number hanging in the
// margin so a line that wraps lines up under itself, and a blank line as a gap.
//
// `states`, where a brief is being compared with the one it replaces, is one of `same`,
// `added` or `removed` per line (briefDiff.js).
function TextBlock({ text, shown, className, states }) {
  if (!text || !text.trim()) return null;
  return (
    <div className={className}>
      {text.split('\n').map((raw, i) => {
        const [, pad, marker, rest] = raw.match(LINE);
        const state = states && states[i];
        // eslint-disable-next-line react/no-array-index-key
        if (!raw.trim()) return <div key={i} className="brief-gap" />;
        const depth = Math.floor(pad.length / 2);
        return (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className={`brief-textline${state && state !== 'same' ? ` brief-diffline--${state}` : ''}`}
            style={{ paddingLeft: `${depth * 1.2 + (marker ? 1.9 : 0)}em`, textIndent: marker ? '-1.9em' : 0 }}
          >
            {marker && <span className="brief-marker">{marker.trim()} </span>}
            {/* A line the new edition drops or adds says so, rather than only looking it. */}
            {state === 'removed' ? <del>{inline(shown(rest))}</del>
              : state === 'added' ? <ins>{inline(shown(rest))}</ins>
                : inline(shown(rest))}
          </div>
        );
      })}
    </div>
  );
}

function EditLink({ what, onClick }) {
  return (
    <button type="button" className="brief-editlink" onClick={onClick} title={`Edit this ${what}`}>
      [edit]
    </button>
  );
}

export const opens = (item) => !item.fixed && !!(item.text && item.text.trim());

// What a mark is called on screen, where a brief is shown against the one it replaces.
const TAG = { added: 'new', changed: 'changed', removed: 'removed' };

function Tag({ mark }) {
  if (!mark) return null;
  return <span className={`brief-diff-tag brief-diff-tag--${mark.state}`}>{TAG[mark.state]}</span>;
}

function Item({ item, number, open, onToggle, shown, edit, mark }) {
  const expandable = opens(item);
  const long = item.label.split(/\s+/).length > 12; // a card line that is a whole rule
  const lines = (mark && mark.lines) || {};
  return (
    <div className={`brief-item${expandable ? ' is-expandable' : ''}${open ? ' is-open' : ''}${mark ? ` brief-diff brief-diff--${mark.state}` : ''}`}>
      <div
        className="brief-item-head"
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? open : undefined}
        onClick={expandable ? onToggle : undefined}
        onKeyDown={expandable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        } : undefined}
      >
        {expandable && <span className="brief-caret" aria-hidden="true">{open ? '▼' : '▶'}</span>}
        <div className="brief-item-name">
          <span className={`${long ? 'brief-rule' : ''}${mark && mark.label ? ' brief-diff-changed' : ''}`.trim() || undefined}>
            {number}. {inline(item.label)}
          </span>
          <Tag mark={mark} />
          {edit && <EditLink what="item" onClick={(e) => { e.stopPropagation(); edit(); }} />}
          <TextBlock text={item.subtext} shown={(t) => t} className="brief-fixed" states={lines.subtext} />
          {item.fixed && <TextBlock text={item.text} shown={shown} className="brief-fixed" states={lines.text} />}
        </div>
      </div>
      {open && expandable && (
        <div className="brief-item-body">
          <TextBlock text={item.text} shown={shown} states={lines.text} />
        </div>
      )}
    </div>
  );
}

function Section({ section, expanded, onToggle, shown, edit, diff }) {
  const sectionKey = keyOf('section', section.id);
  const mark = diff && diff[section.id];
  const lines = (mark && mark.lines) || {};
  const replaceSection = (next) => edit.update((doc) => ({
    ...doc,
    sections: doc.sections.map((s) => (s.id === section.id ? next : s)),
  }));
  const replaceItem = (item, next) => replaceSection({
    ...section,
    items: next
      ? section.items.map((it) => (it.id === item.id ? next : it))
      : section.items.filter((it) => it.id !== item.id),
  });

  if (edit && edit.openKey === sectionKey) {
    return (
      <section className="brief-section">
        <SectionForm
          section={section}
          doc={edit.doc}
          onSave={(next) => { replaceSection(next); edit.close(); }}
          onCancel={edit.close}
          onRemove={() => {
            edit.update((doc) => ({ ...doc, sections: doc.sections.filter((s) => s.id !== section.id) }));
            edit.close();
          }}
        />
      </section>
    );
  }

  return (
    <section className={`brief-section${section.fixed ? ' brief-section--fixed' : ''}${mark ? ` brief-diff brief-diff--${mark.state}` : ''}`}>
      <h2 className={`brief-section-title${mark && mark.title ? ' brief-diff-changed' : ''}`}>
        {section.title}
        <Tag mark={mark} />
        {edit && <EditLink what="section" onClick={() => edit.open(sectionKey)} />}
      </h2>
      {section.fixed ? (
        <div className="brief-fixed-body">
          <TextBlock text={section.text} shown={shown} states={lines.text} />
        </div>
      ) : (
        <>
          <TextBlock text={section.text} shown={shown} className="brief-section-text" states={lines.text} />
          {section.items.map((item, i) => (
            edit && edit.openKey === keyOf('item', item.id) ? (
              <ItemForm
                key={item.id}
                item={item}
                onSave={(next) => { replaceItem(item, next); edit.close(); }}
                onCancel={edit.close}
                onRemove={() => { replaceItem(item, null); edit.close(); }}
              />
            ) : (
              <Item
                key={item.id}
                item={item}
                number={i + 1}
                open={!!expanded[item.id]}
                onToggle={() => onToggle(item.id)}
                shown={shown}
                edit={edit ? () => edit.open(keyOf('item', item.id)) : null}
                mark={diff && diff[item.id]}
              />
            )
          ))}
        </>
      )}
    </section>
  );
}

// Which guide the brief came out of, at the foot: whose it is and when it was made.
function sourceLine(source) {
  if (!source) return '';
  const at = source.date ? new Date(`${source.date}T00:00:00`) : null;
  const when = at && !Number.isNaN(at.getTime())
    ? at.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : source.date;
  return [source.unit || source.publication, when].filter(Boolean).join(' · ');
}

// Sections grouped into the card's pages: a section with `break` starts a new one.
export function sheetsOf(sections) {
  const sheets = [];
  sections.forEach((s, i) => {
    if (i === 0 || s.break) sheets.push([]);
    sheets[sheets.length - 1].push(s);
  });
  return sheets;
}

function BriefView({ brief, expanded, onToggle, firstLetter, edit, diff }) {
  const shown = firstLetter ? firstLetters : (t) => t;
  const sheets = sheetsOf(brief.sections || []);
  return (
    <div className="brief-view">
      {sheets.map((sheet, n) => {
        const right = sheet.filter((s) => s.column === 2);
        const left = sheet.filter((s) => s.column !== 2);
        const render = (s) => (
          <Section
            key={s.id}
            section={s}
            expanded={expanded}
            onToggle={onToggle}
            shown={shown}
            edit={edit}
            diff={diff}
          />
        );
        return (
          // eslint-disable-next-line react/no-array-index-key
          <div key={n} className={`brief-sheet${right.length ? ' brief-sheet--two' : ''}`}>
            <div className="brief-column">{left.map(render)}</div>
            {right.length > 0 && <div className="brief-column">{right.map(render)}</div>}
          </div>
        );
      })}
      {edit && (
        <button
          type="button"
          className="discuss-editor-add brief-addsection"
          onClick={() => {
            const section = newSection(edit.doc);
            edit.update((doc) => ({ ...doc, sections: [...doc.sections, section] }));
            edit.open(keyOf('section', section.id));
          }}
        >
          + section
        </button>
      )}
      {brief.note && (
        <div className="brief-note">
          <TextBlock text={brief.note} shown={(t) => t} />
        </div>
      )}
      {sourceLine(brief.source) && <p className="brief-source">{sourceLine(brief.source)}</p>}
    </div>
  );
}

export default BriefView;
