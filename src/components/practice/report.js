// The flight as plain text, for a bug report pasted into the feedback form: what was flown,
// what was picked, where it stands now, and the last of what was said. Pure. Temporary, while
// the community tests the page.

import { current } from './engine';
import { labelOf } from './legs';

const LAST = 25;

export function flightText(s, { url = '', when = new Date() } = {}) {
  const c = s.card || {};
  const now = current(s);
  const choices = (s.log || []).filter((l) => l.result === 'choice').map((l) => l.text);
  const lines = (s.log || []).slice(-LAST).map((l) => [l.phase || '', l.radio || l.who || '', l.text || ''].join(' | '));
  const step = now ? [now.phase, now.kind, now.choose || now.group || '', now.leg || now.text || ''].filter(Boolean).join(' | ') : (s.done ? `done${s.ended ? `: ${s.ended}` : ''}` : 'none');
  return [
    'Practice Flight report',
    `${when.toISOString()} ${url}`.trim(),
    `Call sign ${c.callSign || '?'}, runway ${c.rwy || '?'} (${c.north ? 'North' : 'South'} Flow), seed ${c.seed ?? '?'}`,
    `Plan: ${s.order || '?'} work first, ${s.plan || '?'}${s.olf ? `, field ${labelOf(s.olf)}` : ''}${s.block ? `, ${s.block.name}` : ''}`,
    `Route: ${(s.route || []).map(labelOf).join(' → ')}`,
    `Choices: ${choices.join(' / ') || 'none'}`,
    `Now: ${s.ep ? `${s.ep.title}: ` : ''}${step}`,
    '',
    `Last ${lines.length} lines:`,
    ...lines,
  ].join('\n');
}
