import type { Chapter, PlayerElements } from './player-types.ts';
import { clock, lead, label } from './player-common.ts';

/** A slot player is one level below the heading it follows (H3 under a section title, H4 under a step title), never deeper than H6. */
const slotHeadingLevel = (slot: HTMLElement): number => {
  const above = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(
    (heading) => heading.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
  return Math.min(Number(above.at(-1)?.tagName.slice(1) ?? 1) + 1, 6);
};

export const createVideoSection = (
  data: HTMLElement,
  chapters: Chapter[],
  slot: HTMLElement | null,
  base: URL,
  stepMode: boolean,
): PlayerElements => {
  const suffix = data.dataset.id ? `-${data.dataset.id}` : '';
  const options = data.dataset;
  const section = document.createElement('section');
  section.className = `card card--wide lesson-video${slot ? ' lesson-video--step' : ''}`;
  section.id = `lesson-video${suffix}`;
  section.hidden = true;
  section.setAttribute('aria-labelledby', `lesson-video-title${suffix}`);
  const level = slot ? slotHeadingLevel(slot) : 2;
  section.innerHTML = `${slot ? `<h${level} id="lesson-video-title${suffix}">Ролик к шагу</h${level}>` : '<details class="lesson-video__disclosure"><summary id="lesson-video-title">Видео к уроку</summary>'}
    <div class="lesson-video__layout">
      <div class="lesson-video__stage">
        <div class="lesson-video__frame">
        <video controls preload="metadata" playsinline${options.poster ? ` poster="${new URL(options.poster, base).href}"` : ''} aria-label="${options.aria ?? 'Видео к уроку: Markdown, Git и GitLab с нуля'}" aria-keyshortcuts="n p c" tabindex="0">
          <track kind="subtitles" srclang="ru" label="Русский" src="${new URL(options.vtt ?? 'block-0a.vtt', base).href}">
        </video>
        </div>
      </div>
      <nav class="lesson-video__chapters" aria-label="Главы видео"><ol>${chapters
        .map(
          (chapter, index) =>
            `<li><button type="button" data-chapter="${index}"><span class="lesson-video__time">${clock(lead(chapter))}</span><span>${label(chapter, stepMode)}</span></button></li>`,
        )
        .join('')}</ol></nav>
    </div>${slot ? '' : '</details>'}`;
  // A course overview is not a step film: the builder may pass its own heading for a slot player.
  const heading = slot ? section.querySelector<HTMLHeadingElement>(`h${level}`) : null;
  if (heading) heading.textContent = options.playerTitle ?? 'Ролик к шагу';
  const credit = document.querySelector<HTMLTemplateElement>(
    `#guide-video-credit${suffix}`,
  )?.content;
  if (credit) section.querySelector('.lesson-video__stage')!.append(credit);
  const video = section.querySelector('video')!;
  const buttons = [...section.querySelectorAll<HTMLButtonElement>('button[data-chapter]')];
  const disclosure = section.querySelector<HTMLDetailsElement>('.lesson-video__disclosure');
  return { section, video, buttons, disclosure };
};
