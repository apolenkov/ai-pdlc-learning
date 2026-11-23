#!/usr/bin/env node
// sfx.json курсовых роликов (TASK-588): события выводятся из scenes.json, а не из подсветок People.focus (их в курсе нет).
//   node --experimental-strip-types scripts/sfx-course.ts [--check]
// swipe и subdrop на хвосте добавляет сам sfx-mix.ts; здесь — выход из постера (sub) и hover по явным подсветкам focus(...).
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  timelineScenes,
  type SceneEntry,
  type SfxFileConfig,
  type SfxEventConfig,
  type SfxKind,
} from '../video/_shared/tools/sfx-plan.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILMS = [
  'block-0',
  'block-0a',
  'block-sdd',
  'block-p4',
  'block-r1',
  'block-r2',
  'block-r3',
  'block-r4',
  'block-r4new',
  'block-r4legacy',
  'block-team',
  'block-delivery',
  'block-dark-factory',
];
// hover — только там, где композиция сама подсвечивает элемент: [n сцены, фраза озвучки, откуда взято]
const HOVER: Record<string, [string | number, string][]> = {
  // compositions/scene-03.html: focus(0…4, t("Первый:")…t("Пятый:"))
  'block-r2': [
    [3, 'Первый:'],
    [3, 'Второй:'],
    [3, 'Третий:'],
    [3, 'Четвёртый:'],
    [3, 'Пятый:'],
  ],
  // compositions/scene-03.html: focus(bB, t("содержание")), focus(pr, t("предложение")), focus(pr, t("предложение", 2) − 0,2);
  // второе «предложение» отличается точкой — phraseStart ищет первое вхождение фразы.
  'block-r3': [
    [3, 'содержание'],
    [3, 'предложение'],
    [3, 'предложение.'],
  ],
};
const POSTER_END = 2.6; // светлая титульная карточка scene-poster: 0…2,6 с, времени не добавляет
const isKind = (value: unknown): value is SfxKind =>
  value === 'swipe' ||
  value === 'hover' ||
  value === 'subdrop' ||
  value === 'pop' ||
  value === 'click' ||
  value === 'keys';

const check = process.argv.includes('--check');
let bad = 0;
for (const film of FILMS) {
  const dir = join(root, 'video', film, 'film');
  const scenes: unknown = JSON.parse(readFileSync(join(dir, 'scenes.json'), 'utf8'));
  assert.ok(Array.isArray(scenes), `${film}: scenes.json — не массив`);
  assert.ok(
    scenes.every(
      (value: unknown): value is SceneEntry =>
        value !== null &&
        typeof value === 'object' &&
        'duration' in value &&
        typeof value.duration === 'number' &&
        (!('n' in value) || typeof value.n === 'number' || typeof value.n === 'string') &&
        (!('overlay' in value) || typeof value.overlay === 'boolean'),
    ),
    `${film}: scenes.json — не список сцен`,
  );
  const timed = timelineScenes(scenes);
  const poster =
    existsSync(join(dir, 'compositions/scene-poster.html')) &&
    readFileSync(join(dir, 'index.html'), 'utf8').includes('scene-poster');
  const path = join(dir, 'sfx.json');
  const was = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const cfg: SfxFileConfig = { sub: poster ? [POSTER_END] : [], hover: HOVER[film] ?? [] };
  if (was) {
    const previous: unknown = JSON.parse(was);
    if (
      previous &&
      typeof previous === 'object' &&
      'events' in previous &&
      Array.isArray(previous.events)
    ) {
      cfg.events = previous.events.map((event: unknown): SfxEventConfig => {
        if (
          !event ||
          typeof event !== 'object' ||
          !('kind' in event) ||
          !isKind(event.kind) ||
          !('t' in event) ||
          typeof event.t !== 'number'
        )
          throw new Error(`${film}: invalid motion event`);
        return {
          kind: event.kind,
          t: event.t,
          ...('pan' in event && typeof event.pan === 'number' ? { pan: event.pan } : {}),
          ...('note' in event && typeof event.note === 'string' ? { note: event.note } : {}),
          ...('phraseStart' in event && typeof event.phraseStart === 'number'
            ? { phraseStart: event.phraseStart }
            : {}),
        };
      });
    }
  }
  const text = JSON.stringify(cfg) + '\n';
  const same = was && JSON.stringify(JSON.parse(was)) === JSON.stringify(cfg);
  const swipes = Math.max(timed.length - 1, 0);
  const subs = (cfg.sub?.length ?? 0) + 1; // + хвост (конец − 2,3 с) из sfx-plan.ts
  console.log(
    `${check ? (same ? 'ok  ' : 'diff') : 'записан'} ${film.padEnd(18)} сцен ${timed.length}, swipe ${swipes}, subdrop ${subs}, hover ${cfg.hover?.length ?? 0}${poster ? '' : ' (постера нет)'}`,
  );
  if (!same) {
    bad++;
    if (!check) writeFileSync(path, text);
  }
}
if (check && bad) {
  console.error(`sfx-course: ${bad} файлов расходятся со scenes.json — запустите без --check`);
  process.exit(1);
}
