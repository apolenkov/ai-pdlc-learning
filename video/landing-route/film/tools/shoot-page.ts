// Кадр главной для шаблона «окно страницы»: снимок страницы и прямоугольники её частей.
//   node --experimental-strip-types tools/shoot-page.ts <url> [film dir]
// Ширина 1664 CSS при DPR 2 → assets/page/page.jpg (3328 px). Координаты в assets/page/rects.json — в единицах
// kit/pagewin.js: x = CSS + 128 (страница стоит в кадре 1920 со сдвигом 128), y = CSS. Высоту страницы
// скрипт записывает в kit/pagewin.css. Анимации отключаются, чтобы кадр не зависел от момента снимка.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { findChrome } from '../../../../scripts/find-chrome.ts';

const url = process.argv[2];
if (!url) throw new Error('usage: shoot-page.ts <url> [film dir]');
const film = resolve(process.argv[3] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const W = 1664, X0 = 128;

// name → selector; for lists, [selector, true] gives one rect per match
const PARTS: Record<string, string | [string, true]> = {
  nav: '[data-global-nav]',
  hero: '.catalog-hero',
  h1: '.catalog-hero h1',
  lede: '.catalog-hero .catalog-lede',
  navLinks: ['[data-global-nav] a', true],
  sdlc: '#sdlc',
  stages: ['#sdlc .route-track > li', true],
  nodes: ['#sdlc .route-stage__node', true],
  agents: ['#sdlc .route-stage__agent', true],
  roles: ['#sdlc .route-stage__role', true],
  ctas: ['#sdlc .route-stage__cta', true],
  chips: ['#sdlc .route-stage__chip', true],
  intent: '#intent',
  intentCards: ['#intent .catalog-card', true],
  analysis: '#analysis',
  analysisCards: ['#analysis .catalog-card', true],
  help: '#help',
  helpCards: ['#help .catalog-card', true],
};

const browser = await puppeteer.launch({ executablePath: await findChrome(), headless: true, args: ['--hide-scrollbars'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: 1000, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const rects = await page.evaluate(
    (parts: Record<string, string | [string, true]>, x0: number) => {
      const box = (e: Element) => {
        const r = e.getBoundingClientRect();
        return { x: Math.round(r.left + x0), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
      };
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parts)) {
        if (Array.isArray(v)) out[k] = [...document.querySelectorAll(v[0])].map(box);
        else {
          const e = document.querySelector(v);
          if (!e) throw new Error('shoot-page: нет элемента ' + v);
          out[k] = box(e);
        }
      }
      return out;
    },
    PARTS,
    X0,
  );
  mkdirSync(resolve(film, 'assets/page'), { recursive: true });
  const shot = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 90 });
  writeFileSync(resolve(film, 'assets/page/page.jpg'), shot);
  writeFileSync(resolve(film, 'assets/page/rects.json'), JSON.stringify({ url, width: W, height, rects }, null, 1) + '\n');
  const kit = resolve(film, 'kit/pagewin.js');
  writeFileSync(kit, readFileSync(kit, 'utf8').replace(/\/\*RECTS\*\/.*?\/\*END\*\//s, `/*RECTS*/${JSON.stringify(rects)}/*END*/`));
  const css = resolve(film, 'kit/pagewin.css');
  writeFileSync(css, readFileSync(css, 'utf8').replace(/^(\.pw-(?:layer|img) \{[^}]*?height: )\d+px;/gm, `$1${height}px;`));
  console.log(`page.jpg ${W * 2}×${height * 2}, rects: ${Object.keys(rects).length}, pagewin.css height ${height}`);
} finally {
  await browser.close();
}
