import type { GuideContent, GuideId } from '../../../../../scripts/learner-guide-types.ts';
import { escapeHtml, list } from './common.ts';
import { renderPreparation } from './preparation.ts';
import { submissionNotes } from './glossaries.ts';
import { levelChoices } from './levels.ts';
import { guideHandoff } from './handoff.ts';
import { steps, renderStepToc } from './steps.ts';

export const renderGuideBody = (
  content: GuideContent,
  id: GuideId,
  supplement: string,
  rationaleInHero: boolean,
): string => {
  const { stages, guideReferences } = content;
  const stage = stages[id];
  const { archiveNote, implementationHandoff } = guideHandoff(id);
  const resources = (guideReferences[id] ?? [])
    .map(
      ([label, href, kind]) =>
        `<a data-guide-resource="${kind}" href="${href}">${label}&nbsp;→</a>`,
    )
    .join('');
  const submissionNote = submissionNotes[id];
  const entry = stage.steps.find((step) => step.entryMode)?.entryMode;
  const modeSwitch = entry
    ? `<div class="mode-switch" data-mode-switch role="group" aria-label="Как вы вошли в шаг"><span class="mode-switch__label">Как вы вошли в шаг:</span><button type="button" class="mode-switch__btn" data-mode="a" aria-pressed="true">${entry.a}</button><button type="button" class="mode-switch__btn" data-mode="b" aria-pressed="false">${entry.b}</button></div>`
    : '';
  return `${modeSwitch}${levelChoices[id] ?? ''}<div class="lesson-intro">${renderPreparation(content, id, rationaleInHero, supplement)}${renderStepToc(stage.steps)}</div>
    <section class="card card--wide" id="work-steps"><h2>Шаги</h2>${steps(stage.steps, id, archiveNote)}</section>
    <section class="card"><h2 id="lesson-check">Финальная самопроверка</h2><p class="lesson-outcome">${escapeHtml(stage.output)}</p><ul class="check">${stage.check.map((item) => `<li>${item}</li>`).join('')}</ul>${stage.application ? `<p class="course-application"><strong>Где применять:</strong> ${stage.application}</p>` : ''}<p class="submission-note">${submissionNote}</p>${id === '3-star' ? '' : implementationHandoff}</section>
    ${id === '3-star' ? implementationHandoff : ''}
    <details class="card card--wide beginner-extra"><summary>${resources ? 'Роли, ограничения и справки' : 'Роли и ограничения'}</summary><div class="beginner-extra__body">${(stage.roles?.length ?? 0) ? `<h3>Кто что делает</h3>${list(stage.roles ?? [])}` : ``}<h3>Ограничения</h3><div class="route"><div><strong>${id === '0a' ? 'В проекте команды' : 'Корпоративный маршрут'}</strong><span>${stage.corporate ?? ``}</span></div><div class="workaround"><strong>${id === '0a' ? 'Самостоятельная практика' : 'Если доступ пока не готов'}</strong><span>${stage.workaround ?? ``}</span></div></div>${resources ? `<h3>Официальные справки</h3><div class="practice-links">${resources}</div>` : ''}</div></details>`;
};
