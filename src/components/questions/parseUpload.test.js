import { detect, dice, likelyDuplicate, parseDelimited, parseUpload, problemsWith } from './parseUpload';

describe('reading a spreadsheet paste', () => {
  test('tab-separated rows with no header are read by position', () => {
    const text = [
      'What is Va?\tManeuvering speed\tNever-exceed speed\tStall speed\tBest glide\t2\tChapter 4',
      'What is Vs?\tStall speed\tCruise speed\t\t\t2\t',
    ].join('\n');
    const { format, rows } = parseUpload(text);
    expect(format).toBe('table');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      question: 'What is Va?', correctAnswer: 'Maneuvering speed', incorrectAnswer1: 'Never-exceed speed',
      incorrectAnswer2: 'Stall speed', incorrectAnswer3: 'Best glide', lecture: '2', explanation: 'Chapter 4',
    });
    expect(rows[1].incorrectAnswer2).toBe('');
  });

  test('a header row names the columns, in any order and any spelling', () => {
    const text = [
      'Lecture\tQuestion\tAnswer\tWrong 1\tWrong 2\tWhy',
      '3\tWhat is Vy?\tBest rate of climb\tBest angle\tBest glide\tIt is the speed for most altitude per minute.',
    ].join('\n');
    const { rows } = parseUpload(text);
    expect(rows).toEqual([expect.objectContaining({
      lecture: '3', question: 'What is Vy?', correctAnswer: 'Best rate of climb',
      incorrectAnswer1: 'Best angle', incorrectAnswer2: 'Best glide',
      explanation: 'It is the speed for most altitude per minute.',
    })]);
  });

  test('a quoted cell keeps its tabs, newlines and quotes, as Excel copies them', () => {
    const text = 'Q1\t"Line one\nline two"\t"He said ""no"""\tc\n';
    const rows = parseDelimited(text, '\t');
    expect(rows).toEqual([['Q1', 'Line one\nline two', 'He said "no"', 'c']]);
  });
});

describe('reading a CSV file', () => {
  test('commas inside quotes stay in the field', () => {
    const text = 'question,correct,wrong,wrong,wrong\n"Minimums, day VFR?","3 SM, 1,000 ft","1 SM, clear","5 SM","3 SM, 500 ft"\n';
    const { format, rows } = parseUpload(text);
    expect(format).toBe('table');
    expect(rows[0]).toMatchObject({
      question: 'Minimums, day VFR?', correctAnswer: '3 SM, 1,000 ft',
      incorrectAnswer1: '1 SM, clear', incorrectAnswer2: '5 SM', incorrectAnswer3: '3 SM, 500 ft',
    });
  });

  test('Windows line endings and blank lines are ignored', () => {
    const { rows } = parseUpload('a,b,c\r\n\r\nd,e,f\r\n');
    expect(rows.map((r) => r.question)).toEqual(['a', 'd']);
  });
});

describe('reading a Quizlet export', () => {
  const cards = ['Va\tManeuvering speed', 'Vx\tBest angle of climb', 'Vy\tBest rate of climb', 'Vne\tNever exceed speed', 'Vs0\tStall speed, landing configuration'];

  test('tab and newline: each card becomes a question with three borrowed wrong answers', () => {
    const { format, rows } = parseUpload(cards.join('\n'));
    expect(format).toBe('quizlet');
    expect(rows).toHaveLength(5);
    const va = rows[0];
    expect(va).toMatchObject({ question: 'Va', correctAnswer: 'Maneuvering speed', borrowed: true });
    const wrong = [va.incorrectAnswer1, va.incorrectAnswer2, va.incorrectAnswer3];
    expect(wrong).not.toContain('Maneuvering speed');
    expect(new Set(wrong).size).toBe(3);
    expect(problemsWith(va)).toEqual([]);
  });

  test('borrowed answers are the other definitions closest in length', () => {
    const { rows } = parseUpload(cards.join('\n'));
    // For 'Best rate of climb' (18): 'Never exceed speed' (18), 'Best angle of climb' (19),
    // then 'Maneuvering speed' (17), the tie going to the earlier card.
    expect([rows[2].incorrectAnswer1, rows[2].incorrectAnswer2, rows[2].incorrectAnswer3])
      .toEqual(['Never exceed speed', 'Maneuvering speed', 'Best angle of climb']);
  });

  test('comma between term and definition splits at the first comma only', () => {
    const { rows } = parseUpload('Vs0,Stall speed, landing configuration\nVa,Maneuvering speed', { format: 'quizlet' });
    expect(rows[0]).toMatchObject({ question: 'Vs0', correctAnswer: 'Stall speed, landing configuration' });
  });

  test('semicolons between cards', () => {
    const { format, rows } = parseUpload('Va\tManeuvering speed;Vx\tBest angle of climb;Vy\tBest rate of climb');
    expect(format).toBe('quizlet');
    expect(rows.map((r) => r.question)).toEqual(['Va', 'Vx', 'Vy']);
  });

  test('a single card has nobody to borrow from, and says so', () => {
    const { rows } = parseUpload('Va\tManeuvering speed', { format: 'quizlet' });
    expect(rows[0].borrowed).toBe(false);
    expect(problemsWith(rows[0])).toEqual(['No wrong answers.']);
  });
});

describe('telling the shapes apart', () => {
  test('two columns is Quizlet, three or more is a table', () => {
    expect(detect('a\tb\nc\td').format).toBe('quizlet');
    expect(detect('a\tb\tc\nd\te\tf').format).toBe('table');
  });

  test('a two-column paste with a header is a table', () => {
    expect(detect('Question\tAnswer\nWhat?\tThat').format).toBe('table');
  });
});

describe('checking rows', () => {
  test('what stops a row being sent', () => {
    expect(problemsWith({ question: '', correctAnswer: 'a', incorrectAnswer1: 'b' })).toEqual(['No question.']);
    expect(problemsWith({ question: 'q', correctAnswer: 'a' })).toEqual(['No wrong answers.']);
    expect(problemsWith({ question: 'q', correctAnswer: 'Same', incorrectAnswer1: ' same ' })).toEqual(['Two answers are the same.']);
  });

  test('a likely duplicate of a live question is found, a different one is not', () => {
    const live = [
      { questionId: 'q1', question: 'What is the flash point of a liquid?' },
      { questionId: 'q2', question: 'Induced drag increases as' },
    ];
    expect(likelyDuplicate({ question: 'What is the flash point of a liquid' }, live).question.questionId).toBe('q1');
    expect(likelyDuplicate({ question: 'What is the flash point of the liquid?' }, live).question.questionId).toBe('q1');
    expect(likelyDuplicate({ question: 'Parasite drag increases as' }, live)).toBeNull();
    expect(dice('induced drag rises', 'induced drag rises')).toBe(1);
    expect(dice('a b c', 'a b c')).toBe(0); // one-letter words carry nothing and are left out
  });
});
