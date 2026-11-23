import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { measure, rootTokens, type CoreMetrics } from './design-tokens-metrics.ts';
import { LEARNING_ENHANCEMENT_PARTS } from './learning-enhancements-css.ts';

const KEYS = [
  'rawColors',
  'radiusOffScale',
  'literalShadows',
  'colorTokenDefs',
] as const satisfies readonly (keyof CoreMetrics)[];
const PAGES = resolve(import.meta.dirname, '../docs/pages/sdlc-development');
/** TASK-568 P0: the course-native styles may only get cleaner. Lower a number when a migration step lands; never raise it. */
const BASELINE: Readonly<Record<string, CoreMetrics>> = {
  'guides/learning-enhancements.css': {
    rawColors: 58,
    radiusOffScale: 2,
    literalShadows: 2,
    colorTokenDefs: 0,
  },
  'course-motion.css': { rawColors: 11, radiusOffScale: 0, literalShadows: 2, colorTokenDefs: 0 },
  'guides/guide.css': { rawColors: 6, radiusOffScale: 0, literalShadows: 0, colorTokenDefs: 0 },
  'site-nav.css': { rawColors: 2, radiusOffScale: 0, literalShadows: 0, colorTokenDefs: 0 },
  'guides/metarepository.css': {
    rawColors: 1,
    radiusOffScale: 1,
    literalShadows: 0,
    colorTokenDefs: 0,
  },
};

/** Same table as customdev `scripts/design-tokens-baseline.test.ts`: the course copy of site-nav.css repeats it value for value. */
const TOKEN_CONTRACT: Readonly<Record<string, string>> = {
  '--customdev-paper-0': '#f4f1e8',
  '--customdev-paper-1': '#fffdf8',
  '--customdev-ink-strong': '#1f2d2a',
  '--customdev-green': '#216650',
  '--customdev-amber-ink': '#965b0d',
  '--customdev-amber-text': '#8f5610',
  '--customdev-line-control': '#8a938d',
  '--customdev-line-control-paper': '#6f7a75',
  '--customdev-line-strong': '#aeb7b1',
  '--customdev-graphite': '#17231f',
  '--customdev-credit-ink': '#b0b0b0',
  '--customdev-credit-ink-open': '#9a9a9a',
  '--customdev-radius-xs': '4px',
  '--customdev-shadow-card': '0 10px 24px rgb(31 45 42 / .08)',
  '--customdev-green-ink': '#2e8a68',
  '--customdev-reference-border-green': '#3d6758',
  '--customdev-surface-quiet': '#f5f8f1',
  '--customdev-surface-blue': '#eef4f8',
  '--customdev-reference-ink': '#315f79',
  '--customdev-team-plum': '#765474',
  '--customdev-team-soft': '#f1e8ef',
  '--customdev-tint-warm': '#fffaf0',
  '--customdev-warning-ink': '#7a2a1f',
  '--customdev-pending-ink': '#694a1a',
  '--customdev-line-muted': '#c7afc2',
  '--customdev-team-line': '#c4b79f',
  '--customdev-poster-route': '#172b26',
  '--customdev-video-bg': '#0b0e11',
  '--customdev-poster-mint': '#b1eccb',
  '--customdev-poster-mint-pale': '#dbf0e2',
  '--customdev-poster-gold': '#ffd98a',
  '--customdev-poster-paper': '#f3f7f2',
  '--customdev-team-plum-ink': '#563e55',
  '--customdev-team-soft-blush': '#f6e1dd',
  '--customdev-green-deep': '#1a5443',
  '--customdev-reference-slate': '#496674',
  '--customdev-poster-mint-quiet': '#d3e8de',
};

await test('course styles do not use more raw colours, off-scale radii or literal shadows than the baseline', () => {
  const parts = LEARNING_ENHANCEMENT_PARTS.map((part) => `guides/learning-enhancements/${part}`);
  const now = measure(PAGES, [
    ...Object.keys(BASELINE).filter((file) => file !== 'guides/learning-enhancements.css'),
    ...parts,
  ]);
  // The published stylesheet is the sum of its split parts: measure the parts together, not each alone.
  const enhancement: CoreMetrics = {
    rawColors: parts.reduce((sum, part) => sum + now[part]!.rawColors, 0),
    radiusOffScale: parts.reduce((sum, part) => sum + now[part]!.radiusOffScale, 0),
    literalShadows: parts.reduce((sum, part) => sum + now[part]!.literalShadows, 0),
    colorTokenDefs: parts.reduce((sum, part) => sum + now[part]!.colorTokenDefs, 0),
  };
  const current: Readonly<Record<string, CoreMetrics>> = {
    ...now,
    'guides/learning-enhancements.css': enhancement,
  };
  for (const [file, base] of Object.entries(BASELINE))
    for (const key of KEYS)
      assert.ok(
        current[file]![key] <= base[key],
        `${file}: ${key} ${current[file]![key]} > baseline ${base[key]}`,
      );
});

await test('site-nav.css :root carries the token contract', () => {
  const tokens = rootTokens(readFileSync(resolve(PAGES, 'site-nav.css'), 'utf8'));
  for (const [name, value] of Object.entries(TOKEN_CONTRACT))
    assert.equal(tokens.get(name), value, name);
});

await test('the course root tokens equal the customdev ones when CUSTOMDEV_DIR points at the source', (t) => {
  const source = process.env.CUSTOMDEV_DIR;
  if (!source) return t.skip('CUSTOMDEV_DIR is not set');
  const mine = rootTokens(readFileSync(resolve(PAGES, 'site-nav.css'), 'utf8'));
  const theirs = rootTokens(
    readFileSync(resolve(source, 'docs/pages/sdlc-development/site-nav.css'), 'utf8'),
  );
  assert.deepEqual([...mine], [...theirs]);
});

await test('the route strip and the guide use the tokens of the contract, not local copies', () => {
  const motion = readFileSync(resolve(PAGES, 'course-motion.css'), 'utf8');
  assert.match(
    motion,
    /\.course-route__group--after \.course-route__word \{ color: var\(--customdev-amber-text\)/u,
  );
  assert.match(motion, /border: 2px solid var\(--customdev-line-control\)/u);
  const guide = readFileSync(resolve(PAGES, 'guides/guide.css'), 'utf8');
  assert.match(guide, /--line-strong: var\(--customdev-line-strong\)/u);
  assert.match(guide, /--graphite: var\(--customdev-graphite\)/u);
});
