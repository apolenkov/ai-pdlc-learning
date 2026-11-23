import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';

import { mountCrumbs } from '../docs/pages/sdlc-development/route-strip/crumbs.ts';
import { assertSafeOutputDir, buildLearningSite } from './build-learning-pages.ts';
import { SITE_FILE_LIST } from './site-file-list.ts';
import { hasInternalName, publishedTextProblems } from './published-text.ts';
import { outsideRequests } from './site-requests.ts';
import { pageOutputPaths, retiredPageRedirects } from './pages-route-manifest.ts';
import { updateSiteNavigation } from './update-site-navigation.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let outputDir = '';

const walk = async (directory: string): Promise<string[]> =>
  (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map(async (entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
      }),
    )
  ).flat();

const sourceFingerprint = async (): Promise<string> => {
  const hash = createHash('sha256');
  for (const base of ['docs', 'scripts', 'standards', 'skills']) {
    for (const file of (await walk(resolve(ROOT, base))).sort())
      hash.update(file).update(await readFile(file));
  }
  return hash.digest('hex');
};

let before_ = '';
before(async () => {
  outputDir = await mkdtemp(join(tmpdir(), 'ai-pdlc-learning-site-'));
  before_ = await sourceFingerprint();
  await buildLearningSite(outputDir);
});
after(async () => rm(outputDir, { recursive: true, force: true }));

await Promise.all([
  // A plain item of the list: a separate top-level test lets the root after-hook remove the site too early.
  test('the internal-name check leaves ordinary words alone', () => {
    for (const text of [
      'make it fit',
      'Fitness for a particular purpose',
      'learning group',
      'актив',
      'DEMO-1402',
    ])
      assert.equal(hasInternalName(text), false, text);
  }),
  test('the site is exactly the declared routes and assets', async () => {
    const files = (await walk(outputDir)).map((file) => relative(outputDir, file)).sort();
    assert.deepEqual(
      files,
      [...SITE_FILE_LIST, ...retiredPageRedirects.map(({ outputPath }) => outputPath)].sort(),
    );
    for (const page of pageOutputPaths) assert.ok(files.includes(page), `missing page ${page}`);
  }),
  test('retired environment pages of the public build redirect to the PDLC map and are not site files', async () => {
    assert.deepEqual(
      retiredPageRedirects.map(({ outputPath }) => outputPath),
      ['environment-scales.html', 'environment-contours.html'],
    );
    for (const { outputPath } of retiredPageRedirects) {
      const stub = await readFile(join(outputDir, outputPath), 'utf8');
      assert.match(stub, /content="0;url=\.\/"/u, outputPath);
      assert.match(stub, /location\.replace\("\.\/" \+ location\.hash\)/u, outputPath);
      // The built stub, not only the helper, says the section is gone, as the CustomDev root stubs do.
      assert.match(stub, /<title>Раздел убран · AI PDLC Learning<\/title>/u, outputPath);
      assert.match(
        stub,
        /Этого раздела больше нет: <a href="\.\/">открыть карту PDLC<\/a>/u,
        outputPath,
      );
      assert.doesNotMatch(stub, /Страница переехала/u, outputPath);
      assert.doesNotMatch(
        stub,
        /Среда\s+и\s+контуры|environment-data|environment\.css/u,
        outputPath,
      );
      assert.ok(!(SITE_FILE_LIST as readonly string[]).includes(outputPath), outputPath);
      assert.ok(!(pageOutputPaths as readonly string[]).includes(outputPath), outputPath);
    }
    for (const asset of ['environment.css', 'environment-data.json'])
      assert.ok(
        !(await walk(outputDir)).some((file) => file.endsWith(asset)),
        `${asset} is not published`,
      );
  }),
  test('a page with a CSP allows each of its inline styles and scripts', async () => {
    // A hand edit of an inline block on a page with hash-pinned CSP makes the browser drop it whole.
    // CSP3: an inline element is governed by *-src-elem, then *-src, then default-src; it runs when the list
    // names its hash, or when the list has 'unsafe-inline' and no hash or nonce (a hash disables 'unsafe-inline').
    for (const file of (await walk(outputDir)).filter((name) => name.endsWith('.html'))) {
      const html = await readFile(file, 'utf8');
      const policy = /http-equiv="Content-Security-Policy" content="([^"]*)"/u
        .exec(html)?.[1]
        ?.replaceAll('&#39;', "'");
      if (!policy) continue;
      const directives = new Map(
        policy
          .split(';')
          .map((part) => part.trim().split(/\s+/u))
          .filter(([name]) => name)
          .map(([name, ...sources]) => [name!.toLowerCase(), sources] as const),
      );
      for (const tag of ['style', 'script'] as const) {
        const sources = directives.get(`${tag}-src-elem`) ??
          directives.get(`${tag}-src`) ??
          directives.get('default-src') ?? ["'unsafe-inline'"];
        const pinnedList = sources.some((source) => /^'(?:sha\d+|nonce)-/u.test(source));
        for (const [, attributes, body] of html.matchAll(
          new RegExp(`<${tag}\\b([^>]*)>([^]*?)</${tag}>`, 'gu'),
        )) {
          if (tag === 'script' && /\bsrc=/u.test(attributes!)) continue;
          const hash = `'sha256-${createHash('sha256').update(body!).digest('base64')}'`;
          assert.ok(
            sources.includes(hash) || (!pinnedList && sources.includes("'unsafe-inline'")),
            `${relative(outputDir, file)}: inline <${tag}> (${hash}) is not allowed by ${sources.join(' ')}`,
          );
        }
      }
    }
  }),
  test('every page title ends with the one site suffix', async () => {
    const pages = (await walk(outputDir)).filter((file) => file.endsWith('.html'));
    for (const file of pages) {
      const title = /<title>([^<]*)<\/title>/u.exec(await readFile(file, 'utf8'))?.[1] ?? '';
      assert.match(title, / · AI PDLC Learning$/u, relative(outputDir, file));
    }
  }),

  test('the comparison on the course map leads with AI agents before approval, history and other workflow criteria', async () => {
    const map = await readFile(join(outputDir, 'guides/index.html'), 'utf8');
    const comparison =
      map.match(/<section\b[^>]*id="why-markdown-git"[^]*?<\/section>/u)?.[0] ?? '';
    assert.deepEqual(
      [...comparison.matchAll(/<th scope="col">([^<]+)<\/th>/gu)].map(([, title]) => title),
      ['Тема', 'Confluence и цепочка согласования', 'Markdown, Git и GitLab'],
    );
    assert.equal((comparison.match(/<td>/gu) ?? []).length, 12);
    assert.deepEqual(
      [...comparison.matchAll(/<th scope="row">([^<]+)<\/th>/gu)].map(([, title]) => title),
      [
        'Работа ИИ-агентов',
        'Согласование и ответственность',
        'Изменения и история',
        'Связь «требование → код → тест»',
        'Проверки в CI',
        'Цена выбора',
      ],
    );
    assert.doesNotMatch(map, /data-offline-download|site-offline\.zip|Без сети/u);
  }),

  test('published course maps show the path from the PDLC landing to the current course', async () => {
    for (const [page, expected] of [
      ['intent', 'Намерение и план'],
      ['index', 'Курс анализа'],
    ] as const) {
      const html = await readFile(join(outputDir, `guides/${page}.html`), 'utf8');
      const body = /<body\b[^>]*>/u.exec(html)![0];
      const title = /<title>([^<]+)<\/title>/u.exec(html)![1];
      const [, href, label] = /<a [^>]*data-global-home[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/u.exec(
        html,
      )!;
      assert.match(html, /data-catalog-return href="\.\.\/#sdlc"/u);
      let rendered = '';
      const home = { textContent: label, getAttribute: () => href };
      const nav = {
        classList: { contains: () => false },
        querySelector: (selector: string) => (selector === '[data-global-home]' ? home : null),
        insertAdjacentHTML: (_position: string, markup: string) => {
          rendered = markup;
        },
      };
      const host = { contains: (node: unknown) => node === nav };
      const doc = {
        title,
        body: {
          dataset: {
            course: /data-course="([^"]+)"/u.exec(body)?.[1],
            stage: /data-stage="([^"]+)"/u.exec(body)?.[1],
          },
        },
        documentElement: { dataset: {} },
        getElementById: (id: string) => (html.includes(`id="${id}"`) ? {} : null),
        querySelector: (selector: string) => (selector === '[data-global-nav]' ? nav : host),
      };
      Reflect.apply(mountCrumbs, undefined, [doc]);
      assert.equal(
        /<li aria-current="page">([^<]*)<\/li>/u.exec(rendered)?.[1]?.replaceAll('\u00a0', ' '),
        expected,
        page,
      );
      assert.match(rendered, /<li><a href="\.\.\/#sdlc">Карта PDLC<\/a><\/li>/u);
      if (page === 'intent') {
        doc.title = 'Проверка названия · AI PDLC Learning';
        Reflect.apply(mountCrumbs, undefined, [doc]);
        assert.match(rendered, /<li aria-current="page">Проверка названия<\/li>/u);
      }
    }
  }),

  test('slide 7 keeps numbered cards without arrows across their borders (#37)', async () => {
    const deck = await readFile(join(outputDir, 'analytics-process-sdd.html'), 'utf8');
    assert.match(deck, /#slide-7 \.rollout-card:not\(:last-child\)::after \{ content: none; \}/u);
    const slide = deck.split('id="slide-7"')[1]!;
    assert.deepEqual(
      [...slide.matchAll(/class="rollout-card"><span class="roadmap-time">(\d+)/gu)].map(
        ([, number]) => number,
      ),
      ['01', '02', '03'],
    );
  }),

  test('the map keeps the legend and controls without duplicating the sticky numbered route', async () => {
    const map = await readFile(join(outputDir, 'guides/index.html'), 'utf8');
    const howto = map.match(/<section class="map-howto"[^]*?<\/section>/u)?.[0] ?? '';
    assert.doesNotMatch(howto, /map-howto__(?:route|line|node)/u);
    assert.match(map, /<script defer src="\.\.\/course-motion\.js"><\/script>/u);
    assert.ok(
      howto.indexOf('id="howto-film"') > 0 &&
        howto.indexOf('id="howto-film"') < howto.indexOf('<ol class="map-howto__steps"'),
      'the film slot sits above the cards',
    );
    assert.deepEqual(
      [...howto.matchAll(/<li\b[^>]*><strong>([^<]+)<\/strong>/gu)].map(([, title]) => title),
      ['Что на карте', 'С чего начать', 'Как выбрать маршрут', 'Как вернуться'],
    );
    assert.match(
      howto,
      /class="map-howto__legend"[^]*гайд[^]*пройден[^]*галочка — самопроверка пройдена[^]*вы смотрите/u,
    );
    assert.match(
      howto,
      /<button type="button" class="map-howto__reset" data-route-reset hidden>Сбросить прогресс<\/button>/u,
    );
    assert.doesNotMatch(map, /course-route|data-route-background/u);
  }),

  test('the root landing keeps seven stages, the future direction and only public destinations', async () => {
    const html = await readFile(join(outputDir, 'index.html'), 'utf8');
    assert.match(html, /<title>Карта PDLC · AI PDLC Learning<\/title>/u);
    assert.match(html, /<h1>Один маршрут от намерения до работающего результата<\/h1>/u);
    assert.match(
      html,
      /<!-- landing-film: the film of the public landing goes here \(TASK-923, session 944\) -->/u,
    );
    assert.doesNotMatch(html, /<video|http-equiv="refresh"|id="enabling"|dark-factory\.html/iu);
    const css = await readFile(join(outputDir, 'landing.css'), 'utf8');
    assert.doesNotMatch(html + css, /custom ?dev|контур|grafana|site-offline/iu);
    const band = /<section [^>]*id="sdlc"[^>]*>([^]*?)<\/section>/u.exec(html)![1]!;
    assert.match(band, /PDLC \(жизненный цикл разработки продукта\): 7 этапов/u);
    const stages = [...band.matchAll(/<li\b[^>]*>([^]*?)<\/li>/gu)].map(([, stage]) => stage!);
    assert.deepEqual(
      stages.map((stage) => /class="route-stage__number">([^<]+)/u.exec(stage)?.[1]),
      ['01', '02', '03', '04', '05', '06', '07', '→'],
    );
    assert.deepEqual(
      stages.map((stage) => /<a [^>]*href="([^"]+)"/u.exec(stage)?.[1]),
      [
        '#intent',
        '#analysis',
        undefined,
        './guides/d1-delivery.html',
        undefined,
        undefined,
        undefined,
        undefined,
      ],
    );
    assert.match(
      stages[7]!,
      /<div class="route-stage route-stage--future">[^]*?<strong>Будущее<\/strong>/u,
    );
    assert.deepEqual(
      [...html.matchAll(/<section [^>]*id="([^"]+)"/gu)].map(([, id]) => id),
      ['sdlc', 'intent', 'analysis', 'help'],
    );
    assert.deepEqual(
      [...html.matchAll(/<a [^>]*class="catalog-card[^"]*"[^>]*href="([^"]+)"/gu)].map(
        (match) => match[1],
      ),
      [
        './intent-maturity-map.html',
        './guides/intent.html',
        './guides/index.html',
        './guides/p2-git.html',
        './roles.html',
        './glossary.html',
        './corporate-resources.html',
      ],
    );
    // Resolve against a project subdirectory, just like GitHub Pages. Reject external and parent URLs.
    const site = new URL('https://example.org/course/');
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/gu)) {
      const value = match[1]!;
      const url = new URL(value, site);
      assert.ok(url.href.startsWith(site.href), value);
      const path = url.pathname.slice(site.pathname.length);
      const target = join(outputDir, path.endsWith('/') || !path ? path + 'index.html' : path);
      assert.ok((await stat(target)).isFile(), value);
      if (url.hash)
        assert.ok((await readFile(target, 'utf8')).includes(`id="${url.hash.slice(1)}"`), value);
    }
  }),

  test('public help pages mark Help and link back to the PDLC map', async () => {
    for (const page of ['roles.html', 'glossary.html', 'corporate-resources.html']) {
      const html = await readFile(join(outputDir, page), 'utf8');
      assert.match(html, /data-section="help"/u, page);
      assert.match(
        html,
        /data-nav-item="help" href="\.\/#help" aria-current="location">Справка/u,
        page,
      );
      assert.match(html, /data-catalog-return href="\.\/#sdlc"/u, page);
    }
  }),

  test('the guide scripts are classic browser scripts without module imports', async () => {
    for (const name of ['guide-stages', 'guide-data']) {
      const script = await readFile(join(outputDir, 'guides', `${name}.js`), 'utf8');
      assert.doesNotMatch(script, /^\s*import\s/mu, `${name}.js must run without a module loader`);
    }
  }),

  test('building does not modify any source file', async () => {
    assert.equal(await sourceFingerprint(), before_);
  }),

  test('every local link and resource resolves inside the site: the public course links nowhere outside it', async () => {
    const broken: string[] = [];
    for (const page of (await walk(outputDir)).filter((file) => file.endsWith('.html'))) {
      const html = await readFile(page, 'utf8');
      for (const [, , , value] of html.matchAll(/\b(href|src)=(["'])([^"']*)\2/gu)) {
        if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/iu.test(value)) continue;
        const path = value.replace(/[?#].*$/u, '');
        const target = resolve(dirname(page), path.endsWith('/') ? `${path}index.html` : path);
        if (
          !(await stat(target).then(
            (entry) => entry.isFile(),
            () => false,
          ))
        )
          broken.push(`${relative(outputDir, page)} -> ${value}`);
      }
    }
    assert.deepEqual(broken, []);
  }),

  test('the public build loads nothing outside its own root and the media release: no page asks for a missing icon', async () => {
    // A page without <link rel="icon"> makes the browser ask the host root for /favicon.ico: a 404 outside the site.
    const outside: string[] = [];
    for (const file of await walk(outputDir)) {
      if (!file.endsWith('.html')) continue;
      const html = await readFile(file, 'utf8');
      // A redirect stub leaves before the browser asks for an icon.
      const redirect = /<meta http-equiv="refresh"/u.test(html);
      if (!redirect && !/<link rel="icon" href="[^"]+"/u.test(html))
        outside.push(`${relative(outputDir, file)}: no icon`);
    }
    // Every other request: the same guard the pre-push hook and the Pages workflow run on the site with its players.
    outside.push(...(await outsideRequests(outputDir)));
    assert.deepEqual(outside, []);
  }),

  test('no page keeps a build marker, a legacy host or a private route', async () => {
    // The same check runs on the uploaded site with its players (check-published-site.ts).
    assert.deepEqual(await publishedTextProblems(outputDir), []);
  }),

  test('output is refused outside dist, .cache and the system temp directory', async () => {
    await assert.rejects(() => assertSafeOutputDir('docs'), /Refusing output/u);
    await assert.rejects(() => assertSafeOutputDir('.'), /Refusing output/u);
    await assert.rejects(() => assertSafeOutputDir('/'), /Refusing output/u);
    await assert.rejects(() => assertSafeOutputDir('dist/../docs'), /Refusing output/u);
    assert.equal(await assertSafeOutputDir('dist/site'), resolve(ROOT, 'dist/site'));
  }),

  test('the shared navigation block of every source page is current', async () => {
    assert.deepEqual(await updateSiteNavigation(true), []);
  }),
]);
