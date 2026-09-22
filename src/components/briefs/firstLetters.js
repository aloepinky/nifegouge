// First-letter mode: each word keeps its first letter or digit, and every other one becomes a
// dash, so `Brief current METARs` reads `B---- c------ M-----`. Punctuation, spacing and the
// `**` bold markers stay where they are, so the sentence keeps its shape. An apostrophe inside
// a word is part of it (`I'M` -> `I--`); a hyphen is not (`4-6` stays `4-6`).

const WORD = /[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g;

export function firstLetters(text) {
  if (!text) return text;
  return text.replace(WORD, (word) => word[0] + '-'.repeat(word.length - 1));
}
