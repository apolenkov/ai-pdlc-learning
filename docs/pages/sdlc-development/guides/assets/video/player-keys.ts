import type { Chapter } from './player-types.ts';

export const bindVideoKeys = (
  video: HTMLVideoElement,
  chapters: Chapter[],
  current: () => number,
  play: (index: number, untilEnd: boolean) => void,
): void => {
  video.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (key === 'n' || key === 'p') {
      const target = current() + (key === 'n' ? 1 : -1);
      if (chapters[target]) {
        event.preventDefault();
        play(target, false);
      }
    } else if (key === 'c') {
      const track = video.textTracks[0];
      if (track) {
        event.preventDefault();
        track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
      }
    }
  });
};
