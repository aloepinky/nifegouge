import { useEffect, useMemo, useRef, useState } from 'react';

// Single Mode on a limits page: the sheet one box at a time, so a limit is recited from its name
// and not found by where it sits on the table. The cards are the school's own (TW4LimitsCards.js,
// T44C/t44cCards.js); the answers stay the table's, so a limit answered here is answered there.
// This holds the walk and nothing else: which card is up, Random Mode's order, and moving on.
//
//   cards     the boxes, in sheet order
//   fieldsOf  a card's blanks (its own, then its notes')
//   results   the page's marks, { field: 'correct' | 'incorrect' | '' }
//   fill      fills the given blanks with their answers and returns the marks as they now stand
//
// Single Mode starts in Random Mode; turning Random Mode off walks the cards in sheet order.
//
// The page tells it about every mark it makes in a card (`after`): the cursor goes on to the
// card's next blank, and once all of them are right the next card comes up.

function focusBlank() {
  const blank = document.querySelector('.epl-single-card input:not(.correct-answer)');
  if (blank) blank.focus();
}

export default function useSingleMode(cards, { fieldsOf = (c) => c.fields, results, fill }) {
  const sheet = useMemo(() => cards.map((_, i) => i), [cards]);
  const asked = useMemo(() => cards.flatMap(fieldsOf), [cards, fieldsOf]);
  const [on, setOn] = useState(false);
  const [random, setRandom] = useState(false);
  const [order, setOrder] = useState(sheet);
  const [at, setAt] = useState(0);
  const timer = useRef(null);
  // A finished card moves on 400 ms later, by when the walk may have changed under it.
  const walk = useRef({});
  walk.current = { at, order, random };
  useEffect(() => () => clearTimeout(timer.current), []);

  const card = cards[order[at]];
  const fields = fieldsOf(card);
  const finished = (r, c) => fieldsOf(c).every((f) => r[f] === 'correct');

  // Each new card puts the cursor in its first blank.
  useEffect(() => {
    if (on) focusBlank();
  }, [on, at, order]);

  const goTo = (i) => {
    clearTimeout(timer.current);
    setAt(i);
  };

  // A finished card stays up long enough to see it turn green. At the end of a Random Mode walk
  // the cards go back to sheet order, staying on the last one.
  const after = (r) => {
    if (!finished(r, card)) {
      setTimeout(focusBlank, 50);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const w = walk.current;
      if (w.at + 1 < w.order.length) {
        setAt(w.at + 1);
      } else if (w.random) {
        setRandom(false);
        setOrder(sheet);
        setAt(w.order[w.at]);
      }
    }, 400);
  };

  const exit = () => {
    clearTimeout(timer.current);
    setOn(false);
    setRandom(false);
    setOrder(sheet);
    setAt(0);
  };

  // The unfinished cards shuffled, or every card once all are done.
  const shuffle = () => {
    clearTimeout(timer.current);
    const unfinished = sheet.filter((i) => !finished(results, cards[i]));
    const shuffled = unfinished.length ? unfinished : [...sheet];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setRandom(true);
    setOrder(shuffled);
    setAt(0);
  };

  const toggle = () => {
    if (on) return exit();
    setOn(true);
    shuffle();
  };

  const toggleRandom = () => {
    if (!random) return shuffle();
    clearTimeout(timer.current);
    setRandom(false);
    setOrder(sheet);
    setAt(order[at]);
  };

  // Next Answer fills the card's first open blank, All Answers all of them.
  const fillCard = (all) => {
    const open = fields.filter((f) => results[f] !== 'correct');
    after(open.length ? fill(all ? open : open.slice(0, 1)) : results);
  };

  return {
    on,
    random,
    card,
    at,
    count: order.length,
    owns: (field) => on && fields.includes(field),
    after,
    exit,
    toggle,
    toggleRandom,
    prev: () => goTo(at - 1),
    next: () => goTo(at + 1),
    nextAnswer: () => fillCard(false),
    allAnswers: () => fillCard(true),
    // The count under the card: every blank Single Mode asks, and how many are right.
    total: asked.length,
    correct: asked.filter((f) => results[f] === 'correct').length,
  };
}
