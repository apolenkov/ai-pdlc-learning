// What a built page makes the browser load from outside the site: the public course loads only its own
// files and the films of its media release. Links a reader may click are not requests and are not checked.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export const MEDIA_RELEASE =
  'https://github.com/apolenkov/ai-pdlc-learning/releases/download/media-v1/';

const SCHEME_SLASHES = /^(?:[a-z][a-z\d+.-]*:)?\/\//iu;
/* Not a file the browser fetches from a place: inline data, in-page anchors, a value that starts with a run-time
   part (`${base}a.png`). A run-time part after a literal host (`https://host/${file}`) still names the host. */
const INERT = /^(?:#|data:|blob:|about:|javascript:|mailto:|tel:|\$\{|\{\{)/iu;
/* The project root under two names: a path stays inside only if it does under both, so `../../<name>/x` that
   climbs out and back into a folder of the same name is still outside. */
const SITES = ['https://site.invalid/a/', 'https://site.invalid/b/'] as const;

/**
 * Whether a request leaves the site. An absolute address is compared after the browser would normalise it, so
 * `media-v1/../other/x` is another release. A root-relative path leaves the Pages project root. A relative path
 * is resolved against its file when `base` is given (pages and stylesheets), and leaves when it climbs above the root.
 */
const leaves = (raw: string, base?: string): boolean => {
  const url = raw.trim();
  if (!url || INERT.test(url)) return false;
  if (SCHEME_SLASHES.test(url)) {
    try {
      return !new URL(url.startsWith('//') ? `https:${url}` : url).href.startsWith(MEDIA_RELEASE);
    } catch {
      return true;
    }
  }
  if (url.startsWith('/')) return true;
  if (base === undefined || /^[a-z][a-z\d+.-]*:/iu.test(url)) return false;
  // The browser's own resolution: it also reads «%2e%2e» and «\» as a parent segment.
  try {
    return SITES.some((site) => !new URL(url, new URL(base, site)).href.startsWith(site));
  } catch {
    return true;
  }
};

/* A tag with its attributes; quoted values may hold «>». */
const TAG = /<([a-z][\w:-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/giu;
const ATTRIBUTE = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gu;
const FETCH_ATTRIBUTE: Record<string, readonly string[]> = {
  link: ['href', 'imagesrcset'],
  object: ['data'],
  image: ['href', 'xlink:href'],
  use: ['href', 'xlink:href'],
  feimage: ['href', 'xlink:href'],
};
const FETCHING_TAG =
  /^(?:script|img|video|audio|source|track|iframe|embed|object|input|image|use|feimage|link)$/u;
/* Player and lazy-load data attributes a script copies into src, srcset, poster or a track. */
const DATA_URL = /^data-(?:[\w-]*-)?(?:file|src|srcset|poster|vtt|chapters|url)$/u;
const NON_FETCH_REL =
  /^(?:canonical|alternate|author|license|help|next|prev|me|bookmark|external)$/iu;

/** Every URL of a srcset: candidates split by commas, each one a URL and an optional descriptor. */
const srcsetUrls = (value: string): string[] =>
  value
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/u)[0] ?? '')
    .filter(Boolean);

const CSS_REQUEST = /url\(\s*\\?["']?([^"')\s\\]+)|@import\s+(?:url\(\s*)?["']([^"']+)/giu;
const cssRequests = (text: string): string[] =>
  [...text.matchAll(CSS_REQUEST)].map(([, url, imported]) => (url ?? imported)!);

/* The browser decodes character references in an attribute before it uses the value. */
const NAMED: Record<string, string> = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' };
const decodeEntities = (value: string): string =>
  value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|(quot|apos|amp|lt|gt));?/giu,
    (_, dec?: string, hex?: string, name?: string): string =>
      dec !== undefined || hex !== undefined
        ? String.fromCodePoint(Number.parseInt(dec ?? hex!, dec === undefined ? 16 : 10))
        : NAMED[name!.toLowerCase()]!,
  );

/** Requests of the markup in a text: fetching attributes, data-* sources, style attributes. */
const tagRequests = (text: string): string[] => {
  const urls: string[] = [];
  for (const [, rawName, body] of text.matchAll(TAG)) {
    const name = rawName!.toLowerCase();
    const attributes = new Map<string, string>();
    for (const [, key, double, single, bare] of body!.matchAll(ATTRIBUTE))
      attributes.set(key!.toLowerCase(), decodeEntities(double ?? single ?? bare ?? ''));
    const fetches =
      FETCHING_TAG.test(name) &&
      !(
        name === 'link' &&
        (attributes.get('rel') ?? '').split(/\s+/u).every((rel) => NON_FETCH_REL.test(rel))
      );
    for (const [key, value] of attributes) {
      if (key === 'style') urls.push(...cssRequests(value));
      // An event handler is script: `onload="fetch('https://…')"`.
      if (key.startsWith('on')) urls.push(...scriptRequests(value));
      const source =
        DATA_URL.test(key) ||
        (fetches && ['src', 'srcset', 'poster', ...(FETCH_ATTRIBUTE[name] ?? [])].includes(key));
      if (source) urls.push(...(key.endsWith('srcset') ? srcsetUrls(value) : [value]));
    }
  }
  return urls;
};

const QUOTED = String.raw`\\?["'\x60]`;
const ABSOLUTE = String.raw`((?:[a-z][a-z\d+.-]*:)?\/\/[^"'\x60\s>)]+)`;
/* A quoted root path (`"/assets/x.json"`): it leaves the Pages project root. Only quoted, so a regular expression
   literal (`data: /\s+/`) is not taken for a path. */
const ROOTED = String.raw`${QUOTED}(\/(?![/*])[^"'\x60\s>)]*)`;
const TARGET = String.raw`(?:${QUOTED}${ABSOLUTE}|${ROOTED})`;
/* Script requests with a literal absolute or root address: calls that fetch, static and dynamic imports, XHR,
   src-like properties and object fields a renderer turns into src or srcset. */
const SCRIPT_REQUEST = new RegExp(
  [
    String.raw`\b(?:fetch|import|importScripts|Worker|SharedWorker|EventSource|WebSocket|sendBeacon)\s*\(\s*${TARGET}`,
    String.raw`\b(?:import|export)\b[^;"'\x60]*?\bfrom\s*${TARGET}`,
    String.raw`\bimport\s*${TARGET}`,
    String.raw`\.open\(\s*["'][A-Za-z]+["']\s*,\s*${TARGET}`,
    String.raw`\b(?:src|srcset|poster|data|file|webFile|vtt|chapters|url)\s*[:=]\s*(?:${QUOTED}?\s*${ABSOLUTE}|${ROOTED})`,
  ].join('|'),
  'giu',
);
const scriptRequests = (text: string): string[] =>
  [...text.matchAll(SCRIPT_REQUEST)].map((match) => match.slice(1).find(Boolean)!);

const blocks = (text: string, tag: string): string =>
  [...text.matchAll(new RegExp(`<${tag}\\b[^>]*>([^]*?)</${tag}>`, 'giu'))]
    .map(([, body]) => body)
    .join('\n');

/** Outside requests of one file of the built site, by its extension; `name` is its path inside the site. */
export const fileRequests = (name: string, text: string): string[] => {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  const found: string[] = [];
  const add = (urls: string[], base?: string): void => {
    for (const url of urls) if (leaves(url, base)) found.push(url);
  };
  if (['html', 'htm', 'svg'].includes(extension)) {
    // Only live markup, style and script count: a code sample in the lesson text and a comment are inert.
    const live = text.replace(/<!--[^]*?-->/gu, '');
    add(tagRequests(live), name);
    add(cssRequests(blocks(live, 'style')), name);
    const scripts = blocks(live, 'script');
    add([...scriptRequests(scripts), ...tagRequests(scripts), ...cssRequests(scripts)]);
  } else if (extension === 'css') add(cssRequests(text), name);
  // A script builds markup for the page that loads it, not for its own folder: only absolute and root paths count.
  else if (['js', 'mjs'].includes(extension))
    add([...scriptRequests(text), ...tagRequests(text), ...cssRequests(text)]);
  // Data the pages read (manifests, subtitles) names no outside address at all.
  else if (['json', 'vtt', 'webmanifest'].includes(extension))
    add([...text.matchAll(/(?:[a-z][a-z\d+.-]*:)?\/\/[^\s"'<>]+/giu)].map(([url]) => url));
  return [...new Set(found)].map((url) => `${name}: ${url}`);
};

export const walk = async (directory: string): Promise<string[]> =>
  (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map(async (entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
      }),
    )
  ).flat();

const TEXT = /\.(?:html?|svg|css|m?js|json|vtt|webmanifest)$/iu;

/** Every outside request of a built site, as «file: url». */
export const outsideRequests = async (siteDir: string): Promise<string[]> => {
  const found: string[] = [];
  for (const file of (await walk(siteDir)).filter((path) => TEXT.test(path)).sort())
    found.push(
      ...fileRequests(relative(siteDir, file).split('\\').join('/'), await readFile(file, 'utf8')),
    );
  return found;
};

// The check used to run from this file; a stale command must not report a clean site without looking.
if (import.meta.main) {
  console.error('site-requests.ts is a module: run scripts/check-published-site.ts <site dir>');
  process.exit(2);
}
