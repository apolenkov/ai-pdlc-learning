import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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

await test('the landing menu links to itself and its help section', () => {
  const html = renderSiteNavigation({ section: 'sdlc', landing: true });
  assert.match(html, /class="site-topbar site-topbar--root"/u);
  assert.deepEqual(items(html), [
    ['home', './', 'page', 'Карта PDLC'],
    ['help', '#help', '', 'Справка'],
  ]);
  assert.equal(back(html), undefined);
  assert.equal(withNavigationRow(html, 'customdev'), html);
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

await test('the public menu highlights the current section and returns to the stage band', () => {
  for (const section of ['sdlc', 'help'] as const) {
    const html = renderSiteNavigation({ section });
    assert.deepEqual(items(html), [
      ['home', `${PUBLIC_ROOT}#sdlc`, section === 'sdlc' ? 'location' : '', 'Карта PDLC'],
      ['help', `${PUBLIC_ROOT}#help`, section === 'help' ? 'location' : '', 'Справка'],
    ]);
    assert.equal(back(html), `${PUBLIC_ROOT}#sdlc`);
    assert.match(html, /К карте PDLC<\/span>/u);
    assert.match(html, /<button class="site-nav-more"[^>]*>Ещё<\/button>/u);
  }
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
});

await test('CustomDev menu markup remains byte-identical to the published course row', () => {
  // SHA-256 of the three original navigation variants at 16d167cb, before path resolution.
  for (const [target, digest] of [
    [{ section: 'sdlc' }, '1921685f5e3d9fe2bf1c724f6e9adc3b6011be07650514f3c9ee7bc9668f92d4'],
    [{ section: 'help' }, '4b21c1dc5c2efb52052ad23e334ddb4601aef49f70a06d78cf3f9ae44bcdac46'],
    [
      { section: 'sdlc', navClass: 'deck-topbar site-topbar', preservePageActions: true },
      '6f3a6e3b00290b899450ad3536562746a95e1317fb6cb4d1ee8791e756321d36',
    ],
  ] as const) {
    const html = renderSiteNavigation({ ...target, row: 'customdev' });
    assert.equal(createHash('sha256').update(html).digest('hex'), digest);
  }
});
