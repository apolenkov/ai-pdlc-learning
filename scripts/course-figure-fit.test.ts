import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';

// SVG text never wraps, so every label of a course diagram must fit its card by its own geometry.
// Inter advance per glyph in em, measured on the built pages: letters 0.50-0.58, digits 0.6, spaces and punctuation 0.28.
const NARROW = /[\s.,;:·\-()«»"'/!?]/u;
const estimate = (text: string, size: number, em: { letter: number; digit: number }): number =>
  [...text].reduce(
    (sum, char) => sum + (NARROW.test(char) ? 0.28 : /\d/u.test(char) ? em.digit : em.letter),
    0,
  ) * size;
const EM = {
  regular: { letter: 0.55, digit: 0.6 },
  bold: { letter: 0.62, digit: 0.65 },
  mono: { letter: 0.62, digit: 0.62 },
};

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const attr = (tag: string, name: string): string | undefined =>
  new RegExp(`\\s${name}="([^"]*)"`, 'u').exec(tag)?.[1];
const plain = (html: string): string =>
  html
    .replace(/<[^>]*>/gu, '')
    .replace(/\\u00a0|&nbsp;/gu, ' ')
    .replace(/&amp;/gu, '&')
    .trim();

const fontSize = (wide: boolean, cls: string, style: string): number | undefined => {
  const inline = /font-size:\s*(\d+)px/u.exec(style)?.[1];
  if (inline) return Number(inline);
  if (!wide) return 16;
  if (/course-figure__title/u.test(cls)) return 16;
  return /course-figure__(?:small|quiet)/u.test(cls) ? 13 : undefined;
};

/** Labels whose estimated text sticks out of the smallest card that holds their start. */
export const findOverflows = (svg: string, wide: boolean): string[] => {
  const boxes: Box[] = [...svg.matchAll(/<rect\b[^>]*>/gu)].map(([tag]) => ({
    x: Number(attr(tag, 'x') ?? 0),
    y: Number(attr(tag, 'y') ?? 0),
    w: Number(attr(tag, 'width') ?? 0),
    h: Number(attr(tag, 'height') ?? 0),
  }));
  const found: string[] = [];
  for (const [, open, body] of svg.matchAll(/(<text\b[^>]*>)(.*?)<\/text>/gu)) {
    const cls = attr(open!, 'class') ?? '';
    const size = fontSize(wide, cls, attr(open!, 'style') ?? '');
    const x = Number(attr(open!, 'x'));
    const y = Number(attr(open!, 'y'));
    if (!size || Number.isNaN(x) || Number.isNaN(y) || /text-anchor/u.test(open!)) continue;
    const text = plain(body!);
    if (text.includes('${')) continue;
    const em = /course-figure__file/u.test(cls)
      ? EM.mono
      : /course-figure__title|arrow-label/u.test(cls)
        ? EM.bold
        : EM.regular;
    const card = boxes
      .filter((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h)
      .sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (card && x + estimate(text, size, em) > card.x + card.w) found.push(text);
  }
  return found;
};

const root = new URL('../docs/pages/sdlc-development/guides/', import.meta.url);
const sources = [
  ...(await readdir(new URL('content/', root))).map((name) => `content/${name}`),
  ...(await readdir(root)).filter((name) => name.endsWith('.html')),
];
const figures = async (): Promise<{ file: string; svg: string; wide: boolean }[]> => {
  const all: { file: string; svg: string; wide: boolean }[] = [];
  for (const file of sources) {
    const source = await readFile(new URL(file, root), 'utf8');
    for (const match of source.matchAll(/<svg\b[^>]*>.*?<\/svg>/gsu)) {
      const before = source.slice(0, match.index);
      const figure = before.lastIndexOf('<figure');
      const open = figure >= 0 && !before.slice(figure).includes('</figure>');
      all.push({
        file,
        svg: match[0],
        wide: open && /^<figure[^>]*course-figure--wide/u.test(before.slice(figure)),
      });
    }
  }
  return all;
};

await test('every label of a course diagram fits its card, so a neighbour never hides its end', async () => {
  const all = await figures();
  assert.ok(all.length > 40, 'the diagrams are found');
  const bad = all.flatMap(({ file, svg, wide }) =>
    findOverflows(svg, wide).map((text) => `${file}: ${text}`),
  );
  assert.deepEqual(bad, []);
});

await test('the check sees a label that is wider than its card', () => {
  const card = (width: number): string =>
    `<svg><g><rect x="464" y="20" width="${width}" height="130"/>` +
    '<text class="course-figure__small" x="476" y="100">пишет владелец продукта</text></g></svg>';
  assert.deepEqual(findOverflows(card(150), true), ['пишет владелец продукта']);
  assert.deepEqual(findOverflows(card(196), true), []);
  assert.deepEqual(findOverflows(card(196), false), ['пишет владелец продукта']);
});
