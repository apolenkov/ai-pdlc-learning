// Course map: a «▶ m:ss» badge on every card whose film is published, and a quiet 4 s loop from the middle
// of that film behind the card text while the pointer rests on the card. Nothing is downloaded before that; never with sound.
import { escapeHtml } from './selfcheck.ts';

const DELAY_MS = 450;
const LOOP_S = 4;
const HIDE_MS = 120;

// One preview at a time: a new card, a hidden tab or the card leaving the screen stops the previous one.
let active: (() => void) | null = null;
const stopActive = (): void => {
  active?.();
  active = null;
};

const play = (card: HTMLElement, src: string): (() => void) => {
  const frame = document.createElement('div');
  frame.className = 'film-preview';
  frame.setAttribute('aria-hidden', 'true');
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata'; // the element exists only after the pointer rests on a card
  let stopped = false;
  let start = 0;
  video.addEventListener('loadedmetadata', () => {
    if (stopped) return;
    start = Math.max(0, video.duration / 2 - LOOP_S / 2);
    video.currentTime = start;
  });
  // Shown only after the seek lands in the middle: no flash of the film's first frame.
  video.addEventListener('seeked', () => {
    if (!stopped) void video.play().catch(() => undefined);
  });
  video.addEventListener('timeupdate', () => {
    if (video.currentTime >= start + LOOP_S) video.currentTime = start;
  });
  video.addEventListener('playing', () => {
    if (!stopped) frame.classList.add('is-playing');
  });
  video.addEventListener('error', () => frame.remove()); // a broken film leaves the plain card
  video.src = src;
  frame.append(video);
  card.prepend(frame);
  return () => {
    stopped = true;
    video.pause();
    frame.classList.remove('is-playing');
    window.setTimeout(() => {
      video.removeAttribute('src');
      video.load();
      frame.remove();
    }, HIDE_MS);
  };
};

export const mountPreviews = (doc: Document, motion: boolean): void => {
  const hover = motion && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cards: HTMLElement[] = [];
  doc.querySelectorAll<HTMLElement>('.course-map__step').forEach((card) => {
    const film = card.querySelector<HTMLElement>('li[data-film][data-src]:not([hidden])');
    const link = film?.querySelector<HTMLAnchorElement>('a');
    if (!film || !link) return;
    card.classList.add('has-film');
    const badge = doc.createElement('a');
    badge.className = 'course-map__film-badge';
    badge.setAttribute('href', link.getAttribute('href') ?? '');
    const title = card.querySelector('h4')?.textContent?.trim();
    badge.setAttribute(
      'aria-label',
      `Ролик ${link.textContent ?? ''}${title ? ` · ${title}` : ''}`,
    );
    badge.innerHTML = `<span aria-hidden="true">▶</span> ${escapeHtml(link.textContent ?? '')}`;
    card.append(badge);
    if (!hover) return;
    cards.push(card);
    // The whole card is the trigger; the loop runs faintly behind its text, so every field stays readable (Astra, 15.10).
    let timer = 0;
    let stop: (() => void) | null = null;
    card.addEventListener('pointerenter', () => {
      timer = window.setTimeout(() => {
        stopActive();
        stop = play(card, film.dataset['src'] ?? '');
        active = stop;
      }, DELAY_MS);
    });
    card.addEventListener('pointerleave', () => {
      clearTimeout(timer);
      if (stop && active === stop) stopActive();
      stop = null;
    });
  });
  if (!cards.length) return;
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) stopActive();
  });
  const seen = new IntersectionObserver((entries) => {
    if (
      entries.some((entry) => !entry.isIntersecting && entry.target.querySelector('.film-preview'))
    )
      stopActive();
  });
  cards.forEach((card) => seen.observe(card));
};
