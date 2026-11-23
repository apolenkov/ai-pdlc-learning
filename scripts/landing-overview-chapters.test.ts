import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

import { assertMasterPin } from './guide-video-test-support.ts';
import { mediaUrl } from './media-release.ts';

const dir = resolve(import.meta.dirname, '../video/landing-overview-sections');
const read = (name: string): string => readFileSync(resolve(dir, name), 'utf8');

interface Chapter {
  n: number;
  title: string;
  start: number;
  end: number;
}

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

const chapters: Chapter[] = parseList(read('landing-overview-sections.chapters.json')).map((c) => ({
  n: num(c, 'n'),
  title: String(c['title']),
  start: num(c, 'start'),
  end: num(c, 'end'),
}));
const durations = parseList(read('film/scenes.json')).map((scene) => num(scene, 'duration'));
const total = r3(durations.reduce((sum, value) => sum + value, 0));

const TITLES = [
  'Обзор страницы',
  'Карта PDLC',
  'Как встроить ИИ',
  'Команда развития',
  'Разделы страницы',
  'С чего начать',
];

await test('overview: 6 глав по сценам обзора', () => {
  assert.equal(chapters.length, 6);
  assert.deepEqual(
    chapters.map((c) => c.title),
    TITLES,
  );
  assert.deepEqual(
    chapters.map((c) => c.n),
    Array.from({ length: 6 }, (_, i) => i + 1),
  );
});

await test('overview: главы монотонны, смежны и заканчиваются концом ролика', () => {
  assert.equal(chapters[0]?.start, 0);
  chapters.forEach((c, i) => {
    assert.ok(c.end > c.start, `глава ${String(c.n)}: конец после начала`);
    if (i > 0)
      assert.equal(c.start, chapters[i - 1]?.end, `глава ${String(c.n)}: стык с предыдущей`);
  });
  const last = chapters.at(-1)?.end ?? Infinity;
  assert.ok(last <= 92.2, `конец ролика ${String(last)} с`);
  assert.equal(last, total, 'конец равен сумме длительностей сцен');
});

await test('overview: начало главы — старт сцены или начало реплики VTT', () => {
  const boundaries: number[] = [];
  let t = 0;
  for (const duration of durations) {
    boundaries.push(r3(t));
    t += duration;
  }
  const cues = vttBlocks(read('landing-overview-sections.vtt')).map(startOf);
  for (const c of chapters) {
    assert.ok(
      boundaries.includes(c.start) || cues.includes(c.start),
      `глава ${String(c.n)} «${c.title}» на ${String(c.start)} с`,
    );
  }
});

await test('overview: манифест sections пинует web и master v5b (мастер утерян, пин сохранён), 22 реплики и 6 глав', () => {
  const manifest = readJson('video-manifest.json');
  const master = manifest['master'];
  assert.ok(isRecord(master), 'master — объект');
  const sha256 = String(manifest['sha256']);
  const masterSha = String(master['sha256']);
  const sums = new Map(
    read('MEDIA.sha256')
      .trim()
      .split('\n')
      .map((line) => line.trim().split(/\s+/u))
      .map(([sum, ...file]) => [file.join(' '), sum ?? ''] as const),
  );
  assert.equal(
    sums.get('./film/renders/landing-overview-sections-v5b-720p.mp4'),
    sha256,
    'web-пин совпадает с MEDIA.sha256 (рендер v5b 720p)',
  );
  assert.equal(
    sums.get('./film/renders/landing-overview-sections-v5b-1080p.mp4'),
    masterSha,
    'master-пин совпадает с MEDIA.sha256 (рендер v5b 1080p)',
  );
  assert.equal(manifest['version'], sha256.slice(0, 12));
  assert.equal(num(manifest, 'size'), 3681673);
  assert.equal(num(master, 'size'), 18841011);
  assert.equal(manifest['url'], mediaUrl('landing-overview.mp4', sha256));
  // The 1080p master was lost before the Mac handover: its pin stays, the release URL is gone.
  assertMasterPin(master);
  assert.equal(num(manifest, 'duration'), 92.2);
  const cues = [...read('landing-overview-sections.vtt').matchAll(/-->/gu)].length;
  assert.equal(cues, 22, 'субтитры — 22 реплики');
  assert.equal(num(manifest, 'captions'), cues);
  const chapterBlocks = vttBlocks(read('landing-overview-sections.chapters.vtt')).length;
  assert.equal(chapterBlocks, 6, 'главы — 6');
  assert.equal(num(manifest, 'chapters'), chapterBlocks);
});

await test('overview: chapters.vtt совпадает с chapters.json и не содержит MCP', () => {
  const raw = read('landing-overview-sections.chapters.vtt');
  const blocks = vttBlocks(raw);
  assert.equal(blocks.length, 6);
  blocks.forEach((lines, i) => {
    assert.equal(lines[2], chapters[i]?.title);
    assert.equal(startOf(lines), chapters[i]?.start);
  });
  assert.ok(!/MCP/iu.test(raw));
});
