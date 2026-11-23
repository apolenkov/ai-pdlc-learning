import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

/** Все дорожки субтитров: каждая .vtt/.srt в подкаталогах video/ + дорожки плеера в assets гайдов. */
const FILM_ROOT = 'video';
const SITE_VIDEO = 'docs/pages/sdlc-development/guides/assets/video';
/** Зазор между соседними репликами — тот же, что ставят генераторы: make-vtt.mjs и build-captions.mjs. */
const GAP = 0.02;
const TIME = /(\d{1,2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{3})/u;

type Cue = { start: number; end: number; line: number };

const seconds = (parts: (string | undefined)[]): number =>
  Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]) + Number(parts[3]) / 1000;

/** Тайминги реплик дорожки (VTT или SRT); line — номер строки с таймингом, для сообщения об ошибке. */
const cuesOf = (track: string): Cue[] =>
  track.split('\n').flatMap((text, index) => {
    const found = TIME.exec(text);
    if (!found) return [];
    return [
      { start: seconds(found.slice(1, 5)), end: seconds(found.slice(5, 9)), line: index + 1 },
    ];
  });

/** Соседние реплики, у которых следующая начинается раньше конца предыдущей. */
const overlapped = (cues: Cue[]): { previous: Cue; next: Cue }[] =>
  cues.flatMap((next, index) => {
    const previous = cues[index - 1];
    return previous && next.start < previous.end ? [{ previous, next }] : [];
  });

/** Соседние реплики, у которых следующая начинается раньше предыдущей (нарушен порядок времени). */
const outOfOrder = (cues: Cue[]): { previous: Cue; next: Cue }[] =>
  cues.flatMap((next, index) => {
    const previous = cues[index - 1];
    return previous && next.start < previous.start ? [{ previous, next }] : [];
  });

/** Относительные пути всех дорожек .vtt/.srt: подкаталоги video/ и каталог assets видеоплеера гайдов. */
async function allTracks(): Promise<string[]> {
  const tracks: string[] = [];
  const films = (await readdir(FILM_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const film of films) {
    const dir = join(FILM_ROOT, film);
    const files = (await readdir(dir)).filter((file) => /\.(?:vtt|srt)$/u.test(file)).sort();
    for (const file of files) tracks.push(`${FILM_ROOT}/${film}/${file}`);
  }
  const siteFiles = (await readdir(SITE_VIDEO))
    .filter((file) => /\.(?:vtt|srt)$/u.test(file))
    .sort();
  for (const file of siteFiles) tracks.push(`${SITE_VIDEO}/${file}`);
  return tracks;
}

await test('реплики всех дорожек не перекрываются и идут по времени', async () => {
  const problems: string[] = [];
  const checked: string[] = [];
  for (const path of await allTracks()) {
    const cues = cuesOf(await readFile(path, 'utf8'));
    if (cues.length === 0) problems.push(`${path}: нет ни одной реплики с таймингами`);
    for (const cue of cues)
      if (cue.end <= cue.start)
        problems.push(`${path}:${cue.line}: реплика нулевой или отрицательной длины`);
    for (const { previous, next } of overlapped(cues))
      problems.push(
        `${path}:${next.line}: старт на ${((previous.end - next.start) * 1000).toFixed(0)} мс раньше конца предыдущей (строка ${previous.line})`,
      );
    for (const { previous, next } of outOfOrder(cues))
      problems.push(
        `${path}:${next.line}: старт раньше предыдущей реплики (${next.start.toFixed(3)} с < ${previous.start.toFixed(3)} с)`,
      );
    checked.push(path);
  }
  assert.ok(checked.length >= 20, `ожидается не менее 20 дорожек, найдено ${checked.length}`);
  assert.deepEqual(
    problems,
    [],
    'реплики перекрываются или идут не по времени — плеер покажет две сразу',
  );
  console.log(`caption-overlaps: проверено дорожек ${checked.length} (зазор ${GAP} с)`);
});

await test('перекрывающаяся пара ловится (негативный фикстур)', () => {
  const track =
    'WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.300\nпервая реплика\n\n2\n00:00:02.000 --> 00:00:03.000\nвторая реплика\n';
  const found = overlapped(cuesOf(track));
  assert.equal(found.length, 1, 'перекрытие 300 мс должно находиться');
  const [pair] = found;
  assert.ok(
    pair && Math.abs(pair.previous.end - pair.next.start - 0.3) < 1e-9,
    'величина перекрытия — 300 мс',
  );
  assert.deepEqual(
    overlapped(cuesOf(track.replace('00:00:02.300', '00:00:01.980'))),
    [],
    'после зажима до «начало следующей − 0,02» перекрытия нет',
  );
});
