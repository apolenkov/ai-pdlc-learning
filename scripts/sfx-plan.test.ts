import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HOVER_DELAY,
  hoverByScene,
  planEvents,
  phraseStart,
  timelineScenes,
  type SceneEntry,
} from '../video/_shared/tools/sfx-plan.ts';

const align = (text: string) => ({
  characters: [...text],
  character_start_times_seconds: [...text].map((_, i) => i * 0.1),
});

await test('phraseStart ищет фразу без учёта регистра', () => {
  assert.ok(Math.abs(phraseStart(align('Привет мир'), 'МИР')! - 0.7) < 1e-9);
  assert.equal(phraseStart(align('Привет'), 'нет'), null);
});

await test('planEvents: swipe на каждой смене, hover позже начала фразы, хвостовой subdrop', () => {
  const ev = planEvents([5, 5], [align('аб вг'), align('де жз')], {
    hover: [[2, 'жз']],
    sub: [2.6],
  });
  assert.deepEqual(
    ev.filter((e) => e.kind === 'swipe').map((e) => e.t.toFixed(2)),
    ['4.82'],
  );
  const hover = ev.find((e) => e.kind === 'hover')!;
  assert.ok(Math.abs(hover.t - hover.phraseStart! - HOVER_DELAY) < 1e-9);
  assert.deepEqual(
    ev.filter((e) => e.kind === 'subdrop').map((e) => e.t.toFixed(1)),
    ['2.6', '7.7'],
  );
});

await test('planEvents: неизвестная фраза — ошибка, а не тишина', () => {
  assert.throws(() => planEvents([5], [align('аб')], { hover: [[1, 'яя']] }), /нет фразы/);
});

await test('planEvents: явные события задают план целиком, в порядке времени', () => {
  const ev = planEvents([5, 5], [align('аб'), align('вг')], {
    hover: [[1, 'аб']],
    sub: [2.6],
    events: [
      { kind: 'swipe', t: 8.2, pan: 0.5, note: 'смена сцены' },
      { kind: 'pop', t: 2.7 },
      { kind: 'click', t: 4.1, pan: -0.25 },
    ],
  });
  assert.deepEqual(
    ev.map((e) => [e.kind, e.t, e.pan]),
    [
      ['pop', 2.7, 0],
      ['click', 4.1, -0.25],
      ['swipe', 8.2, 0.5],
    ],
  );
  assert.equal(ev[2]!.note, 'смена сцены');
  // выводные правила (swipe на смене сцены, hover, хвостовой subdrop) не применяются
  assert.equal(ev.filter((e) => e.kind === 'hover').length, 0);
  assert.equal(ev.filter((e) => e.kind === 'subdrop').length, 0);
});

await test('planEvents: явные события не смотрят в озвучку и допускают pop и click', () => {
  const ev = planEvents([5], [], {
    events: [
      { kind: 'pop', t: 1 },
      { kind: 'click', t: 2 },
      { kind: 'keys', t: 3 },
    ],
  });
  assert.deepEqual(
    ev.map((e) => e.kind),
    ['pop', 'click', 'keys'],
  );
});

await test('заставка overlay не сдвигает hover и явные события', () => {
  const scenes: SceneEntry[] = [
    { n: '0m', duration: 5 },
    { overlay: true, duration: 2 },
    { n: 1, duration: 5 },
  ];
  const timed = timelineScenes(scenes);
  assert.deepEqual(
    timed.map((scene) => scene.n),
    ['0m', 1],
  );
  const cfg = hoverByScene(scenes, { hover: [[1, 'жз']] });
  assert.deepEqual(cfg.hover, [[2, 'жз']]);
  const ev = planEvents(
    timed.map((scene) => scene.duration),
    [align('аб'), align('де жз')],
    cfg,
  );
  assert.equal(ev.find((event) => event.kind === 'hover')!.t, 5.5);
  const explicit = hoverByScene(scenes, { events: [{ kind: 'pop', t: 5.2 }] });
  assert.deepEqual(planEvents([5, 5], [], explicit), [{ kind: 'pop', t: 5.2, pan: 0 }]);
});
