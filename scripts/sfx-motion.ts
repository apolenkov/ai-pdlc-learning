#!/usr/bin/env node
// Collect movement times by running existing scene compositions in Chrome; no frames are rendered.
// node --experimental-strip-types scripts/sfx-motion.ts <film dir> <out events.json>
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  hoverByScene,
  planEvents,
  timelineScenes,
  type Alignment,
  type SceneEntry,
  type SfxEventConfig,
  type SfxFileConfig,
} from '../video/_shared/tools/sfx-plan.ts';

const [filmArg, outArg] = process.argv.slice(2);
if (!filmArg || !outArg) throw new Error('usage: sfx-motion.ts <film dir> <out events.json>');
const film = resolve(filmArg);
const out = resolve(outArg);
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const rawScenes = readJson(join(film, 'scenes.json'));
if (
  !Array.isArray(rawScenes) ||
  !rawScenes.every(
    (scene: unknown) =>
      scene !== null &&
      typeof scene === 'object' &&
      'duration' in scene &&
      typeof scene.duration === 'number',
  )
)
  throw new Error('invalid scenes.json');
const scenes: SceneEntry[] = timelineScenes(
  rawScenes.map((scene: unknown) => {
    if (
      !scene ||
      typeof scene !== 'object' ||
      !('duration' in scene) ||
      typeof scene.duration !== 'number'
    )
      throw new Error('invalid scene');
    return {
      duration: scene.duration,
      ...('n' in scene && (typeof scene.n === 'string' || typeof scene.n === 'number')
        ? { n: scene.n }
        : {}),
      ...('overlay' in scene && typeof scene.overlay === 'boolean'
        ? { overlay: scene.overlay }
        : {}),
    };
  }),
);
const ids = scenes.map((scene) => String(scene.n).padStart(2, '0'));
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let kit = readFileSync(join(film, 'kit/kit.js'), 'utf8');
// Instrument only the temporary browser copy. Every replacement is checked so a kit update cannot silently lose events.
for (const [name, kind] of [
  ['stageIn', 'swipe'],
  ['popIn', 'pop'],
] as const) {
  const line = kit.split('\n').find((value) => value.trim().startsWith(`const ${name} = `));
  if (!line || !line.endsWith(';')) throw new Error(`kit/kit.js: ${name} definition changed`);
  const traced =
    line
      .replace('=> S.tl.', `=> (window.__recordMotion(S.id, t, '${kind}', '${name}'), S.tl.`)
      .slice(0, -1) + ');';
  kit = kit.replace(line, traced);
}
for (const [needle, insert] of [
  [
    'function stageInSoft(S, el, t) {',
    "function stageInSoft(S, el, t) { window.__recordMotion(S.id, t, 'pop', 'stageInSoft');",
  ],
  [
    '      type(from, to, t0, t1) {',
    "      type(from, to, t0, t1) { window.__recordMotion(S.id, t0, 'keys', 'editor.type');",
  ],
  [
    '      press(id, at, hold) {',
    "      press(id, at, hold) { window.__recordMotion(S.id, at, 'click', 'keycard.press');",
  ],
] as const) {
  if (!kit.includes(needle)) throw new Error(`kit/kit.js: ${needle} changed`);
  kit = kit.replace(needle, insert);
}

const compositions = ids.map((id) =>
  readFileSync(join(film, `compositions/scene-${id}.html`), 'utf8'),
);
const bodies = compositions.map((html) =>
  html
    .replace(/^<template[^>]*>/, '')
    .replace(/<\/template>\s*$/, '')
    .replace(/<script>[\s\S]*?<\/script>/g, ''),
);
const scripts = compositions.flatMap((html) =>
  [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]),
);
const seed = `<script>window.__SFX_EVENTS=[];window.__SFX_ERRORS=[];window.__recordMotion=(scene,t,kind,source)=>{if(Number.isFinite(t))window.__SFX_EVENTS.push({scene,t,kind,source});};window.addEventListener('error',e=>window.__SFX_ERRORS.push(e.message));</script>`;
const index = readFileSync(join(film, 'index.html'), 'utf8');
const originalHead = /<head>([\s\S]*?)<\/head>/.exec(index)?.[1];
if (!originalHead || !originalHead.includes('src="kit/kit.js"'))
  throw new Error('film index missing kit/kit.js');
const head = originalHead.replace(
  /<script src="kit\/kit\.js"><\/script>/,
  `<script>${kit}</script>`,
);
const html = [
  '<!doctype html><html><head>',
  seed,
  head,
  '</head><body>',
  ...bodies,
  ...scripts.map((script) => `<script>${script}</script>`),
  '<pre id="motion-result"></pre><script>document.getElementById("motion-result").textContent=JSON.stringify({events:window.__SFX_EVENTS,errors:window.__SFX_ERRORS});</script>',
  '</body></html>',
].join('\n');
const probe = join(film, `.sfx-motion-${process.pid}.html`);
writeFileSync(probe, html);
let dumped: string;
try {
  dumped = execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--allow-file-access-from-files',
      '--no-first-run',
      '--dump-dom',
      pathToFileURL(probe).href,
    ],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  );
} finally {
  unlinkSync(probe);
}
const payload = /<pre id="motion-result">([^<]*)<\/pre>/.exec(dumped)?.[1];
if (!payload) throw new Error('Chrome did not return motion payload');
const parsed: unknown = JSON.parse(payload.replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
const isMotionKind = (value: unknown): value is 'pop' | 'swipe' | 'click' | 'keys' =>
  value === 'pop' || value === 'swipe' || value === 'click' || value === 'keys';
if (
  !parsed ||
  typeof parsed !== 'object' ||
  !('events' in parsed) ||
  !Array.isArray(parsed.events) ||
  !('errors' in parsed) ||
  !Array.isArray(parsed.errors)
)
  throw new Error('invalid Chrome motion payload');
const result = {
  errors: parsed.errors.map((error: unknown) => String(error)),
  events: parsed.events.map(
    (
      event: unknown,
    ): { scene: string; t: number; source: string; kind: 'pop' | 'swipe' | 'click' | 'keys' } => {
      if (
        !event ||
        typeof event !== 'object' ||
        !('scene' in event) ||
        typeof event.scene !== 'string' ||
        !('t' in event) ||
        typeof event.t !== 'number' ||
        !('source' in event) ||
        typeof event.source !== 'string' ||
        !('kind' in event) ||
        !isMotionKind(event.kind)
      )
        throw new Error('invalid motion event');
      return { scene: event.scene, t: event.t, source: event.source, kind: event.kind };
    },
  ),
};
if (result.errors.length) throw new Error(`composition errors: ${result.errors.join('; ')}`);
const starts = new Map<string, number>();
let time = 0;
for (const [i, scene] of scenes.entries()) {
  starts.set(ids[i]!, time);
  time += scene.duration;
}
const candidates: SfxEventConfig[] = result.events
  .map((event): SfxEventConfig => ({
    kind: event.kind,
    t: Number(((starts.get(event.scene) ?? NaN) + event.t).toFixed(3)),
    note: `${event.scene}:${event.source}`,
  }))
  .filter((event) => Number.isFinite(event.t) && event.t >= 2.6 && event.t < time - 2.3)
  .sort((a, b) => a.t - b.t);
const rawCfg = readJson(join(film, 'sfx.json'));
if (!rawCfg || typeof rawCfg !== 'object') throw new Error('invalid sfx.json');
const cfg: SfxFileConfig = {};
if ('sub' in rawCfg) {
  if (!Array.isArray(rawCfg.sub) || !rawCfg.sub.every((v: unknown) => typeof v === 'number'))
    throw new Error('invalid sub');
  cfg.sub = rawCfg.sub.map((v: number) => v);
}
if ('hover' in rawCfg) {
  if (!Array.isArray(rawCfg.hover)) throw new Error('invalid hover');
  cfg.hover = rawCfg.hover.map((entry: unknown): [number | string, string] => {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      (typeof entry[0] !== 'number' && typeof entry[0] !== 'string') ||
      typeof entry[1] !== 'string'
    )
      throw new Error('invalid hover entry');
    return [entry[0], entry[1]];
  });
}
const plan = hoverByScene(scenes, cfg);
const empty: Alignment = { characters: [], character_start_times_seconds: [] };
const aligns = scenes.map(() => empty);
for (const [index] of plan.hover ?? []) {
  const n = String(scenes[index - 1]!.n);
  const alignment = [`scene-${n}`, `scene-${n.padStart(2, '0')}`]
    .map((base) => join(film, `assets/vo/${base}.alignment.json`))
    .find(existsSync);
  if (!alignment) throw new Error(`no alignment for scene ${n}`);
  const raw = readJson(alignment);
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('characters' in raw) ||
    !Array.isArray(raw.characters) ||
    !('character_start_times_seconds' in raw) ||
    !Array.isArray(raw.character_start_times_seconds)
  )
    throw new Error(`invalid alignment for scene ${n}`);
  aligns[index - 1] = {
    characters: raw.characters.map((v: unknown) => String(v)),
    character_start_times_seconds: raw.character_start_times_seconds.map((v: unknown) => Number(v)),
  };
}
const base = planEvents(
  scenes.map((scene) => scene.duration),
  aligns,
  plan,
);
const events: SfxEventConfig[] = base.map(({ kind, t, pan, phraseStart }) => ({
  kind,
  t,
  pan,
  ...(phraseStart !== undefined ? { phraseStart } : {}),
}));
for (const event of candidates) {
  if (events.some((kept) => Math.abs(event.t - kept.t) < 0.6)) continue;
  if (events.some((kept) => kept.note?.includes(':') && Math.abs(event.t - kept.t) < 1.2)) continue;
  events.push(event);
}
events.sort((a, b) => a.t - b.t);
if (!result.events.length) throw new Error('no Kit movement events collected');
writeFileSync(
  out,
  JSON.stringify(
    { ...(cfg.sub ? { sub: cfg.sub } : {}), ...(cfg.hover ? { hover: cfg.hover } : {}), events },
    null,
    2,
  ) + '\n',
);
console.log(
  `sfx-motion: ${result.events.length} calls → ${events.length} events for ${scenes.length} scenes, ${time.toFixed(1)}s`,
);
