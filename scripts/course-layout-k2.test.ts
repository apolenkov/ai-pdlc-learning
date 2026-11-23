import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { mountFixture } from './route-strip-test-support.ts';
import { renderGuide } from './learner-guide-test-support.ts';
import {
  renderStrip,
  STEPS,
  STEPS_INTENT,
} from '../docs/pages/sdlc-development/route-strip/strip.ts';
import { routeState } from '../docs/pages/sdlc-development/route-strip/model.ts';

await test('a detailed practice card switches the map from preparation to the viewed step', (t) => {
  const f = mountFixture(t, true);
  const observer = f.intersections.find((item) => item.targets.includes(f.detail));
  assert.ok(observer);
  observer.notify([{ target: f.detail, isIntersecting: true, boundingClientRect: { top: 400 } }]);
  f.fire('course-route:update');
  assert.equal(f.status.href, 's4-product.html');
  assert.deepEqual(
    f.dots
      .filter((dot) => dot.attributes.get('aria-current') === 'step')
      .map((dot) => dot.dataset.routeId),
    ['3-star'],
  );
});

await test('every guide has just its own current dot even with saved progress', () => {
  for (const steps of [STEPS, STEPS_INTENT]) {
    const done = new Set(steps.map((step) => step.id));
    for (const step of steps) {
      const strip = renderStrip(steps, routeState(steps, step.id, done), step.id);
      const current = [
        ...strip.matchAll(/<a class="course-route__dot" href="([^"]+)"[^>]* aria-current="step"/gu),
      ];
      assert.deepEqual(
        current.map((m) => m[1]),
        [step.href],
      );
    }
  }
});

await test('the OpenSpec exercise crops the original and opens the full-resolution capture', async () => {
  const html = await renderGuide('3');
  const src = 'assets/route-r3-vscode-cumulative-contract.png';
  const shot = html.match(/<a[^>]*class="shot-crop"[^>]*><img[^>]*><\/a>/u)?.[0];
  assert.ok(shot);
  assert.ok(shot.includes(`href="${src}"`));
  assert.ok(shot.includes(`src="${src}"`));
  assert.ok(shot.includes('aspect-ratio:942/690'));
  assert.doesNotMatch(shot, /srcset=/u);
});

await test('the step five route card separates its inputs, output, and ordered actions', async () => {
  const source = await readFile(
    new URL('../docs/pages/sdlc-development/guides/index.html', import.meta.url),
    'utf8',
  );
  const card = source.match(
    /<aside[^>]+aria-labelledby="star-route-title"[^>]*>([^]*?)<\/aside>/u,
  )?.[1];
  assert.ok(card);
  assert.match(
    card,
    /<h2[^>]*>[^<]+<\/h2>\s*<p><strong>Вход<\/strong>[^]*?<p><strong>Выход<\/strong>[^]*?<\/div>\s*<div><strong>Что делаете<\/strong>\s*<ol>/u,
  );
  assert.equal(card.match(/<li>/gu)?.length, 3);
  assert.match(card, /class="route-open" href="s4-product.html"/u);
});
