// Marks the figures in a T-44C course rule the way the T-6's rules are marked in the course rules
// document: [[2500']] MSL, HDG [[105°]], [[200]] KIAS, CH [[8]]. The marked words are what is
// styled and what Quiz Mode blanks. Runway numbers name the branch of the rule and are left alone.

export function markFigures(text) {
  return String(text)
    .replace(/(?<![\w/])(\d[\d,]*')/g, '[[$1]]')
    .replace(/(\d{2,3}°)/g, '[[$1]]')
    .replace(/\b(\d+)(?= KIAS)/g, '[[$1]]')
    .replace(/\b(CH|Channel|UHF) (\d+(?:\.\d+)?)/g, '$1 [[$2]]')
    .replace(/\bCRP (\d{2,3}(?:\/0?\d+|R)?)/g, 'CRP [[$1]]')
    .replace(/\b(\d+(?:\.\d+)?)(?= (?:DME|NM|degrees)\b)/g, '[[$1]]')
    .replace(/\b(five|half|one)(?= (?:miles|WTD)\b)/g, '[[$1]]');
}

export const hasMarks = (text) => /\[\[/.test(text);
export const unmark = (text) => String(text).replace(/\[\[|\]\]/g, '');
