import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

import { steps as folderSteps } from './stage-3-change-step-folder.ts';
import { steps as requirementsSteps } from './stage-3-change-step-requirements.ts';
import { steps as transferSteps } from './stage-3-change-step-transfer.ts';

export const steps: LearnerStep[] = [...folderSteps, ...requirementsSteps, ...transferSteps];
