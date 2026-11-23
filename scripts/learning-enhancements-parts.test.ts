import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';

import { LEARNING_ENHANCEMENT_PARTS } from './learning-enhancements-css.ts';

const PARTS_DIR = resolve(
  import.meta.dirname,
  '../docs/pages/sdlc-development/guides/learning-enhancements',
);

await test('the declared stylesheet parts are exactly the files of their source directory', async () => {
  const files = (await readdir(PARTS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(files, [...LEARNING_ENHANCEMENT_PARTS]);
});
