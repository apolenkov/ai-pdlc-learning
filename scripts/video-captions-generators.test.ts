import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { after, test } from 'node:test';
import { checkAlignmentSources } from './video-captions-generators.test/alignment-sources.ts';
import { DURATION_EXCEPTIONS } from './video-captions-generators.test/duration-exceptions.ts';

const exec = promisify(execFile);
const VIDEO = 'video';
const SITE_TRACKS = 'docs/pages/sdlc-development/guides/assets/video';

/** Ручные дорожки: генератора в дереве нет, на сайте не используются. */
const MANUAL: Record<string, string> = {
  'et-film': 'дорожку выложили вручную, генератора в дереве нет',
};

/** Порог «мелькания»: реплика короче этого — ошибка без исключений. */
const MIN_HARD_SECONDS = 0.7;

/** <0,7 с в ручных дорожках: генератора нет, правка — отдельной задачей (ASK в отчёте). */
const MANUAL_HARD_EXCEPTIONS: Record<string, Record<number, string>> = {};

const GENERATOR_FILE = {
  'build-captions': 'build-captions.mjs',
  'make-vtt': 'make-vtt.mjs',
  build: 'build.mjs',
} as const;

type Generator = keyof typeof GENERATOR_FILE;

const HINT = {
  'build-captions': 'build-captions.mjs',
  'make-vtt': 'make-vtt.mjs',
  build: 'build.mjs',
  chapters: 'make-chapters.mjs',
} as const;

type Video = {
  name: string;
  film: string;
  tracks: string[];
  chapters: string[];
  generator?: Generator;
  /** Почему ролик вне сверки. */
  blockedBy?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const TIME = /(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})/u;

/** Реплики дорожки: время и длительность в секундах. */
const cuesOf = (track: string): { cue: number; duration: number }[] =>
  track
    .split('\n')
    .flatMap((line) => {
      const found = TIME.exec(line);
      if (found === null) return [];
      const start =
        Number(found[1]) * 3600 +
        Number(found[2]) * 60 +
        Number(found[3]) +
        Number(found[4]) / 1000;
      const end =
        Number(found[5]) * 3600 +
        Number(found[6]) * 60 +
        Number(found[7]) +
        Number(found[8]) / 1000;
      return [{ cue: 0, duration: end - start }];
    })
    .map((cue, index) => ({ ...cue, cue: index + 1 }));

/** Файлы Git: обнаружение роликов, дорожек и входов не зависит от рабочей копии. */
const trackedFiles = async (): Promise<Set<string>> => {
  const { stdout } = await exec('git', ['ls-files', '--', VIDEO, SITE_TRACKS]);
  return new Set(stdout.split('\n').filter((path) => path !== ''));
};

/** .vtt под каталогом; символьные ссылки не обходит. */
const vttUnder = async (dir: string): Promise<string[]> => {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await vttUnder(path)));
    else if (entry.isFile() && entry.name.endsWith('.vtt')) found.push(path);
  }
  return found.sort();
};

const generatorOf = (film: string, tracked: Set<string>): Generator | undefined => {
  if (tracked.has(`${film}/tools/build-captions.mjs`)) return 'build-captions';
  if (tracked.has(`${film}/tools/make-vtt.mjs`)) return 'make-vtt';
  if (tracked.has(`${film}/tools/build.mjs`)) return 'build';
  return undefined;
};

const videoOf = (name: string, tracked: Set<string>): Video => {
  const film = `${VIDEO}/${name}/film`;
  const folder = `${VIDEO}/${name}`;
  const tracks = [...tracked]
    .filter((path) => path.startsWith(`${folder}/`) && path.endsWith('.vtt'))
    .filter((path) => !path.endsWith('.chapters.vtt'))
    .sort();
  const site = `${SITE_TRACKS}/${name}.vtt`;
  if (tracked.has(site)) tracks.push(site);
  const chapters = [...tracked].filter(
    (path) => path.startsWith(`${folder}/`) && path.endsWith('.chapters.vtt'),
  );
  const generator = generatorOf(film, tracked);
  const alignments = [...tracked].filter(
    (path) => path.startsWith(`${film}/assets/vo/`) && path.endsWith('.alignment.json'),
  ).length;
  const ready =
    generator !== undefined &&
    tracked.has(`${film}/scenes.json`) &&
    (generator === 'build' || tracked.has(`${film}/terms.json`)) &&
    alignments > 0;
  const video: Video = {
    name,
    film,
    tracks: tracks.sort(),
    chapters: chapters.sort(),
    ...(generator === undefined ? {} : { generator }),
  };
  if (generator !== undefined && !ready)
    video.blockedBy = 'входы генератора (scenes.json, terms.json, alignment) не в Git';
  if (generator === undefined && (video.tracks.length > 0 || video.chapters.length > 0))
    video.blockedBy = 'генератора дорожки в дереве нет';
  return video;
};

const discoverVideos = (tracked: Set<string>): Video[] => {
  const names = new Set<string>();
  for (const path of tracked) {
    if (path.startsWith(`${VIDEO}/`) && path.endsWith('.vtt')) names.add(path.split('/')[1] ?? '');
    if (path.startsWith(SITE_TRACKS) && path.endsWith('.vtt')) names.add(basename(path, '.vtt'));
    if (/^video\/[^/]+\/film\/tools\/(?:build-captions|make-vtt|build)\.mjs$/u.test(path))
      names.add(path.split('/')[1] ?? '');
  }
  return [...names]
    .filter((name) => name !== '')
    .sort()
    .map((name) => videoOf(name, tracked));
};

/** Копия film только из отслеживаемых файлов: неотслеживаемые входы и .vtt не влияют. */
const prepareFilm = async (
  video: Video,
  root: string,
  full: boolean,
  tracked: Set<string>,
): Promise<string> => {
  const film = join(root, 'film');
  const prefix = `${video.film}/`;
  for (const path of tracked) {
    if (!path.startsWith(prefix)) continue;
    const rel = path.slice(prefix.length);
    const keep =
      full ||
      rel.startsWith('tools/') ||
      rel === 'scenes.json' ||
      rel === 'terms.json' ||
      (rel.startsWith('assets/vo/') && rel.endsWith('.alignment.json'));
    if (!keep) continue;
    const target = join(film, rel);
    await mkdir(dirname(target), { recursive: true });
    await cp(path, target);
  }
  return film;
};

const runNode = async (
  script: string,
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
  args: string[] = [],
): Promise<void> => {
  await exec(process.execPath, [script, ...args], { cwd, env });
};

/** Фрагмент вокруг первого расхождения — по символам, чтобы в логах не ломались знаки. */
const describeDiff = (expected: string, actual: string): string => {
  const want = [...expected];
  const got = [...actual];
  let index = 0;
  while (index < want.length && index < got.length && want[index] === got[index]) index++;
  const line = expected.slice(0, index).split('\n').length;
  const around = (chars: string[]): string =>
    chars
      .slice(Math.max(0, index - 25), index + 25)
      .join('')
      .replaceAll('\n', '\\n');
  return `символ ${index}, строка ${line}: собрано «${around(got)}», в Git «${around(want)}»`;
};

const sameTrack = async (
  video: string,
  committed: string,
  produced: string,
  generator: keyof typeof HINT,
): Promise<void> => {
  const want = await readFile(committed, 'utf8');
  const got = await readFile(produced, 'utf8');
  if (got === want) return;
  assert.fail(
    `ролик ${video}: VTT рассинхронизирован с alignment, запусти node video/${video}/film/tools/${HINT[generator]} — ${committed}: ${describeDiff(want, got)}`,
  );
};

/** Допуск длительности реплики: всё вне него — красное, кроме явных исключений. */
const checkDurations = async (video: string, track: string, produced: string): Promise<void> => {
  for (const cue of cuesOf(await readFile(produced, 'utf8'))) {
    const allowed = DURATION_EXCEPTIONS[track];
    if (cue.duration < MIN_HARD_SECONDS)
      assert.fail(
        `ролик ${video}: ${track}: реплика ${cue.cue} длится ${cue.duration.toFixed(3)} с — короче ${MIN_HARD_SECONDS} с, это мелькание; слей её с соседней или продли паузу`,
      );
    const listed = cue.duration >= 1 && allowed?.long[cue.cue] !== undefined;
    const listedShort = cue.duration < 1 && allowed?.short[cue.cue] !== undefined;
    if ((cue.duration < 1 || cue.duration > 7) && !listed && !listedShort)
      assert.fail(
        `ролик ${video}: ${track}: реплика ${cue.cue} длится ${cue.duration.toFixed(3)} с — вне допуска 1,0–7,0 с; если это законно, добавь её в DURATION_EXCEPTIONS`,
      );
  }
};

/** Длительности ручных дорожек: <0,7 с — FAIL, кроме перечисленных с причиной. */
const checkManualDurations = async (track: string): Promise<void> => {
  const cues = cuesOf(await readFile(track, 'utf8'));
  const allowed = MANUAL_HARD_EXCEPTIONS[track] ?? {};
  for (const cue of cues) {
    if (cue.duration >= MIN_HARD_SECONDS || allowed[cue.cue] !== undefined) continue;
    assert.fail(
      `${track}: реплика ${cue.cue} длится ${cue.duration.toFixed(3)} с — короче ${MIN_HARD_SECONDS} с, мелькание; генератора у ручной дорожки нет — запиши причину в ASK`,
    );
  }
  for (const [number, reason] of Object.entries(allowed)) {
    const cue = cues.find((item) => item.cue === Number(number));
    assert.ok(
      cue !== undefined && cue.duration < MIN_HARD_SECONDS,
      `исключение устарело для ${track} #${number}: ${reason}`,
    );
  }
};

const checkCaptionTrack = async (video: Video, produced: string): Promise<void> => {
  assert.equal(
    video.tracks.length > 0,
    true,
    `ролик ${video.name}: нет закоммиченной дорожки для сверки`,
  );
  const own = `video/${video.name}/${video.name}.vtt`;
  const site = `${SITE_TRACKS}/${video.name}.vtt`;
  for (const track of video.tracks) {
    assert.ok(
      track === own || track === site,
      `ролик ${video.name}: лишняя дорожка ${track} — генератор собирает одну дорожку ${own}`,
    );
    await sameTrack(video.name, track, produced, video.generator ?? 'build-captions');
    await checkDurations(video.name, track, produced);
  }
};

const checkChaptersTrack = async (
  video: Video,
  root: string,
  tracked: Set<string>,
): Promise<void> => {
  const film = await prepareFilm(video, root, true, tracked);
  const track = video.tracks.find((path) => basename(path) === `${video.name}.vtt`);
  assert.ok(track !== undefined, `ролик ${video.name}: нет дорожки для main-генератора глав`);
  await cp(track, join(root, `${video.name}.vtt`));
  await runNode(join(film, 'tools/make-chapters.mjs'), film);
  const produced = (await vttUnder(root)).find((path) => basename(path).endsWith('.chapters.vtt'));
  assert.ok(produced !== undefined, `ролик ${video.name}: make-chapters не собрал главы`);
  for (const track of video.chapters) await sameTrack(video.name, track, produced, 'chapters');
};

const FFPROBE_SHIM = [
  '#!/usr/bin/env node',
  "const file = process.argv.at(-1) ?? '';",
  'const found = /scene-(\\d+)\\.mp3$/u.exec(file);',
  'const durations = JSON.parse(process.env.FFPROBE_DURATIONS ?? "{}");',
  'const scene = found === null ? null : String(Number(found[1]));',
  'if (scene === null || !(scene in durations)) process.exit(1);',
  'process.stdout.write(String(durations[scene]));',
  '',
].join('\n');

/** Сборка ролика целиком: VTT, главы, вёрстку и scenes.json пишет один build.mjs. */
const checkFilmBuild = async (video: Video, root: string, tracked: Set<string>): Promise<void> => {
  const film = await prepareFilm(video, root, true, tracked);
  const parsed: unknown = JSON.parse(await readFile(join(video.film, 'scenes.json'), 'utf8'));
  if (!Array.isArray(parsed)) assert.fail(`ролик ${video.name}: scenes.json не массив`);
  const durations: Record<string, number> = {};
  for (const scene of parsed) {
    if (!isRecord(scene) || typeof scene.n !== 'number') continue;
    if (typeof scene.audioDuration === 'number') durations[String(scene.n)] = scene.audioDuration;
  }
  const bin = join(root, 'bin');
  await mkdir(bin);
  await writeFile(join(bin, 'ffprobe'), FFPROBE_SHIM);
  await chmod(join(bin, 'ffprobe'), 0o755);
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH ?? ''}`,
    FFPROBE_DURATIONS: JSON.stringify(durations),
  };
  await runNode(join(film, 'tools/build.mjs'), film, env);
  const produced = await vttUnder(root);
  const expected = [...video.tracks, ...video.chapters];
  for (const track of expected) {
    const found = produced.find((path) => basename(path) === basename(track));
    assert.ok(found !== undefined, `ролик ${video.name}: build.mjs не собрал ${basename(track)}`);
    await sameTrack(video.name, track, found, 'build');
    if (!track.endsWith('.chapters.vtt')) await checkDurations(video.name, track, found);
  }
  const scenesNow = await readFile(join(film, 'scenes.json'), 'utf8');
  const scenesInGit = await readFile(join(video.film, 'scenes.json'), 'utf8');
  assert.equal(
    scenesNow,
    scenesInGit,
    `ролик ${video.name}: пересобранный scenes.json разошёлся с закоммиченным — запусти node video/${video.name}/film/tools/build.mjs`,
  );
};

const temporary = await mkdtemp(join(tmpdir(), 'video-captions-'));
const tracked = await trackedFiles();
const videos = discoverVideos(tracked);
const guards: Promise<void>[] = [];
after(async () => {
  await rm(temporary, { recursive: true, force: true });
});

for (const video of videos) {
  if (video.tracks.length === 0 && video.chapters.length === 0) continue;
  if (video.blockedBy !== undefined) continue;
  guards.push(
    test(`ролик ${video.name}: дорожки совпадают с генератором`, async () => {
      const root = await mkdtemp(join(temporary, `${video.name}-`));
      try {
        if (video.generator === 'build') {
          await checkFilmBuild(video, root, tracked);
          return;
        }
        const film = await prepareFilm(video, root, false, tracked);
        await runNode(
          join(film, 'tools', GENERATOR_FILE[video.generator ?? 'build-captions']),
          film,
        );
        const captionVtt = (await vttUnder(root)).filter((path) => !path.endsWith('.chapters.vtt'));
        assert.equal(
          captionVtt.length,
          1,
          `ролик ${video.name}: генератор собрал ${captionVtt.length} дорожек вместо одной`,
        );
        const produced = captionVtt[0];
        assert.ok(produced !== undefined);
        await checkCaptionTrack(video, produced);
        if (video.chapters.length > 0)
          await checkChaptersTrack(video, join(root, 'chapters'), tracked);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }),
  );
}

guards.push(
  test('голосовые alignment block-0 и block-map сверяются с закоммиченными', async () => {
    await checkAlignmentSources(tracked);
  }),
);

guards.push(
  test('ручные дорожки перечислены с причиной, порог <0,7 с проверяется', async (t) => {
    const manual = videos
      .filter(
        (video) =>
          video.blockedBy !== undefined && (video.tracks.length > 0 || video.chapters.length > 0),
      )
      .map((video) => video.name)
      .sort();
    assert.deepEqual(
      manual,
      Object.keys(MANUAL).sort(),
      'список ручных дорожек в тесте разошёлся с деревом',
    );
    for (const name of manual) t.diagnostic(`ролик ${name}: ${MANUAL[name] ?? ''}`);
    for (const video of videos)
      if (video.blockedBy !== undefined)
        for (const track of video.tracks) await checkManualDurations(track);
  }),
);

guards.push(
  test('каждая закоммиченная дорожка сравнена или явно отнесена к ручным', async () => {
    const listed = (await exec('git', ['ls-files', '--', '*.vtt'])).stdout
      .split('\n')
      .filter((path) => path !== '');
    const known = new Set<string>();
    for (const video of videos)
      for (const track of [...video.tracks, ...video.chapters]) known.add(track);
    assert.deepEqual(
      listed.filter((path) => !known.has(path)),
      [],
      'в Git есть дорожки, которые тест не видит: добавь их ролику',
    );
    assert.deepEqual(
      [...known].filter((path) => !listed.includes(path)),
      [],
      'тест ждёт дорожки, которых нет в Git',
    );
    for (const track of listed) {
      // Главы — тоже дорожки: раздел короче 0,7 с нечитаем, скан общий для всех VTT.
      const flashing = cuesOf(await readFile(track, 'utf8'))
        .filter((cue) => cue.duration < MIN_HARD_SECONDS)
        .map((cue) => `${cue.cue} (${cue.duration.toFixed(3)} с)`);
      assert.deepEqual(flashing, [], `${track}: реплики короче ${MIN_HARD_SECONDS} с — мелькание`);
    }
    for (const [track, exceptions] of Object.entries(DURATION_EXCEPTIONS)) {
      assert.ok(
        known.has(track),
        `исключение по длительности ссылается на неизвестную дорожку ${track}`,
      );
      for (const [number, reason] of [
        ...Object.entries(exceptions.short),
        ...Object.entries(exceptions.long),
      ]) {
        assert.ok(Number(number) >= 1, `исключение ${track}: номер реплики ${number}`);
        assert.ok(
          reason.trim().length >= 10,
          `исключение ${track} #${number}: причина пустая или короче 10 символов`,
        );
      }
      const cues = cuesOf(await readFile(track, 'utf8'));
      const short = cues
        .filter((cue) => cue.duration >= MIN_HARD_SECONDS && cue.duration < 1)
        .map((cue) => cue.cue);
      const long = cues.filter((cue) => cue.duration > 7).map((cue) => cue.cue);
      assert.deepEqual(
        [short, long],
        [Object.keys(exceptions.short).map(Number), Object.keys(exceptions.long).map(Number)],
        `исключение устарело для ${track}: проверь DURATION_EXCEPTIONS`,
      );
    }
  }),
);

await Promise.all(guards);
