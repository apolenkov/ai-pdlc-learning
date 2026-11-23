import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PROGRESS_KEY,
  doneStages,
  hasMarks,
  readProgress,
  resetChecked,
  writeChecked,
} from '../docs/pages/sdlc-development/route-strip/progress.ts';

const memory = (initial?: string) => {
  const map = new Map<string, string>(initial === undefined ? [] : [[PROGRESS_KEY, initial]]);
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
};

await test('marks are written per stage and read back', () => {
  const store = memory();
  writeChecked(store, '2', [0, 2], 3);
  writeChecked(store, '3', [1], 4);
  assert.equal(PROGRESS_KEY, 'customdev-course:v1');
  assert.deepEqual(readProgress(store), {
    checked: { '2': [0, 2], '3': [1] },
    totals: { '2': 3, '3': 4 },
  });
});

await test('broken, foreign or unreadable storage reads as no marks', () => {
  for (const raw of ['{', '[]', '{"checked":5}', '{"checked":{"2":"x"}}', 'null']) {
    assert.deepEqual(readProgress(memory(raw)), { checked: {}, totals: {} }, raw);
  }
  const throwing = {
    getItem: () => {
      throw new Error('SecurityError');
    },
  };
  assert.deepEqual(readProgress(throwing), { checked: {}, totals: {} });
  assert.deepEqual(readProgress(null), { checked: {}, totals: {} });
  assert.doesNotThrow(() =>
    writeChecked(
      {
        setItem: () => {
          throw new Error('QuotaExceeded');
        },
      },
      '2',
      [0],
      3,
    ),
  );
});

await test('a stage is done only when every self-check item is marked', () => {
  const done = doneStages({ checked: { '2': [0, 1, 2], '3': [0, 1] }, totals: { '2': 3, '3': 3 } });
  assert.ok(done.has('2'));
  assert.ok(!done.has('3'));
});

await test('marks past the item count never finish a stage', () => {
  assert.equal(doneStages({ checked: { '2': [0, 1, 7] }, totals: { '2': 3 } }).size, 0);
  assert.equal(doneStages({ checked: { '2': [-1, 0, 1] }, totals: { '2': 3 } }).size, 0);
});

await test('the reset is offered only while some mark is stored', () => {
  assert.equal(hasMarks({ checked: {}, totals: {} }), false);
  assert.equal(hasMarks({ checked: { '2': [] }, totals: { '2': 3 } }), false);
  assert.equal(hasMarks({ checked: { '2': [0] }, totals: { '2': 3 } }), true);
});

await test('marks without a stored total never finish a stage', () => {
  assert.equal(doneStages({ checked: { '2': [0, 1, 2] }, totals: {} }).size, 0);
});

await test('reset removes every mark', () => {
  const store = memory('{"checked":{"2":[0]}}');
  resetChecked(store);
  assert.equal(store.map.has(PROGRESS_KEY), false);
});
