import routeSteps from '../route-steps.json' with { type: 'json' };
import type { GuideId, LearnerGuide } from '../../../../../scripts/learner-guide-types.ts';
import { modelIcon, routeLabel } from './common.ts';

/** Минимальная DOM-поверхность каркаса hero: позволяет проверять отрисовку без браузера. */
export type HeroStage = Pick<LearnerGuide, 'title' | 'summary' | 'output'>;
export type HeroHeading = Pick<Element, 'textContent'>;
export type HeroSummary = Pick<Element, 'innerHTML' | 'insertAdjacentHTML'>;
export type HeroProof = Pick<Element, 'setAttribute' | 'textContent'>;

export const mountHero = (
  id: GuideId,
  stage: HeroStage,
  heading: HeroHeading,
  summary: HeroSummary,
  proof: HeroProof,
): void => {
  const step = routeSteps.find((entry) => entry.id === id)!;
  const course = (step as { course?: string }).course;
  const title = routeLabel({
    number: step.number,
    title: stage.title,
    ...(course === undefined ? {} : { course }),
  });
  document.title = `${title} · AI PDLC Learning`;
  heading.textContent = title;
  // The «Скачать .md» file link moves out of the summary sentence into a button beside «Начать ↓»;
  // the summary keeps the link to the example page itself. Only step 3 embeds a download this way.
  const fileLink = / \(<a href="(examples\/[^"]+\.md)"[^>]*download[^>]*>Скачать \.md<\/a>\)/u;
  const fileHref = fileLink.exec(stage.summary)?.[1] ?? '';
  summary.innerHTML = stage.summary.replace(fileLink, '');
  const stepNumber = String(step.number ?? '').trim();
  // «Начать ↓» — подготовка и шаг 3 (решение ca925859) и шаги с буквенным суффиксом (6а/6б):
  // внутренние шаги курса называются без суффикса, это проверяет тест именования шагов.
  const startLabel =
    ['0', '0a', 'sdd', '3'].includes(id) || !/^[1-9]\d*$/.test(stepNumber)
      ? 'Начать ↓'
      : `Начать с шага ${stepNumber} ↓`;
  summary.insertAdjacentHTML(
    'afterend',
    `<a class="hero-start" href="#work-steps">${startLabel}</a>`,
  );
  if (fileHref)
    summary.insertAdjacentHTML(
      'afterend',
      `<a class="hero-download" href="${fileHref}" download>Скачать .md · замысел</a>`,
    );
  if (['3-star', '4-new', '4-legacy', 'delivery'].includes(id)) {
    summary.insertAdjacentHTML(
      'afterend',
      `<p class="model-role"><span class="model-label">${modelIcon}С моделью</span></p>`,
    );
  }
  // «Наблюдаемый результат» — связный абзац из данных, а не заголовок. В колонке
  // hero 19rem акцентная фраза держится примерно до четырёх строк (около 120 знаков);
  // более длинный текст, набранный strong, читается как заголовок на 8–14 строк.
  // Поэтому длинный текст помечается атрибутом и в карточке идёт как пояснение
  // (guide.css), а короткие strong на карте курса и других страницах не меняются.
  if (stage.output.length > 120) proof.setAttribute('data-output', 'long');
  proof.textContent = stage.output;
};
