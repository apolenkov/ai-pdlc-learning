import { createHash } from 'node:crypto';
import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import { resolveCourseNames } from './course-names.ts';
import { build } from 'esbuild';
import {
  access,
  copyFile,
  lstat,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  readMetarepositoryGuide,
  readMetarepositoryMarkdown,
} from './build-metarepository-guide.ts';
import { renderComparisonTable } from './comparison-table.ts';
import { INTENT_MAP_PART, spliceCourseMap } from './course-map.ts';
import { examplePagePath, renderExamplePage } from './example-pages.ts';
import {
  EXAMPLE_MARKDOWN,
  GUIDE_SCRIPTS,
  readGuideScriptSource,
  PUBLIC_GUIDE_BINARY_ASSETS,
  PUBLIC_GUIDE_DOCUMENT_ASSETS,
} from './guide-content.ts';
import { readLandingCss, readLearningEnhancementsCss } from './learning-enhancements-css.ts';
import { pageRedirects, retiredHome, retiredPageRedirects } from './pages-route-manifest.ts';
import {
  courseNavigationRow,
  MORE_TOGGLE_HANDLER,
  NAV_ESCAPE_HANDLER,
  PUBLIC_ROOT,
  withNavigationRow,
} from './site-navigation-contract.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'docs/pages/sdlc-development';
const GUIDES = `${SOURCE}/guides`;

export const PUBLIC_GUIDE_ASSETS = [
  'guide.css',
  'metarepository.css',
  'index.html',
  'learning-enhancements.css',
  'p1-zachem.html',
  'p2-git.html',
  'p3-sdd.html',
  's1-git.html',
  's2-review.html',
  's3-openspec.html',
  's4-product.html',
  's4b-legacy.html',
  's4a-new.html',
  's4-team.html',
  'd1-delivery.html',
  'intent.html',
  'i1-effect.html',
  'i2-bounds.html',
  'i3-plan.html',
  'i4-accept.html',
] as const;

const SHARED_FILES = [
  'site-nav.css',
  'atmosphere.css',
  'atmosphere-contours.svg',
  'course-motion.css',
  'help-reference.css',
  'corporate-resources.css',
  'harness-levels.css',
  'harness-levels-bpmn.png',
] as const;

const FAVICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#17231f"/><path d="M19 32h26M32 19v26" stroke="#8ad6bb" stroke-width="6" stroke-linecap="round"/></svg>';

const rewriteHome = (html: string, relativeHome: string): string =>
  html.split(PUBLIC_ROOT).join(relativeHome);
const rewriteLink =
  (marker: string, file: string) =>
  (html: string, relativeHome: string): string =>
    html.replace(
      new RegExp(`(<link\\b[^>]*\\b${marker}\\b[^>]*\\bhref=["'])[^"']+(["'][^>]*>)`, 'iu'),
      `$1${relativeHome}${file}$2`,
    );
const rewriteNavStyles = rewriteLink('data-site-nav-styles', 'site-nav.css');
const rewriteAtmosStyles = rewriteLink('data-atmos-styles', 'atmosphere.css');
const ensureFavicon = (html: string, relativeHome: string): string =>
  /<link\s+rel=["'](?:shortcut )?icon["']/iu.test(html)
    ? html
    : html.replace(
        '</head>',
        `  <link rel="icon" href="${relativeHome}favicon.svg" type="image/svg+xml">\n</head>`,
      );
/** Quiet motion (course-motion.ts) is added to the course pages that use the shared atmosphere; pages with their own CSP keep their scripts as they are. */
const addMotion = (html: string, relativeHome: string): string =>
  /\bdata-atmos\b/u.test(html) &&
  !/Content-Security-Policy/iu.test(html) &&
  !html.includes('course-motion.js')
    ? html.replace(
        '</head>',
        `  <link rel="stylesheet" href="${relativeHome}course-motion.css">\n  <script defer src="${relativeHome}course-motion.js"></script>\n</head>`,
      )
    : html;
// Generated maps pin script hashes; permit only the two shared navigation handlers.
const allowNavigationHandlers = (html: string): string => {
  if (!html.includes('data-global-nav')) return html;
  const hashes = [NAV_ESCAPE_HANDLER, MORE_TOGGLE_HANDLER]
    .map((handler) => `'sha256-${createHash('sha256').update(handler).digest('base64')}'`)
    .join(' ');
  return html.replace(
    /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]+)(")/iu,
    (_match, start: string, policy: string, end: string) =>
      `${start}${policy.replace(/script-src-attr[^;]*;?/u, '')}; script-src-attr 'unsafe-hashes' ${hashes};${end}`,
  );
};
export const placeHtml = (html: string, relativeHome: string): string =>
  allowNavigationHandlers(
    addMotion(
      ensureFavicon(
        rewriteAtmosStyles(
          rewriteNavStyles(
            rewriteHome(
              withNavigationRow(resolveCourseNames(html), courseNavigationRow()),
              relativeHome,
            ),
            relativeHome,
          ),
          relativeHome,
        ),
        relativeHome,
      ),
      relativeHome,
    ),
  );

/** One minified ES module with Motion's animate, inView and scroll; the budget is 50 KB. */
export const bundleMotion = async (): Promise<string> => {
  const result = await build({
    entryPoints: [resolve(ROOT, SOURCE, 'course-motion.ts')],
    bundle: true,
    minify: true,
    // Classic script, loaded with defer.
    format: 'iife',
    target: 'es2020',
    write: false,
    legalComments: 'none',
  });
  return result.outputFiles[0]!.text;
};

const contains = (base: string, target: string): boolean => {
  const rel = relative(base, target);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};

/** Resolve existing parents while preserving suffixes that have not been created yet. */
const physicalPath = async (candidate: string): Promise<string> => {
  let parent = resolve(candidate);
  // Stryker disable next-line ArrayDeclaration: an extra leading segment only lengthens the physical target; the layered symlink checks decide
  const suffix: string[] = [];
  for (;;) {
    try {
      return resolve(await realpath(parent), ...suffix);
    } catch (error) {
      // Stryker disable next-line ConditionalExpression,LogicalOperator: assertNoOutputSymlinks already rejects every non-ENOENT failure before this layer
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw error;
      // Stryker disable next-line ConditionalExpression: dangling links are rejected earlier by assertNoOutputSymlinks
      if ((await lstat(parent).catch(() => undefined))?.isSymbolicLink()) throw error;
      suffix.unshift(relative(dirname(parent), parent));
      parent = dirname(parent);
    }
  }
};

const assertNoOutputSymlinks = async (target: string, boundary: string): Promise<void> => {
  for (let component = target; component !== boundary; component = dirname(component)) {
    if (
      // Stryker disable BlockStatement,ConditionalExpression: a non-ENOENT failure resurfaces in physicalPath
      (
        await lstat(component).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') throw error;
          return undefined;
        })
      )
        // Stryker restore BlockStatement,ConditionalExpression
        ?.isSymbolicLink()
    )
      throw new Error('Refusing output with a symlink component');
  }
};

/** Recursive deletion is limited to real descendants of dist/, .cache/ or the system temp directory. */
// shortcut: checks are not atomic with rm; isolate output roots before admitting untrusted concurrent writers.
export const assertSafeOutputDir = async (
  outputDir: string,
  root: string = ROOT,
): Promise<string> => {
  const rootDir = resolve(root);
  const target = resolve(rootDir, outputDir);
  const temp = resolve(tmpdir());
  const base = [resolve(rootDir, 'dist'), resolve(rootDir, '.cache'), temp].find((base) =>
    contains(base, target),
  );
  if (!base) {
    throw new Error(
      'Refusing output: it must be inside dist/, .cache/ or the system temp directory',
    );
  }
  await assertNoOutputSymlinks(target, base === temp ? temp : rootDir);
  const physicalTarget = await physicalPath(target);
  const physicalBase =
    base === temp
      ? await realpath(temp)
      : resolve(await realpath(rootDir), relative(rootDir, base));
  // Stryker disable next-line ConditionalExpression: defence in depth after the symlink walk; only a race between the checks reaches it
  if (!contains(physicalBase, physicalTarget))
    // Stryker disable next-line StringLiteral: unreachable message of the same defence in depth
    throw new Error('Refusing output outside its allowed physical directory');
  return target;
};

const missing = (path: string, error: unknown): unknown =>
  error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
    ? new Error(`Missing course source: ${relative(ROOT, path)}`)
    : error;
const read = async (path: string): Promise<string> =>
  readFile(path, 'utf8').catch((error: unknown) => {
    throw missing(path, error);
  });

/** A stub on a previous address: forwards to the current page with the #step anchor kept (meta refresh is the fallback without scripts).
 * `removedLabel` marks the address of a page that left the course (retiredPageRedirects): the link names the home it leads to. */
/** The stubs of removed pages for a menu row: each leads to the home of that build. */
export const retiredPages = (row: keyof typeof retiredHome): [string, string][] =>
  retiredPageRedirects.map(({ outputPath }) => [
    outputPath,
    redirectStub(retiredHome[row].target, retiredHome[row].label),
  ]);

export const redirectStub = (target: string, removedLabel?: string): string => {
  const title = removedLabel ? 'Раздел убран' : 'Страница переехала';
  const body = removedLabel
    ? `Этого раздела больше нет: <a href="${target}">${removedLabel}</a>.`
    : `Страница переехала: <a href="${target}">открыть новый адрес</a>.`;
  return `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{background:#f4f1e8;color:#1f2a26;font-family:Inter,ui-sans-serif,system-ui,sans-serif}body{margin:0;padding:24px}a{color:#216650}</style><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${target}"><title>${title} · AI PDLC Learning</title><script>location.replace("${target}" + location.hash);</script></head>
<body><p>${body}</p></body>
</html>
`;
};

/** One file of the built site: text content, or a source file to copy as-is. */
type SiteEntry = { path: string; content: string } | { path: string; from: string };

const emit = async (outputDir: string, entry: SiteEntry): Promise<void> => {
  const target = resolve(outputDir, entry.path);
  await mkdir(dirname(target), { recursive: true });
  if ('content' in entry) await writeFile(target, entry.content, 'utf8');
  else await copyFile(entry.from, target);
};

/** Reads the course sources and returns every file of the site; nothing is written, so a missing source fails before any output is touched. */
export const planLearningSite = async (): Promise<SiteEntry[]> => {
  const entries: SiteEntry[] = [];
  const write = (path: string, content: string): void => {
    entries.push({ path, content });
  };
  const copy = async (from: string, path: string): Promise<void> => {
    await access(from).catch((error: unknown) => {
      throw missing(from, error);
    });
    entries.push({ path, from });
  };
  const source = (path: string): string => resolve(ROOT, SOURCE, path);

  for (const name of SHARED_FILES) await copy(source(name), name);
  write('course-motion.js', await bundleMotion());
  if (courseNavigationRow() === 'public') {
    write('index.html', placeHtml(await read(source('index.html')), './'));
    write('landing.css', await readLandingCss());
    await copy(source('landing.js'), 'landing.js');
  } else {
    write('index.html', redirectStub('guides/index.html'));
  }
  for (const [from, to, home] of [
    ['corporate-resources.html', 'corporate-resources.html', './'],
    ['analytics-process-sdd.html', 'analytics-process-sdd.html', './'],
    ['harness-levels.html', 'harness-levels.html', './'],
    ['roles.html', 'roles.html', './'],
    ['glossary.html', 'glossary.html', './'],
    ['analysis-maturity-map.html', 'analysis-maturity-map.html', './'],
    ['intent-maturity-map.html', 'intent-maturity-map.html', './'],
    ['examples/credit-calculator.html', 'examples/credit-calculator.html', '../'],
  ] as const) {
    let html = await read(source(from));
    if (from === 'analytics-process-sdd.html') {
      const css = await read(source('analytics-process-sdd.css'));
      html = html.replace('</head>', () => `<style>\n${css}</style>\n</head>`);
    }
    write(to, placeHtml(html, home));
  }
  write(
    'examples/credit-calculator.js',
    stripTypeScriptTypes(await read(source('examples/credit-calculator.ts')), { mode: 'strip' }),
  );

  for (const name of PUBLIC_GUIDE_ASSETS) {
    // The stylesheet is published as one file: the build joins its source parts without separators.
    let content =
      name === 'learning-enhancements.css'
        ? await readLearningEnhancementsCss()
        : await read(resolve(ROOT, GUIDES, name));
    if (name === 'index.html') content = renderComparisonTable(content);
    // The generated intent map lives in its own part, so the hand-written page stays below the
    // agent-size-guard limit (TASK-718); the published page gets it spliced back in.
    if (name === 'intent.html')
      content = spliceCourseMap(
        content,
        await read(resolve(ROOT, INTENT_MAP_PART)),
        `guides/${name}`,
      );
    write(
      `guides/${name}`,
      name.endsWith('.html') ? placeHtml(content, '../') : rewriteHome(content, '../'),
    );
  }
  write(
    `guides/${courseNames.guides.metarepo.file}`,
    placeHtml(await readMetarepositoryGuide(resolve(ROOT, GUIDES)), '../'),
  );
  for (const { outputPath, target } of pageRedirects) write(outputPath, redirectStub(target));
  for (const [outputPath, html] of retiredPages(courseNavigationRow())) write(outputPath, html);
  for (const name of [...PUBLIC_GUIDE_BINARY_ASSETS, ...PUBLIC_GUIDE_DOCUMENT_ASSETS])
    if (name === 'metarepository.md')
      // The download is the concatenation of the split Markdown source, so the served file keeps its text.
      write(`guides/${name}`, await readMetarepositoryMarkdown(resolve(ROOT, GUIDES)));
    else await copy(resolve(ROOT, GUIDES, name), `guides/${name}`);
  const writeExamplePage = (name: string, markdown: string): void => {
    const depth = name.split('/').length - 1;
    write(
      `guides/${examplePagePath(name)}`,
      placeHtml(renderExamplePage(markdown, name, '../'.repeat(depth)), '../'.repeat(depth + 1)),
    );
  };
  for (const name of EXAMPLE_MARKDOWN)
    writeExamplePage(name, await read(resolve(ROOT, GUIDES, name)));
  for (const name of GUIDE_SCRIPTS) {
    write(`guides/${name}.js`, await readGuideScriptSource(name));
  }
  write('favicon.svg', FAVICON);
  write('favicon.ico', FAVICON);
  return entries;
};

/** Build the whole course site into `outputDir`. Sources are only read, never written. */
export const buildLearningSite = async (outputDir: string): Promise<void> => {
  outputDir = await assertSafeOutputDir(outputDir);
  const entries = await planLearningSite();
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  for (const entry of entries) await emit(outputDir, entry);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputDir = await assertSafeOutputDir(process.env.PAGES_OUTPUT_DIR || 'dist/site');
  await buildLearningSite(outputDir);
  process.stdout.write(`Course site: ${outputDir}\n`);
  // After the site is built: the films are published with the site only, and only if their mp4 files are present (npm run video:fetch).
  const { addGuideVideo, GUIDE_VIDEOS } = await import('./guide-video.ts');
  for (const spec of GUIDE_VIDEOS)
    process.stdout.write(
      `Lesson video: ${(await addGuideVideo(outputDir, undefined, spec)) ? `added to ${spec.page}` : `file absent for ${spec.page}, block hidden`}\n`,
    );
}
