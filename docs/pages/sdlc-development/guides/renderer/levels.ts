import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';
import type { StepLevel } from './level-types.ts';
import { levels0a } from './levels0a.ts';
import { levels0 } from './levels0.ts';
import { levels1 } from './levels1.ts';
import { stepAnchor } from './common.ts';

const stepLevelsByGuide: Record<string, Record<string, StepLevel>> = {
  '0a': levels0a,
  '0': levels0,
  '1': levels1,
};
export const hasLevels = (id: string): boolean => id in stepLevelsByGuide;
const levelCard = (
  knownTitle: string,
  noviceText: string,
  knownText: string,
  knownLinks: [string, string][],
) =>
  `<section class="level-choice" id="level-choice" aria-labelledby="level-choice-title"><h2 id="level-choice-title">Выберите, как проходить шаги</h2><div class="level-choice__options"><details name="guide-level"><summary>Я новичок</summary><p>${noviceText}</p><p class="level-choice__links"><a href="#course-prereq">Перед началом ↓</a></p></details><details name="guide-level"><summary>${knownTitle}</summary><p>${knownText}</p><p class="level-choice__links">${knownLinks.map(([href, label]) => `<a href="#${href}">${label}</a>`).join('')}</p></details></div></section>`;
export const levelChoices: Record<string, string> = {
  '0a': levelCard(
    'Я уже знаю Git и Markdown',
    'Идите по порядку и раскрывайте «Если это впервые».',
    'Раскрывайте «Если уже знаете». Шаги 1–7 всё равно нужны: они собирают main с intent.md. Новое для вас:',
    [
      ['step-01', 'intent.md (шаг 1) →'],
      ['step-06', 'ветка для другой границы (шаг 6, нужна шагу 7) →'],
      ['step-08', 'GitLab и Merge Request (шаги 8–14) →'],
    ],
  ),
  '0': levelCard(
    'Я уже знаю жизненный цикл разработки и роли анализа',
    'Идите по порядку и раскрывайте «Если это впервые».',
    'Раскрывайте «Если уже знаете». Если проверяете чужой замысел, на шаге 4 раскройте «Если вы проверяете чужой замысел». Новое для вас:',
    [
      ['step-04', 'замысел изменения (шаг 4) →'],
      ['step-05', 'папка изменения и одобрение (шаг 5) →'],
      ['step-07', 'выбор следующего шага курса (шаг 7) →'],
    ],
  ),
  '1': levelCard(
    'Я уже знаю, что такое замысел и спецификация',
    'Идите по порядку и раскрывайте «Если это впервые».',
    'Раскрывайте «Если уже знаете». Шаг 1 всё равно нужен: это вход шага\u00a01\u00a0«Требования в Git». Новое для вас:',
    [
      ['step-02', 'шаблон спецификации (шаг 2) →'],
      ['step-03', 'форк и личная ветка (шаг 3) →'],
      ['step-05', 'сверка с образцом и отправка (шаг 5) →'],
    ],
  ),
};
export const renderLevels = (item: LearnerStep, index: number, id: string) => {
  const level = stepLevelsByGuide[id]?.[stepAnchor(item, index)];
  if (!level) return '';
  return `<details name="level-${index + 1}" class="beginner-extra beginner-extra--secondary step-level step-level--novice"><summary>Если это впервые</summary><div class="beginner-extra__body">${level.novice}</div></details><details name="level-${index + 1}" class="beginner-extra beginner-extra--secondary step-level step-level--known"><summary>Если уже знаете</summary><div class="beginner-extra__body">${level.known}</div></details>${level.reviewer ? `<details name="level-${index + 1}" class="beginner-extra beginner-extra--secondary step-level step-level--reviewer"><summary>Если вы проверяете чужой замысел</summary><div class="beginner-extra__body">${level.reviewer}</div></details>` : ''}`;
};
