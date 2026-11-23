import type { GuideContent, GuideId } from '../../../../../scripts/learner-guide-types.ts';
import { list, pluralRu } from './common.ts';
import { hasLevels } from './levels.ts';
import { beginnerGlossaries } from './glossaries.ts';
import { workspaceMap } from './workspace.ts';

export const renderPreparation = (
  content: GuideContent,
  id: GuideId,
  rationaleInHero: boolean,
  supplement: string,
): string => {
  const { stages, accessPreparation, prerequisites } = content;
  const stage = stages[id];
  const glossary = beginnerGlossaries[id];
  const workspace = workspaceMap(id);
  const termsLabel = workspace ? 'Слова и репозитории' : 'Слова перед практикой';
  const terms = glossary.length
    ? `<details class="prep-fold"><summary>${termsLabel}<span class="terms-count"> · Показать ${glossary.length} ${pluralRu(glossary.length, 'слово', 'слова', 'слов')}</span></summary><section aria-label="Слова перед практикой" id="course-terms"><dl class="beginner-glossary">${glossary.map(([term, meaning]) => `<div><dt>${term}</dt><dd>${meaning}.</dd></div>`).join('')}</dl>${id === '0a' ? '<p>Значения команд GitLab появятся перед совместной частью, когда они понадобятся.</p>' : ''}</section>${workspace}</details>`
    : '';
  const goal = stage.learning?.length
    ? `<details class="lesson-goal"><summary id="lesson-goal-title">Чему вы научитесь<span class="lesson-goal__film"> · Видео к уроку</span></summary>${list(stage.learning)}<div class="lesson-goal__links"><a href="#work-steps">К заданию ↓</a><a href="#lesson-check">Проверить результат ↓</a></div></details>`
    : '';
  const why =
    stage.rationale && !rationaleInHero
      ? `<details class="prep-fold" id="course-why"><summary>${id === '0a' ? 'Зачем аналитику Markdown и Git' : 'Зачем это нужно'}</summary>${stage.rationale}</details>`
      : '';
  return `<section class="card card--prep"${hasLevels(id) ? ' id="course-prereq"' : ''}><h2>Перед началом</h2>${accessPreparation[id]}${goal}${why}<details class="prep-fold"><summary>Что подготовить</summary><div>${list(prerequisites[id])}<div class="chips">${(stage.tools ?? []).map((tool) => `<span class="chip" translate="no">${tool}</span>`).join('')}</div></div></details>${terms}${supplement}</section>`;
};
