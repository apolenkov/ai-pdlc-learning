import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };

/** Build marker resolved to the relative site root for each page. */
export const PUBLIC_ROOT = '__CUSTOMDEV_ROOT__';

export type SiteSection = 'sdlc' | 'teams' | 'help';
type GlobalNavigationId = 'home' | 'teams' | 'help';

export type NavigationTarget = Readonly<{
  section: SiteSection;
  /** Optional CSS class used by presentation pages. */
  navClass?: string;
  /** Keep page-specific controls (for example slide controls) in the page-actions row. */
  preservePageActions?: boolean;
  /** Which site the page is built for; the public course by default. */
  row?: NavigationRow;
  /** The PDLC landing has local navigation and no return link. */
  landing?: boolean;
}>;

export type NavigationRow = 'public' | 'customdev';
type NavigationItem = Readonly<{ id: GlobalNavigationId; label: string; href: string }>;

const HOME_LABEL = `Карта ${courseNames.lifecycleName}`;
const mapNavigation = (root: string, landing = false): readonly NavigationItem[] => [
  { id: 'home', label: HOME_LABEL, href: landing ? './' : `${root}#sdlc` },
  { id: 'help', label: 'Справка', href: `${root}#help` },
];

export const navigationRow = (row: NavigationRow): readonly NavigationItem[] =>
  mapNavigation(row === 'customdev' ? `${PUBLIC_ROOT}../` : PUBLIC_ROOT);

export const GLOBAL_NAVIGATION = navigationRow('public');

/** The row the build writes: `COURSE_NAV=customdev` for the CustomDev site, the public row when unset.
    An empty value is refused: a CustomDev build whose variable expanded to nothing must not get the public menu. */
export const courseNavigationRow = (value = process.env.COURSE_NAV): NavigationRow => {
  if (value === undefined || value === 'public') return 'public';
  if (value === 'customdev') return 'customdev';
  throw new Error(`COURSE_NAV must be public or customdev, not ${value}`);
};

/* Every course page returns to the map: one label and one address per row.
   The section still decides the highlighted global destination. */
const renderCatalogReturn = (home: string): string =>
  `<a class="site-catalog-return" data-catalog-return href="${home}"><span aria-hidden="true">←</span><span>К карте ${courseNames.lifecycleName}</span></a>`;

export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const currentAttribute = (id: GlobalNavigationId, section: SiteSection): string =>
  id === section || (id === 'home' && section === 'sdlc') ? ' aria-current="location"' : '';

/* The disclosure stays handler-local (no <script> block): re-running
   site-nav:update replaces the <nav> element, so an extra script node
   would duplicate on every run. <button> is natively keyboard-operable;
   Escape is handled on the nav itself.
   The open menu reserves its measured height (plus the top inset above and
   below, as the CustomDev nav script does), so the page moves down instead
   of hiding under the menu; closing drops the inline value and the
   stylesheet reserve (or the route strip's own measure) applies again. */
export const NAV_ESCAPE_HANDLER =
  "if(event.key==='Escape'&&this.getAttribute('data-expanded')==='true')" +
  "{this.setAttribute('data-expanded','false');" +
  "document.documentElement.style.removeProperty('--site-nav-reserve');" +
  "var more=this.querySelector('.site-nav-more');" +
  "if(more){more.setAttribute('aria-expanded','false');more.focus()}}";
export const MORE_TOGGLE_HANDLER =
  "var nav=this.closest('nav');" +
  "var open=nav.getAttribute('data-expanded')!=='true';" +
  "nav.setAttribute('data-expanded',open);" +
  "this.setAttribute('aria-expanded',open);" +
  'var root=document.documentElement.style;' +
  "if(open){root.setProperty('--site-nav-reserve',nav.getBoundingClientRect().height+2*(parseFloat(getComputedStyle(nav).top)||0)+'px')}" +
  "else{root.removeProperty('--site-nav-reserve')}";

export const renderSiteNavigation = (target: NavigationTarget): string => {
  const row = target.row ?? 'public';
  const items = target.landing ? mapNavigation('', true) : navigationRow(row);
  const links = items
    .map((item) => {
      const home = item.id === 'home';
      const marker = home ? ' data-global-home data-home-link' : '';
      const current =
        target.landing && home ? ' aria-current="page"' : currentAttribute(item.id, target.section);
      return `<a class="${home ? 'site-home' : 'site-global-link'}"${marker} data-nav-item="${item.id}" href="${escapeHtml(item.href)}"${current}>${escapeHtml(item.label)}</a>`;
    })
    .join('');
  const catalogReturn = target.landing ? '' : renderCatalogReturn(items[0]!.href);
  const more = `<button class="site-nav-more" type="button" aria-expanded="false" onclick="${MORE_TOGGLE_HANDLER}">Ещё</button>`;
  const navClass = target.landing
    ? 'site-topbar site-topbar--root'
    : (target.navClass ?? 'site-topbar');
  return `<nav class="${escapeHtml(navClass)}" data-global-nav data-expanded="false" onkeydown="${NAV_ESCAPE_HANDLER}" aria-label="Основная навигация ${courseNames.lifecycleName}"><div class="site-topbar__identity">${links}${more}</div><div class="site-page-actions">${catalogReturn}</div></nav>`;
};

const preservePageActions = (html: string, navigation: string): string => {
  const match = html.match(
    /<div\b[^>]*class=["'][^"']*site-page-actions[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/nav>/u,
  );
  if (!match) return navigation;
  const controls = (match[1] ?? '')
    .replace(/<span\b[^>]*class=["'][^"']*site-current[^"']*["'][^>]*>[\s\S]*?<\/span>/u, '')
    .replace(/<a\b[^>]*data-catalog-return[^>]*>[\s\S]*?<\/a>/gu, '');
  // The deck keeps its slide controls after the generated catalog return.
  return navigation.replace(/<\/div><\/nav>$/u, () => `${controls}</div></nav>`);
};

/** Replace the canonical global navigation block, preserving the page body. */
export const replaceSiteNavigation = (html: string, target: NavigationTarget): string => {
  const rendered = renderSiteNavigation(target);
  const next = html.replace(/<nav\b[^>]*data-global-nav[\s\S]*?<\/nav>/u, () =>
    target.preservePageActions ? preservePageActions(html, rendered) : rendered,
  );
  if (!next.includes('data-global-nav')) throw new Error('Navigation not found in HTML');
  // The page section (styles, atmosphere) follows the menu section, so the two cannot drift apart.
  const pageSection = target.section === 'sdlc' ? 'analysis' : target.section;
  return next.replace(/(<html\b[^>]*\bdata-section=")[a-z]+"/u, `$1${pageSection}"`);
};

/**
 * Rewrite the public row of a built page as `row`. The section and the deck controls are read from the
 * page itself: the public home item is current on the map's pages and not on the help pages.
 */
export const withNavigationRow = (html: string, row: NavigationRow): string => {
  if (row === 'public') return html;
  const nav = html.match(/<nav\b[^>]*data-global-nav[\s\S]*?<\/nav>/u)?.[0];
  if (!nav || nav.includes('site-topbar--root')) return html;
  const home = nav.match(/<a\b[^>]*data-nav-item="home"[^>]*>/u)?.[0] ?? '';
  const section: SiteSection = home.includes('aria-current') ? 'sdlc' : 'help';
  const deck = /^<nav class="deck-topbar site-topbar"/u.test(nav);
  return replaceSiteNavigation(
    html,
    deck
      ? { section, row, navClass: 'deck-topbar site-topbar', preservePageActions: true }
      : { section, row },
  );
};
