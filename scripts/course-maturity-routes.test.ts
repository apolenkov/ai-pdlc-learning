import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { pageOutputPaths } from './pages-route-manifest.ts';
import { planLearningSite } from './build-learning-pages.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteSource = resolve(root, 'docs/pages/sdlc-development');

const maturityPages = [
  'architecture-maturity-map.html',
  'implementation-maturity-map.html',
  'testing-maturity-map.html',
  'release-maturity-map.html',
  'observation-maturity-map.html',
] as const;

await test('the public build publishes addressable maturity maps for stages 03–07', async () => {
  const plan = await planLearningSite();
  const plannedPaths = new Set(plan.map((entry) => entry.path));

  for (const path of maturityPages) {
    assert.ok(pageOutputPaths.includes(path), `${path} is in the site route manifest`);
    assert.ok(plannedPaths.has(path), `${path} is emitted by the public site build`);
    assert.ok(
      plan.some((entry) => entry.path === path && 'content' in entry),
      `${path} is built from a source file rather than copied from an unregistered location`,
    );
  }

  const stageIdentity = [
    ['03', 'Архитектура и дизайн', 'architecture-maturity-map.html'],
    ['04', 'Реализация', 'implementation-maturity-map.html'],
    ['05', 'Тестирование', 'testing-maturity-map.html'],
    ['06', 'Выпуск', 'release-maturity-map.html'],
    ['07', 'Наблюдение', 'observation-maturity-map.html'],
  ] as const;

  for (const [number, title, path] of stageIdentity) {
    const page = plan.find((entry) => entry.path === path && 'content' in entry);
    assert.ok(page && 'content' in page, `${path} has generated page content`);
    const html = page.content;
    assert.match(
      html,
      new RegExp(`<h1>Ступени зрелости: ${title}</h1>`, 'u'),
      `${path} identifies its PDLC stage`,
    );
    assert.match(
      html,
      new RegExp(`Этап ${number} · PDLC`, 'u'),
      `${path} identifies its position in the PDLC route`,
    );

    const levels = [...html.matchAll(/<section class="maturity-pair"[^>]*>([^]*?)<\/section>/gu)];
    assert.equal(levels.length, 3, `${path} has three cumulative levels`);
    levels.forEach(([, level], index) => {
      assert.ok(level, `${path} level ${index + 1} has rendered content`);
      assert.match(
        level,
        new RegExp(`<h3 id="level-${index + 1}">Ступень ${index + 1} · [^<]+</h3>`, 'u'),
      );
      const textOf = (content: string | undefined): string =>
        (content ?? '').replace(/<[^>]+>/gu, '').trim();
      for (const [section, heading] of [
        ['maturity-practice', `Уровень ${index + 1}`],
        ['maturity-ai', `Уровень ${index + 1}-ИИ`],
      ] as const) {
        const article: string | undefined = level.match(
          new RegExp(`<article class="${section}">([^]*?)<\\/article>`, 'u'),
        )?.[1];
        assert.ok(article, `${path} level ${index + 1} includes ${section}`);
        assert.match(article, new RegExp(`<h4>${heading}(?:[^<]*)</h4>`, 'u'));
        assert.ok(
          textOf(article.match(/<p>([^]*?)<\/p>/u)?.[1]).length >= 35,
          `${path} level ${index + 1} has a concrete ${section} practice`,
        );
      }
      const check = level.match(/<p class="maturity-check">([^]*?)<\/p>/u)?.[1];
      assert.ok(textOf(check).length >= 35, `${path} level ${index + 1} has a human check`);
      assert.equal(
        level.match(/class="maturity-check"/gu)?.length,
        1,
        `${path} level ${index + 1} presents one shared human check`,
      );
      const next = textOf(
        level.match(
          /<p class="maturity-next"><strong>Следующий шаг\.<\/strong> ([^]*?)<\/p>/u,
        )?.[1],
      );
      assert.ok(next.length >= 25, `${path} level ${index + 1} has a concrete next action`);
    });

    assert.match(
      html,
      /<a href="\.\/guides\/index\.html#maturity-levels">/u,
      `${path} links to accepted analysis levels`,
    );
    assert.match(
      html,
      /<nav class="stage-maturity__next"[^>]*><a href="\.\/#sdlc">← Карта PDLC<\/a>/u,
      `${path} has a return link to the PDLC map`,
    );
  }

  const implementation = plan.find(
    (entry) => entry.path === 'implementation-maturity-map.html' && 'content' in entry,
  );
  assert.ok(implementation && 'content' in implementation);
  assert.match(
    implementation.content,
    /<a href="\.\/guides\/d1-delivery\.html">Перейти к практикуму разработки/u,
  );
});

await test('the PDLC map opens each maturity map and keeps the existing course routes', async () => {
  const landing = await readFile(resolve(siteSource, 'index.html'), 'utf8');
  const guideHome = await readFile(resolve(siteSource, 'guides/index.html'), 'utf8');

  for (const path of maturityPages) {
    assert.ok(landing.includes(`href="./${path}"`), `landing links to ${path}`);
  }

  assert.match(landing, /href="\.\/guides\/index\.html#maturity-levels"/u);
  assert.match(landing, /href="\.\/guides\/index\.html"/u);
  assert.match(landing, /href="\.\/guides\/d1-delivery\.html"/u);
  assert.match(guideHome, /id="maturity-levels"/u);
});

await test('maturity maps retain working shared navigation in both course build modes', async () => {
  const original = process.env.COURSE_NAV;
  try {
    for (const mode of ['public', 'customdev'] as const) {
      process.env.COURSE_NAV = mode;
      const plan = await planLearningSite();
      const map = plan.find(
        (entry) => entry.path === 'architecture-maturity-map.html' && 'content' in entry,
      );
      assert.ok(map && 'content' in map);
      const stylesheetHome = './';
      const mapHome = mode === 'public' ? './' : './../';
      assert.match(map.content, /data-global-nav/u, `${mode} map includes shared navigation`);
      assert.ok(
        map.content.includes(`href="${stylesheetHome}site-nav.css"`),
        `${mode} navigation stylesheet resolves from the map route`,
      );
      assert.ok(
        map.content.includes(`href="${stylesheetHome}atmosphere.css"`),
        `${mode} page stylesheet resolves from the map route`,
      );
      assert.ok(
        map.content.includes(`data-nav-item="home" href="${mapHome}#sdlc"`),
        `${mode} navigation returns to the appropriate PDLC map`,
      );
      assert.ok(
        map.content.includes(`data-nav-item="help" href="${mapHome}#help"`),
        `${mode} navigation opens help from the appropriate site root`,
      );
    }
  } finally {
    if (original === undefined) delete process.env.COURSE_NAV;
    else process.env.COURSE_NAV = original;
  }
});
