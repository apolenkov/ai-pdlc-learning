import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { revealCourseMapFilm } from './course-map.ts';
import { creditTemplate } from './guide-video-credit.ts';
import { guideVideoOverlay } from './guide-video-overlay.ts';
import {
  GUIDE_VIDEO_DIR,
  GUIDE_VIDEO_MANIFEST,
  readVideoManifest,
  sha256,
} from './video-manifest.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export * from './video-manifest.ts';
export { MEDIA_RELEASE, mediaUrl } from './media-release.ts';

/** One lesson video: the guide page that hosts the player and the tracked files that describe the git-ignored mp4. */
export type VideoSpec = Readonly<{
  page: string;
  manifest: string;
  vtt: string;
  chapters: string;
  aria: string;
  /** Tracked JPEG shown before play; optional file: without it the player opens on a frame of the video. */
  poster: string;
  /** Chapters are numbered steps of the page ("Смотреть шаг"); false for a film whose parts are not the page steps. */
  steps: boolean;
  /** Heading of a player that sits in a slot; step extras keep «Ролик к шагу», the course overview says «Обзор курса». */
  playerTitle?: string;
  /** A second film on a page that already has its own: its player sits in the step `anchor`, and the first screen gets the link `goal`. */
  extra?: Readonly<{ id: string; anchor: string; goal: string }>;
}>;
export const BLOCK_0A: VideoSpec = {
  page: 'guides/p2-git.html',
  manifest: `${GUIDE_VIDEO_DIR}/${GUIDE_VIDEO_MANIFEST}`,
  vtt: `${GUIDE_VIDEO_DIR}/block-0a.vtt`,
  chapters: `${GUIDE_VIDEO_DIR}/block-0a.chapters.json`,
  poster: `${GUIDE_VIDEO_DIR}/block-0a-poster.jpg`,
  aria: 'Видео к уроку: Markdown, Git и GitLab с нуля',
  steps: true,
};
/** The introductory film (9 parts); its release manifest, captions and chapters live next to its sources in video/block-0/. */
export const BLOCK_0: VideoSpec = {
  page: 'guides/p1-zachem.html',
  manifest: 'video/block-0/video-manifest.json',
  vtt: 'video/block-0/block-0.vtt',
  chapters: 'video/block-0/block-0.chapters.json',
  poster: 'video/block-0/block-0-poster.jpg',
  aria: 'Видео к уроку: зачем меняем процесс и как устроен анализ',
  steps: false,
};
/** The SDD and OpenSpec film (8 parts + closing card); same layout as block-0, files in video/block-sdd/. */
export const BLOCK_SDD: VideoSpec = {
  page: 'guides/p3-sdd.html',
  manifest: 'video/block-sdd/video-manifest.json',
  vtt: 'video/block-sdd/block-sdd.vtt',
  chapters: 'video/block-sdd/block-sdd.chapters.json',
  poster: 'video/block-sdd/block-sdd-poster.jpg',
  aria: 'Видео к уроку: что такое SDD и OpenSpec',
  steps: false,
};
/** The С1 film "Требования в Git" (7 parts + closing card); same layout as block-sdd, files in video/block-r1/. */
export const BLOCK_R1: VideoSpec = {
  page: 'guides/s1-git.html',
  manifest: 'video/block-r1/video-manifest.json',
  vtt: 'video/block-r1/block-r1.vtt',
  chapters: 'video/block-r1/block-r1.chapters.json',
  poster: 'video/block-r1/block-r1-poster.jpg',
  aria: 'Видео к уроку: требования в Git, от замысла к спецификации',
  steps: false,
};
/** The С2 film "Проверяем и согласуем требования" (7 parts + closing card); same layout as block-sdd, files in video/block-r2/. */
export const BLOCK_R2: VideoSpec = {
  page: 'guides/s2-review.html',
  manifest: 'video/block-r2/video-manifest.json',
  vtt: 'video/block-r2/block-r2.vtt',
  chapters: 'video/block-r2/block-r2.chapters.json',
  poster: 'video/block-r2/block-r2-poster.jpg',
  aria: 'Видео к уроку: проверяем и согласуем требования, одобрение людей и принятие',
  steps: false,
};
/** The С4 film "Требования в контексте продукта" (8 parts + closing card); same layout as block-sdd, files in video/block-r4/. */
export const BLOCK_R4: VideoSpec = {
  page: 'guides/s4-product.html',
  manifest: 'video/block-r4/video-manifest.json',
  vtt: 'video/block-r4/block-r4.vtt',
  chapters: 'video/block-r4/block-r4.chapters.json',
  poster: 'video/block-r4/block-r4-poster.jpg',
  aria: 'Видео к уроку: изменение требований в метарепозитории продукта, проверка моделью и одобрение людей',
  steps: false,
};
/** The С4 "legacy" film "Описываем действующий продукт" (7 parts + closing card); same layout as block-sdd, files in video/block-r4legacy/. */
export const BLOCK_R4LEGACY: VideoSpec = {
  page: 'guides/s4b-legacy.html',
  manifest: 'video/block-r4legacy/video-manifest.json',
  vtt: 'video/block-r4legacy/block-r4legacy.vtt',
  chapters: 'video/block-r4legacy/block-r4legacy.chapters.json',
  poster: 'video/block-r4legacy/block-r4legacy-poster.jpg',
  aria: 'Видео к уроку: описываем действующий продукт по старым документам, расхождения источников и одобрение людей',
  steps: false,
};
/** The delivery practice film "Практика разработки по согласованным требованиям" (7 parts + closing card); files in video/block-delivery/. */
export const BLOCK_DELIVERY: VideoSpec = {
  page: 'guides/d1-delivery.html',
  manifest: 'video/block-delivery/video-manifest.json',
  vtt: 'video/block-delivery/block-delivery.vtt',
  chapters: 'video/block-delivery/block-delivery.chapters.json',
  poster: 'video/block-delivery/block-delivery-poster.jpg',
  aria: 'Видео к практикуму: практика разработки по согласованным требованиям, проверка людьми и архив',
  steps: false,
};
/** The film "Начинаем требования для нового продукта" (С4, entry "new project"; 6 parts + closing card); same layout as block-sdd, files in video/block-r4new/. */
export const BLOCK_R4NEW: VideoSpec = {
  page: 'guides/s4a-new.html',
  manifest: 'video/block-r4new/video-manifest.json',
  vtt: 'video/block-r4new/block-r4new.vtt',
  chapters: 'video/block-r4new/block-r4new.chapters.json',
  poster: 'video/block-r4new/block-r4new-poster.jpg',
  aria: 'Видео к уроку: начинаем требования для нового продукта, окружение, замысел, независимая проверка и одобрение людей',
  steps: false,
};
/** The С3 film "Оформляем изменение в OpenSpec" (still the old cut, rebuilt in P5) (8 parts + closing card); files in video/block-r3/. */
export const BLOCK_R3: VideoSpec = {
  page: 'guides/s3-openspec.html',
  manifest: 'video/block-r3/video-manifest.json',
  vtt: 'video/block-r3/block-r3.vtt',
  chapters: 'video/block-r3/block-r3.chapters.json',
  poster: 'video/block-r3/block-r3-poster.jpg',
  aria: 'Видео к практике: подготовка изменения в OpenSpec вручную, перенос сценариев и одобрение людей',
  steps: false,
};
/** The film "Как работает команда продукта" (page before С4); files in video/block-team/. */
export const BLOCK_TEAM: VideoSpec = {
  page: 'guides/s4-team.html',
  manifest: 'video/block-team/video-manifest.json',
  vtt: 'video/block-team/block-team.vtt',
  chapters: 'video/block-team/block-team.chapters.json',
  poster: 'video/block-team/block-team-poster.jpg',
  aria: 'Видео к уроку: как работает команда продукта, роли, раскладка репозиториев, права, три этапа и четыре запроса одного изменения',
  steps: false,
};
/** The П3+ film «Перспектива: фабрика»: an extra player in step 6 of the SDD page; files in video/block-dark-factory/ (absent until the film is delivered, then the build skips it). */
export const BLOCK_DARK: VideoSpec = {
  page: 'guides/p3-sdd.html',
  manifest: 'video/block-dark-factory/video-manifest.json',
  vtt: 'video/block-dark-factory/block-dark-factory.vtt',
  chapters: 'video/block-dark-factory/block-dark-factory.chapters.json',
  poster: 'video/block-dark-factory/block-dark-factory-poster.jpg',
  aria: 'Видео к шагу «Перспектива: фабрика»: куда ведёт процесс и почему проверка остаётся за людьми',
  steps: false,
  extra: { id: 'dark', anchor: 'step-06', goal: 'Смотреть ролик о фабрике ↓' },
};
/** The map film «Как пользоваться картой»: an extra player in the #howto-film slot of the course map, above the how-to cards (owner, A); files in video/block-map/. */
export const BLOCK_MAP: VideoSpec = {
  page: 'guides/index.html',
  manifest: 'video/block-map/video-manifest.json',
  vtt: 'video/block-map/block-map.vtt',
  chapters: 'video/block-map/block-map.chapters.json',
  poster: 'video/block-map/block-map-poster.jpg',
  aria: 'Видео: как пользоваться картой курса — с чего начать, как выбрать маршрут и как вернуться',
  steps: false,
  playerTitle: 'Ролик к странице',
  extra: { id: 'map', anchor: 'howto-film', goal: 'Смотреть ролик о карте ↓' },
};
/** The preparation film «Метарепозиторий продукта»: the player of the preparation page; files in video/block-p4/. */
export const BLOCK_P4: VideoSpec = {
  page: 'guides/p4-metarepository.html',
  manifest: 'video/block-p4/video-manifest.json',
  vtt: 'video/block-p4/block-p4.vtt',
  chapters: 'video/block-p4/block-p4.chapters.json',
  poster: 'video/block-p4/block-p4-poster.jpg',
  aria: 'Видео к подготовке: метарепозиторий продукта — где лежит контекст задачи и как связать требования с кодом',
  steps: false,
};
/** The four films of the intent course «Намерение и план»: main players of their step pages; files in video/block-i1…i4/. */
export const BLOCK_I1: VideoSpec = {
  page: 'guides/i1-effect.html',
  manifest: 'video/block-i1/video-manifest.json',
  vtt: 'video/block-i1/block-i1.vtt',
  chapters: 'video/block-i1/block-i1.chapters.json',
  poster: 'video/block-i1/block-i1-poster.jpg',
  aria: 'Видео к шагу: проблема и эффект — проблема словами пользователя и эффект с числом и сроком проверки',
  steps: false,
};
export const BLOCK_I2: VideoSpec = {
  page: 'guides/i2-bounds.html',
  manifest: 'video/block-i2/video-manifest.json',
  vtt: 'video/block-i2/block-i2.vtt',
  chapters: 'video/block-i2/block-i2.chapters.json',
  poster: 'video/block-i2/block-i2-poster.jpg',
  aria: 'Видео к шагу: границы и вопросы — что не трогаем и у каждого вопроса есть адресат и источник',
  steps: false,
};
export const BLOCK_I3: VideoSpec = {
  page: 'guides/i3-plan.html',
  manifest: 'video/block-i3/video-manifest.json',
  vtt: 'video/block-i3/block-i3.vtt',
  chapters: 'video/block-i3/block-i3.chapters.json',
  poster: 'video/block-i3/block-i3-poster.jpg',
  aria: 'Видео к шагу: план изменений — самостоятельные изменения с идентификаторами и риски с запасным ходом',
  steps: false,
};
export const BLOCK_I4: VideoSpec = {
  page: 'guides/i4-accept.html',
  manifest: 'video/block-i4/video-manifest.json',
  vtt: 'video/block-i4/block-i4.vtt',
  chapters: 'video/block-i4/block-i4.chapters.json',
  poster: 'video/block-i4/block-i4-poster.jpg',
  aria: 'Видео к шагу: проверка и одобрение — две проверки, одно одобрение и запись передачи в анализ',
  steps: false,
};
/** The intent course overview: the page's own film in the #intent-overview-film slot, like the map film; files in video/intent-overview/. */
export const INTENT_OVERVIEW: VideoSpec = {
  page: 'guides/intent.html',
  manifest: 'video/intent-overview/video-manifest.json',
  vtt: 'video/intent-overview/intent-overview.vtt',
  chapters: 'video/intent-overview/intent-overview.chapters.json',
  poster: 'video/intent-overview/intent-overview-poster.jpg',
  aria: 'Видео: обзор курса «Намерение и план» — четыре шага, Intent в Git и передача в анализ',
  steps: false,
  playerTitle: 'Обзор курса',
  extra: { id: 'overview', anchor: 'intent-overview-film', goal: 'Смотреть ролик о курсе ↓' },
};
/** The key of a film in the course map: the page, or page#id for an extra film of the same page. */
export const mapKey = (spec: VideoSpec): string =>
  spec.extra ? `${spec.page}#${spec.extra.id}` : spec.page;
/** The extra film goes last: video:fetch stops at the first film that is not available. */
export const GUIDE_VIDEOS: readonly VideoSpec[] = [
  BLOCK_0,
  BLOCK_SDD,
  BLOCK_R1,
  BLOCK_R2,
  BLOCK_R4,
  BLOCK_DELIVERY,
  BLOCK_R4NEW,
  BLOCK_R4LEGACY,
  BLOCK_R3,
  BLOCK_TEAM,
  BLOCK_P4,
  BLOCK_I1,
  BLOCK_I2,
  BLOCK_I3,
  BLOCK_I4,
  INTENT_OVERVIEW,
  BLOCK_DARK,
  BLOCK_MAP,
];

const escapeAttribute = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

/** A course map lives on its course page: the analysis map on guides/index.html, the intent map on guides/intent.html. */
async function revealFilmRows(outputDir: string, spec: VideoSpec, file: string): Promise<void> {
  for (const mapPath of ['guides/index.html', 'guides/intent.html']) {
    const map = await readFile(resolve(outputDir, mapPath), 'utf8').catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return undefined;
        throw error;
      },
    );
    if (map === undefined) continue;
    const revealed = revealCourseMapFilm(map, mapKey(spec), `assets/video/${file}`);
    if (revealed !== map) await writeFile(resolve(outputDir, mapPath), revealed, 'utf8');
  }
}

/**
 * Adds the lesson video to an already built site, after the build, so
 * `buildSite` and its tests never depend on an untracked local file.
 * Without the mp4 nothing changes and false is returned; a file that differs from the manifest is an error.
 */
export const addGuideVideo = async (
  outputDir: string,
  root = ROOT,
  spec: VideoSpec = BLOCK_0A,
): Promise<boolean> => {
  const source = resolve(root, GUIDE_VIDEO_DIR);
  const manifest = await readVideoManifest(root, spec).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  if (!manifest) return false;
  const mp4 = await readFile(resolve(source, manifest.file)).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    },
  );
  if (!mp4) return false;
  if (mp4.length !== manifest.size || sha256(mp4) !== manifest.sha256) {
    throw new Error(
      `${manifest.file} does not match ${GUIDE_VIDEO_MANIFEST}: refetch it (npm run video:fetch) or update the manifest`,
    );
  }
  const target = resolve(outputDir, 'guides/assets/video');
  await mkdir(target, { recursive: true });
  const vtt = basename(spec.vtt);
  await copyFile(resolve(source, manifest.file), resolve(target, manifest.file));
  await copyFile(resolve(root, spec.vtt), resolve(target, vtt));
  const poster = basename(spec.poster);
  const hasPoster = await copyFile(resolve(root, spec.poster), resolve(target, poster)).then(
    () => true,
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return false;
      throw error;
    },
  );
  await copyFile(resolve(source, 'guide-video.css'), resolve(target, 'guide-video.css'));
  const bundle = await build({
    absWorkingDir: ROOT,
    entryPoints: [resolve(source, 'guide-video.ts')],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    charset: 'utf8',
    write: false,
    legalComments: 'none',
  });
  await writeFile(resolve(target, 'guide-video.js'), bundle.outputFiles[0]!.text, 'utf8');
  const chapters = JSON.stringify(
    JSON.parse(await readFile(resolve(root, spec.chapters), 'utf8')),
  ).replaceAll('<', '\\u003c');
  const page = resolve(outputDir, spec.page);
  const html = await readFile(page, 'utf8');
  const extra = spec.extra;
  const attrs = [
    ['file', manifest.file],
    ['vtt', vtt],
    ['aria', spec.aria],
    ['steps', spec.steps ? '1' : '0'],
    ...(spec.playerTitle ? [['player-title', spec.playerTitle]] : []),
    ...(hasPoster ? [['poster', poster]] : []),
    ...(extra
      ? [
          ['slot', extra.anchor],
          ['id', extra.id],
          ['goal', extra.goal],
        ]
      : []),
  ]
    .map(([name, value]) => `data-${name}="${escapeAttribute(value!)}"`)
    .join(' ');
  const suffix = extra ? `-${extra.id}` : '';
  const data = `${guideVideoOverlay(spec.page, extra?.id)}${creditTemplate(suffix, manifest.audio)}<script type="application/json" id="guide-video-chapters${suffix}" ${attrs}>${chapters}</script>`;
  const player = '<script src="assets/video/guide-video.js"></script>';
  // Two films on one page share the stylesheet and the player: the data goes before the one script tag.
  const withStyles = html.includes('assets/video/guide-video.css')
    ? html
    : html.replace(
        '</head>',
        () => '<link rel="stylesheet" href="assets/video/guide-video.css"></head>',
      );
  const withVideo = withStyles.includes(player)
    ? withStyles.replace(player, () => `${data}${player}`)
    : withStyles.replace('</body>', () => `${data}${player}</body>`);
  if (withVideo === html)
    throw new Error(`${spec.page} has no head/body to add the video player to`);
  await writeFile(page, withVideo, 'utf8');
  await revealFilmRows(outputDir, spec, manifest.file);
  return true;
};

/** Without PAGES_WITH_VIDEO=1 no film is embedded (local builds); the `pages` CI job sets it, fetches the mp4 from the GitHub release and checks that every tracked manifest has its mp4. */
export const pagesWithVideo = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.PAGES_WITH_VIDEO === '1';

/** Pages whose player was embedded; without the switch no film is embedded and no mp4 is copied. */
export const addGuideVideos = async (
  outputDir: string,
  enabled = pagesWithVideo(),
  root = ROOT,
): Promise<ReadonlySet<string>> => {
  const embedded = new Set<string>();
  if (enabled)
    for (const spec of GUIDE_VIDEOS)
      if (await addGuideVideo(outputDir, root, spec)) embedded.add(spec.page);
  return embedded;
};
