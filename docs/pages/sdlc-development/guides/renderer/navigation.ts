import routeSteps from '../route-steps.json' with { type: 'json' };
import courseNames from '../../course-names.json' with { type: 'json' };
import type { GuideId, LearnerGuide } from '../../../../../scripts/learner-guide-types.ts';
import { guideInfo, routeLabel } from './common.ts';

const stageHref = (stageId: string) => guideInfo(stageId).file;
const routeStages = routeSteps;
const entryCourse = (entry: { course?: string }): string | undefined => entry.course;
/** Previous step inside each course: preparation is shared, practice steps keep their own course. */
const prevIn = (ids: readonly string[]): Record<string, string | null> =>
  Object.fromEntries(ids.map((id, index) => [id, ids[index - 1] ?? null]));
const routePrev: Record<string, string | null> = {
  ...prevIn(
    courseNames.route.filter((entry) => entryCourse(entry) !== 'intent').map((entry) => entry.id),
  ),
  ...prevIn(
    courseNames.route
      .filter((entry) => entry.group === 'prep' || entryCourse(entry) === 'intent')
      .map((entry) => entry.id),
  ),
  ...Object.fromEntries(courseNames.branches.map((branch) => [branch.id, branch.of])),
};
const routeById = (stageId: string | null | undefined) =>
  routeStages.find((entry) => entry.id === stageId);
const labelOf = (stageId: string, short = true): string => {
  const step = routeById(stageId);
  if (!step) throw new Error(`Unknown course step: ${stageId}`);
  return routeLabel(step, short);
};
export const mountFooter = (id: GuideId, stage: LearnerGuide): void => {
  document.querySelectorAll<HTMLElement>('[data-stage-link]').forEach((link) => {
    const target = link.dataset.stageLink;
    if (target) link.textContent = labelOf(target);
    if (target === id) link.setAttribute('aria-current', 'page');
  });
  const next = document.querySelector<HTMLAnchorElement>('#next-stage');
  if (!next) return;
  const prevStage = routeById(routePrev[id]);
  if (prevStage) {
    next.insertAdjacentHTML(
      'beforebegin',
      `<a class="footer-nav__prev" id="prev-stage" rel="prev" href="${stageHref(prevStage.id)}">← ${routeLabel(prevStage, true)}</a>`,
    );
  }
  const branches = courseNames.branches.filter((branch) => branch.of === id);
  if (branches.length) {
    next.href = stageHref(branches[0]!.id);
    next.textContent = `${labelOf(branches[0]!.id)} →`;
    next.insertAdjacentHTML(
      'afterend',
      branches
        .slice(1)
        .map((branch) => `<a href="${stageHref(branch.id)}">${labelOf(branch.id)} →</a>`)
        .join(''),
    );
  } else if (stage.next) {
    const nextId = stage.next;
    const entry = routeById(nextId)!;
    next.href = stageHref(stage.next);
    // Intent guide titles are bare: the course name comes from the route entry, as in the strip.
    const course = entryCourse(entry);
    next.textContent = `${routeLabel({ number: entry.number, title: guideInfo(nextId).title, ...(course === undefined ? {} : { course }) }, true)} →`;
  } else {
    next.href =
      id === 'delivery' ? 'index.html#implementation' : '../examples/credit-calculator.html';
    next.textContent =
      id === 'delivery' ? 'Карта курса →' : 'Открыть исходную версию калькулятора →';
  }
};
