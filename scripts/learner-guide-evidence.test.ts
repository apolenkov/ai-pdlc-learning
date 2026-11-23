import assert from 'node:assert/strict';
import test from 'node:test';
import { type GuideId, type LearnerGuides } from './learner-guide-contract.ts';
import { readLearningEnhancementsCss } from './learning-enhancements-css.ts';
import {
  loadGuides,
  renderGuide,
  renderedStepHtml,
  type RenderedDisclosure,
  directDisclosureElements,
  disclosureText,
  disclosureSummary,
  supplementSections,
  GUIDE_IDS,
  leadThenClosedLazyScreenshots,
} from './learner-guide-test-support.ts';

const collectAdvancedDisclosureFailures = (
  stepHtml: string,
  hasAdvanced: boolean,
  advanced: unknown,
  shouldHaveAdvanced: boolean,
  label: string,
  failures: string[],
) => {
  let actualAdvanced: RenderedDisclosure[] = [];
  if (hasAdvanced && typeof advanced === 'string') {
    const carriesItsDisclosure = /^\s*<details\b/u.test(advanced);
    const expectedSummary = carriesItsDisclosure
      ? disclosureSummary(advanced)
      : 'Продвинутый вариант';
    const primary = carriesItsDisclosure
      ? (directDisclosureElements(advanced)[0]?.html ?? '')
      : advanced;
    const advancedText = disclosureText(primary);
    const expectedText = carriesItsDisclosure ? advancedText : `${expectedSummary} ${advancedText}`;
    actualAdvanced = supplementSections(stepHtml).filter(
      (disclosure) =>
        disclosure.html.includes(`<h4>${expectedSummary}</h4>`) &&
        disclosureText(disclosure.html) === expectedText,
    );
  }
  if (actualAdvanced.length !== Number(shouldHaveAdvanced)) {
    failures.push(`${label}: advanced must be one independent disclosure only when provided`);
  }
};

const collectDisclosureFailures = (
  stepHtml: string,
  resultAt: number,
  resultEnd: number,
  label: string,
  failures: string[],
) => {
  const details = [...stepHtml.matchAll(/<details\b[^>]*>|<\/details>/gu)];
  let detailsDepth = 0;
  let skippedDepth = 0;
  for (const detail of details) {
    // R-1 content disclosures (long example previews) are part of the step body, not optional evidence.
    if (skippedDepth > 0) {
      if (detail[0].startsWith('</')) skippedDepth -= 1;
      continue;
    }
    if (/\bexample-details\b/u.test(detail[0])) {
      skippedDepth += 1;
      continue;
    }
    if (detail[0].startsWith('</')) {
      if (detailsDepth === 0)
        failures.push(`${label}: optional disclosure closing tag has no matching opener`);
      detailsDepth -= 1;
      continue;
    }
    if (/\sopen(?:\s|=|>)/u.test(detail[0]))
      failures.push(`${label}: optional details must start closed`);
    if (detailsDepth > 0) failures.push(`${label}: optional details must be independent`);
    if (/\bstep-level\b/u.test(detail[0])) {
      if (detail.index >= stepHtml.indexOf('<div class="step-instructions'))
        failures.push(`${label}: levels must precede actions`);
    } else {
      if (
        !/class="(?:step-additional|step-trouble)"/u.test(detail[0]) ||
        detail.index <= resultEnd ||
        resultAt < 0
      )
        failures.push(`${label}: only trouble and the closed supplement belong after the result`);
    }
    detailsDepth += 1;
  }
  if (detailsDepth !== 0) failures.push(`${label}: optional disclosure markup must be balanced`);
  const helpCount = [...stepHtml.matchAll(/<details\b[^>]*\bclass="[^"]*\bstep-trouble\b/gu)]
    .length;
  if (helpCount !== 1) failures.push(`${label}: help must be one independent disclosure`);
};

const collectScreenshotFailures = (
  stepHtml: string,
  step: LearnerGuides['1']['steps'][number],
  label: string,
  failures: string[],
) => {
  const screenshots = step.screenshots ?? [];
  const screenshotGroups = supplementSections(stepHtml).filter(({ html }) =>
    html.startsWith('<section class="step-screenshots"><h4>Ещё снимки шага</h4>'),
  );
  if (screenshotGroups.length !== (screenshots.length > 1 ? 1 : 0)) {
    failures.push(`${label}: captures after the first must use one closed group`);
  }
  const images = [...stepHtml.matchAll(/<img\b[^>]*>/gu)];
  if (
    images.length !== screenshots.length ||
    images.some((image) => !/\bloading="lazy"/u.test(image[0]))
  ) {
    failures.push(`${label}: every screenshot must render once with lazy loading`);
  }
  const screenshotGroup = screenshotGroups[0];
  const groupedImages = screenshotGroup ? [...screenshotGroup.html.matchAll(/<img\b[^>]*>/gu)] : [];
  if (groupedImages.length !== Math.max(0, screenshots.length - 1))
    failures.push(`${label}: captures after the first must be inside the group`);
  if (screenshots.length && !leadThenClosedLazyScreenshots(stepHtml, screenshots.length))
    failures.push(`${label}: captures must follow both action variants and precede the result`);
};

await test('the lead capture follows the complete instruction block and both action variants', () => {
  const instructions =
    '<div class="step-instructions"><div>Первое действие</div>Второе действие</div>';
  const variant = '<div class="mode-b" data-mode-b>Другой вариант</div>';
  const lead = '<figure class="step-reference step-reference--lead"><img loading="lazy"></figure>';
  const result = '<p class="step-result">Готово</p>';
  assert.ok(leadThenClosedLazyScreenshots(instructions + variant + lead + result));
  for (const beforeResult of [
    lead,
    instructions.replace('Второе действие', lead + 'Второе действие'),
    instructions + lead + variant,
    instructions + variant.replace('Другой вариант', lead + 'Другой вариант'),
  ])
    assert.equal(leadThenClosedLazyScreenshots(beforeResult + result), false);
});

await test('screenshot links name the capture and expose one keyboard stop', async () => {
  const step = (await loadGuides())['3'].steps.find(
    (item) => item.title === 'Обновите правила и подготовьте OpenSpec',
  );
  assert.ok(step);
  const shot = step.screenshots?.[0];
  assert.ok(shot);
  const html = await renderGuide('3');
  const stepStart = html.indexOf('id="step-03"');
  const nextStep = html.indexOf('id="step-04"', stepStart);
  assert.ok(stepStart >= 0 && nextStep > stepStart, 'the targeted init step is present');
  const stepHtml = html.slice(stepStart, nextStep);
  const figureStart = stepHtml.search(
    /<figure class="step-reference[^"]*\bstep-reference--lead\b/u,
  );
  const figure = stepHtml.slice(
    figureStart,
    stepHtml.indexOf('</figure>', figureStart) + '</figure>'.length,
  );
  const links = [...figure.matchAll(/<a\b[^>]*>/gu)].map(([tag]) => tag);
  // C14: one link per capture (image), short aria-label with the step number; the duplicate caption link is gone.
  assert.equal(links.length, 1, 'the capture has exactly one link');
  assert.match(
    links[0] ?? '',
    /aria-label="Открыть снимок крупно · шаг 3"/u,
    'the single link has a short name that says which step it belongs to',
  );
  assert.doesNotMatch(
    figure,
    /tabindex="-1"|>Открыть крупно<\/a>/u,
    'no second zoom link is left in the caption',
  );
  const zoomContent = figure.match(/<a[^>]*>[\s\S]*?<\/a>/u)?.[0] ?? '';
  assert.doesNotMatch(
    zoomContent,
    /screenshot-marker/u,
    'visible numeric overlays must not override the short zoom label',
  );
  assert.match(
    figure,
    /<\/a><span class="screenshot-marker"/u,
    'the decorative overlays remain beside the zoom link',
  );
});

await test('screenshot focus target has clearance below the fixed navigation', async () => {
  const css = await readLearningEnhancementsCss();
  const rule = css.match(/\.step-reference__image>a\{([^}]+)\}/u)?.[1] ?? '';
  assert.match(rule, /scroll-margin-top:\s*calc\(var\(--site-nav-reserve,112px\)\s*\+\s*16px\)/u);
});

const ADVANCED_STEP_NUMBERS: Record<GuideId, readonly number[]> = {
  '0': [],
  '0a': [],
  '1': [3, 5],
  '2': [2, 5, 8],
  '3': [2, 3, 4, 6, 7, 8, 9],
  '3-star': [2, 3, 4, 6, 7, 8, 9, 10],
  '4-legacy': [],
  '4-new': [],
  '4-team': [],
  delivery: [],
  sdd: [1, 2, 3],
  i1: [],
  i2: [],
  i3: [],
  i4: [],
};

/* Duplicating a lone capture exercises the multi-capture grid: every
   screenshot stays lazy inside the one closed group in the supplement after the result. */
const withDuplicatedCapture = (guides: LearnerGuides): void => {
  for (const stage of Object.values(guides)) {
    for (const step of stage.steps) {
      if (step.screenshots?.length === 1) step.screenshots.push({ ...step.screenshots[0]! });
    }
  }
};

const renderedImages = (html: string): { tag: string; loading: string }[] =>
  [...html.matchAll(/<img\b[^>]*>/gu)].map((match) => ({
    tag: match[0],
    loading: match[0].match(/\bloading="([^"]*)"/u)?.[1] ?? '',
  }));

await test('every screenshot loads lazy: the first is open after the actions, the rest share one closed group', async () => {
  const guides = await loadGuides();
  for (const id of GUIDE_IDS) {
    for (const [mode, html] of [
      ['as published', await renderGuide(id)],
      ['with a duplicated capture', await renderGuide(id, withDuplicatedCapture)],
    ] as const) {
      const images = renderedImages(html);
      assert.ok(images.length > 0, `${id} ${mode}: the guide renders screenshots`);
      assert.ok(
        images.every((image) => image.loading === 'lazy'),
        `${id} ${mode}: every capture loads lazily; none renders eager`,
      );
      for (const [index, step] of guides[id].steps.entries()) {
        const number = String(index + 1).padStart(2, '0');
        const label = `${id} ${mode} step ${number}`;
        const stepStart = html.indexOf(`id="step-${number}"`);
        const nextStart = html.indexOf('id="step-', stepStart + 1);
        assert.ok(stepStart >= 0, `${label}: the rendered step is missing`);
        const block = html.slice(stepStart, nextStart > stepStart ? nextStart : undefined);
        const shots = step.screenshots?.length ?? 0;
        const count = mode === 'as published' || shots !== 1 ? shots : 2; // the duplicate helper doubles a lone capture
        assert.equal(
          leadThenClosedLazyScreenshots(block, count),
          count > 0,
          `${label}: the first capture is open after the actions, the rest share one closed supplement after the result`,
        );
      }
    }
  }
});

await test('all 32 learner steps keep advanced routes and optional evidence after the result', async () => {
  const guides = await loadGuides();
  const failures: string[] = [];
  let stepCount = 0;
  let advancedCount = 0;

  for (const id of GUIDE_IDS) {
    const steps = guides[id].steps;
    const html = await renderGuide(id);
    for (const [index, step] of steps.entries()) {
      stepCount += 1;
      const number = index + 1;
      const label = `${id} step ${number}`;
      const shouldHaveAdvanced = ADVANCED_STEP_NUMBERS[id].includes(number);
      const hasAdvancedField = Object.hasOwn(step, 'advanced');
      const advanced = Reflect.get(step, 'advanced');
      const hasAdvanced = typeof advanced === 'string' && advanced.trim().length > 0;
      if (hasAdvanced) advancedCount += 1;
      if (!hasAdvancedField) failures.push(`${label}: advanced field is missing`);
      if (shouldHaveAdvanced ? !hasAdvanced : advanced !== null) {
        failures.push(
          `${label}: advanced must be ${shouldHaveAdvanced ? 'non-empty' : 'explicit null'}`,
        );
      }

      const stepHtml = renderedStepHtml(html, number);
      if (!stepHtml) {
        failures.push(`${label}: rendered step is missing`);
        continue;
      }
      const resultAt = stepHtml.indexOf('<p class="step-result">');
      const resultEnd = resultAt < 0 ? -1 : stepHtml.indexOf('</p>', resultAt);
      if (resultAt < 0 || resultEnd < 0) failures.push(`${label}: result is missing`);

      collectScreenshotFailures(stepHtml, step, label, failures);

      const examples = [step.example, ...(step.examples ?? [])].filter(Boolean);
      const exampleTags = [...stepHtml.matchAll(/<div class="step-example[\s"]/gu)].filter(
        (example) => (example.index ?? 0) < resultAt,
      );
      const modelExampleCount =
        [...stepHtml.matchAll(/<div class="step-example[\s"]/gu)].length - exampleTags.length;
      if (modelExampleCount !== Number(Boolean(step.model)))
        failures.push(`${label}: model prompt must render once after the result`);
      if (
        exampleTags.length !== examples.length ||
        exampleTags.some((example) => resultAt < 0 || (example.index ?? 0) >= resultAt)
      ) {
        failures.push(`${label}: only provided examples must render before the result`);
      }

      collectDisclosureFailures(stepHtml, resultAt, resultEnd, label, failures);
      collectAdvancedDisclosureFailures(
        stepHtml,
        hasAdvanced,
        advanced,
        shouldHaveAdvanced,
        label,
        failures,
      );
    }
  }

  if (stepCount !== 32) failures.push(`expected 32 steps, found ${stepCount}`);
  if (advancedCount !== 20 || stepCount - advancedCount !== 12) {
    failures.push(
      `expected 20 advanced routes and 12 explicit nulls, found ${advancedCount} and ${stepCount - advancedCount}`,
    );
  }
  assert.equal(failures.length, 0, failures.slice(0, 24).join('\n'));
});
