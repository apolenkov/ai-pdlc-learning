// The course route stays at the viewport edge while the site menu follows scroll direction.
import routeSteps from '../guides/route-steps.json' with { type: 'json' };
import { groupIcon } from './gears.ts';
import {
  GROUP_WORDS,
  asGroup,
  minutes,
  routeState,
  routeLabel,
  type Group,
  type RouteStep,
} from './model.ts';
import { doneStages, readProgress, safeStorage } from './progress.ts';

type State = ReturnType<typeof routeState>;
const GROUPS: Group[] = ['prep', 'practice', 'after'];
const SPOKEN = { passed: 'пройден', current: 'вы смотрите', ahead: '' } as const;
const attr = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

const checkedLabel = 'самопроверка пройдена';
const renderSymbol = (step: RouteStep, checked: boolean): string => {
  const flag = checked ? ' data-selfchecked' : '';
  if (step.number)
    return `<span class="course-route__number" aria-hidden="true"${flag}>${step.number.replace(/([аб])$/u, '<span class="course-route__suffix">$1</span>')}</span>`;
  const drawing =
    step.id === '0'
      ? '<path d="M9 18h6m-5 4h4m-5-8a6 6 0 1 1 6 0c-1 1-1 2-1 4h-4c0-2 0-3-1-4Z"/>'
      : step.id === '0a'
        ? '<path d="M6 3v12m12-6a9 9 0 0 1-9 9"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/>'
        : step.id === 'metarepo'
          ? '<rect x="8" y="2" width="8" height="6" rx="1"/><path d="M12 8v5M5 16v-3h14v3"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/>'
          : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h8"/>';
  return `<span class="course-route__prep" aria-hidden="true"${flag}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" focusable="false">${drawing}</svg></span>`;
};

const chevron = (offset: number): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${offset < 0 ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}"/></svg>`;

const renderArrow = (
  cls: string,
  step: RouteStep | undefined,
  offset: number,
  label: string,
): string =>
  step
    ? `<a class="${cls}" href="${step.href}" aria-label="${label}: ${attr(routeLabel(step))}">${chevron(offset)}</a>`
    : `<span class="${cls}" role="link" aria-disabled="true" aria-label="${label}">${chevron(offset)}</span>`;

// 6а/6б are alternatives, not a sequence: an arrow out of a branch leaves the
// whole run — prev to the shared parent, next past the sibling.
const neighbor = (steps: RouteStep[], index: number, offset: -1 | 1): RouteStep | undefined => {
  let i = index + offset;
  while (steps[i]?.branchOf && (offset < 0 || steps[index]?.branchOf)) i += offset;
  return steps[i];
};

const renderCompact = (steps: RouteStep[], current: RouteStep, checked: boolean): string => {
  const index = steps.indexOf(current);
  return `<a class="course-route__current" href="${current.href}" title="${attr(routeLabel(current))}"${checked ? ` aria-label="${attr(routeLabel(current))} — ${checkedLabel}"` : ''}>${renderSymbol(current, checked)}<span>${routeLabel(current)}</span></a>${renderArrow('course-route__arrow', neighbor(steps, index, -1), -1, 'Назад')}${renderArrow('course-route__arrow', neighbor(steps, index, 1), 1, 'Вперёд')}`;
};

// The desktop strip carries the same prev/next step arrows at its edges as the compact row.
const renderEdge = (steps: RouteStep[], position: RouteStep | undefined, offset: -1 | 1): string =>
  renderArrow(
    `course-route__edge course-route__edge--${offset < 0 ? 'prev' : 'next'}`,
    position ? neighbor(steps, steps.indexOf(position), offset) : undefined,
    offset,
    offset < 0 ? 'Назад' : 'Вперёд',
  );

export const renderStrip = (steps: RouteStep[], state: State, currentId: string | null): string => {
  const current = steps.find((step) => step.id === currentId);
  const total = state.passedSeconds + state.leftSeconds;
  const groups = GROUPS.filter((group) => steps.some((step) => step.group === group))
    .map((group) => {
      const members = steps.filter((step) => step.group === group);
      // D-1: the four preparation steps have no step number, so the group chip carries their ordinal
      // range (1–4) and each title names its ordinal — otherwise the chips read as one identical word.
      const ordinal = (step: RouteStep): number => members.indexOf(step) + 1;
      const range =
        group === 'prep'
          ? members.length > 1
            ? `1–${members.length}`
            : '1'
          : members.length > 1
            ? `${members[0]!.number}–${members.at(-1)!.number}`
            : members[0]?.number;
      const items = members
        .map((step) => {
          const at = steps.indexOf(step);
          const mark = state.states[step.id] ?? 'ahead';
          const checked = state.done.has(step.id);
          const spoken = [SPOKEN[mark], checked ? checkedLabel : '']
            .filter(Boolean)
            .map((label) => ` — ${label}`)
            .join('');
          const label = routeLabel(step).replace(
            new RegExp(`^${GROUP_WORDS[step.group]}[\\s\\u00a0]*·[\\s\\u00a0]*`, 'u'),
            '',
          );
          const title = `${step.number ? `${GROUP_WORDS[step.group]} · ` : group === 'prep' ? `${GROUP_WORDS[step.group]} ${ordinal(step)} · ` : ''}${label}`;
          return `<li data-route-id="${step.id}" class="course-route__step is-${mark}${step.branchOf ? ' is-branch' : ''}${mark === 'ahead' && current && at < steps.indexOf(current) ? ' is-traversed' : ''}" style="--i:${at}"><a class="course-route__dot" href="${step.href}" data-title="${attr(title)}" title="${attr(title)}${spoken}" aria-label="${attr(title)}${spoken}"${mark === 'current' ? ' aria-current="step"' : ''}>${renderSymbol(step, checked)}<span class="course-route__sr">${attr(title)}${spoken}</span></a></li>`;
        })
        .join('');
      return `<li class="course-route__group course-route__group--${group}${state.group === group ? ' is-now' : ''}"><a class="course-route__word" href="index.html#course-map" title="${attr(GROUP_WORDS[group])} — карта курса">${groupIcon(group)}<span class="course-route__group-name">${GROUP_WORDS[group]}</span><span class="course-route__range" aria-hidden="true">${range ?? ''}</span></a><ol class="course-route__steps">${items}</ol></li>`;
    })
    .join('');
  // On the map with marks: continue from the first step not passed.
  const next = current ? undefined : steps.find((step) => state.states[step.id] !== 'passed');
  const go =
    state.passedSeconds && next
      ? `Продолжить: ${routeLabel(next)}`
      : `Начните: ${routeLabel(steps[0]!)}`;
  const target = state.passedSeconds && next ? next : steps[0]!;
  // Intent has no films of its own yet (manifest durations, as in analysis): a prep-only sum misleads, so the minutes stay hidden until the first intent manifest lands.
  const isIntentView = steps.some((step) => step.course === 'intent');
  const hasIntentFilms = steps.some((step) => step.course === 'intent' && step.seconds != null);
  const showMinutes = !isIntentView || hasIntentFilms;
  const split = `<span class="course-route__passed">пройдено ${minutes(state.passedSeconds)} · </span>осталось ${minutes(state.leftSeconds)} роликов`;
  const minutesSuffix = (text: string): string => (showMinutes ? `<span>${text}</span>` : '');
  const status = current
    ? `<strong title="${attr(routeLabel(current))}">${current.number ? `<span class="course-route__status-group">${GROUP_WORDS[current.group]} · </span>` : ''}${routeLabel(current)}</strong>${minutesSuffix(split)}`
    : state.passedSeconds
      ? `<strong><a href="${target.href}">${go}</a></strong>${minutesSuffix(split)}`
      : `<strong><a href="${target.href}">${go}</a></strong>${minutesSuffix(`весь маршрут ${minutes(total)} роликов`)}`;
  const position = current ?? target;
  return `<nav class="course-route" aria-label="Маршрут курса">${renderEdge(steps, position, -1)}<ol class="course-route__groups">${groups}</ol>${renderEdge(steps, position, 1)}<p class="course-route__status">${status}</p><div class="course-route__compact">${renderCompact(steps, position, state.done.has(position.id))}</div></nav>`;
};

// Generated by scripts/course-map.ts --write: the strip ships the route, not the whole course-names.json.
const toStep = (step: (typeof routeSteps)[number]): RouteStep => ({
  ...step,
  group: asGroup(step.group),
});
const courseOf = (step: { course?: string }): string | null => step.course ?? null;

/** Analysis view: byte-identical to the single-course strip; intent steps never leak into it. */
export const STEPS: RouteStep[] = routeSteps
  .filter((step) => courseOf(step) !== 'intent')
  .map(toStep);

/** Intent view: the shared preparation plus the four intent steps. */
export const STEPS_INTENT: RouteStep[] = routeSteps
  .filter((step) => (courseOf(step) !== 'intent' ? asGroup(step.group) === 'prep' : true))
  .map(toStep);

const currentStrip = (steps: RouteStep[], currentId: string | null): string =>
  renderStrip(
    steps,
    routeState(steps, currentId, doneStages(readProgress(safeStorage()))),
    currentId,
  );

// Click-driven scrollIntoView and hash jumps must not reveal the menu over their target.
const followMenu = (
  doc: Document,
  nav: HTMLElement,
  strip: HTMLElement,
  place: () => void,
): void => {
  let anchoring = !!doc.location?.hash;
  let lastY = Math.max(0, scrollY);
  nav.classList.toggle('is-route-menu-hidden', lastY >= 8 && !nav.contains(doc.activeElement));
  place();
  let direction = 0;
  let distance = 0;
  const showMenu = (): void => {
    nav.classList.remove('is-route-menu-hidden');
    place();
  };
  const hideMenu = (): void => {
    nav.classList.toggle('is-route-menu-hidden', !nav.contains(doc.activeElement));
    place();
  };
  addEventListener('hashchange', () => {
    anchoring = true;
    hideMenu();
  });
  addEventListener('click', () => {
    anchoring = true;
  });
  const manualScroll = (): void => {
    anchoring = false;
  };
  addEventListener('wheel', manualScroll, { passive: true });
  addEventListener('touchmove', manualScroll, { passive: true });
  addEventListener(
    'pointerdown',
    (event) => {
      if (event.target === doc.documentElement) manualScroll();
    },
    { passive: true },
  );
  addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key))
      manualScroll();
  });
  nav.addEventListener('focusin', showMenu);
  strip.addEventListener('focusin', hideMenu);
  addEventListener(
    'scroll',
    () => {
      const y = Math.max(0, scrollY);
      const delta = y - lastY;
      lastY = y;
      if (Math.sign(delta) !== direction) distance = 0;
      direction = Math.sign(delta);
      distance += Math.abs(delta);
      if (y === 0 || nav.contains(doc.activeElement)) showMenu();
      else if (anchoring || strip.contains(doc.activeElement)) hideMenu();
      else if (distance >= 8) {
        nav.classList.toggle('is-route-menu-hidden', direction > 0);
        distance = 0;
      }
      place();
    },
    { passive: true },
  );
};

/** On a guide the strip is pinned from the load. On the map it waits for the start of the route: it appears
 * once #course-introduction-title reaches the pinned strip and hides again when the reader scrolls back above it. */
const bindSticky = (
  doc: Document,
  nav: HTMLElement,
  strip: HTMLElement,
  onMap: boolean,
): (() => void) => {
  const root = doc.documentElement;
  root.classList.add('has-course-route');
  const sentinel = doc.createElement('div');
  sentinel.className = `course-route-sentinel${onMap ? ' course-route-sentinel--map' : ''}`;
  sentinel.setAttribute('aria-hidden', 'true');
  const introduction = doc.getElementById('course-introduction-title');
  if (onMap && introduction) introduction.before(sentinel);
  else nav.before(sentinel);
  let stuck = false;
  let origin = 0;
  let height = 0;
  const place = (): void => {
    const menuOffset = nav.classList.contains('is-route-menu-hidden') ? 0 : origin;
    root.style.setProperty('--route-top', `${menuOffset}px`);
    root.style.setProperty('--route-sticky-height', `${height + menuOffset}px`);
  };
  const measure = (): void => {
    // A hidden map strip still needs its measured height for the anchor reserve before the first jump.
    const hidden = strip.hidden;
    if (hidden) strip.classList.add('is-stuck');
    strip.hidden = false;
    height = strip.offsetHeight;
    strip.hidden = hidden;
    if (hidden) strip.classList.toggle('is-stuck', stuck);
    root.style.setProperty('--route-height', `${height}px`);
    place();
  };
  const align = (): void => {
    origin = nav.offsetTop + nav.offsetHeight;
    root.style.setProperty('--route-origin-top', `${origin}px`);
    // The map keeps the site reserve: the strip appears later, so it must not move the page.
    if (!onMap)
      root.style.setProperty('--site-nav-reserve', `${origin + strip.offsetHeight + 24}px`);
    place();
    measure();
  };
  strip.hidden = onMap && !!introduction;
  align();
  new ResizeObserver(align).observe(nav);
  new ResizeObserver(measure).observe(strip);
  new IntersectionObserver(([entry]) => {
    if (!entry) return;
    stuck = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    strip.classList.toggle('is-stuck', stuck);
    if (onMap && introduction) strip.hidden = !stuck;
    place();
    measure();
  }).observe(sentinel);
  followMenu(doc, nav, strip, place);
  return measure;
};

/** On the map the nearest card drives the strip: viewing marks, a breathing current node and a flash on the step just left. */
const bindViewing = (
  doc: Document,
  strip: HTMLElement,
  steps: RouteStep[],
  passed: () => Set<string>,
): (() => void) => {
  const cards = new Map<Element, string>();
  doc.querySelectorAll<HTMLElement>('#course-map [data-route-id]').forEach((card) => {
    cards.set(card, card.getAttribute('data-route-id')!);
  });
  doc.querySelectorAll<HTMLAnchorElement>('.route-open').forEach((link) => {
    const card = link.closest('article, aside, #implementation');
    const step = steps.find((entry) => entry.href === link.getAttribute('href'));
    if (card && step) cards.set(card, step.id);
  });
  const visible = new Set<Element>();
  let previousId = '';
  const applyViewing = (): void => {
    const distance = (card: Element): number => {
      const box = card.getBoundingClientRect();
      return Math.abs(box.top + box.height / 2 - doc.documentElement.clientHeight / 2);
    };
    const nearest = [...visible].sort((a, b) => distance(a) - distance(b))[0];
    const id = nearest ? cards.get(nearest)! : '';
    const currentIndex = steps.findIndex((step) => step.id === id);
    // Scrolling fires this many times a second: only a real move to the next step flashes.
    const moved = id !== previousId;
    const prevIndex = steps.findIndex((step) => step.id === previousId);
    const done = passed();
    const current = steps[currentIndex] ?? steps.find((step) => !done.has(step.id)) ?? steps[0];
    const status = strip.querySelector<HTMLAnchorElement>('.course-route__status a');
    if (current && status) {
      status.href = current.href;
      status.textContent = routeLabel(current);
    }
    const compact = strip.querySelector<HTMLElement>('.course-route__compact');
    if (current && compact) compact.innerHTML = renderCompact(steps, current, done.has(current.id));
    for (const offset of [-1, 1] as const) {
      const edge = strip.querySelector<HTMLElement>(
        `.course-route__edge--${offset < 0 ? 'prev' : 'next'}`,
      );
      if (edge) edge.outerHTML = renderEdge(steps, current, offset);
    }
    strip.querySelectorAll<HTMLElement>('[data-route-id]').forEach((dot, index) => {
      const dotId = dot.dataset['routeId']!;
      dot.classList.toggle('is-traversed', index < currentIndex);
      if (moved)
        dot.classList.toggle(
          'is-new',
          prevIndex >= 0 && currentIndex > prevIndex && dotId === previousId,
        );
      dot.classList.toggle('is-viewing', dotId === id);
      const link = dot.querySelector('a');
      if (dotId === id) link?.setAttribute('aria-current', 'step');
      else link?.removeAttribute('aria-current');
      const spoken =
        (dotId === id ? ' — вы смотрите' : '') + (done.has(dotId) ? ` — ${checkedLabel}` : '');
      for (const attribute of ['title', 'aria-label'])
        link?.setAttribute(attribute, `${link.dataset['title']}${spoken}`);
    });
    previousId = id;
  };
  let viewing: IntersectionObserver;
  const observe = (): void => {
    viewing?.disconnect();
    visible.clear();
    viewing = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        applyViewing();
      },
      { rootMargin: `-${Math.floor(doc.documentElement.clientHeight * 0.45)}px 0px` },
    );
    for (const card of cards.keys()) viewing.observe(card);
  };
  observe();
  let resizePending = false;
  addEventListener('resize', () => {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => {
      resizePending = false;
      observe();
    });
  });
  return applyViewing;
};

/** The current step comes from body[data-stage]; the guides map has none. Pages outside the route get no strip. */
export const mountStrip = (doc: Document): HTMLElement | null => {
  const stage = doc.body.dataset['stage'] ?? null;
  const steps = doc.body.dataset['course'] === 'intent' ? STEPS_INTENT : STEPS;
  const onMap = !!doc.getElementById('course-map');
  if (!onMap && !steps.some((step) => step.id === stage)) return null;
  const nav = doc.querySelector<HTMLElement>('[data-global-nav]');
  if (!nav) return null;
  const currentId = onMap ? null : stage;
  nav.insertAdjacentHTML('afterend', currentStrip(steps, currentId));
  const strip = nav.nextElementSibling;
  if (!(strip instanceof HTMLElement)) return null;
  strip.classList.add('is-live');
  const measure = bindSticky(doc, nav, strip, onMap);
  if (onMap)
    doc.querySelectorAll<HTMLElement>('.course-map__group > h3').forEach((heading, index) => {
      const group = GROUPS[index];
      if (group) heading.insertAdjacentHTML('afterbegin', groupIcon(group));
    });
  let applyViewing = (): void => {};
  let passed = doneStages(readProgress(safeStorage()));
  addEventListener('course-route:update', () => {
    strip.classList.remove('is-live');
    const template = doc.createElement('template');
    template.innerHTML = currentStrip(steps, currentId);
    strip.innerHTML = template.content.firstElementChild!.innerHTML;
    // Only the dot that has just been passed pulses, not every passed one.
    const now = doneStages(readProgress(safeStorage()));
    for (const step of steps.filter((item) => now.has(item.id) && !passed.has(item.id)))
      nav.nextElementSibling
        ?.querySelector(`a[href="${step.href}"]`)
        ?.parentElement?.classList.add('is-new');
    passed = now;
    measure();
    applyViewing();
  });
  if (onMap) applyViewing = bindViewing(doc, strip, steps, () => passed);
  return strip;
};
