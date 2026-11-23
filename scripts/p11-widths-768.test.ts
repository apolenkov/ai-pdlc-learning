import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';

// P11-768: 768px sits between the phone and desktop layouts, where these blocks broke words between
// letters. The tests pin the layout rules that keep a word whole at 768 and check the width budget
// against the container widths measured in headless Chrome (768x1024 window, 20.10.2026).
// The live word-level scan of all 11 course pages is recorded in pack14/REPORT-W768.md.
const pages = new URL('../docs/pages/sdlc-development/', import.meta.url);
const read = (name: string): Promise<string> => readFile(new URL(name, pages), 'utf8');

const plain = (html: string): string =>
  html
    .replace(/<[^>]*>/gu, '')
    .replace(/&nbsp;|\\u00a0/gu, ' ')
    .replace(/&laquo;/gu, '«')
    .replace(/&raquo;/gu, '»')
    .trim();

/** Cyrillic advance in em at the page font: a letter or a digit 0.55, narrow punctuation 0.28. */
const NARROW = /[\s.,;:·\-–—()«»"'/!?]/u;
const estimate = (text: string, size: number): number =>
  [...text].reduce((sum, char) => sum + (NARROW.test(char) ? 0.28 : 0.55), 0) * size;
const longestWord = (text: string, size: number, breaks = /\s+/u): number =>
  Math.max(
    0,
    ...plain(text)
      .split(breaks)
      .filter(Boolean)
      .map((word) => estimate(word, size)),
  );

const escape = (selector: string): string => selector.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const rule = (source: string, selector: string): string =>
  source.match(new RegExp(`^\\s*${escape(selector)} \\{([^}]*)\\}`, 'mu'))?.[1] ?? '';
const media = (source: string, query: string): string => {
  const start = source.indexOf(`@media (${query}) {`);
  if (start < 0) return '';
  let depth = 0;
  for (let index = source.indexOf('{', start); index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(source.indexOf('{', start) + 1, index);
    }
  }
  return '';
};

/** The columns of a course figure table: the longest unbreakable word in each column. */
const tableColumns = (source: string, caption: string, count = 3, breaks = /\s+/u): number[] => {
  const html = source.replace(/\\u00a0/gu, ' ').replace(/&nbsp;/gu, ' ');
  const captionAt = html.indexOf(caption);
  assert.ok(captionAt > 0, `${caption} is in the course sources`);
  const start = html.lastIndexOf('<table class="course-figure__table">', captionAt);
  const end = html.indexOf('</table>', captionAt);
  assert.ok(start >= 0 && end > start, `${caption}: the table markup is found`);
  const columns: number[][] = Array.from({ length: count }, () => []);
  for (const row of html.slice(start, end).matchAll(/<tr>([\s\S]*?)<\/tr>/gu)) {
    const cells = [...(row[1] ?? '').matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gu)];
    if (cells.length !== columns.length) continue;
    cells.forEach(([, cell], index) => columns[index]?.push(longestWord(cell ?? '', 15, breaks)));
  }
  return columns.map((column) => Math.max(...column));
};

const guideCss = await read('guides/learning-enhancements/06-course-figures.css');
const guideReview = await read('guides/content/stage-3-star-review.ts');
const guideTeam = await read('guides/content/stage-4-team-step-timeline.ts');
const guideStandard = await read('guides/content/stage-sdd-steps-standard.ts');
const deck = await read('analytics-process-sdd.html');

await test('a course table wraps its words and scrolls instead of squeezing a column at 720-1040', () => {
  assert.match(
    rule(guideCss, '.course-figure__table th, .course-figure__table td'),
    /overflow-wrap: normal/u,
    'a table cell must not cut a word between letters',
  );
  const tablet = media(guideCss, 'min-width: 720px) and (max-width: 1040px');
  assert.match(
    tablet,
    /\.course-figure__table \{ display: block; max-width: 100%; overflow-x: auto; \}/u,
    'a table wider than the figure scrolls inside it',
  );
  assert.match(
    tablet,
    /\.course-figure__table tbody th\[scope="row"\] \{ white-space: normal; \}/u,
    'the row header may wrap, otherwise it squeezes the other columns',
  );
});

await test('the two wide course tables need less than the figure width at 768', () => {
  // The figure content is 554px wide in a 768px window (measured in headless Chrome), and every
  // column keeps 12px of padding on each side: 3 columns x 24px = 72px.
  const figure = 554;
  const padding = 3 * 24;
  for (const [source, caption] of [
    [guideReview, 'Замысел 2 · замечание модели'],
    [guideStandard, 'Что задаёт стандарт и где это в курсе'],
  ] as const) {
    const columns = tableColumns(source, caption);
    assert.equal(columns.length, 3, caption);
    const needed = columns.reduce((sum, width) => sum + width, padding);
    assert.ok(needed <= figure, `${caption}: ${Math.round(needed)}px > ${figure}px`);
  }
});

await test('the four-column team table keeps tight cells at 720-1040 so it does not scroll sideways', () => {
  // In the 720-1040 band the cells keep 6px on each side, so a table whose longest words fit the
  // figure content box never scrolls. Measured in headless Chrome: the content box is 554px at 768
  // and 574px at 720, the table needed 587px with 12px cells and 539px with 6px cells.
  assert.match(
    media(guideCss, 'min-width: 720px) and (max-width: 1040px'),
    /\.course-figure__table th, \.course-figure__table td \{ padding-inline: 6px; \}/u,
    'cells in the tablet band are tight enough for a four-column table',
  );
  const columns = tableColumns(guideTeam, 'Кто ведёт каждый этап', 4, /[\s-]+/u);
  assert.equal(columns.length, 4, 'the team table has four columns');
  assert.ok(columns.every((width) => width > 0 && width < 554 / 2));
});

await test('the analytics deck gives the seven stages two rows of readable width at 768', () => {
  const tablet = media(deck, 'max-width: 1023px');
  assert.match(tablet, /\.local-flow \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); \}/u);
  assert.match(tablet, /\.level-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/u);
  assert.match(
    tablet,
    /\.process-matrix-head, \.process-matrix-row \{ grid-template-columns: minmax\(7\.5rem, \.8fr\)/u,
    'the layer label column is wide enough for «спецификация»',
  );
  assert.match(
    tablet,
    /ga[p]*: var\(--space-1\); \}/u,
    'the matrix columns give back the gap width',
  );
  assert.match(
    tablet,
    /\.process-tile, \.process-layer-label \{ padding: var\(--space-2\) var\(--space-1\); \}/u,
    'the tiles spend the horizontal padding on their text',
  );
  const band = media(deck, 'min-width: 1024px) and (max-width: 1180px');
  assert.match(band, /\.local-flow \.stage \{ padding-inline: var\(--space-2\); \}/u);
});

await test('the analytics stage words and the layer label fit their boxes at 768', () => {
  // A stage is 153.4px wide in a 768px window, minus 8px padding and 1px border on each side.
  const stage = 153.4 - 2 * 8 - 2;
  for (const [, text] of deck.matchAll(/<span class="stage-label">([^<]*)<\/span>/gu))
    assert.ok(estimate(text ?? '', 12) <= stage, `stage word ${text ?? ''}`);
  // The layer column starts at 7.5rem = 120px, minus 4px padding on each side.
  const label = 120 - 2 * 4;
  assert.ok(longestWord('02 · спецификация', 12.8) <= label);
});

await test('the scales page formerly checked at 768 px is absent from the source tree', async () => {
  await assert.rejects(access(new URL('environment-scales.html', pages)), { code: 'ENOENT' });
});
