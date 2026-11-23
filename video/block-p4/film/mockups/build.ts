import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scene03, scene05, type State } from './scene-data.ts';

// Generates isolated review artifacts only; never imports production timing or audio.
const base = fileURLToPath(new URL('.', import.meta.url));
const escape = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const plain = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, 'x')
    .trim();
const words = (s: string) =>
  plain(s)
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
const steps = ['Создать', 'Отправить', 'Подключить', 'Связать', 'Изменить', 'Проверить'];
const snapshots: Record<string, unknown> = {
  warning: 'ILLUSTRATIVE MOCK TIMING ONLY — not production timing, speech or alignment',
  units: 'seconds from the start of each isolated index.html',
};
for (const [scene, states] of [
  ['03', scene03],
  ['05', scene05],
] as const) {
  let cursor = 0;
  const slots = states.map((state: State) => {
    const count = words(
      state.title +
        ' ' +
        state.html +
        (state.machine ? ' Машина 1 Машина 2 ' + steps.join(' ') : ''),
    );
    const reveal = state.html.includes('ui-action') ? 1.5 : 0.7;
    const hold = Math.max(5, Math.ceil((count / 3 + 1) * 10) / 10);
    const duration = Math.round((hold + reveal + 0.7) * 10) / 10;
    const start = cursor;
    cursor = Math.round((cursor + duration) * 10) / 10;
    if (duration - reveal - 0.5 < count / 3 + 1)
      throw new Error(`Reading hold failed: ${state.id}`);
    return {
      state,
      count,
      hold,
      reveal,
      duration,
      start,
      midpoint: Math.round((start + reveal + hold / 2) * 100) / 100,
    };
  });
  const id = `p4-mock-${scene}`;
  const clips = slots
    .map(({ state, start, duration }) => {
      const rail =
        state.step === undefined
          ? ''
          : `<ol class="steps">${steps.map((name, i) => `<li${state.step === i ? ' class="current"' : ''}>${name}</li>`).join('')}</ol>`;
      const machines =
        state.machine === undefined
          ? ''
          : `<div class="machines"><span${state.machine === 1 ? ' class="selected"' : ''}>Машина 1</span><span${state.machine === 2 ? ' class="selected"' : ''}>Машина 2</span></div>`;
      return `<section class="clip" id="${id}-${state.id}" data-start="${start}" data-duration="${duration}" data-track-index="1"><div class="state ${state.machine ? 'setup-state' : 'contract-state'}"><h2 class="state-title">${escape(state.title)}</h2>${machines}${rail}<div class="content">${state.html}</div></div></section>`;
    })
    .join('\n');
  const animations = slots
    .map(({ state, start, duration }, index) => {
      const target = `#${id}-${state.id} .state`;
      const incoming =
        index === 0
          ? `tl.set(${JSON.stringify(target)}, {opacity: 1, x: 0, scale: 1}, 0);`
          : state.kind === 'result'
            ? `tl.fromTo(${JSON.stringify(target)}, {opacity: 0, scale: 0.97}, {opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.2)', immediateRender: false}, ${start});`
            : `tl.fromTo(${JSON.stringify(target)}, {opacity: 0, x: 32}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, ${start});`;
      const commandReveal = state.html.includes('ui-action')
        ? `tl.set('#${id}-${state.id} .command', {opacity: 0}, ${start}); tl.fromTo('#${id}-${state.id} .command', {opacity: 0, x: 20}, {opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', immediateRender: false}, ${Math.round((start + 0.8) * 10) / 10});`
        : '';
      return `tl.addLabel('${state.id}', ${start});\n${incoming}\n${commandReveal}\n${index === slots.length - 1 ? '' : `tl.to(${JSON.stringify(target)}, {opacity: 0, duration: 0.5, ease: 'power2.in'}, ${Math.round((start + duration - 0.5) * 10) / 10});`}`;
    })
    .join('\n');
  const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=1920, height=1080"><title>p4 · сцена ${scene} · макет</title>
<link rel="stylesheet" href="kit/tokens.css"><link rel="stylesheet" href="mockup.css"><script src="assets/gsap.min.js"></script>
<style>
@font-face {font-family: 'Inter'; font-weight:100 900; src:url('assets/fonts/inter-cyrillic.woff2') format('woff2'); unicode-range:U+0400-045F,U+2116;}
@font-face {font-family: 'Inter'; font-weight:100 900; src:url('assets/fonts/inter-latin.woff2') format('woff2'); unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF;}
@font-face {font-family: 'JetBrains Mono Local'; font-weight:100 800; src:url('assets/fonts/jetbrains-mono-cyrillic.woff2') format('woff2'); unicode-range:U+0400-045F,U+2116;}
@font-face {font-family: 'JetBrains Mono Local'; font-weight:100 800; src:url('assets/fonts/jetbrains-mono-latin.woff2') format('woff2'); unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF;}
</style></head><body>
<div id="root" data-composition-id="${id}" data-start="0" data-width="1920" data-height="1080" data-duration="${cursor}">
<div class="backdrop"></div><header><h1>${scene === '03' ? 'Store шаг за шагом' : 'Контракт и запросы изменения'}</h1><p>Макет · условное время · без озвучки</p></header>
${clips}
<div class="subtitle-mock">Зона субтитров · макет без аудио</div>
</div><script>const tl = gsap.timeline({paused: true}); window.__timelines = window.__timelines || {}; window.__timelines['${id}'] = tl;</script><script src="timeline.js"></script></body></html>\n`;
  mkdirSync(`${base}scene-${scene}`, { recursive: true });
  writeFileSync(`${base}scene-${scene}/index.html`, html);
  writeFileSync(`${base}scene-${scene}/timeline.js`, `${animations.trim()}\n`);
  writeFileSync(
    `${base}scene-${scene}/package.json`,
    JSON.stringify(
      {
        name: `p4-scene-${scene}-mock`,
        private: true,
        type: 'module',
        scripts: {
          check: 'npx --no-install hyperframes@0.8.164 check',
          lint: 'npx --no-install hyperframes@0.8.164 lint',
        },
      },
      null,
      2,
    ) + '\n',
  );
  snapshots[`scene-${scene}`] = {
    file: `scene-${scene}/index.html`,
    compositionId: id,
    duration: cursor,
    midpoints: slots.map(({ midpoint }) => midpoint),
    states: slots.map(({ state, start, duration, midpoint, hold, count }) => ({
      id: state.id,
      step: state.step === undefined ? undefined : state.step + 1,
      start,
      duration,
      midpoint,
      words: count,
      stationaryHold: hold,
    })),
    edges: [0, 0.1, 0.3, Math.round((cursor - 1 / 30) * 1000) / 1000],
  };
}
const sceneMetadata = JSON.parse(readFileSync(`${base}../scenes.json`, 'utf8')) as {
  id?: string;
  duration: number;
  audio?: string | null;
}[];
const titleMetadata = sceneMetadata.find((item) => item.id === 't5');
if (!titleMetadata || titleMetadata.duration !== 2 || titleMetadata.audio !== null)
  throw new Error('Expected unchanged silent t5 metadata, duration 2');
mkdirSync(`${base}title-05`, { recursive: true });
writeFileSync(
  `${base}title-05/index.html`,
  `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=1920, height=1080"><title>p4 · actual t5 inspection harness</title>
<link rel="stylesheet" href="kit/tokens.css"><link rel="stylesheet" href="kit/components.css"><script src="assets/gsap.min.js"></script>
<script>window.KIT_SCENES = ${JSON.stringify({ t5: titleMetadata })};</script><script src="kit/kit.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:1920px;height:1080px;overflow:hidden;background:var(--k-bg)}#root{position:relative;width:100%;height:100%;overflow:hidden;background:var(--k-bg)}.clip{position:absolute;inset:0}</style>
</head><body><div id="root" data-composition-id="p4-title-05-proof" data-start="0" data-duration="2" data-width="1920" data-height="1080"><div id="scene-t5" class="clip" data-composition-id="scene-t5" data-composition-src="compositions/scene-t5.html" data-start="0" data-duration="2" data-track-index="1" data-width="1920" data-height="1080"></div></div>
<script>window.__timelines = window.__timelines || {}; window.__timelines['p4-title-05-proof'] = gsap.timeline({paused:true});</script></body></html>\n`,
);
writeFileSync(
  `${base}title-05/package.json`,
  JSON.stringify(
    {
      name: 'p4-title-05-proof',
      private: true,
      type: 'module',
      scripts: {
        check: 'npx --no-install hyperframes@0.8.164 check',
        lint: 'npx --no-install hyperframes@0.8.164 lint',
      },
    },
    null,
    2,
  ) + '\n',
);
snapshots['title-05'] = {
  file: 'title-05/index.html',
  compositionId: 'p4-title-05-proof',
  duration: 2,
  times: [0, 0.1, 0.3, 1, 1.69, 1.97],
  status:
    'STOP: source has 1.7s static hold; five-word lead needs 2.667s; full eleven-word card needs 4.667s. No visual PASS.',
};
writeFileSync(`${base}snapshot-times.json`, JSON.stringify(snapshots, null, 2) + '\n');
