import assert from 'node:assert/strict';
import test from 'node:test';
import { renderGuide, renderedStepHtml } from './learner-guide-test-support.ts';

await test('the first step names each downloaded file and keeps it beside its example', async () => {
  for (const [guide, titles] of [
    ['1', ['обращение', 'замысел']],
    ['3-star', ['замысел 2']],
  ] as const) {
    const step = renderedStepHtml(await renderGuide(guide), 1);
    const links = step?.match(/<div class="step-links">(.*?)<\/div>/su)?.[1];
    assert.ok(links);
    const pairs = [
      ...links.matchAll(
        /<a class="step-link" href="([^"]+)\.html">[^<]+<\/a><a class="step-link step-link--download" href="\1\.md" download>Скачать \.md · ([^<]+)<\/a>/gu,
      ),
    ];
    assert.deepEqual(
      pairs.map(([, , title]) => title),
      titles,
    );
    assert.equal(links.match(/<a /gu)?.length, 2 * titles.length);
  }
});

await test('each alternative has one visible label, including authored alternatives without a heading', async () => {
  const html = await renderGuide('3');
  const variants = [...html.matchAll(/<div class="mode-b" data-mode-b>(.*?)<\/h4>/gu)];
  assert.ok(variants.length);
  for (const [, heading] of variants) {
    assert.match(heading!, /^<h4>Вариант Б/u);
    assert.equal(heading!.match(/Вариант Б/gu)?.length, 1);
  }
  assert.match(html, /step-instructions--mode-a"><p class="step-variant-tag">Вариант А<\/p>/u);
  const plain = await renderGuide('3', (guides) => {
    const step = guides['3'].steps.find((item) => item.variantB && item.entryMode);
    assert.ok(step);
    step.variantB = '<p>Откройте учебный образец.</p>';
  });
  assert.match(
    plain,
    /data-mode-b><p class="step-variant-tag">Вариант Б<\/p><p>Откройте учебный образец/u,
  );
});
