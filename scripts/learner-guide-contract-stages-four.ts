import { prose } from './learner-guide-contract-common.ts';
import type { LearnerGuides } from './learner-guide-types.ts';
import { assertStageFourEntry } from './learner-guide-contract-stages-four-entry.ts';
import { assertStageFourSetup } from './learner-guide-contract-stages-four-setup.ts';
import { assertStageFourPlanning } from './learner-guide-contract-stages-four-planning.ts';

/** step 5: fork entry, project setup, Store, Changes, planning MR. */
export const assertStageFour = (guides: LearnerGuides): void => {
  const fourth = guides['3-star'];
  const fourthText = prose(fourth);
  const fourthEntryActions = assertStageFourEntry(fourth);
  assertStageFourSetup(fourth);
  assertStageFourPlanning(guides, fourth, fourthText, fourthEntryActions);
};
