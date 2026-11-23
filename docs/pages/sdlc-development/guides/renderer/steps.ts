import type { LearnerStep, GuideId } from '../../../../../scripts/learner-guide-types.ts';
import { escapeHtml, stepAnchor } from './common.ts';
import { renderEvidence } from './screenshots.ts';
import { renderMockup } from './mockups.ts';
import {
  renderExamples,
  renderAdvanced,
  renderModel,
  renderTrouble,
  renderPlatformActions,
} from './examples.ts';
import { renderLevels } from './levels.ts';

const renderWhy = (why: string | undefined): string => {
  if (!why) return '';
  const [lead, ...more] = why.split('<br><br>');
  const paragraphs = more.map((part) => `<div>${part}</div>`).join('');
  return `<div class="step-why"><strong>Зачем:</strong> ${lead}</div>${paragraphs ? `<div class="step-why-more">${paragraphs}</div>` : ''}`;
};

// Authored extra blocks may contain their own disclosures. Only the outer summary becomes a heading.
const additionalSections = (html: string): string => {
  let depth = 0;
  return html.replace(/<details\b[^>]*>|<\/details>|<summary\b[^>]*>|<\/summary>/gu, (tag) => {
    if (tag.startsWith('<details')) return depth++ === 0 ? tag.replace('details', 'section') : tag;
    if (tag === '</details>') return --depth === 0 ? '</section>' : tag;
    return depth === 1 ? tag.replace('summary', 'h4') : tag;
  });
};

const extra = (action: string) => action.trimStart().startsWith('<details');
const renderActions = (item: LearnerStep, separateVariants: boolean): string => {
  const actions = item.actions.filter((action) => !extra(action));
  const css = separateVariants ? 'step-actions step-actions--mode-a' : 'step-actions';
  const headings = { 1: '', ...item.actionHeadings };
  const starts = Object.keys(headings).map(Number);
  return starts
    .map((start, index) => {
      const end = starts[index + 1] ?? actions.length + 1;
      const content = actions
        .slice(start - 1, end - 1)
        .map((action) => `<li>${action}</li>`)
        .join('');
      const title = item.actionHeadings?.[start];
      const heading = title ? `<h4>${escapeHtml(title)}</h4>` : '';
      return `${heading}<ol class="${css}"${start === 1 ? '' : ` start="${start}"`}>${content}</ol>`;
    })
    .join('');
};

const renderVariantB = ({ entryMode, variantB }: LearnerStep): string => {
  if (!variantB) return '';
  const label =
    entryMode && !/^\s*<h4>Вариант\s+Б(?:\s|<)/iu.test(variantB)
      ? '<p class="step-variant-tag">Вариант Б</p>'
      : '';
  return `<div class="mode-b" data-mode-b>${label}${variantB}</div>`;
};

export const steps = (items: LearnerStep[], id: GuideId, archiveNote: string) =>
  `<ol class="step-list step-list--beginner">${items
    .map((item, index) => {
      const figure =
        item.figure?.html.replace(
          /^(<figure\b[^>]*>)\s*(<svg\b[\s\S]*?<\/svg>)/u,
          '$1<div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с прокруткой при узком окне">$2</div>',
        ) ?? '';
      const separateVariants = item.entryMode && !item.entryMode.shared;
      const actions = renderActions(item, Boolean(separateVariants));
      const links = item.links.length
        ? `<div class="step-links">${item.links
            .map(([label, href, downloadTitle = label]) => {
              const confluence = href.endsWith('/confluence-page.html');
              const example = /^examples\/.+\.html$/u.test(href) && !confluence;
              // The Confluence mock has no site menu, so it opens beside the guide instead of replacing it.
              return `<a class="step-link" href="${href}"${confluence ? ' target="_blank" rel="noopener"' : ''}>${label}</a>${example ? `<a class="step-link step-link--download" href="${href.replace(/\.html$/u, '.md')}" download>Скачать .md · ${escapeHtml(downloadTitle)}</a>` : ''}`;
            })
            .join('')}</div>`
        : '';
      const gitNote = item.gitNote ? `<p class="step-git-note">${item.gitNote}</p>` : '';
      const instructions = `<div class="step-instructions${separateVariants ? ' step-instructions--mode-a' : ''}">${separateVariants ? '<p class="step-variant-tag">Вариант А</p>' : ''}${actions}${separateVariants ? '' : gitNote}${links}${renderExamples(item)}${id === 'delivery' && index === 6 ? archiveNote.replace('<h3>Когда изменение попадает в главную спецификацию</h3>', '<h4>Когда изменение попадает в главную спецификацию</h4>') : ''}</div>`;
      const levels = renderLevels(item, index, id);
      const evidence = renderEvidence(item, index + 1);
      const { trouble, secondary } = renderTrouble(item);
      const optional = [
        evidence.more,
        secondary,
        renderAdvanced(item),
        renderModel(item),
        ...item.actions.filter(extra),
        renderPlatformActions(item.platformActions),
      ].join('');
      const supplement = optional
        ? `<details class="step-additional"><summary>Дополнительно</summary><div>${additionalSections(optional)}</div></details>`
        : '';
      const last = index === items.length - 1;
      const stepNav = `<p class="step-nav"><a class="${last ? 'step-follow-up' : 'step-next'}" href="${escapeHtml(item.nextUse.href)}">${last ? `Дальше: ${escapeHtml(item.nextUse.label ?? '')}` : 'Следующий шаг →'}</a>${items.length >= 4 ? `<a class="step-next step-next--toc" href="#step-toc">↑ Шаги инструкции</a>` : ''}</p>`;
      return `<li id="${stepAnchor(item, index)}"><span class="step-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div class="step-copy"><h3>${item.title}</h3>${item.legacyAnchor ? `<span id="${escapeHtml(item.legacyAnchor)}"></span>` : ''}${renderWhy(item.why)}${levels}${figure}${instructions}${renderMockup(item.mockup)}${renderVariantB(item)}${separateVariants ? gitNote : ''}${evidence.lead}<p class="step-result"><strong>Результат:</strong> ${item.result}</p><div class="step-tail">${trouble}${supplement}</div>${stepNav}</div></li>`;
    })
    .join('')}</ol>`;
export const renderStepToc = (items: LearnerStep[]) =>
  items.length < 4
    ? ''
    : `<nav class="step-toc" id="step-toc" aria-labelledby="step-toc-title"><h2 id="step-toc-title">Шаги инструкции</h2><ol>${items.map((item, index) => `<li><a href="#${stepAnchor(item, index)}">${item.title}</a></li>`).join('')}</ol></nav>`;
