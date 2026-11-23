// The third navigation level: one line «home → раздел → страница» in the
// document flow under the fixed menu and course strip.
import { GROUP_WORDS, routeLabel, type RouteStep } from './model.ts';
import { STEPS, STEPS_INTENT } from './strip.ts';

const esc = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export type Crumb = { label: string; href?: string };
type CrumbInput = {
  home: Crumb;
  step?: RouteStep | undefined;
  /** The course page of a step outside the analysis course (the intent course): it stands between home and step. */
  stepCourse?: Crumb | undefined;
  onMap?: boolean;
  /** Name of the course whose map the page shows; the analysis course when absent. */
  mapCourse?: string | undefined;
  section?: Crumb | undefined;
  page?: string;
  /** The home crumb is the course route itself (the public course): no second crumb to the same page. */
  courseRoot?: boolean;
};

export const crumbItems = (input: CrumbInput): Crumb[] => {
  const items: Crumb[] = [input.home];
  if (input.step && input.stepCourse) {
    items.push(input.stepCourse, {
      label: `Шаг\u00a0${input.step.number}\u00a0· ${input.step.title}`,
    });
  } else if (input.step) {
    if (!input.courseRoot) items.push({ label: 'Курс анализа', href: 'index.html' });
    items.push({
      label: input.step.number
        ? `${GROUP_WORDS[input.step.group]}\u00a0· ${routeLabel(input.step)}`
        : routeLabel(input.step),
    });
  } else if (input.onMap) {
    // The course root page itself: a trail would only point back at it.
    if (input.courseRoot && !input.mapCourse) return [];
    items.push({ label: input.mapCourse || 'Курс анализа' });
  } else {
    if (input.section && input.section.href !== input.home.href) items.push(input.section);
    if (input.page) items.push({ label: input.page });
  }
  return items;
};

export const renderCrumbs = (items: Crumb[]): string => {
  const last = items.length - 1;
  return `<nav class="site-crumbs" aria-label="Путь по сайту"><ol>${items
    .map((item, index) =>
      index === last
        ? `<li aria-current="page">${esc(item.label)}</li>`
        : `<li><a href="${esc(item.href ?? '')}">${esc(item.label)}</a></li>`,
    )
    .join('')}</ol></nav>`;
};

const titleHead = (doc: Document): string => (doc.title.split('·')[0] ?? '').trim();

/** What the page tells the crumb line: its menu home, route step, map and section. */
const pageCrumbInput = (doc: Document, nav: HTMLElement, home: HTMLAnchorElement): CrumbInput => {
  const section = nav.querySelector<HTMLAnchorElement>(
    `[data-nav-item="${doc.documentElement.dataset['section'] ?? ''}"]`,
  );
  const stage = doc.body.dataset['stage'];
  const course = doc.body.dataset['course'];
  // A numbered step of another course (intent): its page carries data-course, its course page is <course>.html.
  const courseStep = course
    ? STEPS_INTENT.find((item) => item.id === stage && item.course === course && item.number)
    : undefined;
  return {
    home: {
      label: home.textContent?.trim() || 'Карта PDLC',
      href: home.getAttribute('href') ?? '',
    },
    step: courseStep ?? STEPS.find((item) => item.id === stage),
    stepCourse: courseStep ? { label: titleHead(doc), href: `${course}.html` } : undefined,
    onMap: !!doc.getElementById('course-map'),
    // The intent course page carries the same map: its crumb names that course, not the analysis one.
    mapCourse: (doc.body.dataset['course'] && titleHead(doc)) || undefined,
    section: section
      ? {
          label: section.textContent?.trim() || '',
          href: section.getAttribute('href') ?? '',
        }
      : undefined,
    page: titleHead(doc) || doc.querySelector('h1')?.textContent?.trim() || '',
    courseRoot: home.hasAttribute('data-course-root'),
  };
};

export const mountCrumbs = (doc: Document): void => {
  const nav = doc.querySelector<HTMLElement>('[data-global-nav]');
  if (!nav || nav.classList.contains('deck-topbar')) return;
  const home = nav.querySelector<HTMLAnchorElement>('[data-global-home]');
  if (!home) return;
  const items = crumbItems(pageCrumbInput(doc, nav, home));
  if (items.length === 0) {
    // On the course root the return link would lead to the page itself.
    nav.querySelector('[data-catalog-return]')?.remove();
    return;
  }
  const host = doc.querySelector<HTMLElement>('.shell, .page-shell, .reference-shell, main');
  if (!host) return;
  const crumbs = renderCrumbs(items);
  if (host.contains(nav)) nav.insertAdjacentHTML('afterend', crumbs);
  else host.insertAdjacentHTML('afterbegin', crumbs);
};
