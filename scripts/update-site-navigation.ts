import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import { buildRoute, routeLabel } from '../docs/pages/sdlc-development/route-strip/model.ts';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { escapeHtml, replaceSiteNavigation, type SiteSection } from './site-navigation-contract.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = resolve(ROOT, 'docs/pages/sdlc-development');

/** The landing section whose catalog lists the page; every other course page belongs to «Анализ» of the SDLC map. */
const CATALOG_SECTIONS: Readonly<Record<string, SiteSection>> = {
  'roles.html': 'help',
  'glossary.html': 'help',
  'corporate-resources.html': 'help',
};

const htmlFiles = async (directory: string): Promise<string[]> =>
  (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map(async (entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith('.html') ? [path] : [];
      }),
    )
  ).flat();

/** Rewrite the shared navigation block of every source page; pages without one are skipped. */
export const updateSiteNavigation = async (check: boolean): Promise<string[]> => {
  const stale: string[] = [];
  const route = buildRoute(courseNames, {});
  const guides: Record<string, { title: string }> = courseNames.guides;
  for (const file of await htmlFiles(PAGES)) {
    const html = await readFile(file, 'utf8');
    if (!html.includes('data-global-nav')) continue;
    // With «/» separators, as the maps below are keyed: on Windows `relative` returns «guides\index.html».
    const page = relative(PAGES, file).split(sep).join('/');
    const section = CATALOG_SECTIONS[page] ?? 'sdlc';
    const deck = file === resolve(PAGES, 'analytics-process-sdd.html');
    const target = { section, landing: page === 'index.html' };
    let next = replaceSiteNavigation(
      html,
      deck ? { ...target, navClass: 'deck-topbar site-topbar', preservePageActions: true } : target,
    );
    const stageId = html.match(/<body\b[^>]*data-stage="([^"]+)"/u)?.[1];
    const step = route.find((entry) => entry.id === stageId);
    if (step) {
      const title = escapeHtml(
        routeLabel({
          ...step,
          title: guides[step.id]!.title,
        }),
      );
      next = next
        .replace(/<title>[^]*?<\/title>/u, `<title>${title} · AI PDLC Learning</title>`)
        .replace(/(<h1\b[^>]*>)[^]*?<\/h1>/u, `$1${title}</h1>`);
    }
    if (next === html) continue;
    stale.push(file);
    if (!check) await writeFile(file, next, 'utf8');
  }
  return stale;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const stale = await updateSiteNavigation(check);
  process.stdout.write(`${check ? 'Out of date' : 'Updated'}: ${stale.length} page(s)\n`);
  if (check && stale.length > 0) process.exitCode = 1;
}
