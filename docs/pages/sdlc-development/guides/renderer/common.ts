import courseNames from '../../course-names.json' with { type: 'json' };
import type { GuideId, LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const INTENT_COURSE_TITLE = 'Намерение и\u00a0план';

/** Steps of the intent course always carry the course name; every other step renders as before. */
export const routeLabel = (
  step: { number: string; title: string; course?: string },
  short = false,
): string => {
  if (step.course === 'intent' && step.number)
    return `${INTENT_COURSE_TITLE}\u00a0· Шаг\u00a0${step.number}\u00a0· ${step.title}`;
  return `${step.number ? `${short ? '' : 'Шаг\u00a0'}${step.number}` : 'Подготовка'}\u00a0· ${step.title}`;
};
// Textual reference to a course step: number + name in guillemets, e.g. `2 «Проверяем и согласуем»`.
// The case of «шаг» is set by the preposition in the sentence; navigation keeps routeLabel.
export const stepRefLabel = (step: { number: string; title: string }): string =>
  `${step.number ? step.number : 'Подготовка'}\u00a0«${step.title}»`;

export const modelIcon = `<svg class="model-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 8V4H9M2 12v4m20-4v4"/><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M8 13v2m8-2v2m-7 2h6"/></svg>`;
export const list = (items: readonly string[]) =>
  `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
/** Russian noun form for a count: 1 → one, 2–4 → few, 5–20 and 0 → many (11–14 are always «many»). */
export const pluralRu = (count: number, one: string, few: string, many: string): string => {
  const tail = Math.abs(count) % 100;
  const last = tail % 10;
  if (tail > 10 && tail < 20) return many;
  if (last === 1) return one;
  return last >= 2 && last <= 4 ? few : many;
};
export const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export const stepAnchor = (item: LearnerStep, index: number) =>
  item.anchor ?? `step-${String(index + 1).padStart(2, '0')}`;

export const isGuideId = (id: string): id is GuideId =>
  id !== 'metarepo' && Object.hasOwn(courseNames.guides, id);

export const guideInfo = (id: string) => {
  if (id === 'metarepo') return courseNames.guides.metarepo;
  if (!isGuideId(id)) throw new Error(`Unknown course guide: ${id}`);
  return courseNames.guides[id];
};
