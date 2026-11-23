import type {
  ScreenshotMarker,
  LearnerScreenshot,
  LearnerStep,
} from '../../../../../scripts/learner-guide-types.ts';
import { escapeHtml } from './common.ts';

const renderMarkers = (markers: ScreenshotMarker[] = []) =>
  markers
    .map(
      (marker) =>
        `<span class="screenshot-marker" style="--marker-left:${marker.left}%;--marker-top:${marker.top}%;--marker-width:${marker.width}%;--marker-height:${marker.height}%" aria-hidden="true"><span>${escapeHtml(marker.label)}</span></span>`,
    )
    .join('');
const renderScreenshot = (
  screenshot: LearnerScreenshot,
  loading: 'lazy' | 'eager',
  stepNo: number,
  lead = false,
  index = 0,
) => {
  // Narrow shots put the caption beside the image on wide screens (R-2), like .resource-shot on the site.
  const { crop } = screenshot;
  const previews = crop ? undefined : screenshot.previews;
  const narrow = screenshot.width <= 720;
  const cropStyle = crop
    ? ` class="shot-crop" style="aspect-ratio:${crop.width}/${crop.height};--image-width:${(100 * screenshot.width) / crop.width}%;--image-left:${(-100 * crop.x) / crop.width}%;--image-top:${(-100 * crop.y) / crop.height}%"`
    : '';
  return `<figure class="step-reference${lead ? ' step-reference--lead' : ''}${narrow ? ' step-reference--narrow' : ''}"${lead ? ` style="--shot-w:${crop ? crop.width + 2 : Math.min(screenshot.width, 1200)}px"` : ''}><div class="step-reference__image"><a href="${screenshot.src}"${cropStyle} aria-label="Открыть снимок крупно · шаг ${stepNo}${index ? `, снимок ${index + 1}` : ''}"><img src="${previews?.at(-1)?.src ?? screenshot.src}"${previews?.length ? ` srcset="${previews.map(({ src, width }) => `${src} ${width}w`).join(', ')}" sizes="(max-width: 1280px) 100vw, 1200px"` : ''} width="${screenshot.width}" height="${screenshot.height}" alt="${screenshot.alt}" loading="${loading}" decoding="async"></a>${renderMarkers(screenshot.markers)}</div><figcaption>${screenshot.caption}</figcaption></figure>`;
};
export const renderEvidence = (item: LearnerStep, stepNo: number) => {
  const [first, ...rest] = item.screenshots ?? [];
  return {
    lead: first ? renderScreenshot(first, 'lazy', stepNo, true) : '',
    more: rest.length
      ? `<details class="step-screenshots"><summary>Ещё снимки шага</summary><div class="step-screenshot-grid">${rest.map((shot, i) => renderScreenshot(shot, 'lazy', stepNo, false, i + 1)).join('')}</div></details>`
      : '',
  };
};
