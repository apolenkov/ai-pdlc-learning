import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

import { steps as mapSteps } from './stage-3-star-preparation-step-map.ts';
import { steps as forkSteps } from './stage-3-star-preparation-step-fork.ts';
import { steps as environmentSteps } from './stage-3-star-preparation-step-environment.ts';
import { steps as branchSteps } from './stage-3-star-preparation-step-branch.ts';

export const steps: LearnerStep[] = [
  ...mapSteps,
  ...forkSteps,
  ...environmentSteps,
  ...branchSteps,
];
