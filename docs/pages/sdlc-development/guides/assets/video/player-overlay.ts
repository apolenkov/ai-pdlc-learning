/** The template is generated from the route at build time; only playback state lives here. */
export const mountVideoOverlay = (data: HTMLElement, video: HTMLVideoElement): void => {
  const suffix = data.dataset.id ? `-${data.dataset.id}` : '';
  const template = document.querySelector<HTMLTemplateElement>(`#guide-video-overlay${suffix}`);
  const frame = video.parentElement;
  if (!template || !frame) return;
  frame.append(template.content.cloneNode(true));
  const corner = frame.querySelector<HTMLElement>('.lesson-video__corner')!;
  const ending = frame.querySelector<HTMLElement>('.lesson-video__ending')!;
  let started = false;
  let ended = false;
  const refresh = () => {
    const opening = !ended && (!started || video.currentTime < 3);
    corner.hidden = opening || ended;
    ending.hidden = !ended;
  };
  video.addEventListener('play', () => {
    if (ending.contains(document.activeElement)) video.focus({ preventScroll: true });
    started = true;
    ended = false;
    refresh();
  });
  video.addEventListener('timeupdate', refresh);
  video.addEventListener('seeked', refresh);
  video.addEventListener('ended', () => {
    ended = true;
    refresh();
  });
  refresh();
};
