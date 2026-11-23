import type { LearnerMockup } from '../../../../../scripts/learner-guide-types.ts';
import { escapeHtml } from './common.ts';

const mockupReviewerStates = {
  approved: '✓ Approved',
  pending: 'Review required',
  stale: 'Stale',
  bot: 'Bot',
};
const renderGithubReview = (mockup: LearnerMockup): string => {
  const rows = (mockup.reviewers ?? [])
    .map((reviewer) => {
      const state = Object.hasOwn(mockupReviewerStates, reviewer.state)
        ? reviewer.state
        : 'pending';
      return `<li class="mockup-reviewers__item"><span class="mockup-state mockup-state--${state}">${mockupReviewerStates[state]}</span><span class="mockup-reviewers__role">${escapeHtml(reviewer.role)}</span><span class="mockup-reviewers__note">${escapeHtml(reviewer.note ?? '')}</span></li>`;
    })
    .join('');
  const tabs = ['Conversation', 'Commits', 'Checks', 'Files changed']
    .map(
      (tab, index) =>
        `<span class="mockup-tabs__tab${index === 0 ? ' mockup-tabs__tab--active' : ''}">${tab}</span>`,
    )
    .join('');
  return `<div class="mockup-window"><p class="mockup-window__bar">${escapeHtml(mockup.title)}</p><div class="mockup-pr"><p class="mockup-pr__branches"><span class="mockup-pr__status">Open</span><code>${escapeHtml(mockup.source ?? '')}</code><span aria-hidden="true">→</span><code>${escapeHtml(mockup.base ?? '')}</code></p><div class="mockup-tabs">${tabs}</div><div class="mockup-pr__body"><div class="mockup-conversation"><p class="mockup-conversation__label">Лента обсуждения</p><p class="mockup-conversation__cue">Комментарии, статусы проверок и история коммитов MR</p></div><div class="mockup-reviewers"><p class="mockup-reviewers__title">Reviewers</p><ul class="mockup-reviewers__list">${rows}</ul></div></div><p class="mockup-pr__footnote">${escapeHtml(mockup.footnote ?? '')}</p></div></div>`;
};

const renderJiraIssue = (mockup: LearnerMockup): string => {
  const fields = (mockup.fields ?? [])
    .map(
      ([label, value]) =>
        `<div class="mockup-jira__field"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
    )
    .join('');
  return `<div class="mockup-window"><p class="mockup-window__bar">${escapeHtml(mockup.title)}</p><div class="mockup-jira"><p class="mockup-jira__head"><span class="mockup-jira__type">Task</span><code class="mockup-jira__key">DEMO-…</code><span class="mockup-jira__status">${escapeHtml(mockup.status ?? '')}</span></p><p class="mockup-jira__summary">${escapeHtml(mockup.summary ?? '')}</p><dl class="mockup-jira__fields">${fields}</dl><p class="mockup-jira__label">Описание</p><p class="mockup-jira__description">${escapeHtml(mockup.description ?? '')}</p><p class="mockup-pr__footnote">${escapeHtml(mockup.footnote ?? '')}</p></div></div>`;
};

const renderHandoffChecklist = (mockup: LearnerMockup): string => {
  const items = (mockup.items ?? [])
    .map(
      ([label, note]) =>
        `<li class="mockup-handoff__item"><span class="mockup-handoff__box" aria-hidden="true"></span><span class="mockup-handoff__label">${escapeHtml(label)}</span><span class="mockup-handoff__note">${escapeHtml(note ?? '')}</span></li>`,
    )
    .join('');
  return `<div class="mockup-window"><p class="mockup-window__bar">${escapeHtml(mockup.title)}</p><div class="mockup-handoff"><ul class="mockup-handoff__list">${items}</ul><p class="mockup-pr__footnote">${escapeHtml(mockup.footnote ?? '')}</p></div></div>`;
};

const renderKiloPanel = (mockup: LearnerMockup): string => {
  const messages = (
    [
      ['Запрос', 'prompt', mockup.prompt],
      ['Ответ модели · схема', 'reply', mockup.reply],
    ] satisfies [string, string, string | undefined][]
  )
    .map(
      ([label, cls, text]) =>
        `<p class="mockup-kilo__label">${label}</p><p class="mockup-kilo__${cls}">${escapeHtml(text ?? '')}</p>`,
    )
    .join('');
  const context = mockup.context
    ? `<code class="mockup-kilo__file">${escapeHtml(mockup.context)}</code>`
    : '';
  return `<div class="mockup-window"><p class="mockup-window__bar">${escapeHtml(mockup.title)}</p><div class="mockup-kilo"><p class="mockup-kilo__meta"><span class="mockup-kilo__mode">${escapeHtml(mockup.mode ?? '')}</span>${context}<span class="mockup-kilo__model">${escapeHtml(mockup.model ?? '')}</span></p>${messages}<p class="mockup-pr__footnote">${escapeHtml(mockup.footnote ?? '')}</p></div></div>`;
};

const renderGitlabRequest = (mockup: LearnerMockup): string => {
  const fork = mockup.kind === 'gitlab-fork';
  const fields: [string, string][] = fork
    ? (mockup.fields ?? [])
    : [
        ['Source', mockup.source ?? ''],
        ['Target', mockup.base ?? ''],
      ];
  const rows = fields
    .map(
      ([label, value]) =>
        `<div class="mockup-gitlab__field"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
    )
    .join('');
  const path = fork ? 'Fork project' : 'Merge requests → New merge request';
  const cues = fork
    ? ''
    : `<p class="mockup-gitlab__cue">${escapeHtml(mockup.footnote ?? 'Source — новая ветка шага 2 курса. Target — ваша предыдущая личная ветка шага 1 курса.')}</p>`;
  return `<div class="mockup-window"><p class="mockup-window__bar">${escapeHtml(mockup.title)}</p><div class="mockup-gitlab"><p class="mockup-gitlab__path">${path}</p><dl class="mockup-gitlab__fields${fork ? '' : ' mockup-gitlab__fields--branches'}">${rows}</dl>${cues}<span class="mockup-gitlab__button">${fork ? 'Fork project' : 'Compare branches and continue'}</span></div></div>`;
};

const renderGitlabReview = (mockup: LearnerMockup): string => {
  const rows = (mockup.reviewers ?? [])
    .map(
      (reviewer) =>
        `<li class="mockup-gitlab__reviewer"><strong>${escapeHtml(reviewer.role)}</strong><span class="mockup-state mockup-state--${reviewer.state}">${mockupReviewerStates[reviewer.state]}</span><span class="mockup-gitlab__note">${escapeHtml(reviewer.note ?? '')}</span></li>`,
    )
    .join('');
  const count = (mockup.reviewers ?? []).filter(({ state }) => state === 'approved').length;
  return `<div class="mockup-window"><p class="mockup-window__bar">${escapeHtml(mockup.title)}</p><div class="mockup-gitlab"><p class="mockup-gitlab__path">Reviewer</p><ul class="mockup-gitlab__reviewers">${rows}</ul><p class="mockup-gitlab__approved">✓ Approved by ${count}</p></div></div>`;
};

export const renderMockup = (mockup: LearnerMockup | undefined): string => {
  if (!mockup) return '';
  let body = '';
  switch (mockup.kind) {
    case 'github-review':
      body = renderGithubReview(mockup);
      break;
    case 'jira-issue':
      body = renderJiraIssue(mockup);
      break;
    case 'handoff-checklist':
      body = renderHandoffChecklist(mockup);
      break;
    case 'kilo-panel':
      body = renderKiloPanel(mockup);
      break;
    case 'gitlab-fork':
    case 'gitlab-new-mr':
      body = renderGitlabRequest(mockup);
      break;
    case 'gitlab-review':
      body = renderGitlabReview(mockup);
      break;
  }
  if (!body) return '';
  return `<figure class="step-mockup"><div class="step-mockup__frame">${body}</div><figcaption><strong>Учебный пример · вымышленные данные.</strong> ${escapeHtml(mockup?.caption ?? '')}</figcaption></figure>`;
};
