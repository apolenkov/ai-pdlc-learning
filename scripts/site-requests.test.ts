import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { FORBIDDEN_TEXT, publishedTextProblems } from './published-text.ts';
import { fileRequests, MEDIA_RELEASE, outsideRequests } from './site-requests.ts';

// Synthetic hosts only: the guard is about the shape of a request, not about a real address.
const OUT = 'https://cdn.example.invalid/x';
const FILM = `${MEDIA_RELEASE}0123456789ab-block-1.mp4`;

await test('each way a page can load an outside file is caught', () => {
  const cases: [string, string][] = [
    ['a.html', `<img src="${OUT}.png">`],
    ['a.html', `<img src='${OUT}.png'>`],
    ['a.html', `<img src=${OUT}.png alt="">`],
    // The desktop candidate of a responsive image, not only the first one.
    ['a.html', `<img src="local.png" srcset="local-600.webp 600w, ${OUT}-1200.webp 1200w">`],
    // A quoted «>» does not end the tag before the srcset.
    ['a.html', `<img alt="score > baseline" srcset="local.webp 1x, ${OUT}.webp 2x">`],
    ['a.html', `<picture><source srcset="${OUT}.avif"></picture>`],
    ['a.html', `<video poster="${OUT}.jpg"></video>`],
    // The player copies data-file into video.src.
    ['a.html', `<div class="lesson-video" data-file="${OUT}.mp4"></div>`],
    ['a.html', `<link rel="stylesheet" href="//cdn.example.invalid/s.css">`],
    ['a.html', `<link rel="preload" as="image" imagesrcset="${OUT}.webp 1x">`],
    ['a.html', `<object data="${OUT}.pdf"></object>`],
    ['a.html', `<div style="background:url(${OUT}.png)"></div>`],
    ['a.html', `<style>@import "${OUT}.css";</style>`],
    ['a.html', `<script>fetch("${OUT}.json")</script>`],
    // Root-relative and climbing paths leave the Pages project root.
    ['a.html', `<img src="/assets/a.png">`],
    ['guides/a.html', `<img src="../../a.png">`],
    ['a.svg', `<svg><image href="${OUT}.png"/></svg>`],
    ['a.css', `.x{background:url("${OUT}.png")}`],
    ['a.css', `.x{background:url(/assets/poster.jpg)}`],
    // A release prefix that normalises into another release.
    ['a.css', `.x{background:url("${MEDIA_RELEASE}../old-release/poster.jpg")}`],
    ['a.js', `const data = await fetch('${OUT}.json');`],
    ['a.js', `import(\`${OUT}.js\`);`],
    ['a.js', `import "${OUT}.js";`],
    ['a.js', `import { x } from '${OUT}.js';`],
    ['a.js', `xhr.open('GET', "${OUT}.json");`],
    ['a.js', `img.src = '${OUT}.png';`],
    // A screenshot field the renderer turns into src and srcset.
    ['a.js', `const shot = { src: "${OUT}.png", alt: "" };`],
    // Markup built in a script string.
    ['a.js', `el.innerHTML = \`<img src="${OUT}.png">\`;`],
    // An event handler is script.
    ['a.html', `<img src="local.png" onload="fetch('${OUT}.json')">`],
    // A run-time file name after a literal host still goes to that host.
    ['a.js', `fetch(\`https://cdn.example.invalid/\${filename}\`);`],
    // Encoded parent segments resolve above the Pages project root, as the browser reads them.
    ['guides/a.html', `<img src="%2e%2e/%2e%2e/a.png">`],
    ['guides/a.css', `.x{background:url(%2E%2E/%2e%2e/a.png)}`],
    // A root path from a script leaves the project root too.
    ['a.js', `const catalog = await fetch("/assets/catalog.json");`],
    ['a.js', `const shot = { src: '/assets/a.png' };`],
    // Character references are decoded before the handler runs.
    ['a.html', `<img src="local.png" onload="fetch(&quot;${OUT}.json&quot;)">`],
    ['a.html', `<img src="local.png" onerror="fetch(&#39;${OUT}.json&#39;)">`],
    // A folder that happens to share the scanner's own name for the root is still outside.
    ['guides/a.html', `<img src="../../a/favicon.svg">`],
    ['guides/a.html', `<img src="../../b/favicon.svg">`],
    ['guides/a.html', `<img src="../../root/favicon.svg">`],
    ['a.json', `{"file": "${OUT}.mp4"}`],
    ['a.vtt', `WEBVTT\n\n00:00.000 --> 00:01.000\n${OUT}`],
  ];
  for (const [name, text] of cases)
    assert.equal(fileRequests(name, text).length, 1, `${name}: ${text}`);
});

await test('links, local files, lesson samples and the media release are not outside requests', () => {
  const allowed: [string, string][] = [
    ['a.html', `<a href="${OUT}">ссылка</a>`],
    ['a.html', `<link rel="canonical" href="${OUT}">`],
    [
      'guides/a.html',
      `<img src="assets/a.png" srcset="assets/a-600.webp 600w, ../favicon.svg 1200w">`,
    ],
    ['a.html', `<video poster="${MEDIA_RELEASE}poster.jpg"><source src="${FILM}"></video>`],
    ['a.html', `<div class="lesson-video" data-file="block-0-720p.mp4" data-vtt="block-0.vtt">`],
    ['a.html', `<img src="data:image/png;base64,AAAA">`],
    // Lesson text that shows code is inert.
    ['a.html', `<pre><code>fetch("${OUT}/sample")\n&lt;img src="${OUT}.png"&gt;</code></pre>`],
    // A stylesheet may use a poster from the release (Codex review item 19).
    ['a.css', `.film{background:url("${MEDIA_RELEASE}poster.jpg")}`],
    ['guides/a.css', `.x{background:url(../atmosphere-contours.svg)}`],
    ['a.js', `const film = new URL('${FILM}'); const link = '<a href="${OUT}">';`],
    ['a.js', `const page = \`<img src="\${base}a.png">\`;`],
    // A commented-out element does not load.
    [
      'a.html',
      `<!-- <button onclick="fetch('/retired.json')">старое</button> --><img src="a.png">`,
    ],
    // A regular expression literal after a field name is not a root path.
    ['a.js', `const rule = { data: /\\s+/u, url: x };`],
    ['a.js', `fetch(\`\${MEDIA}\${name}\`); const film = \`${MEDIA_RELEASE}\${name}\`;`],
  ];
  for (const [name, text] of allowed)
    assert.deepEqual(fileRequests(name, text), [], `${name}: ${text}`);
});

await test('the published-site check fails on an outside request or a marker in any text file, players included', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'site-requests-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'guides/assets/video'), { recursive: true });
  await writeFile(join(root, 'guides/clean.html'), `<video><source src="${FILM}"></video>`);
  const run = () =>
    spawnSync(
      process.execPath,
      ['--experimental-strip-types', join(import.meta.dirname, 'check-published-site.ts'), root],
      { encoding: 'utf8' },
    );
  assert.equal(run().status, 0);
  await writeFile(join(root, 'guides/bad.css'), `.x{background:url(${OUT}.png)}`);
  assert.deepEqual(await outsideRequests(root), [`guides/bad.css: ${OUT}.png`]);
  const failed = run();
  assert.equal(failed.status, 1);
  assert.match(
    failed.stderr,
    /outside request: guides\/bad\.css: https:\/\/cdn\.example\.invalid\/x\.png/u,
  );
  await rm(join(root, 'guides/bad.css'));
  // A subtitle file added with the players is text too.
  await writeFile(join(root, 'guides/assets/video/block-1.vtt'), 'WEBVTT\n\n__CUSTOMDEV_ROOT__\n');
  assert.equal((await publishedTextProblems(root)).length, 1);
  const marked = run();
  assert.equal(marked.status, 1, 'a text finding alone fails the check');
  assert.match(marked.stderr, /published text: guides\/assets\/video\/block-1\.vtt/u);
});

await test('the old request-check command fails instead of passing without looking', () => {
  const old = spawnSync(
    process.execPath,
    ['--experimental-strip-types', join(import.meta.dirname, 'site-requests.ts'), '/no-such-site'],
    { encoding: 'utf8' },
  );
  assert.equal(old.status, 2);
  assert.match(old.stderr, /check-published-site\.ts/u);
});

await test('only the course and its sample repositories of the owner may be named', () => {
  const owner = FORBIDDEN_TEXT[1];
  for (const allowed of [
    'https://apolenkov.github.io/ai-pdlc-learning/guides/',
    'https://github.com/apolenkov/ai-pdlc-learning/releases/tag/media-v1',
    'git clone https://github.com/apolenkov/ai-pdlc-learning-stage-1.git',
    'репозиторий github.com/apolenkov/git-markdown-intent.',
  ])
    assert.doesNotMatch(allowed, owner, allowed);
  for (const forbidden of [
    'https://github.com/apolenkov/ai-pdlc-learning.archive',
    'https://github.com/apolenkov/ai-pdlc-learning..archive',
    'https://github.com/apolenkov/ai-pdlc-learning-stage-5',
    'https://github.com/apolenkov/customdev-learning-private',
    'https://apolenkov.github.io/customdev-learning/',
  ])
    assert.match(forbidden, owner, forbidden);
});
