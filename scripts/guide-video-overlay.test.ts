import assert from 'node:assert/strict';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import route from '../docs/pages/sdlc-development/guides/route-steps.json' with { type: 'json' };
import { routeLabel } from '../docs/pages/sdlc-development/guides/renderer/common.ts';
import { buildLearningSite } from './build-learning-pages.ts';
import { addGuideVideo, GUIDE_VIDEOS, GUIDE_VIDEO_DIR, sha256 } from './guide-video.ts';
import { fixture, mp4 } from './guide-video-test-support.ts';
import { escapeHtml } from './site-navigation-contract.ts';

const nextPages: Record<string, string[]> = {
  'p1-zachem.html': ['p2-git.html'],
  'p2-git.html': ['p3-sdd.html'],
  'p3-sdd.html': ['p4-metarepository.html'],
  'p4-metarepository.html': ['s1-git.html'],
  's1-git.html': ['s2-review.html'],
  's2-review.html': ['s3-openspec.html'],
  's3-openspec.html': ['s4-team.html'],
  's4-team.html': ['s4-product.html'],
  's4-product.html': ['s4a-new.html', 's4b-legacy.html'],
  's4a-new.html': ['d1-delivery.html'],
  's4b-legacy.html': ['d1-delivery.html'],
  'd1-delivery.html': ['index.html'],
  'index.html': ['p1-zachem.html'],
  'i1-effect.html': ['i2-bounds.html'],
  'i2-bounds.html': ['i3-plan.html'],
  'i3-plan.html': ['i4-accept.html'],
  'i4-accept.html': ['intent.html'],
  'intent.html': ['i1-effect.html'],
};

await test('all 18 built players use the menu label and link the next route, including branches and extras', async (t) => {
  const { root, out } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await buildLearningSite(out);
  assert.equal(GUIDE_VIDEOS.length, 18);
  for (const spec of GUIDE_VIDEOS) {
    const file = `${spec.extra?.id ?? spec.page.split('/').at(-1)}.mp4`;
    await mkdir(dirname(join(root, spec.manifest)), { recursive: true });
    for (const path of [spec.vtt, spec.chapters]) await cp(path, join(root, path));
    await writeFile(join(root, GUIDE_VIDEO_DIR, file), mp4);
    await writeFile(
      join(root, spec.manifest),
      JSON.stringify({ file, sha256: sha256(mp4), size: mp4.length, url: 'https://example.test' }),
    );
    assert.equal(await addGuideVideo(out, root, spec), true);
  }
  for (const spec of GUIDE_VIDEOS) {
    const html = await readFile(join(out, spec.page), 'utf8');
    const id = `guide-video-overlay${spec.extra ? `-${spec.extra.id}` : ''}`;
    const overlay = html.match(new RegExp(`<template id="${id}">([^]*?)</template>`, 'u'))?.[1];
    assert.ok(overlay, `${spec.manifest}: overlay is delivered on the built page`);
    if (spec.playerTitle)
      assert.ok(
        html.includes(`data-player-title="${spec.playerTitle}"`),
        `${spec.manifest}: the slot player carries its own heading`,
      );
    const step = route.find((entry) => spec.page === `guides/${entry.href}`);
    const label = escapeHtml(
      spec.extra?.id === 'dark'
        ? 'Дополнение к подготовке · SDD и OpenSpec · Перспектива: фабрика'
        : step
          ? routeLabel(step)
          : 'Видео: карта курса',
    );
    for (const name of ['corner']) {
      assert.equal(
        overlay.match(new RegExp(`class="lesson-video__${name}"[^>]*>([^<]*)</div>`, 'u'))?.[1],
        label,
        `${spec.manifest}: ${name} must match the menu`,
      );
    }
    assert.doesNotMatch(overlay, /lesson-video__intro/u);
    assert.match(overlay, /class="lesson-video__corner" aria-hidden="true" hidden/u);
    assert.match(overlay, /class="lesson-video__ending" hidden>/u);
    const links = [...overlay.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/gu)];
    assert.deepEqual(
      links.map((link) => link[1]),
      nextPages[spec.page.slice('guides/'.length)],
    );
    for (const [, href, text] of links) {
      assert.ok((await stat(join(out, 'guides', href!))).isFile(), `${href} exists`);
      const next = route.find((entry) => entry.href === href);
      assert.equal(
        text,
        next ? escapeHtml(routeLabel(next).replace(/^Шаг/u, 'шаг')) : 'К карте курса',
      );
    }
    // The analysis route ends after delivery; the intent course ends after its fourth step.
    const courseEnd = step?.number === '7' || spec.page === 'guides/i4-accept.html';
    assert.ok(overlay.includes(courseEnd ? 'Конец курса' : 'Дальше — '));
    if (links.length === 2) assert.ok(overlay.includes('</a> или <a'));
  }
});

const overlayPlayer = async () => {
  const corner = { hidden: true };
  const link = {};
  const ending = { hidden: true, contains: (element: unknown) => element === link };
  const nodes: Record<string, unknown> = {
    '.lesson-video__corner': corner,
    '.lesson-video__ending': ending,
  };
  const document = {
    activeElement: {},
    querySelector: () => ({ content: { cloneNode: () => nodes } }),
  };
  const video = Object.assign(new EventTarget(), {
    currentTime: 5,
    parentElement: {
      append: () => undefined,
      querySelector: (selector: string) => nodes[selector],
    },
    focus: () => {
      document.activeElement = video;
    },
  });
  const bundle = await build({
    entryPoints: [`${GUIDE_VIDEO_DIR}/player-overlay.ts`],
    bundle: true,
    format: 'iife',
    globalName: 'overlay',
    write: false,
  });
  runInNewContext(`${bundle.outputFiles[0]!.text}\noverlay.mountVideoOverlay(data, video);`, {
    document,
    video,
    data: { dataset: {} },
  });
  const state = () => ({ corner: !corner.hidden, ending: !ending.hidden });
  return { video, state, document, link };
};

await test('opening, seeks, ended hold and replay follow video events without exposing hidden links', async () => {
  const { video, state, document, link } = await overlayPlayer();
  const opening = { corner: false, ending: false };
  const playing = { corner: true, ending: false };
  const ended = { corner: false, ending: true };
  assert.deepEqual(state(), opening, 'poster at t=5 still shows the opening before first play');
  video.currentTime = 0;
  video.dispatchEvent(new Event('play'));
  video.currentTime = 2.99;
  video.dispatchEvent(new Event('timeupdate'));
  assert.deepEqual(state(), opening);
  video.currentTime = 3;
  video.dispatchEvent(new Event('timeupdate'));
  assert.deepEqual(state(), playing);
  video.dispatchEvent(new Event('pause'));
  assert.deepEqual(state(), playing);
  video.currentTime = 1;
  video.dispatchEvent(new Event('seeked'));
  assert.deepEqual(state(), opening);
  video.dispatchEvent(new Event('ended'));
  video.dispatchEvent(new Event('timeupdate'));
  assert.deepEqual(state(), ended);
  video.currentTime = 0;
  video.dispatchEvent(new Event('seeked'));
  assert.deepEqual(state(), ended, 'ending persists until replay');
  document.activeElement = link;
  video.dispatchEvent(new Event('play'));
  assert.deepEqual(state(), opening);
  assert.equal(
    document.activeElement,
    video,
    'replay returns focus from the hidden ending to video',
  );
});

await test('an extra film is labelled as the extra, not as the step whose page hosts it', async () => {
  const { guideVideoOverlay } = await import('./guide-video-overlay.ts');
  const dark = guideVideoOverlay('guides/p3-sdd.html', 'dark');
  assert.match(
    dark,
    /lesson-video__corner" aria-hidden="true" hidden>Дополнение к подготовке · SDD и OpenSpec · Перспектива: фабрика</u,
  );
  assert.match(dark, /<a href="p4-metarepository.html">Подготовка\u00a0· Мета‑репозиторий/u);
  assert.match(
    guideVideoOverlay('guides/p3-sdd.html'),
    /aria-hidden="true" hidden>Подготовка\u00a0· SDD и OpenSpec</u,
  );
});
