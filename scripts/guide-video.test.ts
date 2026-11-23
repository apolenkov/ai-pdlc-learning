import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import {
  addGuideVideo,
  addGuideVideos,
  pagesWithVideo,
  BLOCK_0,
  BLOCK_0A,
  BLOCK_DARK,
  BLOCK_MAP,
  BLOCK_SDD,
  GUIDE_VIDEO_DIR,
  GUIDE_VIDEOS,
} from './guide-video.ts';
import { fixture, playerFixture, placeFilm } from './guide-video-test-support.ts';

await test('without the mp4 the built page is untouched', async (t) => {
  const { root, out, page } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root), false);
  assert.equal(await readFile(join(out, 'guides/p2-git.html'), 'utf8'), page);
});

await test('the films are hidden unless PAGES_WITH_VIDEO=1: no player and no mp4 in the output, with the switch the player returns', async (t) => {
  const { root, out, page } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await placeFilm(root, BLOCK_0, 'block-0-720p.mp4', Buffer.from('public film'));
  await writeFile(join(out, BLOCK_0.page), page);
  assert.equal(pagesWithVideo({}), false);
  assert.equal(pagesWithVideo({ PAGES_WITH_VIDEO: '0' }), false);
  assert.equal(pagesWithVideo({ PAGES_WITH_VIDEO: '1' }), true);
  assert.deepEqual([...(await addGuideVideos(out, false, root))], []);
  assert.equal(await readFile(join(out, 'guides/p2-git.html'), 'utf8'), page);
  await assert.rejects(() => stat(join(out, 'guides/assets/video')), { code: 'ENOENT' });
  assert.deepEqual([...(await addGuideVideos(out, true, root))], [BLOCK_0.page]);
  assert.ok((await stat(join(out, 'guides/assets/video/block-0-720p.mp4'))).isFile());
  await assert.rejects(stat(join(out, 'guides/assets/video/block-0a.mp4')), { code: 'ENOENT' });
});

await test('the course map names a film only where its player is embedded', async (t) => {
  const row = (page: string) => `<li data-film="${page}" hidden><span>Ролик</span>4:47</li>`;
  const map = `<main>${row('guides/p2-git.html')}${row('guides/p1-zachem.html')}</main>`;
  for (const withVideo of [false, true]) {
    const { root, out } = await fixture(withVideo);
    t.after(() => rm(root, { recursive: true, force: true }));
    await writeFile(join(out, 'guides/index.html'), map);
    assert.equal(await addGuideVideo(out, root), withVideo);
    const html = await readFile(join(out, 'guides/index.html'), 'utf8');
    assert.equal(
      html.includes('<li data-film="guides/p2-git.html" data-src="assets/video/'),
      withVideo,
      withVideo ? 'embedded film is shown on the map' : 'no mp4: the map hides the film',
    );
    assert.ok(html.includes(row('guides/p1-zachem.html')), 'other films stay hidden');
  }
});

await test('with the mp4 the player, styles, subtitles and chapters are added to block-0a only', async (t) => {
  const { root, out } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root), true);
  const html = await readFile(join(out, 'guides/p2-git.html'), 'utf8');
  assert.match(html, /<link rel="stylesheet" href="assets\/video\/guide-video\.css"><\/head>/u);
  assert.match(
    html,
    /id="guide-video-chapters" data-file="block-0a\.mp4" data-vtt="block-0a\.vtt" data-aria="[^"]+" data-steps="1" data-poster="block-0a-poster\.jpg">\[\{"n":0,/u,
  );
  assert.match(html, /<script src="assets\/video\/guide-video\.js"><\/script><\/body>/u);
  for (const name of [
    'block-0a.mp4',
    'block-0a.vtt',
    'block-0a-poster.jpg',
    'guide-video.css',
    'guide-video.js',
  ]) {
    assert.ok((await readFile(join(out, 'guides/assets/video', name))).length > 0, name);
  }
  assert.doesNotMatch(
    await readFile(join(out, 'guides/assets/video/guide-video.js'), 'utf8'),
    /\btype Chapter\b/u,
  );
});

await test('a file that differs from the manifest fails the build', async (t) => {
  const { root, out } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, GUIDE_VIDEO_DIR, 'block-0a.mp4'), 'tampered');
  await assert.rejects(() => addGuideVideo(out, root), /does not match video-manifest\.json/u);
});

await test('the player scrolls below the fixed site panel: block start under the global scroll-margin-top rule', async (t) => {
  const { root, out } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root), true);
  /* The player section has an id, so the global anchor rule of the site panel gives it the margin; `block: "center"` ignored it in short windows. */
  const nav = await readFile(resolve('docs/pages/sdlc-development/site-nav.css'), 'utf8');
  assert.match(
    nav,
    /\[id\]\s*\{\s*scroll-margin-top:\s*calc\(var\(--site-nav-reserve\)\s*-\s*4px\)/,
  );
  const script = await readFile(join(out, 'guides/assets/video/guide-video.js'), 'utf8');
  const assertScroll = (source: string) => {
    const player = playerFixture(source);
    player.video.dispatchEvent(new Event('loadedmetadata'));
    player.watch.dispatchEvent(new Event('click'));
    assert.equal(player.disclosure.open, true, 'watch opens the main film');
    assert.equal(player.scrolls.length, 1, 'the registered watch click scrolls the player');
    assert.equal(player.scrolls[0]!.block, 'start');
  };
  assertScroll(script);
});

await test('the film attribution summary has no disclosure marker, as on the home page, and keeps its focus ring', async () => {
  const css = await readFile(
    resolve('docs/pages/sdlc-development/guides/assets/video/guide-video.css'),
    'utf8',
  );
  const rules = (selector: string): string[] =>
    [...css.matchAll(/(^|\n)([^{}\n]+)\{([^}]*)\}/gu)]
      .filter((match) => match[2]!.split(',').some((part) => part.trim() === selector))
      .map((match) => match[3]!);
  const summary = '.lesson-video__credit summary';
  assert.ok(
    rules(summary).some((body) => /list-style:\s*none/u.test(body)),
    'the native list-item marker is removed',
  );
  assert.ok(
    rules(`${summary}::-webkit-details-marker`).some((body) => /display:\s*none/u.test(body)),
    'the WebKit disclosure marker is hidden',
  );
  assert.ok(
    rules(`${summary}::marker`).some((body) => /content:\s*""/u.test(body)),
    'the standard ::marker is emptied',
  );
  assert.ok(
    rules(`${summary}:focus-visible`).some((body) => /outline:\s*3px solid/u.test(body)),
    'the keyboard focus ring stays',
  );
  assert.ok(
    rules(summary).some((body) => /cursor:\s*pointer/u.test(body)),
    'the summary stays clickable',
  );
});

await test('the main player is in the lesson goal without file links or a duplicate; extras keep their slot', async (t) => {
  const { root, out } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root), true);
  const player = await readFile(join(out, 'guides/assets/video/guide-video.js'), 'utf8');
  const assertMetadata = (source: string) => {
    const app = playerFixture(source);
    assert.equal(app.sections.length, 0, 'no player remains at the steps');
    assert.equal(app.goalSections.length, 1, 'one primary player in the lesson goal');
    const section = app.goalSections[0]!;
    assert.ok(section.id, 'the visible player has a real anchor');
    assert.equal(section.hidden, true, 'the player waits for metadata');
    assert.equal(app.controls.length, 0, 'step controls wait for metadata');
    assert.equal(app.links.length, 0, 'the film link waits for metadata');
    app.video.dispatchEvent(new Event('loadedmetadata'));
    assert.equal(section.hidden, false);
    assert.equal(app.controls.length, 1, 'production controls are inserted after the step heading');
    assert.match(app.controls[0]!.innerHTML, /<button[^>]*data-watch[^>]*>Смотреть шаг<\/button>/u);
    assert.match(
      app.controls[0]!.innerHTML,
      /<button[^>]*data-again hidden[^>]*>Повторить шаг<\/button>/u,
    );
    assert.deepEqual(app.links, [], 'the inline player needs no goal link');
    assert.doesNotMatch(section.innerHTML, /target="_blank"|download|Открыть видео/u);
    return section.innerHTML;
  };
  const markup = assertMetadata(player);
  assert.match(
    markup,
    /<details class="lesson-video__disclosure"><summary[^>]*>Видео к уроку<\/summary>\s*<div class="lesson-video__layout">/u,
  );
  const linked = playerFixture(player, undefined, '#lesson-video');
  assert.equal(linked.disclosure.open, true);
  linked.disclosure.open = false;
  linked.clickLink('p1-zachem.html#lesson-video');
  linked.clickLink('#step-01');
  assert.equal(linked.disclosure.open, false, 'other links leave the film collapsed');
  linked.clickLink('#lesson-video');
  assert.equal(linked.disclosure.open, true, 'a repeat click opens the film without hashchange');
  for (const slot of ['step-06', 'howto-film']) {
    const extra = playerFixture(player, slot);
    assert.equal(extra.goalSections.length, 0);
    assert.equal(extra.sections.length, 0);
    assert.equal(extra.extraSections.length, 1, slot);
  }
  // A slot player titles itself one level below the heading it follows: H3 after a section title, H4 after a step title, H6 at most.
  for (const [above, level] of [
    ['H2', 3],
    ['H3', 4],
    ['H5', 6],
    ['H6', 6],
  ] as const) {
    const [titled] = playerFixture(player, 'howto-film', '', undefined, above).extraSections;
    assert.match(titled!.innerHTML, new RegExp(`<h${level} id="lesson-video-title`, 'u'), above);
  }
  // Owner's word 19.10 10:02: no "now playing" line, no key hints and no transcript under the film.
  assert.doesNotMatch(markup, /lesson-video__(now|keys)|Клавиши|Сейчас:|К тексту шага/u);
  const map = await readFile(
    resolve(import.meta.dirname, '..', 'docs/pages/sdlc-development/guides/index.html'),
    'utf8',
  );
  assert.equal(
    [
      ...map.matchAll(
        /<li data-film="guides\/([^"]+)" hidden><span>Ролик<\/span><a href="\1#lesson-video">\d+:\d\d<\/a><\/li>/gu,
      ),
    ].length,
    // The withdrawn block-0a film (П2) has no row.
    11,
    'every film row of the map links to its player',
  );
});

await test('П3+: without its manifest the build skips the extra film; with it the page gets one player script, two data blocks and both map rows open', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'guide-video-dark-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const out = join(root, 'out');
  await mkdir(join(out, 'guides'), { recursive: true });
  const page = '<html><head></head><body><main id="guide-content"></main></body></html>';
  await writeFile(join(out, 'guides/p3-sdd.html'), page);
  const row = (key: string) =>
    `<li data-film="${key}" hidden><span>Ролик</span><a href="p3-sdd.html">3:00</a></li>`;
  await writeFile(
    join(out, 'guides/index.html'),
    `<main>${row('guides/p3-sdd.html')}${row('guides/p3-sdd.html#dark')}</main>`,
  );

  assert.equal(
    await addGuideVideo(out, root, BLOCK_DARK),
    false,
    'no manifest: skipped, nothing added',
  );
  assert.equal(await readFile(join(out, 'guides/p3-sdd.html'), 'utf8'), page);
  assert.equal(BLOCK_DARK.extra?.id, 'dark');
  assert.deepEqual(
    GUIDE_VIDEOS.slice(-2),
    [BLOCK_DARK, BLOCK_MAP],
    'the extra films go last so video:fetch does not stop before the others',
  );

  await placeFilm(root, BLOCK_SDD, 'block-sdd-720p.mp4', Buffer.from('sdd film'));
  await placeFilm(root, BLOCK_DARK, 'block-dark-factory-720p.mp4', Buffer.from('dark film'));
  assert.equal(await addGuideVideo(out, root, BLOCK_DARK), true);
  assert.equal(await addGuideVideo(out, root, BLOCK_SDD), true);
  const html = await readFile(join(out, 'guides/p3-sdd.html'), 'utf8');
  assert.equal(
    html.split('assets/video/guide-video.js').length,
    2,
    'one player script for both films',
  );
  assert.equal(
    html.split('assets/video/guide-video.css').length,
    2,
    'one stylesheet for both films',
  );
  assert.doesNotMatch(
    html,
    /video-transcript|lesson-video__now|Музыка курса|обрезан|нормализован|сведён|сведены|приглушены/u,
  );
  assert.equal(
    html.match(
      /<template id="guide-video-credit[^"]*"><details class="lesson-video__credit"><summary>Музыка и звук<\/summary>Музыка: <a[^>]*>«Relaxing Ambient»<\/a> и <a[^>]*>«Serene and Peaceful Ambience»<\/a> — Matio888, <a[^>]*>CC BY 4\.0<\/a>, с изменениями\. Звук: <a[^>]*>«Pop, Low, A \(H1\)\.wav»<\/a> — InspectorJ, CC BY 4\.0, с изменениями\.<\/details>/gu,
    )?.length,
    2,
    'each film carries the folded, owner-approved attribution',
  );
  for (const source of [
    'https://freesound.org/people/Matio888/sounds/796050',
    'https://freesound.org/people/Matio888/sounds/796135',
    'https://freesound.org/people/InspectorJ/sounds/411639',
    'https://creativecommons.org/licenses/by/4.0/',
  ])
    assert.equal(html.split(`href="${source}"`).length - 1, 2, source);
  const ids = [
    ...html.matchAll(/<script type="application\/json" id="(guide-video-chapters[^"]*)"([^>]*)>/gu),
  ];
  assert.deepEqual(ids.map((match) => match[1]).sort(), [
    'guide-video-chapters',
    'guide-video-chapters-dark',
  ]);
  const dark = ids.find((match) => match[1] === 'guide-video-chapters-dark')![2]!;
  assert.match(dark, /data-file="block-dark-factory-720p\.mp4"/u);
  assert.match(dark, /data-slot="step-06" data-id="dark" data-goal="Смотреть ролик о фабрике ↓"/u);
  assert.doesNotMatch(
    ids.find((match) => match[1] === 'guide-video-chapters')![2]!,
    /data-slot/u,
    'the page film has no slot',
  );
  assert.ok(
    html.lastIndexOf('id="guide-video-chapters') <
      html.indexOf('<script src="assets/video/guide-video.js">'),
    'both data blocks come before the player script',
  );
  const map = await readFile(join(out, 'guides/index.html'), 'utf8');
  assert.equal(
    [...map.matchAll(/<li data-film="[^"]+" hidden>/gu)].length,
    0,
    'both map rows are open',
  );
});

await test('block-0a is withdrawn: its manifest has no release URL, says why, and no page plays it', async () => {
  // Part 8 of the film shows a corporate GitLab, so the public release does not carry it.
  const manifest: unknown = JSON.parse(await readFile(resolve(BLOCK_0A.manifest), 'utf8'));
  assert.ok(manifest !== null && typeof manifest === 'object');
  assert.equal('url' in manifest, false);
  assert.ok('withdrawn' in manifest && typeof manifest.withdrawn === 'string');
  assert.match(manifest.withdrawn, /^не публикуется/u);
  assert.equal(GUIDE_VIDEOS.includes(BLOCK_0A), false);
  assert.equal(
    GUIDE_VIDEOS.some((spec) => spec.manifest === BLOCK_0A.manifest),
    false,
  );
  // No page links its player or a chapter of it: the build embeds no player there, the anchor would lead nowhere.
  const page = BLOCK_0A.page.split('/').pop()!;
  const sources = resolve(import.meta.dirname, '..', 'docs/pages/sdlc-development');
  const linking: string[] = [];
  for (const entry of await readdir(sources, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(?:html|ts|json|md)$/u.test(entry.name)) continue;
    const path = join(entry.parentPath, entry.name);
    if ((await readFile(path, 'utf8')).includes(`${page}#lesson-video`)) linking.push(path);
  }
  assert.deepEqual(linking, [], `links to ${page}#lesson-video`);
});
