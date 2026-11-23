// Имена web-рендеров роликов для scripts/video-delivery-manifests.ts.
// Курсовые ролики лежат в film/renders как `<ролик>-720p.mp4`; явное поле
// `webFile` манифеста задаёт имя файла без правил. Роликов landing-* скрипт не
// обрабатывает: их пины лежат в CD (`landing-video-manifest.json`).

/** Что манифест ролика может сказать о имени web-рендера. */
export type WebRenderManifest = Readonly<{ webFile?: unknown }>;

/** Имена web-рендера в `film/renders/` в порядке проверки. */
export const webRenderCandidates = (
  film: string,
  manifest: WebRenderManifest = {},
): readonly string[] => {
  if (manifest.webFile !== undefined) {
    if (typeof manifest.webFile !== 'string' || manifest.webFile.length === 0)
      throw new Error(`${film}: invalid manifest webFile`);
    return [manifest.webFile];
  }
  return [`${film}-720p.mp4`];
};

/** Первое существующее имя web-рендера; ошибка перечисляет проверенные имена. */
export const pickWebRender = (
  film: string,
  manifest: WebRenderManifest,
  exists: (name: string) => boolean,
): string => {
  const candidates = webRenderCandidates(film, manifest);
  const found = candidates.find((name) => exists(name));
  if (found) return found;
  throw new Error(`${film}: нет web-рендера (${candidates.join(', ')})`);
};
