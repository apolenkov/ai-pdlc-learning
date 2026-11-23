import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const site = (path: string) =>
  readFile(new URL(`../docs/pages/sdlc-development/${path}`, import.meta.url), 'utf8');
const enhancements = (file: string) => site(`guides/learning-enhancements/${file}`);

/** Declarations of the rule whose selector list is exactly `selector`. */
const rule = (css: string, selector: string): string => {
  const found = [...css.replace(/\/\*[\s\S]*?\*\//gu, '').matchAll(/([^{}]+)\{([^{}]*)\}/gu)].find(
    ([, selectors]) => selectors!.trim() === selector,
  );
  assert.ok(found, `no rule ${selector}`);
  return found[2]!;
};

await test('both course maps explain the check mark beside a number with the strip’s own sign', async () => {
  const strip = await site('course-motion.css');
  const sign = /content:\s*"([^"]+)"/u.exec(
    rule(strip, '.course-route [data-selfchecked]::after'),
  )?.[1];
  assert.equal(sign, '✓');
  const css = await enhancements('08-course-map-and-rhythm.css');
  assert.match(
    rule(css, '.map-howto__key.is-selfchecked i::before'),
    new RegExp(`content:"${sign}"`, 'u'),
  );
  for (const page of ['guides/index.html', 'guides/intent.html']) {
    const legend = (await site(page)).match(/<p class="map-howto__legend">([\s\S]*?)<\/p>/u)?.[1];
    assert.ok(legend, page);
    assert.match(
      legend,
      /<span class="map-howto__key is-selfchecked"><i aria-hidden="true"><\/i>галочка — самопроверка пройдена<\/span>/u,
      page,
    );
  }
});

await test('the extra card on the course map is visibly secondary to the preparation guides', async () => {
  const css = await enhancements('08-course-map-and-rhythm.css');
  const extra = rule(css, '.course-map__step--extra');
  assert.match(extra, /border-style:dashed/u);
  assert.match(extra, /background:transparent/u);
  assert.match(rule(css, '.course-map__kind'), /color:var\(--muted\)/u);
});

await test('the intro card keeps its own height and the contents beside it is compact', async () => {
  const css = await enhancements('09-step-layout.css');
  assert.match(rule(css, '.lesson-intro>.card--prep'), /align-self:start/u);
  assert.match(rule(css, '.lesson-intro>.step-toc ol'), /gap:0/u);
  // 2 px above and below a 24 px line keeps every link a 24 px target.
  assert.match(rule(css, '.lesson-intro>.step-toc a'), /padding:2px 0/u);
});
