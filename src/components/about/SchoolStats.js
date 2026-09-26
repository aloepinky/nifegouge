import React, { useEffect, useState } from 'react';
import { fetchBriefIndex, fetchBrief, rememberBrief } from '../briefs/briefApi';
import { fetchSyllabusIndex, fetchSyllabus, rememberSyllabus } from '../discuss/discussApi';
import { isSchool } from '../programs';
import { briefRows, syllabusRows, weekGroups } from './stats';
import { SERVER_STATS } from './serverStats';

/*
 * What a tab asks a student to learn, counted from its own data and shown in that tab's panel
 * on the About page: EpStats under EPs/Limits, BriefStats under Briefs, SyllabusStats under
 * Discussion Items.
 *
 * platforms: [{ aircraft, eps: { eps, steps, words, nwcs }, limits }], one per aircraft the
 *   school flies. Advanced covers several, and each has its own EPs, limits and briefs, so a
 *   school with more than one (or passing `byAircraft`, for one expecting more) gets a group
 *   per aircraft, titled with it.
 *
 * The briefs and syllabi are on the mirror. Each is fetched once per school per session and
 * put in the caches their own tabs read, so opening one afterwards costs nothing.
 *
 * These numbers change only when somebody publishes, which is rare, and waiting on a fetch of
 * every syllabus document to show six of them made the page look broken on arrival. So they are
 * SEEDED from a snapshot in the repo (serverStats.js, written by tools/about-stats.js) and
 * painted at once, and the read still happens behind them and corrects anything a publish has
 * changed since. A school the snapshot does not know still shows a dash until its read lands,
 * which is what a newly added one does.
 */

const format = (n) => (n == null ? '–' : n.toLocaleString('en-US'));

async function loadBriefs(school) {
  const index = await fetchBriefIndex();
  const rows = ((index && index.briefs) || []).filter((b) => isSchool(b, school));
  const records = (await Promise.all(rows.map((b) => fetchBrief(b.id)))).filter(Boolean);
  records.forEach(rememberBrief);
  return records;
}

async function loadSyllabi(school) {
  const index = await fetchSyllabusIndex();
  const rows = ((index && index.syllabi) || []).filter((s) => isSchool(s, school));
  const records = (await Promise.all(rows.map((s) => fetchSyllabus(s.id)))).filter(Boolean);
  records.forEach(rememberSyllabus);
  return records;
}

// One read per school and kind, shared: the same numbers are mounted twice, in the panel and
// under the blurb a phone shows instead of it. A failed read settles on an empty list, since
// the page is still worth drawing without them.
const loads = new Map();

// `derive` turns the records into the figures a panel shows, and is the same function the
// snapshot was written with, so a seeded number and a fetched one are computed one way.
//
// `source` is what gets read and `kind` is what gets shown, and they are separate because the
// syllabi are read once and shown two ways — as course lengths on the landing page and as
// discuss-item counts on the About page. Keying the read by `kind` would fetch every syllabus
// document twice.
function useFigures(source, kind, load, derive, school) {
  const key = `${source}:${school}`;
  const [state, setState] = useState(() => (SERVER_STATS[school] || {})[kind]);
  useEffect(() => {
    setState((SERVER_STATS[school] || {})[kind]);
    if (!loads.has(key)) loads.set(key, load(school).catch(() => { loads.delete(key); return []; }));
    let live = true;
    loads.get(key).then((records) => { if (live) setState(derive(records)); });
    return () => { live = false; };
  }, [key, load, derive, school, kind]);
  return state;
}

// A stat whose value is `undefined` is one this school does not have and is left out; `null`
// is one still loading and shows a dash.
function Group({ title, stats, caption }) {
  const shown = stats.filter((s) => s.value !== undefined);
  return (
    <section className="about-stats-group">
      {title && <h3 className="about-stats-title">{title}</h3>}
      <dl className="about-stats-row">
        {shown.map((s) => (
          <div key={s.label} className="about-stat">
            <dt>{s.label}</dt>
            <dd>{format(s.value)}</dd>
          </div>
        ))}
      </dl>
      {caption && <p className="about-stats-caption">{caption}</p>}
    </section>
  );
}

const perAircraft = (platforms, byAircraft) => byAircraft || platforms.length > 1;

export function EpStats({ platforms, byAircraft = false }) {
  const titled = perAircraft(platforms, byAircraft);
  return (
    <div className="about-stats">
      {platforms.map(({ aircraft, eps, limits }) => (
        <Group
          key={aircraft}
          title={titled ? aircraft : null}
          stats={[
            { label: 'EPs', value: eps.eps },
            { label: 'steps', value: eps.steps },
            { label: 'words', value: eps.words },
            // A sheet with no NWCs (NIFE's) shows no NWC count, rather than a zero.
            { label: 'NWCs', value: eps.nwcs || undefined },
            { label: 'limits', value: limits },
          ]}
        />
      ))}
    </div>
  );
}

export function BriefStats({ school, platforms = [], byAircraft = false }) {
  const briefs = useFigures('briefs', 'briefs', loadBriefs, briefRows, school);
  const titled = perAircraft(platforms, byAircraft);
  const planes = titled ? platforms.map((p) => p.aircraft) : [null];
  return (
    <div className="about-stats">
      {planes.map((aircraft) => {
        const mine = !briefs ? null : briefs.filter((b) => !aircraft || b.aircraft === aircraft);
        if (mine && titled && !mine.length) return null;
        return (
          <Group
            key={aircraft || 'all'}
            title={aircraft}
            stats={[
              { label: 'briefs', value: mine && mine.length },
              { label: 'words to memorize', value: mine && mine.reduce((n, b) => n + b.words, 0) },
            ]}
          />
        );
      })}
    </div>
  );
}

// Each of the school's syllabi side by side (Primary has Delta and Echo), titled with its name.
// The course length, hours and events by type are on the syllabus's own All Events page.
export function SyllabusStats({ school }) {
  const syllabi = useFigures('syllabi', 'syllabi', loadSyllabi, syllabusRows, school);
  return (
    <div className="about-stats about-stats--across">
      {(syllabi || [null]).map((row) => (
        <Group
          key={row ? row.id : 'loading'}
          title={row ? row.name : 'Syllabus'}
          stats={[{ label: 'discuss items', value: row ? row.discussItems : null }]}
        />
      ))}
    </div>
  );
}

export function useCourseWeeks(school, wanted = true) {
  return useFigures('syllabi', 'weeks', wanted ? loadSyllabi : NONE, weekGroups, wanted ? school : `-${school}`);
}

const NONE = () => Promise.resolve([]);
