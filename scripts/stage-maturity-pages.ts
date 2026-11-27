import {
  courseNavigationRow,
  escapeHtml,
  renderSiteNavigation,
} from './site-navigation-contract.ts';
import { stage as architecture } from './maturity-content/architecture.ts';
import { stage as implementation } from './maturity-content/implementation.ts';
import { stage as observation } from './maturity-content/observation.ts';
import { stage as release } from './maturity-content/release.ts';
import { stage as testing } from './maturity-content/testing.ts';
import type { StageMap } from './maturity-content/types.ts';

type StagePage = { path: string; stage: StageMap; coursePath?: string; courseLabel?: string };

const stageMaps: readonly StagePage[] = [
  {
    path: 'architecture-maturity-map.html',
    stage: architecture,
    coursePath: './guides/s3-openspec.html',
    courseLabel: 'Практика: оформить изменение в OpenSpec →',
  },
  {
    path: 'implementation-maturity-map.html',
    stage: implementation,
    coursePath: './guides/d1-delivery.html',
    courseLabel: 'Перейти к практикуму разработки →',
  },
  {
    path: 'testing-maturity-map.html',
    stage: testing,
    coursePath: './guides/d1-delivery.html',
    courseLabel: 'Практика: проверить реализацию по требованиям →',
  },
  {
    path: 'release-maturity-map.html',
    stage: release,
    coursePath: './guides/p4-metarepository.html#lesson-check',
    courseLabel: 'Практика: подтвердить выпуск отдельно →',
  },
  { path: 'observation-maturity-map.html', stage: observation },
];

const escape = (value: string): string => escapeHtml(value);

export const renderStageMaturityPages = (): { path: string; content: string }[] =>
  stageMaps.map(({ path, stage, coursePath, courseLabel }, index) => {
    const courseHome = courseNavigationRow() === 'customdev' ? '../#sdlc' : './#sdlc';
    const nextStage = stageMaps[index + 1];
    const nextLink = nextStage
      ? `<a href="./${nextStage.path}">Следующий этап: ${escape(nextStage.stage.title)} →</a>`
      : '';
    const previousStage = stageMaps[index - 1];
    const previousLink = previousStage
      ? `<a href="./${previousStage.path}">← Предыдущий этап: ${escape(previousStage.stage.title)}</a>`
      : '';
    const courseLink = coursePath
      ? `<a href="${coursePath}">${escape(courseLabel ?? 'Открыть практикум курса →')}</a>`
      : '';
    const levels = stage.levels
      .map(
        (
          level,
          levelIndex,
        ) => `<section class="maturity-pair" aria-labelledby="level-${levelIndex + 1}">
    <h3 id="level-${levelIndex + 1}">Ступень ${levelIndex + 1} · ${escape(level.title)}</h3>
    <div class="maturity-pair__columns">
      <article class="maturity-practice"><h4>Уровень ${levelIndex + 1}</h4><p>${escape(level.practice)}</p></article>
      <article class="maturity-ai"><h4>Уровень ${levelIndex + 1}-ИИ · дополнение</h4><p>${escape(level.ai)}</p></article>
    </div>
    <p class="maturity-check"><strong>Решение человека.</strong> ${escape(level.check)}</p>
    <p class="maturity-next"><strong>Следующий шаг.</strong> ${escape(level.next)}</p>
  </section>`,
      )
      .join('\n');
    const content = `<!doctype html>
<html lang="ru" data-atmos data-section="analysis">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Три ступени зрелости команды на этапе ${escape(stage.title)} в PDLC и помощь ИИ на каждом уровне.">
  <title>Зрелость: ${escape(stage.title)} · AI PDLC Learning</title>
  <link rel="stylesheet" data-site-nav-styles href="site-nav.css">
  <link rel="stylesheet" data-atmos-styles href="./atmosphere.css">
  <link rel="stylesheet" href="./stage-maturity.css">
</head>
<body>
  <a class="skip-link" href="#main-content">Перейти к содержанию</a>
  ${renderSiteNavigation({ section: 'sdlc' })}
  <div class="stage-maturity">
    <header class="stage-maturity__intro">
      <p class="maturity-kicker">Этап ${escape(stage.number)} · PDLC</p>
      <h1>Ступени зрелости: ${escape(stage.title)}</h1>
      <p>Выберите ближайшую следующую ступень по проверяемым признакам. Новая ступень включает предыдущие.</p>
      <div class="stage-maturity__links"><a href="./guides/index.html#maturity-levels">Для сравнения: ступени зрелости анализа</a>${courseLink}</div>
    </header>
    <main id="main-content" tabindex="-1">
      <section class="stage-maturity__rule" aria-labelledby="evidence-title">
        <h2 id="evidence-title">На что опираться</h2>
        <p>${escape(stage.evidence)}</p>
      </section>
      <section class="stage-maturity__levels" aria-labelledby="levels-title">
        <div class="stage-maturity__levels-head"><h2 id="levels-title">Три ступени</h2><p>ИИ помогает готовить и проверять материалы. Решения и приёмка остаются за людьми.</p></div>
        ${levels}
      </section>
      <nav class="stage-maturity__next" aria-label="Маршрут по этапам"><a href="${courseHome}">← Карта PDLC</a>${previousLink}${nextLink}</nav>
    </main>
  </div>
</body>
</html>`;
    return { path, content };
  });
