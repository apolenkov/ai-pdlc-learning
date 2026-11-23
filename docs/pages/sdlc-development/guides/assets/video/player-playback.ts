import type { Chapter, PlayerElements } from './player-types.ts';
import { lead } from './player-common.ts';

export const createPlayback = (elements: PlayerElements, chapters: Chapter[]) => {
  const { section, video, buttons, disclosure } = elements;
  const goal = section.closest<HTMLDetailsElement>('details.lesson-goal');
  for (const fold of [goal, disclosure]) {
    fold?.addEventListener('toggle', () => {
      if (!fold.open && !video.paused) video.pause();
    });
  }
  let stopAt: number | null = null;
  let timer = 0;
  const current = () => {
    let index = 0;
    chapters.forEach((chapter, i) => {
      if (video.currentTime >= chapter.start) index = i;
    });
    return index;
  };
  const play = (index: number, untilEnd: boolean) => {
    const chapter = chapters[index]!;
    stopAt = untilEnd ? chapter.end : null;
    video.currentTime = lead(chapter);
    if (goal) goal.open = true;
    if (disclosure) disclosure.open = true;
    section.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    void video.play().catch(() => undefined);
  };
  const refresh = () => {
    const index = current();
    buttons.forEach((button, i) =>
      i === index
        ? button.setAttribute('aria-current', 'true')
        : button.removeAttribute('aria-current'),
    );
    // Reaching the step end pauses; a manual seek past it cancels the limit instead.
    if (stopAt !== null && video.currentTime >= stopAt) {
      if (video.currentTime < stopAt + 1) video.pause();
      stopAt = null;
    }
  };
  video.addEventListener('timeupdate', refresh);
  video.addEventListener('play', () => {
    timer = window.setInterval(refresh, 100);
  });
  video.addEventListener('pause', () => window.clearInterval(timer));
  buttons.forEach((button, index) => button.addEventListener('click', () => play(index, false)));
  return { current, play, refresh };
};
