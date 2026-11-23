import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Design-token metrics of the core pages (TASK-568 P0): the numbers may only go down. Same file in customdev and in the course. */
export type CoreMetrics = Readonly<{
  rawColors: number;
  radiusOffScale: number;
  literalShadows: number;
  colorTokenDefs: number;
}>;

const COLOR = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})\b|\b(?:rgba?|hsla?)\([^)]*\)/giu;
const DEFINITION = /^\s*--[\w-]+\s*:/u;
const RADIUS = /border-radius\s*:\s*([^;}]+)/u;
const IN_SCALE = /^(?:0|4px|8px|12px|16px|999px|50%|inherit|var\(.*\))$/u;

const cssOf = (file: string, text: string): string =>
  file.endsWith('.html')
    ? [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gu)].map(([, css]) => css).join('\n')
    : text;

export const measure = (
  root: string,
  files: readonly string[],
): Readonly<Record<string, CoreMetrics>> =>
  Object.fromEntries(
    files.map((file) => {
      let rawColors = 0;
      let radiusOffScale = 0;
      let literalShadows = 0;
      let colorTokenDefs = 0;
      for (const raw of cssOf(file, readFileSync(resolve(root, file), 'utf8')).split('\n')) {
        if (/^\s*(?:--color-[\w-]+)\s*:/u.test(raw)) colorTokenDefs += 1;
        if (DEFINITION.test(raw)) continue;
        const line = raw.replace(/\/\*.*?\*\//gu, '');
        rawColors += line.match(COLOR)?.length ?? 0;
        const radius = RADIUS.exec(line)?.[1]?.trim();
        if (radius && !IN_SCALE.test(radius)) radiusOffScale += 1;
        const shadow = /box-shadow\s*:\s*([^;}]+)/u.exec(line)?.[1]?.trim();
        if (shadow && !shadow.startsWith('none') && !shadow.includes('var(--')) literalShadows += 1;
      }
      return [file, { rawColors, radiusOffScale, literalShadows, colorTokenDefs }];
    }),
  );

/** Custom properties of the first :root block, in order. */
export const rootTokens = (css: string): ReadonlyMap<string, string> => {
  const block = /:root\s*\{([\s\S]*?)\n\}/u.exec(css)?.[1] ?? '';
  const norm = (value: string): string =>
    value.replace(/"/gu, "'").replace(/\b0\./gu, '.').replace(/\s+/gu, ' ').trim();
  return new Map(
    [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/gu)].map(([, name, value]) => [
      name!,
      norm(value!),
    ]),
  );
};
