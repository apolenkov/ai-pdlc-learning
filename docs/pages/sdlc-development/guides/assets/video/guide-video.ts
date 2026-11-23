// Player for a lesson video (every film of the course; an extra film such as П3+ sits in a step). Classic browser script: the builder adds it to the guide page
// only when the mp4 exists and passes the file, captions, label and mode as data-* of #guide-video-chapters.
// Everything video-specific lives in this directory (see README, section "Видео block-0a").

import { readChapters } from './chapters.ts';
import { createVideoSection } from './player-markup.ts';
import { createPlayback } from './player-playback.ts';
import { bindVideoKeys } from './player-keys.ts';
import { addStepControls } from './player-controls.ts';
import { mountVideoOverlay } from './player-overlay.ts';

const mount = (data: HTMLElement): void => {
  // The main film opens the lesson; extra films keep their own step or map slot.
  const slot = data.dataset.slot ? document.getElementById(data.dataset.slot) : null;
  const anchor = slot ?? document.querySelector('.lesson-goal');
  if (!data.textContent || !anchor) return;
  const chapters = readChapters(data.textContent);
  if (!chapters) return;
  const options = data.dataset;
  const stepMode = options.steps !== '0'; // chapters are the page steps ("Смотреть шаг") or free-standing parts
  const base = new URL('assets/video/', document.baseURI);
  const fileUrl = new URL(options.file ?? 'block-0a.mp4', base).href;
  const elements = createVideoSection(data, chapters, slot, base, stepMode);
  const { section, video, disclosure } = elements;
  mountVideoOverlay(data, video);
  // A step slot keeps its own heading above the film; an empty film container (course map, course overview) holds it.
  const stepHeading = slot?.querySelector('.step-copy > h3') ?? null;
  if (stepHeading) stepHeading.after(section);
  else (slot ?? anchor).append(section);
  const { current, play, refresh } = createPlayback(elements, chapters);
  bindVideoKeys(video, chapters, current, play);
  const reveal = (): void => {
    if (!section.hidden) return;
    section.hidden = false;
    if (stepMode) addStepControls(chapters, stepMode, play);
    refresh();
  };
  video.addEventListener('loadedmetadata', reveal, { once: true });
  // Карта курса и урок ведут на саму секцию (#lesson-video, #lesson-video-dark):
  // страница, открытая с таким hash, должна упираться в видимый блок, а не в скрытый.
  const openLinkedFilm = (): void => {
    if (location.hash !== `#${section.id}`) return;
    const goal = section.closest<HTMLDetailsElement>('details.lesson-goal');
    if (goal) goal.open = true;
    reveal();
    if (disclosure) disclosure.open = true;
    section.scrollIntoView({ block: 'start' });
  };
  // Following the current fragment again does not dispatch hashchange.
  const onLinkClick = (event: MouseEvent): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link =
      event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (
      link?.href === location.href &&
      (!link.target || link.target.toLowerCase() === '_self') &&
      !link.hasAttribute('download')
    )
      openLinkedFilm();
  };
  openLinkedFilm();
  window.addEventListener('hashchange', openLinkedFilm);
  document.addEventListener('click', onLinkClick);
  // The file is missing or unreadable: the lesson stays text-only.
  video.addEventListener(
    'error',
    () => {
      window.removeEventListener('hashchange', openLinkedFilm);
      document.removeEventListener('click', onLinkClick);
      section.remove();
    },
    { once: true },
  );
  video.src = options.poster ? fileUrl : `${fileUrl}#t=5`; // the poster, or the title card, instead of a black frame
};

(() =>
  document.querySelectorAll<HTMLElement>('script[id^="guide-video-chapters"]').forEach(mount))();
