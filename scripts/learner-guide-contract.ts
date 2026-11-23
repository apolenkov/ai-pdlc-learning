import assert from 'node:assert/strict';
import type { LearnerGuides } from './learner-guide-types.ts';
export type {
  GuideExample,
  LearnerScreenshot,
  LearnerMockupReviewer,
  LearnerMockup,
  LearnerStep,
  LearnerGuide,
  GuideId,
  LearnerGuides,
  ScreenshotMarker,
  GuideContent,
} from './learner-guide-types.ts';
export {
  assertVsCodeCloneNames,
  visibleStepText,
  stepDisclosures,
} from './learner-guide-contract-common.ts';
import { assertEveryGuide } from './learner-guide-contract-stages-shared.ts';
import { assertAgentRoutes, assertStepModels } from './learner-guide-contract-stages-agents.ts';
import { assertStageOne, assertNoManualSha } from './learner-guide-contract-stages-one.ts';
import { assertStageTwo } from './learner-guide-contract-stages-two.ts';
import { assertStageThree, assertMrSourceAndBase } from './learner-guide-contract-stages-three.ts';
import { assertStageFour } from './learner-guide-contract-stages-four.ts';
import { assertIntroBlock } from './learner-guide-contract-stages-intro.ts';

/** Instructional regression checks, not proof of a human or runtime walkthrough. */
export function assertLearnerGuideContract(guides: LearnerGuides): void {
  // Typography is presentation; semantic checks accept both regular and nonbreaking
  // prose spaces. Copied commands and documents keep their original bytes.
  const semanticCopy = (value: unknown, key = ''): unknown => {
    if (typeof value === 'string') {
      if (['advanced', 'prompt', 'content', 'src', 'href', 'source'].includes(key)) return value;
      return value
        .split(/(<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>)/giu)
        .map((part) =>
          /^<(?:pre|code)\b/iu.test(part) ? part : part.replace(/[\u00a0\u202f]/gu, ' '),
        )
        .join('');
    }
    if (Array.isArray(value)) return value.map((item) => semanticCopy(item, key));
    if (value && typeof value === 'object') {
      const entries: [string, unknown][] = Object.entries(value);
      for (const [name, item] of entries) {
        Reflect.set(value, name, semanticCopy(item, name));
      }
    }
    return value;
  };
  guides = structuredClone(guides);
  semanticCopy(guides);
  assert.deepEqual(
    Object.keys(guides).sort(),
    [
      '0',
      '0a',
      '1',
      '2',
      '3',
      '3-star',
      '4-legacy',
      '4-new',
      '4-team',
      'delivery',
      'sdd',
      'i1',
      'i2',
      'i3',
      'i4',
    ].sort(),
  );
  assertEveryGuide(guides);
  assertStepModels(guides);
  for (const id of ['1', '2'] as const) {
    for (const [index, step] of guides[id].steps.entries()) {
      if (id === '2' && index === 2) {
        assert.match(
          step.example?.label ?? '',
          /specification\.md целиком/u,
          'step 2 draft step must use the complete text as its instructional reference',
        );
        continue; // The complete draft is checked by assertStageTwo below.
      }
      assert.ok(
        step.figure,
        `${id} step ${index + 1}: every step must explain its purpose with a figure`,
      );
    }
  }
  for (const id of ['0', '0a'] as const) {
    assert.ok(
      guides[id].steps.some((step) => step.figure),
      `${id}: an introductory block needs a figure`,
    );
  }
  assert.equal(
    guides['0'].next,
    '0a',
    '0: block 0 leads to the Markdown and Git guide, then the SDD and OpenSpec guide, then step 1',
  );
  assert.equal(
    guides['0a'].next,
    'sdd',
    '0a: the Markdown and Git guide leads to the SDD and OpenSpec guide',
  );
  assertAgentRoutes(guides);
  assertStageOne(guides);
  assertStageTwo(guides);
  assertNoManualSha(guides);
  assertStageThree(guides);
  assertMrSourceAndBase(guides);
  assertStageFour(guides);
  assertIntroBlock(guides);
}
