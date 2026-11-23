// Browser walk over a built site (PAGES_WITH_VIDEO=1 npm run build:site, then a static server on dist/site):
// both courses — analysis and intent. Map film links lead to loaded players; each lesson opens with one inline main
// player and keeps its extra films in their slots; the intent overview sits in its own slot and its step films are main
// players. For the intent films the gate also requires muted playback to advance, a loaded caption track with parsed
// cues, chapters and a loaded poster; both widths must not overflow horizontally.
//   node scripts/check-film-links.ts [baseUrl=http://localhost:4194] [--course=all|analysis|intent]
// Needs the agent-browser CLI (AGENT_BROWSER_SESSION set by the caller); exits 1 on the first failed page.
// --course=intent walks the intent course only; it needs the full video build (all intent and preparation films), because the map must show every row its source declares. A release runs the default both.
// The analysis pass only checks readiness and placement; it does not claim playback or track checks.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const base = (args.find((arg) => !arg.startsWith('--')) ?? 'http://localhost:4194').replace(
  /\/$/u,
  '',
);
const course = args.find((arg) => arg.startsWith('--course='))?.split('=')[1] ?? 'all';
assert.ok(['all', 'analysis', 'intent'].includes(course), `unknown course: ${course}`);
const walkAnalysis = course !== 'intent';
const walkIntent = course !== 'analysis';
export const VIEWPORTS: [number, number][] = [
  [1440, 900],
  [1024, 900],
  [390, 844],
];

/** A caption track is usable only when the browser finished loading it and parsed real cues; 404 or a broken VTT is ERROR with cues null. */
export const trackOk = (element: unknown): boolean => {
  if (!element || typeof element !== 'object') return false;
  // An HTMLTrackElement carries readyState, while the parsed cues live on its TextTrack (Chrome has no TextTrack.readyState).
  const wrapped = 'track' in element ? element.track : undefined;
  const source = wrapped ?? element;
  if (!source || typeof source !== 'object') return false;
  const readyState =
    'readyState' in element
      ? element.readyState
      : 'readyState' in source
        ? source.readyState
        : undefined;
  const cues = 'cues' in source ? source.cues : 'cues' in element ? element.cues : undefined;
  return (
    readyState === 2 &&
    !!cues &&
    typeof cues === 'object' &&
    'length' in cues &&
    typeof cues.length === 'number' &&
    cues.length > 0
  );
};

const ab = (...command: string[]): string =>
  execFileSync('agent-browser', command, { encoding: 'utf8', timeout: 90_000 }).trim();
const evaluate = (js: string): unknown => {
  let value: unknown = ab('eval', js);
  while (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      break;
    }
  }
  return value;
};
const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
const isProbeResult = (value: unknown): value is { ok: boolean; why: string } =>
  !!value &&
  typeof value === 'object' &&
  'ok' in value &&
  typeof value.ok === 'boolean' &&
  'why' in value &&
  typeof value.why === 'string';
const open = (path: string): void => {
  ab('open', `${base}${path}`);
  ab('wait', '2500');
};

/**
 * Player probe. With `withPlay` it loads the caption track (hidden mode), waits for its readyState, starts muted
 * playback, waits for time to advance and verifies the poster image really loads. `trackOk` is embedded by
 * `toString()` so this probe and the unit test enforce exactly the same caption contract.
 */
export const PLAYER = (id: string, withPlay = false): string => `
(async()=>{
  const s=document.getElementById(${JSON.stringify(id)});
  if(!s)return {ok:false,why:'no #${id}'};
  const v=s.querySelector('video');
  if(!v)return {ok:false,why:'no video'};
  await new Promise(r=>{if(v.readyState>=1)return r();v.addEventListener('loadedmetadata',r,{once:true});setTimeout(r,6000)});
  const track=v.querySelector('track');
  let trackLive=(${trackOk.toString()})(track);
  let playOk=false;
  let posterLive=!!v.getAttribute('poster');
  if(${withPlay ? 'true' : 'false'}){
    if(track){try{(track.track??track).mode='hidden'}catch(e){};const until=Date.now()+3000;while(track.readyState<2&&Date.now()<until){await new Promise(r=>setTimeout(r,100));}}
    v.muted=true;try{await v.play()}catch(e){};await new Promise(r=>setTimeout(r,900));
    trackLive=(${trackOk.toString()})(track);
    playOk=!v.paused&&v.currentTime>0.2&&trackLive;
    const posterUrl=v.getAttribute('poster');
    posterLive=!!posterUrl&&await new Promise(r=>{try{const img=new Image();img.onload=()=>r(img.naturalWidth>0);img.onerror=()=>r(false);img.src=posterUrl}catch(e){r(false)}});
  }
  const chapters=s.querySelectorAll('button[data-chapter]').length;
  const top=Math.round(s.getBoundingClientRect().top);
  const ok=v.readyState>=1&&!v.error&&top>=0&&top<innerHeight*0.6&&(${withPlay ? '(playOk&&chapters>0&&posterLive)' : 'true'});
  return JSON.stringify({ok,why:'ready='+v.readyState+' top='+top+' dur='+Math.round(v.duration)+' play='+v.currentTime.toFixed(1)+' track='+trackLive+' chapters='+chapters+' poster='+posterLive});
})()`;

const ANALYSIS_PLACEMENT = `JSON.stringify({
  ok: document.querySelectorAll('.lesson-goal > #lesson-video').length === 1
    && document.querySelectorAll('[id="lesson-video"]').length === 1
    && !document.querySelector('.lesson-goal__links [data-video-link], .lesson-video a[href*=".mp4"]')
    && [...document.querySelectorAll('script[id^="guide-video-chapters"][data-slot]')].every(data =>
      document.getElementById(data.dataset.slot)?.contains(document.getElementById('lesson-video-' + data.dataset.id))),
  why: 'expected one inline primary player, extra players in their slots, and no video-file links'
})`;

const INTENT_STEP_PLACEMENT = `JSON.stringify({
  ok: document.querySelectorAll('.lesson-goal > #lesson-video').length === 1
    && document.querySelectorAll('[id="lesson-video"]').length === 1
    && !document.querySelector('.lesson-video a[href*=".mp4"]'),
  why: 'expected one inline main player in the lesson goal and no video-file links'
})`;

// The course overview lives in the page's own slot, not in a lesson goal, and is labelled as the overview.
const OVERVIEW_PLACEMENT = `JSON.stringify((() => {
  const data = document.getElementById('guide-video-chapters-overview');
  const slot = document.getElementById('intent-overview-film');
  const section = document.getElementById('lesson-video-overview');
  const heading = section?.querySelector('h3, h4')?.textContent;
  return {
    ok: !!data && data.dataset.slot === 'intent-overview-film' && !!slot && !!section
      && slot.contains(section) && document.querySelectorAll('section.lesson-video').length === 1
      && heading === 'Обзор курса' && !document.querySelector('.lesson-video a[href*=".mp4"]'),
    why: 'expected the overview player inside #intent-overview-film with the «Обзор курса» heading',
    heading,
  };
})())`;

type Problems = { page: string; problems: string[] }[];
const fail = (problems: Problems, page: string, text: string): void => {
  const found = problems.find((item) => item.page === page);
  if (found) found.problems.push(text);
  else problems.push({ page, problems: [text] });
};
const overflow = (problems: Problems, page: string, label: string): void => {
  const value = evaluate(`JSON.stringify(document.documentElement.scrollWidth-innerWidth)`);
  assert.ok(typeof value === 'number', 'Horizontal overflow probe must return a number');
  if (value > 0) fail(problems, `${page} ${label}`, `horizontal overflow ${value}px`);
};
const mapLinksOf = (page: string): string[] => {
  open(page);
  const links = evaluate(
    `JSON.stringify([...document.querySelectorAll('.course-map li[data-film]:not([hidden]) a')].map(a=>a.getAttribute('href')))`,
  );
  assert.ok(isStringList(links), 'Course map film links must be strings');
  return links;
};
const checkPlayer = (
  problems: Problems,
  page: string,
  id: string,
  label: string,
  withPlay = true,
): void => {
  const result = evaluate(PLAYER(id, withPlay));
  assert.ok(isProbeResult(result), 'Player probe must return ok and why');
  if (!result.ok) fail(problems, `${page} ${label}`, result.why);
  const labels = evaluate(`JSON.stringify((() => {
    const section = document.getElementById(${JSON.stringify(id)});
    const video = section?.querySelector('video');
    if (!video) return { ok: false, why: 'no video for route-label geometry' };
    const recorded = video.getBoundingClientRect();
    const visible = [...section.querySelectorAll('.lesson-video__intro, .lesson-video__corner')]
      .filter(element => {
        const style = getComputedStyle(element);
        return element.getClientRects().length && !element.hidden
          && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0;
      });
    const covering = visible.find(element => {
      const box = element.getBoundingClientRect();
      return Math.min(box.right, recorded.right) - Math.max(box.left, recorded.left) > 1
        && Math.min(box.bottom, recorded.bottom) - Math.max(box.top, recorded.top) > 1;
    });
    return { ok: visible.length > 0 && !covering,
      why: !visible.length ? 'no visible route label'
        : covering ? 'route label covers recorded video pixels' : 'route label outside recorded frame' };
  })())`);
  assert.ok(isProbeResult(labels), 'Route-label geometry must return ok and why');
  if (!labels.ok) fail(problems, `${page} ${label}`, labels.why);
};
const checkLanded = (problems: Problems, page: string, href: string, label: string): void => {
  ab('eval', `location.hash=${JSON.stringify(`#${href.split('#')[1] ?? ''}`)};1`);
  ab('wait', '1200');
  const landed = evaluate(`JSON.stringify(location.pathname.split('/').pop()+location.hash)`);
  assert.ok(typeof landed === 'string', 'Landed film path must be a string');
  if (landed !== href) fail(problems, `${page} ${label}`, `landed on ${landed}, expected ${href}`);
};

const walkAnalysisCourse = (problems: Problems, label: string): void => {
  const mapLinks = mapLinksOf('/guides/index.html');
  if (mapLinks.length < 12)
    fail(problems, `index ${label}`, `${mapLinks.length} film links on the map, expected 12`);
  for (const href of mapLinks) {
    const [page, id] = href.split('#');
    assert.ok(page && id, 'Course map film link must include a page and player anchor');
    open(`/guides/${page}`);
    checkLanded(problems, page, href, `${label} (map link)`);
    checkPlayer(problems, page, id, `${label} (map link)`, false);
    // The same page from the map, as a click, not a typed hash.
    open('/guides/index.html');
    ab('eval', `document.querySelector('.course-map li[data-film] a[href="${href}"]').click();1`);
    ab('wait', '1500');
    const landed = evaluate(`JSON.stringify(location.pathname.split('/').pop()+location.hash)`);
    assert.ok(typeof landed === 'string', 'Landed film path must be a string');
    if (landed !== href)
      fail(problems, `${page} ${label} (map click)`, `landed on ${landed}, expected ${href}`);
  }
  const pages = [...new Set(mapLinks.map((href) => href.split('#')[0]!))];
  for (const page of pages) {
    open(`/guides/${page}`);
    const placement = evaluate(ANALYSIS_PLACEMENT);
    assert.ok(isProbeResult(placement), 'Player placement probe must return ok and why');
    if (!placement.ok) fail(problems, `${page} ${label}`, placement.why);
    ab('eval', `document.getElementById('lesson-video')?.scrollIntoView({block:'start'});1`);
    checkPlayer(problems, page, 'lesson-video', `${label} (inline player)`, false);
    overflow(problems, page, label);
  }
  console.log(`${label}: ${mapLinks.length} analysis map links, ${pages.length} pages checked`);
};

/** Film rows the source map declares (`li[data-film]`), hidden or not: the full video build reveals a row only when its player is embedded. */
export const sourceFilmRows = (html: string): number =>
  html.match(/<li[^>]*\sdata-film="/gu)?.length ?? 0;

/** The expectation comes from the source map part (5 preparation + 4 step films on intent), never from the page under test: 0 of 0 would pass any build. */
export const intentFilmLinksProblem = (
  links: readonly string[],
  sourceHtml: string,
): string | null => {
  const expected = sourceFilmRows(sourceHtml);
  if (expected === 0)
    return 'the source intent map declares no film rows, the gate has nothing to expect';
  return links.length === expected
    ? null
    : `${links.length} film links on the intent map, expected ${expected}`;
};

// The generated map part, not guides/intent.html: the page keeps only markers, the build splices this part in (TASK-718).
const INTENT_SOURCE = resolve(
  import.meta.dirname,
  '..',
  'docs/pages/sdlc-development/guides/intent/course-map.html',
);

const walkIntentCourse = (problems: Problems, label: string): void => {
  const mapLinks = mapLinksOf('/guides/intent.html');
  const mapProblem = intentFilmLinksProblem(mapLinks, readFileSync(INTENT_SOURCE, 'utf8'));
  if (mapProblem) fail(problems, `intent ${label}`, mapProblem);
  for (const href of mapLinks) {
    const [page, id] = href.split('#');
    assert.ok(page && id, 'Intent map film link must include a page and player anchor');
    open(`/guides/${page}`);
    checkLanded(problems, page, href, `${label} (intent map link)`);
    const placement = evaluate(INTENT_STEP_PLACEMENT);
    assert.ok(isProbeResult(placement), 'Intent player placement probe must return ok and why');
    if (!placement.ok) fail(problems, `${page} ${label}`, placement.why);
    checkPlayer(problems, page, id, `${label} (intent player)`);
    overflow(problems, page, label);
    open('/guides/intent.html');
    ab('eval', `document.querySelector('.course-map li[data-film] a[href="${href}"]').click();1`);
    ab('wait', '1500');
    const landed = evaluate(`JSON.stringify(location.pathname.split('/').pop()+location.hash)`);
    if (typeof landed !== 'string' || landed !== href)
      fail(
        problems,
        `${page} ${label} (intent map click)`,
        `landed on ${String(landed)}, expected ${href}`,
      );
  }
  open('/guides/intent.html');
  const placement = evaluate(OVERVIEW_PLACEMENT);
  assert.ok(isProbeResult(placement), 'Overview placement probe must return ok and why');
  if (!placement.ok) fail(problems, 'intent.html', `${label} (overview) ${placement.why}`);
  ab('eval', `document.getElementById('intent-overview-film')?.scrollIntoView({block:'start'});1`);
  ab('wait', '600');
  checkPlayer(problems, 'intent.html', 'lesson-video-overview', `${label} (overview player)`);
  overflow(problems, 'intent.html', label);
  console.log(`${label}: ${mapLinks.length} intent map links, overview checked`);
};

const run = (): void => {
  const problems: Problems = [];
  try {
    for (const [width, height] of VIEWPORTS) {
      const label = `${width}px`;
      ab('set', 'viewport', String(width), String(height));
      if (walkAnalysis) walkAnalysisCourse(problems, label);
      if (walkIntent) walkIntentCourse(problems, label);
    }
  } finally {
    ab('close');
  }
  if (problems.length) {
    for (const item of problems) console.error(`FAIL ${item.page}: ${item.problems.join('; ')}`);
    process.exit(1);
  }
  const scope = course === 'all' ? 'both courses lead' : `${course} course leads`;
  console.log(`film links: ${scope} to a loaded player`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
