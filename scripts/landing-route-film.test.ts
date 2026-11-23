import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

import { mediaUrl } from './media-release.ts';

const dir = resolve(import.meta.dirname, '../video/landing-route');
const read = (name: string): string => readFileSync(resolve(dir, name), 'utf8');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const num = (record: Record<string, unknown>, key: string): number => {
  const value = record[key];
  assert.equal(typeof value, 'number', `поле ${key} — число`);
  return Number(value);
};
const parseList = (raw: string): Record<string, unknown>[] => {
  const parsed: unknown = JSON.parse(raw);
  assert.ok(Array.isArray(parsed));
  return parsed.filter(isRecord);
};
const readJson = (name: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(read(name));
  assert.ok(isRecord(parsed), `${name}: ожидался объект`);
  return parsed;
};
const r3 = (value: number): number => Number(value.toFixed(3));
const seconds = (value: string): number => {
  const [h, m, s] = value.split(':');
  return r3(Number(h) * 3600 + Number(m) * 60 + Number(s));
};
const vttBlocks = (raw: string): string[][] =>
  raw
    .split(/\n\n+/)
    .map((block) => block.trim().split('\n'))
    .filter((lines) => lines[1]?.includes('-->'));
const startOf = (lines: string[]): number => seconds((lines[1] ?? '').split(' --> ')[0] ?? '');

const chapters = parseList(read('landing-route.chapters.json')).map((c) => ({
  n: num(c, 'n'),
  title: String(c['title']),
  start: num(c, 'start'),
  end: num(c, 'end'),
}));
const durations = parseList(read('film/scenes.json')).map((scene) => num(scene, 'duration'));
const total = r3(durations.reduce((sum, value) => sum + value, 0));

// Chapters follow the order of the public home page (TASK-923).
const TITLES = ['Главная', 'Карта PDLC', 'Намерение и план', 'Анализ', 'Справка'];

await test('landing-route: 5 глав по порядку публичной главной', () => {
  assert.deepEqual(
    chapters.map((c) => c.title),
    TITLES,
  );
  assert.deepEqual(
    chapters.map((c) => c.n),
    [1, 2, 3, 4, 5],
  );
});

await test('landing-route: главы смежны, начинаются со стартов сцен и кончаются концом ролика', () => {
  let t = 0;
  chapters.forEach((c, i) => {
    assert.equal(c.start, r3(t), `глава ${String(c.n)}: старт сцены`);
    t += durations[i] ?? 0;
    assert.equal(c.end, r3(t), `глава ${String(c.n)}: конец сцены`);
  });
  assert.equal(chapters.at(-1)?.end, total);
});

await test('landing-route: манифест совпадает с MEDIA.sha256, субтитрами и главами', () => {
  const manifest = readJson('video-manifest.json');
  const master = manifest['master'];
  const poster = manifest['poster'];
  assert.ok(isRecord(master) && isRecord(poster));
  const sums = new Map(
    read('MEDIA.sha256')
      .trim()
      .split('\n')
      .map((line) => line.trim().split(/\s+/u))
      .map(([sum, ...file]) => [file.join(' '), sum ?? ''] as const),
  );
  const sha256 = String(manifest['sha256']);
  assert.equal(sums.get('./film/renders/landing-route-720p.mp4'), sha256);
  assert.equal(sums.get('./film/renders/landing-route-1080p.mp4'), master['sha256']);
  assert.equal(sums.get('./landing-route-poster.webp'), poster['sha256']);
  assert.equal(manifest['version'], sha256.slice(0, 12));
  assert.equal(manifest['url'], mediaUrl('landing-route.mp4', sha256));
  assert.equal(num(manifest, 'duration'), total);
  const cues = vttBlocks(read('landing-route.vtt')).length;
  assert.equal(num(manifest, 'captions'), cues);
  assert.equal(num(manifest, 'chapters'), vttBlocks(read('landing-route.chapters.vtt')).length);
});

await test('landing-route: chapters.vtt совпадает с chapters.json', () => {
  const blocks = vttBlocks(read('landing-route.chapters.vtt'));
  assert.equal(blocks.length, chapters.length);
  blocks.forEach((lines, i) => {
    assert.equal(lines[2], chapters[i]?.title);
    assert.equal(startOf(lines), chapters[i]?.start);
  });
});

await test('landing-route: в тексте, субтитрах и сценах нет CustomDev, команды развития и аудита', () => {
  const files = [
    'landing-route.vtt',
    'landing-route.chapters.vtt',
    'film/work/vo-input.md',
    ...['01', '02', '03', '04', '05'].map((n) => `film/work/scenes/${n}.js`),
  ];
  for (const file of files)
    assert.doesNotMatch(read(file), /custom\s?dev|команд[аеуыой]+\s+развития|аудит/iu, file);
});
