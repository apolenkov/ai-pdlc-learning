import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { test } from 'node:test';

import { buildLearningSite } from './build-learning-pages.ts';
import { EXAMPLE_CAPTIONS, examplePagePath, renderExamplePage } from './example-pages.ts';
import { EXAMPLE_MARKDOWN, guideContent } from './guide-content.ts';
import { renderGuide } from './learner-guide-test-support.ts';

await test('an example page is UTF-8 HTML with a download link and Markdown links turned into page links', () => {
  const html = renderExamplePage(
    '# Заголовок\n\nСм. [образец](../intents/a.md#x) и [сайт](https://example.com/a.md).\n',
    'a.md',
    '../../',
    'Подпись «примера» & ссылка',
  );
  assert.match(html, /<meta charset="utf-8">/u);
  assert.match(html, /<h1>Заголовок<\/h1>/u);
  assert.match(html, /href="\.\.\/intents\/a\.html#x"/u);
  assert.match(html, /href="https:\/\/example\.com\/a\.md"/u);
  assert.match(
    html,
    /<a class="meta-download" href="a\.md" download aria-label="Скачать \.md \(a\.md\)"/u,
  );
  // TASK-904: the download names itself on screen, and the line under the title is the page's own caption.
  assert.match(html, /<\/svg>Скачать \.md<\/a>/u);
  assert.match(html, /<p class="meta-note">Подпись «примера» &amp; ссылка<\/p>/u);
  assert.doesNotMatch(html, /Редактировать файл — в VS Code/u);
  assert.equal(examplePagePath('examples/x/a.md'), 'examples/x/a.html');
});

await test('the intent example shows its fictional task link without making the reserved address clickable', async () => {
  const markdown = await readFile(
    'docs/pages/sdlc-development/guides/examples/intent-markdown/intent.md',
    'utf8',
  );
  const html = renderExamplePage(markdown, 'intent.md', '../../', 'Подпись');
  assert.match(
    markdown,
    /^`\[PILOT-001\]\(https:\/\/jira\.example\.invalid\/browse\/PILOT-001\)`$/mu,
  );
  assert.match(html, /<p>PILOT-001<\/p>/u, 'the example keeps the fictional task id visible');
  assert.doesNotMatch(
    html,
    /href="https:\/\/jira\.example\.invalid/u,
    'the intent example page has no clickable link to the training placeholder host',
  );
});

const walk = async (dir: string): Promise<string[]> =>
  (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map(async (entry) =>
        entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
      ),
    )
  ).flat();

// Approved page captions (TASK-904, examples-5..15).
const expectedCaptions: Readonly<Record<string, string>> = {
  'examples/credit-calculator-intents/README.md':
    'Материалы учебного кредитного калькулятора: обращение, шаблоны и образцы.',
  'examples/credit-calculator-intents/intent-2-credit-limit.md':
    'Замысел 2: вход шага 5 «Контекст продукта» курса анализа.',
  'examples/credit-calculator-intents/intent-template.md':
    'Короткий шаблон замысла для курса анализа: подготовка «Зачем меняем процесс», шаг «Составьте замысел изменения».',
  'examples/credit-calculator-intents/intents/clear-calculation-result.md':
    'Разобранный замысел курса анализа: шаги 1–3 уточняют его по частям.',
  'examples/credit-calculator-intents/request-and-answers.md':
    'Учебное обращение и ответы инициатора: исходный материал курса «Намерение и план» и курса анализа.',
  'examples/intent-markdown/intent.md':
    'Пример файла intent.md к подготовке «Markdown, Git, GitLab».',
  'examples/intent-plan/intent-template.md': 'Шаблон записи намерения курса «Намерение и план».',
  'examples/intent-plan/strong-intent.md':
    'Сильный образец записи намерения курса «Намерение и план».',
  'examples/intent-plan/weak-complete-intent.md':
    'Слабый полный пример к шагу 4 «Проверка и одобрение» курса «Намерение и план»: так не пишем.',
  'examples/intent-plan/weak-intent.md': 'Слабый образец записи намерения: так не пишем.',
  'examples/legacy-calculator/observed-2026.md':
    'Наблюдения аналитика к шагу 6б «Описываем действующий продукт» курса анализа.',
};

await test('the built site has a page for every example file and no link opens a bare .md', async () => {
  const out = await mkdtemp(join(tmpdir(), 'example-pages-'));
  try {
    await buildLearningSite(out);
    // Every published example has its own caption, and no caption is left for a removed file (TASK-904).
    assert.deepEqual(Object.keys(EXAMPLE_CAPTIONS).sort(), [...EXAMPLE_MARKDOWN].sort());
    assert.deepEqual(Object.keys(expectedCaptions).sort(), [...EXAMPLE_MARKDOWN].sort());
    for (const [name, caption] of Object.entries(expectedCaptions)) {
      const page = await readFile(resolve(out, 'guides', examplePagePath(name)), 'utf8');
      if (name === 'examples/intent-plan/weak-complete-intent.md') {
        assert.equal(page.match(/так не пишем/giu)?.length, 1);
        assert.equal(page.match(/class="meta-note"/gu)?.length, 1);
        assert.doesNotMatch(page, /<h1>[^<]*учебный пример/iu);
      }
      assert.match(page, /<meta charset="utf-8">/u, name);
      assert.ok(
        page.includes(`<p class="meta-note">${caption}</p>`),
        `${name}: the page shows its caption`,
      );
    }
    const bare: string[] = [];
    for (const file of (await walk(out)).filter((item) => item.endsWith('.html'))) {
      const html = await readFile(file, 'utf8');
      for (const [tag, href = ''] of html.matchAll(
        /<a\b[^>]*\bhref="([^"#?]*\.md)(?:[#?][^"]*)?"[^>]*>/giu,
      )) {
        if (/^[a-z][a-z0-9+.-]*:/iu.test(href) || /\bdownload\b/u.test(tag)) continue;
        bare.push(`${relative(out, file)} → ${href}`);
      }
    }
    assert.deepEqual(
      bare,
      [],
      'every link to an example opens its HTML page; the .md file is offered only as a download',
    );
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

await test('intent header fields render on separate lines', () => {
  const html = renderExamplePage(
    '# Замысел\n\nИнициатор: А\nВладелец решения: Б\nПомощник (аналитик): Г\nСостояние: черновик\nИсточник: В\nпродолжение\n\n## Проблема\n',
    'a.md',
    '../',
    'Подпись',
  );
  assert.match(
    html,
    /Инициатор: А<br>\s*Владелец решения: Б<br>\s*Помощник \(аналитик\): Г<br>\s*Состояние: черновик<br>\s*Источник: В\s*продолжение/u,
  );
});

await test('a mermaid block shows its pre-rendered diagram, the source stays under a disclosure', async () => {
  const html = renderExamplePage(
    '# A\n\n```mermaid\nflowchart LR\n  A --> B\n```\n',
    'a.md',
    '../',
    'Подпись',
  );
  assert.match(html, /<figure(?=[^>]*tabindex="0")[^>]*><img src="a\.mermaid-1\.svg" alt="[^"]+"/u);
  assert.match(
    html,
    /<details class="meta-diagram__source"><summary>Исходный текст схемы \(Mermaid\)<\/summary><pre tabindex="0"><code>flowchart LR\n {2}A --&gt; B\n<\/code><\/pre><\/details>/u,
  );
  assert.doesNotMatch(html, /language-mermaid/u);
  // Every mermaid block of a published example has its SVG in the same folder and in the copied assets (013, 15.10).
  const { PUBLIC_GUIDE_BINARY_ASSETS } = await import('./guide-content.ts');
  for (const name of EXAMPLE_MARKDOWN) {
    const blocks =
      (await readFile(resolve('docs/pages/sdlc-development/guides', name), 'utf8')).match(
        /^```mermaid$/gmu,
      ) ?? [];
    blocks.forEach((_, index) => {
      const svg = name.replace(/\.md$/u, `.mermaid-${index + 1}.svg`);
      assert.ok(PUBLIC_GUIDE_BINARY_ASSETS.includes(svg), svg);
    });
  }
});

/**
 * Example Markdown files that are deliberately not offered for download.
 * The repository README explains how the example set is built, and the short weak intent is a
 * fixture of the course rules: the guides show the weak → strong change inline instead.
 * Any other example file without a «Скачать .md» link fails the test below.
 */
const UNLINKED_EXAMPLE_MARKDOWN = [
  'examples/intent-plan/weak-intent.md',
  'examples/credit-calculator-intents/README.md',
];

await test('every «Скачать .md» link of the course opens an example file in the built site', async () => {
  const out = await mkdtemp(join(tmpdir(), 'download-links-'));
  try {
    await buildLearningSite(out);
    const guides = Object.keys(guideContent.stages);
    const found: { guide: string; href: string }[] = [];
    for (const id of guides) {
      const html = await renderGuide(id);
      // Every analysis step that shows a sample file offers the Markdown source as a download.
      for (const [anchor, href = '', content = ''] of html.matchAll(
        /<a\b[^>]*\bhref="(examples\/[^"]+\.md)"[^>]*\bdownload\b[^>]*>([\s\S]*?)<\/a>/gu,
      )) {
        const label = content.trim();
        assert.doesNotMatch(label, /[<>]/u);
        const accessibleName = anchor.match(/aria-label="([^"]*)"/u)?.[1] ?? label;
        assert.equal(accessibleName, label, href);
        if (anchor.includes('step-link--download'))
          assert.match(label, /^Скачать \.md · \S/u, `visible material name for ${href}`);
        assert.match(
          label,
          /^Скачать \.md(?: · .+)?$/u,
          `${id}: the download link ${href} is labelled «${label}», expected «Скачать .md»`,
        );
        found.push({ guide: id, href });
      }
      // Every readable example page also offers its Markdown source for download.
      for (const [, href = ''] of html.matchAll(/<a\b[^>]*\bhref="(examples\/[^"]+\.html)"/gu)) {
        if (href.endsWith('/confluence-page.html')) continue;
        const markdown = href.replace(/\.html$/u, '.md');
        assert.ok(
          html.includes(`href="${markdown}" download`),
          `${id}: the example ${href} needs its «Скачать .md» link`,
        );
      }
      // One step offers each sample file once: a download added beside a links entry that already
      // publishes the same file repeats the same action, and the reader cannot tell them apart.
      for (const step of html.split(/<li id="step-/u).slice(1)) {
        const downloads = [
          ...step.matchAll(/<a\b[^>]*\bhref="(examples\/[^"]+\.md)"[^>]*\bdownload\b[^>]*>/gu),
        ].map((match) => match[1] ?? '');
        assert.deepEqual(
          downloads,
          [...new Set(downloads)],
          `${id}: a step repeats the download ${downloads.find((href, index) => downloads.indexOf(href) !== index)}`,
        );
      }
    }
    assert.ok(found.length >= 20, `expected the course download links, found ${found.length}`);
    for (const { guide, href } of found) {
      assert.ok(EXAMPLE_MARKDOWN.includes(href), `${guide}: ${href} is not a published example`);
      await readFile(resolve(out, 'guides', href));
    }
    // New sample files land in guides/examples/: until a guide offers them, the course cannot
    // show its own sample, so the deliberate exceptions stay an explicit, checked list.
    const linked = new Set(found.map(({ href }) => href));
    assert.deepEqual(
      EXAMPLE_MARKDOWN.filter((name) => !linked.has(name)),
      UNLINKED_EXAMPLE_MARKDOWN,
      'a new example Markdown file needs its «Скачать .md» link on the page that shows it',
    );
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
