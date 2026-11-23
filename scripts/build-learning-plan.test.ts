import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';

import { planLearningSite } from './build-learning-pages.ts';

const plan = await planLearningSite();

await test('the site plan lists each output path once and needs no output directory', () => {
  const paths = plan.map((entry) => entry.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const required of [
    'index.html',
    'course-motion.js',
    'favicon.svg',
    'guides/metarepository.html',
  ])
    assert.ok(paths.includes(required), required);
});

await test('every copied entry points at an existing source and every written entry has content', async () => {
  for (const entry of plan) {
    if ('from' in entry) await access(entry.from);
    else assert.ok(entry.content.length > 0, entry.path);
  }
});

await test('planned pages carry the site chrome placed by the shared page transform', () => {
  const index = plan.find((entry) => entry.path === 'index.html');
  assert.ok(index && 'content' in index);
  assert.match(index.content, /<html[\s>]/u);
});

await test('preparation guide four ships from Markdown with adjacent steps and the old URL', () => {
  const page = (path: string): string => {
    const entry = plan.find((item) => item.path === path);
    assert.ok(entry && 'content' in entry, `published page: ${path}`);
    return entry.content;
  };
  const guide = page('guides/p4-metarepository.html');
  assert.match(guide, /<body data-stage="metarepo">/u);
  const hero = guide.match(/<header class="hero">([^]*?)<\/header>/u)![1]!;
  const start = hero.match(/<a class="hero-start" href="#([^"]+)">Начать ↓<\/a>/u)![1]!;
  assert.equal(start, 'find-product');
  assert.ok(guide.includes(`<h2 id="${start}">`));
  assert.match(hero, /class="proof"><span>Наблюдаемый результат<\/span><strong>[^<]+<\/strong>/u);
  assert.doesNotMatch(hero, /meta-tools| download|window\.print/u);
  assert.match(
    guide,
    /class="terminal-copy">[^]*?class="copy-example">Скопировать<\/button>[^]*?<pre tabindex="0"><code/u,
  );
  assert.match(guide, /rel="prev" href="p3-sdd.html"/u);
  assert.match(guide, /rel="next" href="s1-git.html"/u);
  assert.match(guide, /href="metarepository.md" download/u);
  assert.match(
    guide,
    /<section id="lesson-check"[^]*?<ul class="check">[^]*?<\/ul>[^]*?<\/section>/u,
  );
  // TASK-904: p1 and p2 lost their extra link past the next preparation; the course map and p3's footer lead here.
  for (const name of ['index', 'p3-sdd'])
    assert.match(page(`guides/${name}.html`), /href="p4-metarepository.html"/u);
  for (const name of ['p1-zachem', 'p2-git', 'p3-sdd'])
    assert.doesNotMatch(
      page(`guides/${name}.html`),
      /meta-preparation/u,
      `${name}: transitions live only in the footer, no separate preparation link above it`,
    );
  assert.match(
    page('guides/metarepository.html'),
    /location.replace\("p4-metarepository.html" \+ location.hash\)/u,
  );
});
