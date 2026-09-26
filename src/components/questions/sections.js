import { useCallback, useEffect, useState } from 'react';
import { call, post, readMirror } from '../serverApi';
import { TOPICS, lecturesIn } from './questionsApi';

// The topics ("sections") and lectures the quiz is filed under: a document anyone may edit at
// /nife/questions/sections (lambda/discussApi/questionSections.mjs). Every list of topics or
// lectures on the page comes from here.
//
// A retired section or lecture is kept, because questions are filed under it, and is left out
// of the quiz, the review list, the review queue and the submit form. Until the document
// exists, the six topics the page always had stand in, with their lectures read off the data.

const SECTIONS_KEY = 'questions/nife/sections.json';

const FALLBACK = TOPICS.map((t) => ({ id: t.id, name: t.name, lectures: [], fallback: true }));

export function useSections() {
  const [state, setState] = useState({ sections: FALLBACK, rev: 0, loaded: false });

  const reload = useCallback(async () => {
    try {
      const data = await readMirror(SECTIONS_KEY);
      if (data && data.doc) setState({ sections: data.doc.sections, rev: data.rev, loaded: true });
      else setState({ sections: FALLBACK, rev: 0, loaded: true });
    } catch (err) {
      console.error('Error loading sections:', err);
      setState((s) => ({ ...s, loaded: true }));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

export const activeSections = (sections) => sections.filter((s) => !s.retired);

export function sectionName(sections, id) {
  const found = sections.find((s) => s.id === id);
  return found ? found.name : id;
}

// A question's lecture as the page prints it: the lecture's name where the list has one.
export function lectureName(sections, topic, lecture) {
  const section = sections.find((s) => s.id === topic);
  const found = section && section.lectures.find((l) => l.id === String(lecture));
  return found ? found.name : `Lecture ${lecture}`;
}

// Whether a question belongs in the quiz as the list stands: its section is in use, and so is
// its lecture where the section lists it.
export const inUse = (sections) => (q) => {
  const section = sections.find((s) => s.id === (q.topic || '').toLowerCase());
  if (!section || section.retired) return false;
  if (!q.lecture) return true;
  const lecture = section.lectures.find((l) => l.id === String(q.lecture));
  return !lecture || !lecture.retired;
};

// The lectures a topic offers for a quiz: those in use, in the list's order, that have
// questions. Before the list exists, whatever lectures the data has.
export function quizLectures(sections, questions, topic) {
  const section = sections.find((s) => s.id === topic);
  if (!section) return [];
  if (section.fallback) return lecturesIn(questions, topic).map((id) => ({ id, name: `Lecture ${id}` }));
  const present = new Set(questions.filter((q) => (q.topic || '').toLowerCase() === topic).map((q) => String(q.lecture)));
  return section.lectures.filter((l) => !l.retired && present.has(l.id));
}

// The lectures a new or edited question may be filed under.
export const formLectures = (section) => (section && !section.fallback ? section.lectures.filter((l) => !l.retired) : []);

// ---------------------------------------------------------------------------------------
// Editing

export const saveSections = (baseRev, doc, { author, summary }) => post('save-question-sections', { baseRev, doc, author, summary });
export const sectionsHistory = () => call('question-sections-history');
export const restoreSections = (rev, { author, summary } = {}) => post('restore-question-sections', { rev, author, summary });

// An id for a new section, from its name: lowercase words joined by hyphens, unique.
export function sectionIdFor(name, taken) {
  const base = (name || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'section';
  let id = base;
  for (let n = 2; taken.includes(id); n += 1) id = `${base}-${n}`;
  return id;
}

// An id for a new lecture: the next number the section has not used.
export function lectureIdFor(lectures) {
  const taken = new Set(lectures.map((l) => l.id));
  const numbers = lectures.map((l) => parseInt(l.id, 10)).filter((n) => !Number.isNaN(n));
  let n = (numbers.length ? Math.max(...numbers) : 0) + 1;
  while (taken.has(String(n))) n += 1;
  return String(n);
}
