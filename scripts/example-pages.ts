import { Marked, Renderer } from 'marked';

import { escapeHtml, renderSiteNavigation } from './site-navigation-contract.ts';

/** A browser opens a bare .md without a charset and shows mojibake, so every example file gets a readable page next to it. */
/** An intent header is one field per line; marked would merge the lines into one paragraph, so each field line ending before the next field gets a hard break. */
const INTENT_HEADER_BREAK =
  /^((?:Инициатор|Владелец решения|Помощник \(аналитик\)|Состояние|Источник|Дата|Принятие):[^\n]*?)[ ]*\n(?=(?:Инициатор|Владелец решения|Помощник \(аналитик\)|Состояние|Источник|Дата|Принятие):)/gmu;

/** The line under the title of each example page: what the file is and which course step uses it (TASK-904). */
export const EXAMPLE_CAPTIONS: Readonly<Record<string, string>> = {
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

export const examplePagePath = (markdownPath: string): string =>
  markdownPath.replace(/\.md$/u, '.html');

const relativeMarkdown = /^(?![a-z][a-z0-9+.-]*:|\/|#)([^?#]*\.md)(#.*)?$/iu;
const defaultRenderer = new Renderer();

/** markdownPath is relative to guides/ and selects the page caption and table layout. */
export const renderExamplePage = (
  markdown: string,
  markdownPath: string,
  guideRoot: string,
  caption = EXAMPLE_CAPTIONS[markdownPath] ?? '',
): string => {
  const markdownName = markdownPath.split('/').at(-1)!;
  let title = '';
  let sectionTitle = '';
  let diagrams = 0;
  const base = markdownName.replace(/\.md$/iu, '');
  const parser = new Marked({
    gfm: true,
    renderer: {
      heading({ depth, tokens, text }) {
        if (depth === 1 && !title) title = text;
        sectionTitle = text;
        return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
      table(token) {
        if (!markdownPath.startsWith('examples/intent-plan/')) return false;
        const label = escapeHtml(sectionTitle || 'Таблица');
        const table = defaultRenderer.table.call(this, token);
        return `<div class="intent-plan-table-scroll" role="region" aria-label="${label}: прокрутка по горизонтали" tabindex="0">\n${table}</div>\n`;
      },
      // A mermaid block shows its pre-rendered SVG (<name>.mermaid-N.svg next to the file); the source stays readable under a disclosure.
      code({ text, lang }) {
        if (lang !== 'mermaid') return false;
        diagrams += 1;
        const svg = escapeHtml(`${base}.mermaid-${diagrams}.svg`);
        return `<figure class="meta-diagram" tabindex="0" aria-label="Схема с прокруткой при узком окне"><img src="${svg}" alt="Схема из блока mermaid файла ${escapeHtml(markdownName)}; исходный текст — ниже"></figure>\n<details class="meta-diagram__source"><summary>Исходный текст схемы (Mermaid)</summary><pre><code>${escapeHtml(text)}\n</code></pre></details>\n`;
      },
      // A task item keeps its state checkbox inside the same label as the text: the disabled control then has an accessible name.
      listitem({ tokens, task }) {
        const inner = this.parser.parse(tokens);
        return task ? `<li><label>${inner}</label></li>\n` : `<li>${inner}</li>\n`;
      },
      // The fictional task stays code in the downloadable file (no broken link); the page shows the bare id.
      codespan({ text }) {
        return text === '[PILOT-001](https://jira.example.invalid/browse/PILOT-001)'
          ? 'PILOT-001'
          : false;
      },
      link({ href, tokens }) {
        const match = relativeMarkdown.exec(href);
        const target = match ? `${match[1]!.replace(/\.md$/iu, '.html')}${match[2] ?? ''}` : href;
        if (href === 'https://jira.example.invalid/browse/PILOT-001')
          return this.parser.parseInline(tokens);
        return `<a href="${escapeHtml(target)}">${this.parser.parseInline(tokens)}</a>`;
      },
    },
  });
  const body = parser
    .parse(markdown.replace(INTENT_HEADER_BREAK, '$1  \n'), { async: false })
    .replace(/<pre>/gu, '<pre tabindex="0">');
  const name = escapeHtml(markdownName);
  const h1 = /<h1\b[^>]*>[\s\S]*?<\/h1>/u.exec(body)?.[0];
  let article = h1 ? body.replace(h1, '') : body;
  if (markdownPath === 'examples/intent-plan/weak-intent.md') {
    const [intro, ...sections] = article.split(/(?=<h2>)/u);
    article = `${intro}<div class="intent-summary-sections">${sections.map((section) => `<section>${section}</section>`).join('')}</div>`;
  }
  const download = `<a class="meta-download" href="${name}" download aria-label="Скачать .md (${name})" title="Скачать ${name}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/></svg>Скачать .md</a>`;
  return `<!doctype html>
<!-- Generated from ${name} by scripts/example-pages.ts. -->
<html lang="ru" data-atmos data-section="analysis">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title || markdownName)} · Пример · AI PDLC Learning</title>
  <link rel="stylesheet" data-site-nav-styles href="../site-nav.css">
  <link rel="stylesheet" data-atmos-styles href="../atmosphere.css">
  <link rel="stylesheet" href="${guideRoot}metarepository.css">
</head>
<body>
  <a class="skip-link" href="#main-content">К основному содержанию</a>
  ${renderSiteNavigation({ section: 'sdlc' })}
  <div class="page-shell">
  <main id="main-content" class="meta-shell" tabindex="-1">
    <article class="meta-content meta-content--example">
${h1 ? `<div class="meta-title">${h1}<nav class="meta-tools" aria-label="Действия со страницей">${download}</nav></div>` : `<nav class="meta-tools" aria-label="Действия со страницей">${download}</nav>`}
    <p class="meta-note">${escapeHtml(caption)}</p>
${article}
    </article>
    <footer class="meta-footer"><a href="${guideRoot}index.html">← К учебному маршруту</a></footer>
  </main>
  </div>
</body>
</html>
`;
};
