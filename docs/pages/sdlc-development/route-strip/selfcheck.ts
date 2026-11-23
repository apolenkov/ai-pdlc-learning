// Final self-check becomes checkable: marks stay in this browser, a full set gives a short success click
// and fills the step's dot on the route strip; step 7 ends with the "route passed" card.
import { minutes, routeLabel, routeState, routeTotal, type RouteStep } from './model.ts';
import {
  doneStages,
  hasMarks,
  inRange,
  readProgress,
  resetChecked,
  safeStorage,
  writeChecked,
} from './progress.ts';
import { STEPS } from './strip.ts';

const UPDATE = 'course-route:update';
const FINAL_STAGE = 'delivery';
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/gu, (char) => `&#${char.charCodeAt(0)};`);

/**
 * Chip in the finale card: step number, or the first word of a preparation title
 * («Зачем», «SDD»); «Markdown, Git, GitLab» gets the shorter «Git».
 */
export const finaleLabel = (step: RouteStep): string =>
  step.number || { '0a': 'Git' }[step.id] || (step.title.split(' ')[0] ?? 'Подготовка');

/** Every numbered main step and at least one branch of step 6; preparation can be skipped. */
export const allMarked = (steps: RouteStep[], done: ReadonlySet<string>): boolean =>
  steps.filter((step) => step.number && !step.branchOf).every((step) => done.has(step.id)) &&
  steps.some((step) => step.branchOf === '6' && done.has(step.id));

export const renderFinale = (
  steps: RouteStep[],
  done: ReadonlySet<string>,
  totalSeconds: number,
  celebrate = false,
): string => {
  const labels = steps
    .map(
      (step) =>
        `<li class="${done.has(step.id) ? 'is-marked' : ''}" title="${escapeHtml(routeLabel(step))}">${escapeHtml(finaleLabel(step))}</li>`,
    )
    .join('');
  const passed = allMarked(steps, done);
  const all = passed
    ? '<p class="route-finale__all">Все шаги отмечены</p>'
    : '<p class="route-finale__hint">Отметьте самопроверку на каждом шаге — точки маршрута станут зелёными.</p>';
  return `<section class="card card--wide route-finale${celebrate ? ' is-celebrating' : ''}" aria-labelledby="route-finale-title"><h2 id="route-finale-title">${passed ? 'Маршрут пройден' : 'Маршрут курса'}</h2><p class="route-finale__lead">${routeTotal(steps)} шагов и подготовка: ${minutes(totalSeconds)} роликов от замысла до кода. Линия маршрута вверху считает только ваш путь: ветви без одобрения в её минуты не входят.</p><ol class="route-finale__codes">${labels}</ol>${all}<a class="route-finale__map" href="index.html#course-map">Карта курса</a></section>`;
};

const done = (): Set<string> => doneStages(readProgress(safeStorage()));

const mountFinale = (doc: Document, after: Element): void => {
  const total = routeState(STEPS, null, new Set()).leftSeconds;
  const draw = (celebrate: boolean): void => {
    doc.querySelector('.route-finale')?.remove();
    after.insertAdjacentHTML('afterend', renderFinale(STEPS, done(), total, celebrate));
  };
  draw(false);
  // Marking step 7 complete replays the click on the finale card too.
  addEventListener(UPDATE, () => draw(done().has(FINAL_STAGE)));
};

export const enhanceSelfCheck = (doc: Document, stageId: string): void => {
  const section = doc.getElementById('lesson-check')?.closest('section');
  const items = [...(section?.querySelectorAll<HTMLLIElement>('ul.check > li') ?? [])];
  if (!section || !items.length || !STEPS.some((step) => step.id === stageId)) return;
  const label = routeLabel(STEPS.find((step) => step.id === stageId)!);
  const marked = new Set(inRange(readProgress(safeStorage()).checked[stageId], items.length));
  const toast = doc.createElement('p');
  toast.className = 'check__toast';
  toast.setAttribute('role', 'status');
  section.querySelector('ul.check')!.after(toast);
  const sync = (celebrate: boolean): void => {
    const complete = marked.size === items.length;
    toast.textContent = complete ? `${label}: пройден — точка на маршруте отмечена` : '';
    if (complete && celebrate) {
      section.classList.remove('is-celebrating');
      void section.offsetWidth; // restart the one-shot animation
      section.classList.add('is-celebrating');
    }
  };
  items.forEach((item, index) => {
    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'check__toggle';
    toggle.setAttribute('role', 'checkbox');
    toggle.setAttribute('aria-label', item.textContent?.trim() ?? `Пункт ${index + 1}`);
    toggle.setAttribute('aria-checked', String(marked.has(index)));
    item.classList.add('is-checkable');
    item.prepend(toggle);
    const flip = (): void => {
      if (marked.has(index)) marked.delete(index);
      else marked.add(index);
      toggle.setAttribute('aria-checked', String(marked.has(index)));
      writeChecked(
        safeStorage(),
        stageId,
        [...marked].sort((a, b) => a - b),
        items.length,
      );
      sync(true);
      dispatchEvent(new CustomEvent(UPDATE));
    };
    toggle.addEventListener('click', flip);
    // The item text toggles too, except its own links.
    item.addEventListener('click', (event) => {
      if (event.target instanceof Element && !event.target.closest('a, button')) flip();
    });
  });
  sync(false);
  if (stageId === FINAL_STAGE) mountFinale(doc, section);
};

/** «Сбросить прогресс» on the map: shown only while marks exist, asks once, then clears every mark in this browser. */
export const bindReset = (doc: Document): void => {
  const buttons = [...doc.querySelectorAll<HTMLElement>('[data-route-reset]')];
  const show = (): void => {
    const any = hasMarks(readProgress(safeStorage()));
    buttons.forEach((button) => (button.hidden = !any));
  };
  buttons.forEach((button) =>
    button.addEventListener('click', () => {
      if (!confirm('Сбросить весь прогресс самопроверки в этом браузере?')) return;
      resetChecked(safeStorage());
      dispatchEvent(new CustomEvent(UPDATE));
      // The button hides itself; keep keyboard focus on the map instead of losing it.
      const map = doc.getElementById('course-map');
      map?.setAttribute('tabindex', '-1');
      map?.focus({ preventScroll: true });
    }),
  );
  addEventListener(UPDATE, show);
  show();
};
