import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';

/** Player styles of the course lessons and the shared light-theme tokens they read. */
const PLAYER_CSS = 'docs/pages/sdlc-development/guides/assets/video/guide-video.css';
const GUIDE_CSS = 'docs/pages/sdlc-development/guides/guide.css';
const TOKENS_CSS = 'docs/pages/sdlc-development/site-nav.css';

/** Bodies of every rule whose selector list contains `selector`; enough to read the focus rules of the player CSS. */
const ruleBodies = (css: string, selector: string): string[] =>
  [...css.matchAll(/(^|\n)([^{}\n]+)\{([^}]*)\}/gu)]
    .filter((match) => match[2]!.split(',').some((part) => part.trim() === selector))
    .map((match) => match[3]!);

/** A light-theme colour token of the shared stylesheet; a token change has to answer to the ring checks. */
const tokenColour = (tokens: string, name: string): string => {
  const found = tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'iu'));
  assert.ok(found, `--${name} is defined in site-nav.css`);
  return found[1]!;
};

/** WCAG contrast of two #rrggbb colours; a focus indicator has to keep 3:1 against what it sits on. */
const contrastRatio = (a: string, b: string): number => {
  const luminance = (hex: string): number => {
    const channels = [1, 3, 5]
      .map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
      .map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
    return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
  };
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
};

const isClippingOverflow = /overflow(?:-[xy])?:\s*(?:hidden|clip|auto|scroll)/u;

await test('the film attribution summary keeps a whole focus ring of at least 3:1', async () => {
  const [css, guide, tokens] = await Promise.all([
    readFile(resolve(PLAYER_CSS), 'utf8'),
    readFile(resolve(GUIDE_CSS), 'utf8'),
    readFile(resolve(TOKENS_CSS), 'utf8'),
  ]);
  const summary = '.lesson-video__credit summary';
  assert.ok(
    ruleBodies(css, `${summary}:focus-visible`).some((body) =>
      /outline:\s*3px solid var\(--blue\)/u.test(body),
    ),
    'the keyboard focus ring of the summary is drawn',
  );
  // The ring sits outside the summary, so none of its ancestors may clip that place.
  for (const ancestor of ['.lesson-video__credit', '.lesson-video__stage', '.lesson-video__layout'])
    assert.ok(
      ruleBodies(css, ancestor).every((body) => !isClippingOverflow.test(body)),
      `${ancestor} leaves the ring of the summary unclipped`,
    );
  assert.ok(
    ruleBodies(guide, '.lesson-goal').every((body) => !/overflow/u.test(body)),
    '.lesson-goal leaves the ring of the summary unclipped',
  );
  const blue = tokenColour(tokens, 'customdev-blue');
  for (const background of ['customdev-paper-0', 'customdev-paper-1'])
    assert.ok(
      contrastRatio(blue, tokenColour(tokens, background)) >= 3,
      `the ring of the summary keeps 3:1 on ${background}`,
    );
});

await test('the chapter buttons keep the focus ring inside the scroll box and at 3:1 on its surfaces', async () => {
  const [css, tokens] = await Promise.all([
    readFile(resolve(PLAYER_CSS), 'utf8'),
    readFile(resolve(TOKENS_CSS), 'utf8'),
  ]);
  // The list scrolls, so a ring drawn outside a row is cut by the scroll box and dimmed by the fade mask.
  assert.ok(
    ruleBodies(css, '.lesson-video__chapters button:focus-visible').some(
      (body) =>
        /outline:\s*3px solid var\(--blue\)/u.test(body) && /outline-offset:\s*-3px/u.test(body),
    ),
    'the ring of a chapter button sits inside the row, where the scroll box cannot cut it',
  );
  assert.ok(
    ruleBodies(css, '.lesson-video__chapters:focus-within').some((body) =>
      /mask-image:\s*none/u.test(body),
    ),
    'the fade mask does not dim the ring while the keyboard is in the list',
  );
  // The scroll box clips at its 11px inner corners, so the first and the last row follow them and the inner ring is not nicked.
  for (const [corner, radii] of [
    ['.lesson-video__chapters li:first-child button', ['top-left', 'top-right']],
    ['.lesson-video__chapters li:last-child button', ['bottom-left', 'bottom-right']],
  ] as const)
    for (const side of radii)
      assert.ok(
        ruleBodies(css, corner).some((body) =>
          new RegExp(`border-${side}-radius:\\s*11px`, 'u').test(body),
        ),
        `${corner} follows the rounded clip of the list (${side})`,
      );
  const blue = tokenColour(tokens, 'customdev-blue');
  for (const surface of ['customdev-paper-1', 'customdev-green-soft'])
    assert.ok(
      contrastRatio(blue, tokenColour(tokens, surface)) >= 3,
      `the ring of a chapter button keeps 3:1 on ${surface}`,
    );
  assert.ok(
    ruleBodies(css, '.lesson-video__chapters').some((body) =>
      /background:\s*var\(--raised\)/u.test(body),
    ),
    'the rows keep the raised surface the ring contrast is measured on',
  );
});
