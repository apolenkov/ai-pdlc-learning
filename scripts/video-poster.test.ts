import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TOOL = resolve(ROOT, 'video/_shared/tools/build-poster.mjs');

type Run = { status: number | null; stderr: string; html: string };

/** Runs the shared poster tool on a throwaway film dir: the tool reads poster.json next to its tool dir. */
const buildPoster = (poster: unknown): Run => {
  const dir = mkdtempSync(join(tmpdir(), 'build-poster-'));
  try {
    mkdirSync(join(dir, 'tools'));
    copyFileSync(TOOL, join(dir, 'tools/build-poster.mjs'));
    writeFileSync(join(dir, 'poster.json'), JSON.stringify(poster));
    const run = spawnSync(process.execPath, [join(dir, 'tools/build-poster.mjs')], {
      encoding: 'utf8',
    });
    const file = join(dir, 'compositions/scene-poster.html');
    return {
      status: run.status,
      stderr: run.stderr,
      html: existsSync(file) ? readFileSync(file, 'utf8') : '',
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

/** The inline script of the generated composition; parsing it catches a broken string literal. */
const scriptBody = (html: string): string => {
  const match = /<script>\n([\s\S]*?)<\/script>/u.exec(html);
  assert.ok(match, 'scene-poster.html has no inline script');
  return match[1]!;
};

await test('build-poster refuses a poster without a kicker or a title', () => {
  const missingKicker = buildPoster({ title: 'Только заголовок' });
  assert.equal(missingKicker.status, 1);
  assert.match(missingKicker.stderr, /нужно поле kicker/u);
  const missingTitle = buildPoster({ kicker: 'Курс анализа' });
  assert.equal(missingTitle.status, 1);
  assert.match(missingTitle.stderr, /нужно поле title/u);
});

await test('build-poster puts the sketch name into the script as a safe string', () => {
  const normal = buildPoster({ kicker: 'Курс анализа', title: 'Заголовок', sketch: 'intro-idea' });
  assert.equal(normal.status, 0);
  assert.match(normal.html, /\(window\.SKETCHES \|\| \{\}\)\["intro-idea"\]/u);
  assert.doesNotThrow(() => new Script(scriptBody(normal.html)));
});

await test('build-poster escapes a hostile sketch name instead of breaking the script', () => {
  const sketch = 'bad"name</script><script>alert(1)//';
  const hostile = buildPoster({
    kicker: 'Курс анализа',
    title: 'Заголовок с "кавычками"',
    sketch,
  });
  assert.equal(hostile.status, 0);
  // A raw closing tag would both break the page and confirm the injection.
  assert.equal(hostile.html.match(/<\/script>/gu)?.length, 1);
  assert.equal(hostile.html.match(/<script>/gu)?.length, 1);
  assert.doesNotThrow(() => new Script(scriptBody(hostile.html)));
  assert.match(hostile.html, /bad\\"name/u);
});

await test('build-poster keeps the brand mark by default and drops it with brand false', () => {
  const withBrand = buildPoster({ kicker: 'Курс анализа', title: 'Заголовок' });
  assert.equal(withBrand.status, 0);
  assert.match(withBrand.html, /<i><\/i>Custom Dev/u);
  const withoutBrand = buildPoster({ kicker: 'Курс анализа', title: 'Заголовок', brand: false });
  assert.equal(withoutBrand.status, 0);
  assert.doesNotMatch(withoutBrand.html, /<i><\/i>Custom Dev/u);
  assert.doesNotThrow(() => new Script(scriptBody(withoutBrand.html)));
});
