// Quiet motion for the course site (Motion, vanilla API). Everything here is decoration:
// no content is hidden unless this script is running, and with reduced motion nothing moves.
import { animate } from 'motion/mini';
import { inView } from 'motion';

import { spinGears } from './route-strip/gears.ts';
import { mountPreviews } from './route-strip/preview.ts';
import { trackReading } from './route-strip/reading-time.ts';
import { bindReset, enhanceSelfCheck } from './route-strip/selfcheck.ts';
import { mountCrumbs } from './route-strip/crumbs.ts';
import { mountStrip } from './route-strip/strip.ts';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

// Soft appearance of steps and cards. Only blocks below the fold are prepared, and only here,
// so without this script (or if it fails) everything stays visible.
const REVEAL = '.step-list > li, .course-map__step, .route-card';
const reveal = (): void => {
  const below = [...document.querySelectorAll<HTMLElement>(REVEAL)].filter(
    (node) => node.getBoundingClientRect().top > innerHeight,
  );
  const show = (node: HTMLElement): void => {
    node.removeAttribute('data-motion');
  };
  try {
    below.forEach((node) => node.setAttribute('data-motion', 'pre'));
    addEventListener('beforeprint', () => below.forEach(show));
    below.forEach((node) => {
      inView(
        node,
        () => {
          if (node.getAttribute('data-motion') !== 'pre') return;
          node.setAttribute('data-motion', 'in');
          animate(
            node,
            { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0px)'] },
            { duration: 0.55, ease: 'easeOut' },
          ).finished.then(
            () => show(node),
            () => show(node),
          );
        },
        { margin: '0px 0px -8% 0px' },
      );
    });
  } catch {
    below.forEach(show);
  }
};

// The route strip and the crumb line are information, not decoration: mounted with or without motion.
const strip = mountStrip(document);
mountCrumbs(document);
if (strip && !reduced) spinGears(document);
const stage = document.body.dataset['stage'];
if (stage) {
  enhanceSelfCheck(document, stage);
  trackReading(document, stage);
}
bindReset(document);
mountPreviews(document, !reduced);

if (root.hasAttribute('data-atmos') && !root.hasAttribute('data-no-motion')) {
  if (!reduced) {
    reveal();
  }
}
