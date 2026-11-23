import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { guideInfo } from '../docs/pages/sdlc-development/guides/renderer/common.ts';
import { resolveCourseNames } from './course-names.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// TASK-951: the analysis maturity map left the course; its three levels on the course home lead to steps 1–3.
await test('the analysis levels on the course home lead to steps 1, 2 and 3 in order', async () => {
  const html = resolveCourseNames(
    await readFile(resolve(root, 'docs/pages/sdlc-development/guides/index.html'), 'utf8'),
  );
  const block = /<ol class="maturity-levels__list"[^>]*>([^]*?)<\/ol>/u.exec(html)?.[1];
  assert.ok(block, 'the course home has the analysis levels block');
  const levels = [...block.matchAll(/<a href="([^"]+)">[^]*?<strong>([^<]+)<\/strong>/gu)].map(
    ([, href, title]) => ({ href, title }),
  );
  assert.deepEqual(levels, [
    { href: guideInfo('1').file, title: 'Передача требований' },
    { href: guideInfo('2').file, title: 'Перекрёстная проверка' },
    { href: guideInfo('3').file, title: 'Единый источник и SDD' },
  ]);
});
