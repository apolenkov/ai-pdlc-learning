import type { LearnerGuides } from '../../../../scripts/learner-guide-types.ts';
import { stage as stage0 } from './content/stage-0.ts';
import { stage as stage1 } from './content/stage-1.ts';
import { stage as stage2 } from './content/stage-2.ts';
import { stage as stage3 } from './content/stage-3.ts';
import { stage as stagedelivery } from './content/stage-delivery.ts';
import { stage as stage4_new } from './content/stage-4-new.ts';
import { stage as stage4_legacy } from './content/stage-4-legacy.ts';
import { stage as stagesdd } from './content/stage-sdd.ts';
import { stage as stage4_team } from './content/stage-4-team.ts';
import { stage as stage3_star } from './content/stage-3-star.ts';
import { stage as stage0a } from './content/stage-0a.ts';
import { stage as stageI1 } from './content/stage-i1.ts';
import { stage as stageI2 } from './content/stage-i2.ts';
import { stage as stageI3 } from './content/stage-i3.ts';
import { stage as stageI4 } from './content/stage-i4.ts';
import { prerequisites } from './content/prerequisites.ts';
import { accessPreparation } from './content/access-preparation.ts';
import { guideReferences } from './content/references.ts';

const stages: LearnerGuides = {
  '0': stage0,
  '1': stage1,
  '2': stage2,
  '3': stage3,
  delivery: stagedelivery,
  '4-new': stage4_new,
  '4-legacy': stage4_legacy,
  sdd: stagesdd,
  '4-team': stage4_team,
  '3-star': stage3_star,
  '0a': stage0a,
  i1: stageI1,
  i2: stageI2,
  i3: stageI3,
  i4: stageI4,
};

Object.assign(globalThis, {
  guideContent: { stages, prerequisites, accessPreparation, guideReferences },
});
