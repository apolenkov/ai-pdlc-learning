import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import { buildLearningSite } from './build-learning-pages.ts';
import { fetchGuideVideo } from './fetch-guide-video.ts';
import { addLandingVideo, LANDING_VIDEO, readLandingVideoManifest } from './landing-video.ts';
import { mediaUrl } from './media-release.ts';
import { publishedTextProblems } from './published-text.ts';
import { outsideRequests } from './site-requests.ts';
import { GUIDE_VIDEO_DIR, sha256, verifyVideoAsset } from './video-manifest.ts';

await test('the landing manifest pins the tracked poster, captions and chapter files', async () => {
  const root = resolve(import.meta.dirname, '..');
  const source = dirname(join(root, LANDING_VIDEO.manifest));
  const { poster, tracks } = await readLandingVideoManifest(root);
  for (const asset of [poster, tracks.captions, tracks.chapters, tracks.chaptersJson])
    verifyVideoAsset(await readFile(join(source, asset.file)), asset);
  const chapters = await readFile(join(source, tracks.chapters.file), 'utf8');
  assert.deepEqual(
    chapters
      .trim()
      .split(/\r?\n\r?\n/u)
      .slice(1)
      .map((cue) => cue.split(/\r?\n/u).at(-1)),
    ['Главная', 'Карта PDLC', 'Намерение и план', 'Анализ', 'Справка'],
  );
});

async function writeFixture(root: string) {
  const cache = join(root, GUIDE_VIDEO_DIR);
  const manifestPath = join(root, LANDING_VIDEO.manifest);
  const source = dirname(manifestPath);
  const mp4 = Buffer.from('synthetic release bytes');
  const poster = Buffer.from('synthetic poster bytes');
  const captions = Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:01:10.600\nОбзор карты\n');
  const chapters = Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:01:10.600\nГлавная\n');
  const describe = (file: string, bytes: Buffer) => ({
    file,
    size: bytes.length,
    sha256: sha256(bytes),
  });
  const manifest = {
    file: 'overview recut.mp4',
    size: mp4.length,
    sha256: sha256(mp4),
    url: mediaUrl('overview recut.mp4', sha256(mp4)),
    duration: 70.6,
    version: sha256(mp4).slice(0, 12),
    captions: 1,
    chapters: 1,
    poster: describe('overview-recut.webp', poster),
    tracks: {
      captions: { ...describe('transcript ru.vtt', captions), kind: 'captions', srclang: 'ru-RU' },
      chapters: { ...describe('route sections.vtt', chapters), kind: 'chapters', srclang: 'ru' },
      chaptersJson: describe('sections.json', Buffer.from('[]')),
    },
  };
  await mkdir(cache, { recursive: true });
  await mkdir(source, { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest));
  const files = [
    [manifest.poster.file, poster],
    [manifest.tracks.captions.file, captions],
    [manifest.tracks.chapters.file, chapters],
  ] as const;
  for (const [name, data] of files) await writeFile(join(source, name), data);

  return { cache, source, mp4, manifest, files };
}

await test('public build embeds the verified release and its local tracks only with the video switch', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'landing-film-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = join(root, 'site');
  const { cache, source, mp4, manifest, files } = await writeFixture(root);
  const html = () => readFile(join(output, 'index.html'), 'utf8');
  const assets = join(output, LANDING_VIDEO.outputDir);
  const noFilm = async () => {
    assert.doesNotMatch(await html(), /<video|<figure class="hero-media"/u);
    await assert.rejects(readdir(assets), { code: 'ENOENT' });
  };
  const original = { ...process.env };
  t.after(() => {
    for (const name of ['PAGES_WITH_VIDEO', 'COURSE_NAV']) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  });
  process.env.COURSE_NAV = 'public';
  process.env.PAGES_WITH_VIDEO = '1';
  await buildLearningSite(output);
  assert.equal(await addLandingVideo(output, root), false);
  await noFilm();

  const download = async (url: string, part: string) => {
    assert.equal(url, manifest.url);
    await writeFile(part, mp4);
  };
  assert.equal(await fetchGuideVideo(root, download, LANDING_VIDEO), 'fetched');
  assert.equal(await fetchGuideVideo(root, download, LANDING_VIDEO), 'present');
  process.env.PAGES_WITH_VIDEO = '0';
  await buildLearningSite(output);
  assert.equal(await addLandingVideo(output, root), false);
  await noFilm();

  process.env.PAGES_WITH_VIDEO = '1';
  await buildLearningSite(output);
  await noFilm();
  for (const [name, bytes] of files) {
    await t.test(`rejects a SHA256 mismatch for ${name} before publishing any files`, async (t) => {
      t.after(() => writeFile(join(source, name), bytes));
      await writeFile(join(source, name), Buffer.alloc(bytes.length));
      await assert.rejects(addLandingVideo(output, root), {
        message: /SHA256 differs from the manifest/u,
      });
      await noFilm();
    });
  }
  assert.equal(await addLandingVideo(output, root), true);
  const page = await html();
  assert.doesNotMatch(page, /<!-- landing-film:/u);
  const figure = page.match(/<figure class="hero-media">[\s\S]*?<\/figure>/u)?.[0];
  assert.ok(figure);
  assert.match(
    figure,
    /<video controls preload="metadata" playsinline width="640" height="360".*aria-label="Видео: один маршрут по главной странице, 1 мин 10 с">/u,
  );
  assert.match(figure, /<source [^>]*type="video\/mp4">/u);
  assert.match(
    figure,
    /<track kind="captions" srclang="ru-RU" label="Русские субтитры" [^>]* default>/u,
  );
  assert.match(figure, /<track kind="chapters" srclang="ru" /u);
  assert.match(
    figure,
    /<figcaption>Обзор главной: карта PDLC, курсы и справка · 1:10<\/figcaption>/u,
  );
  assert.deepEqual(
    [...figure.matchAll(/(?:src|poster)="([^"]+)"/gu)].map((match) => match[1]),
    [
      manifest.poster.file,
      manifest.file,
      manifest.tracks.captions.file,
      manifest.tracks.chapters.file,
    ].map((name) => './media/landing-route/' + encodeURIComponent(name)),
  );
  assert.deepEqual(await readFile(join(assets, manifest.file)), mp4);
  for (const [name, bytes] of files) assert.deepEqual(await readFile(join(assets, name)), bytes);
  assert.deepEqual(
    (await readdir(assets)).sort(),
    [manifest.file, ...files.map(([name]) => name)].sort(),
  );
  assert.deepEqual(await outsideRequests(output), []);
  assert.deepEqual(await publishedTextProblems(output), []);

  await writeFile(join(cache, manifest.file), Buffer.alloc(mp4.length));
  await assert.rejects(addLandingVideo(output, root), /SHA256 differs/u);
  await writeFile(join(cache, manifest.file), 'short');
  await assert.rejects(addLandingVideo(output, root), /size differs/u);
  await writeFile(join(cache, manifest.file), mp4);
  process.env.COURSE_NAV = 'customdev';
  await buildLearningSite(output);
  assert.equal(await addLandingVideo(output, root), false);
  assert.match(await html(), /http-equiv="refresh" content="0;url=guides\/index.html"/u);
  await noFilm();
});
