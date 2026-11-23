import type { GuideExample, LearnerStep } from '../../../../../scripts/learner-guide-types.ts';
import { escapeHtml, list, modelIcon, pluralRu } from './common.ts';

/** Long examples open collapsed with a short preview (R-1 of SHARED-CSS-FOR-INTEGRATOR). */
const PREVIEW_LINES = 12;

export const renderExample = (
  example: GuideExample | undefined,
  labelElement: 'strong' | 'h4' = 'strong',
  collapsible = true,
) => {
  if (!example) return '';
  const lines = example.content.split('\n');
  const long = collapsible && lines.length > PREVIEW_LINES;
  const toolbar = `<div class="example-toolbar"><${labelElement}>${escapeHtml(example.label)}</${labelElement}><button type="button" class="copy-example" aria-label="Скопировать: ${escapeHtml(example.label)}">Скопировать</button></div>`;
  // The preview carries no <code>, so the copy button keeps copying the whole block.
  const code = `<pre tabindex="0"><code>${escapeHtml(example.content)}</code></pre>`;
  const body = long
    ? `<pre class="example-preview" aria-hidden="true">${escapeHtml(`${lines.slice(0, PREVIEW_LINES).join('\n')}\n…`)}</pre><details class="example-details"><summary>Показать полностью · ${lines.length}\u00a0${pluralRu(lines.length, 'строка', 'строки', 'строк')}</summary>${code}</details>`
    : code;
  return `<div class="step-example${long ? ' step-example--long' : ''}">${toolbar}${body}<span class="copy-status" role="status" aria-live="polite"></span></div>`;
};
export const renderExamples = (item: LearnerStep) =>
  [item.example, ...(item.examples ?? [])]
    .filter(Boolean)
    .map((example) => renderExample(example))
    .join('');
export const renderPlatformActions = (platformActions: LearnerStep['platformActions']) =>
  platformActions
    ? `<details class="step-platforms"><summary>Действия в GitLab</summary><div aria-label="Отдельные действия в GitLab">${([['GitLab · Merge Request', platformActions.gitlab]] satisfies [string, string[]][]).map(([label, actions]) => `<section><h4>${label}</h4><ol>${actions.map((action) => `<li>${action}</li>`).join('')}</ol></section>`).join('')}</div></details>`
    : '';
export const renderAdvanced = (item: LearnerStep) => {
  const content = item.advanced;
  if (!content) return '';
  return content.trimStart().startsWith('<details')
    ? content
    : `<details class="beginner-extra"><summary>Продвинутый вариант</summary><div class="beginner-extra__body">${content}</div></details>`;
};
export const renderModel = (item: LearnerStep) => {
  if (!item.model) return '';
  const { prompt, does, check } = item.model;
  return `<details class="step-model"><summary>${modelIcon}С моделью</summary><div class="step-model__body">${renderExample({ label: 'Что написать модели', content: prompt }, 'h4', false)}<h4>Что она сделает</h4><p>${does}</p><h4>Что проверяете вы</h4>${list(check)}</div></details>`;
};
export const renderTrouble = (item: LearnerStep) => {
  const at = item.trouble.indexOf('<details');
  const text = at < 0 ? item.trouble : item.trouble.slice(0, at);
  const secondary = at < 0 ? '' : item.trouble.slice(at);
  return {
    trouble: `<details class="step-trouble"><summary>Если не получилось</summary><div>${text}</div></details>`,
    secondary,
  };
};
