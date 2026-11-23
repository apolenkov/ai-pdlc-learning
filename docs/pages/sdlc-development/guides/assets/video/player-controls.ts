import type { Chapter } from './player-types.ts';
import { stepItem } from './player-common.ts';

export const addStepControls = (
  chapters: Chapter[],
  stepMode: boolean,
  play: (index: number, untilEnd: boolean) => void,
) =>
  chapters.forEach((chapter, index) => {
    if (!chapter.pageStep) return;
    const heading = stepItem(chapter, stepMode)?.querySelector('.step-copy > h3');
    if (!heading) return;
    const row = document.createElement('div');
    row.className = 'lesson-video__step';
    row.innerHTML = `<button type="button" data-watch aria-label="Смотреть шаг ${chapter.pageStep} в видео, ${chapter.title}">Смотреть шаг</button>
    <button type="button" data-again hidden aria-label="Повторить шаг ${chapter.pageStep} в видео">Повторить шаг</button>`;
    const again = row.querySelector<HTMLButtonElement>('[data-again]')!;
    row.querySelector('[data-watch]')!.addEventListener('click', () => {
      again.hidden = false;
      play(index, true);
    });
    again.addEventListener('click', () => play(index, true));
    heading.after(row);
  });
