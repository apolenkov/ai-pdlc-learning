import type { Chapter } from './player-types.ts';

export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
// Steps start one second before the speech so the first word is not cut off.
export const lead = (chapter: Chapter) => Math.max(chapter.start, chapter.speechStart - 1);
// Step anchors are not uniform (step-03, git-ignore, ...): the chapter's pageStep is the N-th item of the step list; film and page step counts may differ.
export const stepItem = (chapter: Chapter, stepMode: boolean) =>
  !stepMode || !chapter.pageStep
    ? undefined
    : document.querySelectorAll<HTMLElement>('#work-steps .step-list > li')[chapter.pageStep - 1];
export const label = (chapter: Chapter, stepMode: boolean) =>
  chapter.step ? `${stepMode ? 'Шаг' : 'Часть'} ${chapter.step} · ${chapter.title}` : chapter.title;
