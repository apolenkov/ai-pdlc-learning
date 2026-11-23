import assert from 'node:assert/strict';
import names from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import route from '../docs/pages/sdlc-development/guides/route-steps.json' with { type: 'json' };
import { routeLabel } from '../docs/pages/sdlc-development/guides/renderer/common.ts';
import { escapeHtml } from './site-navigation-contract.ts';

/** The player's labels and destinations follow the same route as the menu, including branches. */
export const guideVideoOverlay = (page: string, id = ''): string => {
  const current = route.find((step) => `guides/${step.href}` === page);
  /** The intent course page hosts the overview film, like the course map page hosts its own film. */
  const intentPage = `guides/${names.courses.intent.page}`;
  assert.ok(
    current || page === 'guides/index.html' || page === intentPage,
    `No video route for ${page}`,
  );
  const branches = current
    ? route.filter((step) =>
        names.branches.some((branch) => branch.of === current.id && branch.id === step.id),
      )
    : [];
  const courseOf = (step: { course?: string }): string | null => step.course ?? null;
  const firstIntentStep = route.find((step) => !step.branchOf && courseOf(step) === 'intent');
  const following = current
    ? route
        .slice(route.indexOf(current) + 1)
        .find((step) => !step.branchOf && courseOf(step) === courseOf(current))
    : page === intentPage
      ? firstIntentStep
      : route[0];
  const next = branches.length ? branches : following ? [following] : [];
  // The extra belongs to preparation and has no course number.
  const extra = names.extras.find((entry) => entry.id === id);
  const host = extra && route.find((step) => step.id === extra.after);
  const label = escapeHtml(
    host
      ? `Дополнение к подготовке · ${host.title} · ${extra.title}`
      : current
        ? routeLabel(current)
        : 'Видео: карта курса',
  );
  const courseEnd = current?.course === 'intent' ? 'intent.html' : 'index.html';
  const ending = next.length
    ? `Дальше — ${next
        .map(
          (step) =>
            `<a href="${escapeHtml(step.href)}">${escapeHtml(routeLabel(step).replace(/^Шаг/u, 'шаг'))}</a>`,
        )
        .join(' или ')}`
    : `Конец курса · <a href="${courseEnd}">К карте курса</a>`;
  return `<template id="guide-video-overlay${id ? `-${id}` : ''}">
    <div class="lesson-video__corner" aria-hidden="true" hidden>${label}</div>
    <div class="lesson-video__ending" hidden>${ending}</div>
  </template>`;
};
