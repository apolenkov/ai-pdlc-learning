import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Marked } from 'marked';

import { buildRoute, routeLabel } from '../docs/pages/sdlc-development/route-strip/model.ts';

import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };

import { escapeHtml, renderSiteNavigation } from './site-navigation-contract.ts';

const route = buildRoute(courseNames, {});
const index = route.findIndex((step) => step.id === 'metarepo');
const guide = courseNames.guides.metarepo;
const title = routeLabel({ ...route[index]!, title: guide.title });
const adjacent = (offset: number, rel: string): string => {
  const step = route[index + offset]!;
  return `<a rel="${rel}" href="${step.href}">${offset < 0 ? '← ' : ''}${escapeHtml(routeLabel(step, true))}${offset > 0 ? ' →' : ''}</a>`;
};
const routeNavigation = `<nav class="meta-route" aria-label="Место в учебном маршруте">${adjacent(-1, 'prev')}<a href="index.html#course-map">Карта курса</a>${adjacent(1, 'next')}</nav>`;
const icon = (path: string): string =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
// The document tools sit beside the route at the end of the guide.
const pageTools = `<nav class="meta-tools" aria-label="Действия со страницей"><a href="metarepository.md" download aria-label="Скачать Markdown" title="Скачать Markdown">${icon('<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/>')}</a><button type="button" onclick="window.print()" aria-label="Печать / PDF" title="Печать / PDF">${icon('<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>')}</button></nav>`;

const printScript = `<script>
    const openedForPrint = new Set();
    window.addEventListener('beforeprint', () => {
      document.querySelectorAll('details:not([open])').forEach((item) => { openedForPrint.add(item); item.open = true; });
    });
    window.addEventListener('afterprint', () => {
      openedForPrint.forEach((item) => { item.open = false; }); openedForPrint.clear();
    });
  </script>`;

const addCopyButtons = (content: string): string =>
  content.replace(
    /<pre>([\s\S]*?)<\/pre>/gu,
    (_pre, code: string) =>
      `<div class="terminal-copy"><div class="example-toolbar"><button type="button" class="copy-example">Скопировать</button></div><pre tabindex="0">${code}</pre><span class="copy-status" role="status" aria-live="polite"></span></div>`,
  );

/** The tracked Markdown is the only content source; raw HTML diagrams are intentional. */
export const renderMetarepositoryGuide = (markdown: string): string => {
  const headings: { id: string; html: string }[] = [];
  const slugs = new Map<string, number>();
  let titleCount = 0;
  const parser = new Marked({
    gfm: true,
    renderer: {
      table({ header, rows }) {
        const headings = header.map((cell) => this.parser.parseInline(cell.tokens));
        const labels = header.map((cell) =>
          cell.text.replace(/<[^>]*>/gu, '').replace(/[*_`]/gu, ''),
        );
        return `<table class="meta-table"><thead><tr>${headings.map((heading) => `<th scope="col">${heading}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell, index) => `<td data-label="${escapeHtml(labels[index] ?? '')}">${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`).join('')}</tbody></table>\n`;
      },
      link({ href }) {
        const target = Object.values(courseNames.guides).find((item) => item.file === href);
        // Short menu names («Markdown, Git, GitLab») read better inside sentences than full titles.
        if (target)
          return `<a href="${escapeHtml(href)}">${escapeHtml((target as { short?: string }).short ?? target.title)}</a>`;
        return false;
      },
      heading({ depth, text, tokens }) {
        const explicitId = /\s+\{#([a-z][a-z0-9-]*)\}\s*$/iu.exec(text)?.[1];
        const label = text.replace(/\s+\{#[a-z][a-z0-9-]*\}\s*$/iu, '');
        const base =
          explicitId ??
          (label
            .normalize('NFKC')
            .toLowerCase()
            .replace(/<[^>]*>/gu, '')
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .replace(/^-|-$/gu, '') ||
            'section');
        const occurrence = (slugs.get(base) ?? 0) + 1;
        slugs.set(base, occurrence);
        const id = occurrence === 1 ? base : `${base}-${occurrence}`;
        const html = this.parser.parseInline(tokens).replace(/\s+\{#[a-z][a-z0-9-]*\}\s*$/iu, '');
        if (depth === 1) titleCount += 1;
        if (depth === 2) headings.push({ id, html });
        const number = depth === 2 && /^Шаг\s+(\d+)\./u.exec(label)?.[1];
        const heading = number ? `<span id="step-${number.padStart(2, '0')}">${html}</span>` : html;
        return `<h${depth} id="${escapeHtml(id)}">${depth === 1 ? escapeHtml(title) : heading}</h${depth}>\n`;
      },
    },
  });
  const content = parser.parse(markdown, { async: false });
  if (titleCount !== 1 || (content.match(/<h1\b/gu) ?? []).length !== 1) {
    throw new Error('Metarepository guide must contain exactly one Markdown H1');
  }
  if (headings.length === 0)
    throw new Error('Metarepository guide requires H2 sections for its contents');
  const accessibleContent = addCopyButtons(content);
  const h1 = /<h1\b[^>]*>[\s\S]*?<\/h1>/u.exec(accessibleContent)?.[0];
  if (!h1) throw new Error('Metarepository guide must render an H1');
  const firstSection = accessibleContent.indexOf('<h2');
  const intro = accessibleContent.slice(0, firstSection).replace(h1, '');
  const summary = intro.match(/<p>[\s\S]*?<\/p>/u)?.[0] ?? '';
  const start = headings.find(({ id }) => id === 'find-product') ?? headings[0]!;
  const navigation = renderSiteNavigation({ section: 'sdlc' });
  return `<!doctype html>
<!-- Generated from metarepository.md by scripts/build-metarepository-guide.ts. -->
<html lang="ru" data-atmos data-section="analysis">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#f4f1e8">
  <meta name="description" content="${escapeHtml(guide.gain)}.">
  <title>${escapeHtml(title)} · AI PDLC Learning</title>
  <link rel="stylesheet" data-site-nav-styles href="../site-nav.css">
  <link rel="stylesheet" data-atmos-styles href="../atmosphere.css">
  <link rel="stylesheet" href="guide.css">
  <link rel="stylesheet" href="learning-enhancements.css">
  <link rel="stylesheet" href="metarepository.css">
</head>
<body data-stage="metarepo">
  <a class="skip-link" href="#main-content">К основному содержанию</a>
  ${navigation}
  <div class="page-shell">
  <header class="hero"><div>${h1}${summary}<a class="hero-start" href="#${escapeHtml(start.id)}">Начать ↓</a></div><aside class="proof"><span>Наблюдаемый результат</span><strong>${escapeHtml(guide.gain)}</strong></aside></header>
  <main id="main-content" class="meta-shell" tabindex="-1">
    <article id="metarepository-guide" class="meta-content">
<section class="lesson-goal" aria-label="Ролик подготовки"></section>
${intro.replace(summary, '')}
    <nav class="meta-toc" aria-label="Оглавление руководства">
      <p>В этом руководстве</p>
      <ol>${headings.map(({ id, html }) => `<li><a href="#${escapeHtml(id)}">${html}</a></li>`).join('')}</ol>
    </nav>
${accessibleContent.slice(firstSection)}
    </article>
    <footer class="meta-footer">${routeNavigation}${pageTools}</footer>
  </main>
  </div>
  <script defer src="guide-data.js"></script>
${printScript}
</body>
</html>
`;
};

/**
 * The tracked Markdown is split into `metarepository.md` and the ordered parts in
 * `metarepository/`; concatenated they are the single source of the guide text.
 */
export const readMetarepositoryMarkdown = async (guideDirectory: string): Promise<string> => {
  const main = await readFile(resolve(guideDirectory, 'metarepository.md'), 'utf8');
  const partsDirectory = resolve(guideDirectory, 'metarepository');
  const parts = (await readdir(partsDirectory)).filter((name) => name.endsWith('.md')).sort();
  const contents = await Promise.all(
    parts.map((name) => readFile(resolve(partsDirectory, name), 'utf8')),
  );
  return main + contents.join('');
};

/** Render the guide page from the tracked Markdown source; the page is build output, never a source file. */
export const readMetarepositoryGuide = async (guideDirectory: string): Promise<string> =>
  renderMetarepositoryGuide(await readMetarepositoryMarkdown(guideDirectory));
