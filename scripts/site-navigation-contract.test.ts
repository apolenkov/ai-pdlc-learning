import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  courseNavigationRow,
  PUBLIC_ROOT,
  renderSiteNavigation,
  replaceSiteNavigation,
  withNavigationRow,
} from './site-navigation-contract.ts';

const items = (html: string): string[][] =>
  [...html.matchAll(/data-nav-item="([^"]+)" href="([^"]+)"([^>]*)>([^<]+)<\/a>/gu)].map(
    ([, id, href, rest, label]) => [
      id!,
      href!,
      /aria-current="(\w+)"/u.exec(rest!)?.[1] ?? '',
      label!,
    ],
  );
const back = (html: string): string | undefined =>
  /data-catalog-return href="([^"]+)"/u.exec(html)?.[1];

await test('the public course row has one home item that leads to the course root', () => {
  assert.deepEqual(items(renderSiteNavigation({ section: 'sdlc' })), [
    ['home', PUBLIC_ROOT, 'location', 'Маршрут курса'],
  ]);
});

await test('in the public build no menu link leaves the course or points to a missing section', () => {
  for (const section of ['sdlc', 'help'] as const)
    for (const home of ['./', '../']) {
      const html = renderSiteNavigation({ section }).split(PUBLIC_ROOT).join(home);
      const hrefs = [...items(html).map(([, href]) => href), back(html)];
      assert.deepEqual(hrefs, [home, home], `${section} at ${home}`);
      assert.doesNotMatch(html, /#sdlc|#help|Справка/u, `${section} at ${home}`);
    }
});

await test('the course navigation omits the retired environment item, anchor and label', () => {
  for (const section of ['sdlc', 'help'] as const) {
    const html = renderSiteNavigation({ section });
    assert.doesNotMatch(
      html,
      /data-nav-item="environment"|#environment|Среда\s+и\s+контуры/u,
      section,
    );
  }
});

await test('a page marks its section, every page returns to the course route', () => {
  for (const [section, current] of [
    ['sdlc', ['home']],
    ['help', []],
  ] as const) {
    const html = renderSiteNavigation({ section });
    assert.deepEqual(
      items(html)
        .filter(([, , aria]) => aria)
        .map(([id]) => id),
      current,
      section,
    );
    assert.equal(back(html), PUBLIC_ROOT, section);
    // «Маршрут курса» in the menu leads to the same page as the hidden «К маршруту курса».
    assert.equal(items(html)[0]?.[1], back(html), section);
    assert.match(html, /К маршруту курса<\/span>/u, section);
    assert.doesNotMatch(html, /Карта PDLC|К карте PDLC/u, section);
    // The home item tells the breadcrumbs it is the course root.
    assert.match(html, /data-home-link data-course-root data-nav-item="home"/u, section);
    assert.doesNotMatch(html, /К каталогу|site-catalog-return__section/u, section);
    assert.match(html, /data-expanded="false"/u, section);
    // With a single menu item a page has nothing for «Ещё» to open.
    assert.doesNotMatch(html, /<button class="site-nav-more"/u, section);
    assert.match(html, /onkeydown="[^"]*Escape/u, section);
  }
  // The deck hides its slide actions on a narrow bar, so it keeps «Ещё».
  assert.match(
    renderSiteNavigation({
      section: 'sdlc',
      navClass: 'deck-topbar site-topbar',
      preservePageActions: true,
    }),
    /<button class="site-nav-more"[^>]*aria-expanded="false"[^>]*>Ещё<\/button>/u,
  );
});

await test('built for CustomDev, the course keeps the CustomDev row: the map, «Справка» and «Ещё»', () => {
  // Labels and order are those of site-navigation-contract.ts in CustomDev, which refuses a course with another row.
  for (const [section, current] of [
    ['sdlc', 'home'],
    ['help', 'help'],
  ] as const) {
    const html = renderSiteNavigation({ section, row: 'customdev' });
    assert.deepEqual(
      items(html),
      [
        ['home', `${PUBLIC_ROOT}../#sdlc`, current === 'home' ? 'location' : '', 'Карта PDLC'],
        ['help', `${PUBLIC_ROOT}../#help`, current === 'help' ? 'location' : '', 'Справка'],
      ],
      section,
    );
    assert.equal(back(html), `${PUBLIC_ROOT}../#sdlc`, section);
    assert.match(html, /К карте PDLC<\/span>/u, section);
    assert.doesNotMatch(html, /data-course-root/u, section);
    assert.match(html, /<button class="site-nav-more"[^>]*>Ещё<\/button>/u, section);
  }
});

await test('COURSE_NAV picks the row and refuses an unknown one', () => {
  assert.equal(courseNavigationRow(undefined), 'public');
  assert.equal(courseNavigationRow('public'), 'public');
  assert.equal(courseNavigationRow('customdev'), 'customdev');
  assert.throws(() => courseNavigationRow('CustomDev'), /COURSE_NAV must be public or customdev/u);
  assert.throws(() => courseNavigationRow(''), /COURSE_NAV must be public or customdev, not $/u);
});

await test('a built public page turns into the same page written for CustomDev', () => {
  const page = (nav: string): string =>
    `<html data-section="analysis"><body>${nav}<main>x</main></body></html>`;
  const deckControls =
    '<span class="counter">1 / 9</span><button id="overview-toggle">Обзор</button>';
  const deck = (row: 'public' | 'customdev'): string =>
    replaceSiteNavigation(
      page(
        `<nav class="deck-topbar site-topbar" data-global-nav><div class="site-page-actions">${deckControls}</div></nav>`,
      ),
      { section: 'sdlc', row, navClass: 'deck-topbar site-topbar', preservePageActions: true },
    );
  for (const section of ['sdlc', 'help'] as const) {
    const pub = replaceSiteNavigation(page('<nav data-global-nav></nav>'), { section });
    const own = replaceSiteNavigation(page('<nav data-global-nav></nav>'), {
      section,
      row: 'customdev',
    });
    assert.equal(withNavigationRow(pub, 'customdev'), own, section);
    assert.equal(withNavigationRow(pub, 'public'), pub, section);
  }
  assert.equal(withNavigationRow(deck('public'), 'customdev'), deck('customdev'));
  assert.match(deck('customdev'), /Обзор<\/button><\/div><\/nav>/u);
  assert.equal(withNavigationRow(page('<p>no menu</p>'), 'customdev'), page('<p>no menu</p>'));
  // The public course root has no return link to itself; written for CustomDev it gets the row's return to the map.
  const root = replaceSiteNavigation(page('<nav data-global-nav></nav>'), {
    section: 'sdlc',
    courseRoot: true,
  });
  assert.equal(back(root), undefined);
  assert.equal(
    withNavigationRow(root, 'customdev'),
    replaceSiteNavigation(page('<nav data-global-nav></nav>'), {
      section: 'sdlc',
      row: 'customdev',
    }),
  );
  assert.equal(
    back(renderSiteNavigation({ section: 'sdlc', row: 'customdev', courseRoot: true })),
    `${PUBLIC_ROOT}../#sdlc`,
  );
});
