import assert from 'node:assert/strict';
import { prose, leafTexts, examples } from './learner-guide-contract-common.ts';
import type { GuideId, LearnerGuides, LearnerStep } from './learner-guide-types.ts';

const ADVANCED_STEPS: Record<GuideId, readonly number[]> = {
  '0': [],
  '0a': [1, 6, 14],
  '1': [3, 5],
  '2': [2, 5, 8],
  '3': [2, 3, 4, 6, 7, 8, 9],
  '3-star': [2, 3, 4, 6, 7, 8, 9, 10],
  '4-legacy': [],
  '4-new': [],
  '4-team': [],
  delivery: [],
  sdd: [],
  i1: [],
  i2: [],
  i3: [],
  i4: [],
};

const isGuideId = (id: string): id is GuideId => Object.hasOwn(ADVANCED_STEPS, id);

const assertStepFields = (id: string, index: number, step: LearnerStep): void => {
  assert.ok(
    step.title && step.actions.length && step.result && step.trouble,
    `${id}: incomplete learner step`,
  );
  assert.ok(step.result.trim(), `${id} step ${index + 1}: missing observable result`);
  assert.ok(step.nextUse.href.trim(), `${id} step ${index + 1}: missing destination`);
  assert.ok(
    Object.hasOwn(step, 'advanced'),
    `${id} step ${index + 1}: every step must declare advanced`,
  );
  assert.equal(
    step.actions.filter((action) => /<details\b/u.test(action)).length,
    0,
    `${id} step ${index + 1}: terminal and OpenCode variants live in advanced, not in actions`,
  );
  if ((isGuideId(id) ? ADVANCED_STEPS[id] : []).includes(index + 1)) {
    assert.ok(
      typeof step.advanced === 'string' && step.advanced.trim().length > 0,
      `${id} step ${index + 1}: advanced must carry a meaningful same-outcome alternative`,
    );
  } else {
    assert.equal(step.advanced, null, `${id} step ${index + 1}: advanced must be an explicit null`);
  }
};

const assertStepMedia = (id: string, index: number, step: LearnerStep): void => {
  if (id === 'sdd' || id === '3') {
    assert.ok(
      step.figure,
      `${id} step ${index + 1}: every course step must explain its flow with a figure`,
    );
  }
  if (step.figure) {
    const html = step.figure.html;
    assert.doesNotMatch(html, /<script\b/iu, `${id}: figures must not contain scripts`);
    const svgs = [...html.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/giu)].map(([svg]) => svg);
    assert.ok(svgs.length, `${id}: figures must contain an SVG`);
    for (const svg of svgs) {
      const opening = svg.slice(0, svg.indexOf('>') + 1);
      assert.ok(
        (/<title\b[^>]*>[^<]+<\/title>/iu.test(svg) && /<desc\b[^>]*>[^<]+<\/desc>/iu.test(svg)) ||
          (/\brole=["']img["']/iu.test(opening) && /\baria-label=["'][^"']+["']/iu.test(opening)),
        `${id}: figure SVG needs title and desc or role=img with aria-label`,
      );
    }
  }
  if (step.mockup) {
    assert.equal(
      step.screenshots?.length ?? 0,
      0,
      `${id}: a fictional mockup must not shadow a real screenshot`,
    );
    assert.ok(
      step.mockup.title && step.mockup.caption,
      `${id}: a fictional mockup needs a title and caption`,
    );
    assert.doesNotMatch(
      prose(step.mockup),
      /\/Users\/[^/\s]+\//u,
      `${id}: a fictional mockup must not embed a personal home path`,
    );
  }
};

const assertStepInstructions = (
  id: string,
  guide: LearnerGuides[GuideId],
  step: LearnerStep,
): void => {
  for (const instruction of [
    ...step.actions,
    step.advanced ?? '',
    examples(step),
    step.model?.prompt ?? '',
    step.model?.does ?? '',
    ...(step.model?.check ?? []),
    ...guide.check,
  ]) {
    for (const command of instruction.matchAll(
      /(?:запусти(?:те)?|выполни(?:те)?|выполняй(?:те)?)\s+Apply\b/giu,
    )) {
      const prefix = instruction.slice(0, command.index).replace(/<[^>]*>/gu, '');
      assert.match(
        prefix,
        /(?:^|[^\p{L}\p{N}_])не\s+$/iu,
        `${id}: the course must stop before application Apply`,
      );
    }
    assert.doesNotMatch(
      instruction,
      /(?:^|\n)\s*\/openspec-apply-change(?:\s|$)/iu,
      `${id}: the course must stop before application Apply`,
    );
    assert.doesNotMatch(
      instruction,
      /(?:создай|создайте|поставь|поставьте)\s+(?:два\s+)?(?:approval|одобрения?)[\s\S]{0,60}от имени/iu,
      `${id}: AI must not fabricate human approval`,
    );
  }
};

/** Checks that hold for every guide: outcome, steps, advanced variants, forbidden wording. */
export const assertEveryGuide = (guides: LearnerGuides): void => {
  for (const [id, guide] of Object.entries(guides)) {
    assert.ok(guide.summary && guide.output && guide.check.length, `${id}: missing outcome`);
    assert.doesNotMatch(
      prose(guide),
      /\/Users\/[^/\s]+\//u,
      `${id}: public guides must not embed a personal home path`,
    );
    const anchors = new Set<string>();
    for (const [index, step] of guide.steps.entries()) {
      const anchor = step.anchor ?? `step-${String(index + 1).padStart(2, '0')}`;
      assert.match(anchor, /^[a-z][a-z0-9-]*$/u, `${id}: invalid step destination`);
      assert.ok(!anchors.has(anchor), `${id}: duplicate step destination ${anchor}`);
      anchors.add(anchor);
      assertStepFields(id, index, step);
      const next = guide.steps[index + 1];
      if (next)
        assert.equal(
          step.nextUse.href,
          '#' + (next.anchor ?? `step-${String(index + 2).padStart(2, '0')}`),
        );
      else assert.ok(step.nextUse.label?.trim(), `${id}: the last link names its destination`);
      assertStepMedia(id, index, step);
      assertStepInstructions(id, guide, step);
    }
    /* JSON serialization would glue sibling fields together without a period;
       joining leaf texts keeps the sentence boundary intact for this check. */
    assert.doesNotMatch(
      leafTexts(guide).join('.\n'),
      /(?:установите|установить|настройте|настроить|поставьте|подготовьте)[^.\n]{0,100}(?:Kilo|OpenCode)[^.\n]{0,60}и[^.\n]{0,40}(?:Kilo|OpenCode)|(?:оба|обе)\s+(?:агента|инструмента|маршрута)/iu,
      `${id}: a learner chooses one agent route; wording must not require installing or configuring both`,
    );
  }
};
