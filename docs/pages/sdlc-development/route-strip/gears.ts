import type { Group } from './model.ts';

// Two meshing gears for the route strip; they turn with page scroll and stand still with reduced motion.

const gear = (cx: number, cy: number, outer: number, teeth: number, cls: string): string => {
  const inner = outer - 2.2;
  const points = Array.from({ length: teeth * 4 }, (_, index) => {
    const radius = index % 4 < 2 ? outer : inner;
    const angle = ((index + 0.5) / (teeth * 4)) * 2 * Math.PI;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
  return `<g class="${cls}"><polygon points="${points}"/><circle cx="${cx}" cy="${cy}" r="${(outer / 3).toFixed(1)}"/></g>`;
};

export const gearsSvg = (): string =>
  `<svg class="course-route__gears" viewBox="0 0 34 22" width="34" height="22" aria-hidden="true" focusable="false">${gear(11, 11, 9.8, 10, 'course-route__gear course-route__gear--big')}${gear(25.8, 8.2, 6.8, 7, 'course-route__gear course-route__gear--small')}</svg>`;

/** Shared group symbols on the map and the route; step links use numbers only. */
export const groupIcon = (group: Group): string => {
  const drawing =
    group === 'prep'
      ? gearsSvg()
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${group === 'practice' ? '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 15l3 3 5-6"/>' : '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 8h20M9 12l-3 3 3 3m6-6 3 3-3 3"/>'}</svg>`;
  return `<span class="course-route__icon course-route__icon--${group}" aria-hidden="true">${drawing}</span>`;
};

/** Angle follows scroll position, small gear counter-turns by the tooth ratio; only on scroll, one frame at a time. */
export const spinGears = (root: ParentNode): void => {
  let queued = false;
  // The strip is redrawn when marks change, so the gears are looked up each frame.
  const turn = (): void => {
    queued = false;
    const big = root.querySelector<SVGGElement>('.course-route__gear--big');
    const small = root.querySelector<SVGGElement>('.course-route__gear--small');
    if (!big || !small) return;
    const angle = scrollY * 0.25;
    big.style.transform = `rotate(${angle}deg)`;
    small.style.transform = `rotate(${(-angle * 10) / 7 + 12}deg)`;
  };
  addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(turn);
    },
    { passive: true },
  );
  // The redrawn strip starts at 0°: put it back to the scroll angle (the strip redraws in an earlier listener).
  addEventListener('course-route:update', turn);
  turn();
};
