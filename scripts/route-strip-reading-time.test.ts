import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import {
  addSeconds,
  READING_KEY,
  readTimes,
  renderReading,
  type Store,
  countReading,
} from '../docs/pages/sdlc-development/route-strip/reading-time.ts';
import { STEPS } from '../docs/pages/sdlc-development/route-strip/strip.ts';

const memory = (initial: Record<string, string> = {}): Store => ({
  getItem: (key: string) => initial[key] ?? null,
  setItem: (key: string, value: string) => void (initial[key] = value),
});

await test('reading time adds up per stage and survives a broken or hostile store', () => {
  const store = memory();
  addSeconds(store, 'delivery', 90);
  assert.deepEqual(addSeconds(store, 'delivery', 30), { delivery: 120 });
  assert.deepEqual(addSeconds(store, 'delivery', 0), { delivery: 120 });
  assert.deepEqual(readTimes(memory({ [READING_KEY]: '{bad' })), {});
  assert.deepEqual(readTimes(memory({ [READING_KEY]: '[1]' })), {});
  assert.deepEqual(readTimes(memory({ [READING_KEY]: '{"a":-5,"b":"x","c":60}' })), { c: 60 });
  assert.deepEqual(readTimes(null), {});
  const throwing: Store = {
    getItem: () => '{}',
    setItem: () => {
      throw new Error('quota');
    },
  };
  assert.deepEqual(addSeconds(throwing, 'delivery', 10), { delivery: 10 });
});

await test('the note shows this step and the route total, counting only route steps', () => {
  const [first, second] = STEPS;
  const text = renderReading({ [first!.id]: 61, [second!.id]: 120, gone: 6000 }, first!.id);
  assert.match(
    text,
    /На этом шаге вы провели ≈\u00a01\u00a0мин, на всём маршруте — ≈\u00a03\u00a0мин\./u,
  );
  assert.match(text, /только в этом браузере и никуда не отправляется/u);
  assert.match(
    renderReading({}, first!.id),
    /провели меньше минуты, на всём маршруте — меньше минуты/u,
  );
});

await test('counting takes only visible time, never twice, and caps a sleep gap at two ticks', () => {
  mock.timers.enable({ apis: ['setInterval'] });
  const stage = STEPS[0]!.id;
  const store = memory();
  const seconds = (): number => readTimes(store)[stage] ?? 0;
  let clock = 1_000_000;
  const view = new EventTarget();
  const state: { visibilityState: DocumentVisibilityState; defaultView: EventTarget } = {
    visibilityState: 'visible',
    defaultView: view,
  };
  const page = Object.assign(new EventTarget(), state);
  const note = { textContent: '' as string | null };
  const show = (state: DocumentVisibilityState): void => {
    page.visibilityState = state;
    page.dispatchEvent(new Event('visibilitychange'));
  };

  countReading(page, stage, note, () => clock, store);
  assert.match(note.textContent ?? '', /меньше минуты/u);

  clock += 10_000;
  show('hidden');
  assert.equal(seconds(), 10);
  view.dispatchEvent(new Event('pagehide'));
  clock += 60_000;
  mock.timers.tick(15_000);
  assert.equal(seconds(), 10, 'hidden time and a pagehide after hidden add nothing');

  show('visible');
  clock += 5 * 60_000;
  mock.timers.tick(15_000);
  assert.equal(seconds(), 40, 'a five-minute gap between ticks counts as two ticks');
  view.dispatchEvent(new Event('pagehide'));
  assert.equal(seconds(), 40, 'a flush at the same moment adds nothing');
  mock.timers.reset();
});
