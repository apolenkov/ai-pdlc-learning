import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { readIntentPageSource } from './course-map.ts';
import { addGuideVideo } from './guide-video.ts';
import { fixture, playerFixture } from './guide-video-test-support.ts';
import { renderGuide } from './learner-guide-test-support.ts';

const SITE_DIR = resolve(import.meta.dirname, '..', 'docs/pages/sdlc-development');
const GUIDES_DIR = join(SITE_DIR, 'guides');

/** Page#fragment step links exposed by the course map and the intent page (p1-zachem.html#step-05). */
const stepLinks = async (file: string): Promise<{ page: string; step: string }[]> => {
  // The intent map is a generated part: read the page as the build publishes it, with the part spliced in.
  const html =
    file === 'guides/intent.html'
      ? await readIntentPageSource()
      : await readFile(join(SITE_DIR, file), 'utf8');
  return [...html.matchAll(/href="[^"#]*?([a-z0-9-]+\.html)#(step-[a-z0-9-]+)"/gu)].map(
    ([, page, step]) => ({ page: page!, step: step! }),
  );
};

await test('every step link of the course map and the intent page opens a rendered anchor', async () => {
  const links = (
    await Promise.all(['guides/index.html', 'guides/intent.html'].map(stepLinks))
  ).flat();
  assert.equal(links.length > 0, true, 'the map and the intent page expose step links');
  for (const { page, step } of new Map(
    links.map((link) => [`${link.page}#${link.step}`, link]),
  ).values()) {
    // The per-stage shell decides which stage the page renders; the anchor must exist in that render.
    const shell = (await readFile(join(GUIDES_DIR, page), 'utf8')).match(/data-stage="([^"]+)"/u);
    assert.ok(shell, `${page} declares data-stage`);
    const stage = shell[1]!;
    const html = await renderGuide(stage);
    assert.ok(html.includes(`id="${step}"`), `#${step} is rendered on ${page}`);
  }
});

await test('a guide page opened on a step fragment scrolls to the rendered step', async () => {
  const scrolls: { id: string; block?: string }[] = [];
  const html = await renderGuide('0', undefined, undefined, undefined, {
    hash: '#step-05',
    scrolls,
  });
  assert.ok(html.includes('id="step-05"'), 'the anchor target exists in the rendered body');
  assert.deepEqual(
    scrolls,
    [{ id: 'step-05', block: 'start' }],
    'the landing scroll targets the step after the body is rendered',
  );
});

await test('the novice link targets the preparation heading before access, goals and rationale', async () => {
  for (const stage of ['0', '0a', '1']) {
    const html = await renderGuide(stage);
    assert.match(html, /<a href="#course-prereq">Перед началом ↓<\/a>/u);
    assert.match(
      html,
      /<section class="card card--prep" id="course-prereq"><h2>Перед началом<\/h2><p>/u,
    );
    const start = html.indexOf('id="course-prereq"');
    const checklist = html.indexOf('<summary>Что подготовить</summary>');
    assert.ok(checklist > start);
    const prep = html.slice(start, checklist);
    assert.match(prep, /<p>[\s\S]*?<details class="lesson-goal">/u);
    if (stage !== '0') assert.match(prep, /id="course-why"/u);
  }
});

await test('a page fragment for a hidden player section reveals the section before metadata', async (t) => {
  const { root, out } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await addGuideVideo(out, root), true);
  const player = await readFile(join(out, 'guides/assets/video/guide-video.js'), 'utf8');

  const main = playerFixture(player);
  assert.equal(main.goalSections[0]!.id, 'lesson-video', 'the map film rows link to #lesson-video');
  assert.equal(
    main.goalSections[0]!.hidden,
    true,
    'without a fragment the player waits for metadata',
  );

  assert.equal(main.goalFold.open, false, 'the lesson starts with the film folded');
  const filmLink = playerFixture(player, undefined, '#lesson-video');
  assert.equal(filmLink.goalFold.open, true, 'a direct film link opens its preparation disclosure');
  assert.deepEqual(
    filmLink.scrolls.map(({ block }) => block),
    ['start'],
  );
  filmLink.goalFold.open = false;
  filmLink.disclosure.open = false;
  filmLink.clickLink('#lesson-video');
  assert.equal(filmLink.goalFold.open, true, 'the repeated link reopens the lesson goal');
  assert.equal(filmLink.disclosure.open, true, 'the repeated link reopens the film inside it');
  main.video.dispatchEvent(new Event('loadedmetadata'));
  main.watch.dispatchEvent(new Event('click'));
  assert.equal(main.goalFold.open, true, 'watching a step opens the film before playback');

  main.goalFold.dispatchEvent(new Event('toggle'));
  assert.equal(main.video.paused, false, 'opening the card allows playback');
  main.goalFold.open = false;
  main.goalFold.dispatchEvent(new Event('toggle'));
  assert.equal(main.video.paused, true, 'closing the playing film pauses it');
  main.goalFold.open = true;
  main.goalFold.dispatchEvent(new Event('toggle'));
  assert.equal(main.video.paused, true, 'reopening the card leaves the film paused');

  main.watch.dispatchEvent(new Event('click'));
  assert.equal(main.video.paused, false);
  main.disclosure.open = false;
  main.disclosure.dispatchEvent(new Event('toggle'));
  assert.equal(main.video.paused, true, 'closing the inner film also pauses playback');

  // intent.html opens the extra film on #lesson-video-dark; such a page must land on a visible block, not a hidden section.
  const extra = playerFixture(player, 'step-06', '#lesson-video-dark', 'dark');
  assert.equal(
    extra.extraSections[0]!.id,
    'lesson-video-dark',
    'the slot section keeps its id suffix',
  );
  assert.equal(
    extra.extraSections[0]!.hidden,
    false,
    'the matching fragment reveals the section before loadedmetadata',
  );
});
