import routeSteps from '../../docs/pages/sdlc-development/guides/route-steps.json' with { type: 'json' };
import { routeLabel } from '../../docs/pages/sdlc-development/guides/renderer/common.ts';
import {
  renderStrip,
  STEPS,
  STEPS_INTENT,
} from '../../docs/pages/sdlc-development/route-strip/strip.ts';
import { routeState } from '../../docs/pages/sdlc-development/route-strip/model.ts';
import courseNames from '../../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { readIntentPageSource } from '../course-map.ts';

await test('the map and back arrows follow the course order, with a separate prerequisite on the first intent card', async () => {
  const pages = {
    analysis: await readFile(
      resolve(import.meta.dirname, '../../docs/pages/sdlc-development/guides/index.html'),
      'utf8',
    ),
    // The intent map is a generated part: compare against the page as the build publishes it.
    intent: await readIntentPageSource(),
  };
  const intentPrev: Record<string, string> = { i1: 'metarepo', i2: 'i1', i3: 'i2', i4: 'i3' };
  for (const id of [
    ...courseNames.route.map((entry) => entry.id),
    ...courseNames.branches.map((branch) => branch.id),
  ]) {
    const course = id in intentPrev ? 'intent' : 'analysis';
    const index = pages[course];
    const code =
      courseNames.route.find((entry) => entry.id === id)?.code ??
      courseNames.branches.find((branch) => branch.id === id)!.code;
    const mapItem = index.match(new RegExp(`id="map-${code}"[^]*?</li></ul>`, 'u'))![0];
    const mapPrev = mapItem.match(/Перед этим<\/span>([^<]+)/u)?.[1]?.replace(/\s+/gu, ' ');
    const steps = course === 'intent' ? STEPS_INTENT : STEPS;
    const strip = renderStrip(steps, routeState(steps, id, new Set()), id);
    const prevHref = strip.match(/course-route__edge--prev" href="([^"]+)"/u)?.[1];
    const previous = routeSteps.find((entry) => entry.href === prevHref);
    if (course === 'intent') assert.equal(previous?.id, intentPrev[id], `${code}: prerequisite`);
    if (id === 'i1') {
      assert.equal(prevHref, 'p4-metarepository.html');
      assert.match(strip, /class="course-route__arrow" href="p4-metarepository.html"/u);
      assert.equal(
        mapPrev,
        'подготовка «Markdown, Git и GitLab»; SDD и мета‑репозиторий — по желанию',
      );
      continue;
    }
    assert.equal(
      mapPrev,
      // An intent step in the previous slot carries the course name, as everywhere on the intent pages.
      previous
        ? previous.course === 'intent'
          ? routeLabel(previous, true).replace(/\u00a0/gu, ' ')
          : `${previous.number || 'Подготовка'} · ${previous.title}`
        : undefined,
      `${code}: the strip's prev arrow points at the page the map names`,
    );
  }
});
