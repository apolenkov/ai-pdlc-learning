import assert from 'node:assert/strict';
import { prose } from './learner-guide-contract-common.ts';
import type { LearnerGuides } from './learner-guide-types.ts';

/** The intro block owns the transition after step 2 and leads to Store. */
export const assertIntroBlock = (guides: LearnerGuides): void => {
  /* Route after TASK-494: Preparation → steps 1–5; step 3 is mandatory, so no stage carries an optional branch. */
  const intro = guides.sdd;
  const fourthText = prose(guides['3-star']);
  assert.equal(guides['2'].next, '3', '2: the primary transition after step 2 leads to step 3');
  assert.equal(intro.next, 'metarepo', 'sdd: preparation continues with the metarepository guide');
  const introText = prose(intro);
  for (const artifact of ['proposal', 'specs', 'design', 'tasks']) {
    assert.match(
      introText,
      new RegExp(`\\b${artifact}\\b`, 'u'),
      `sdd: the ${artifact} artifact must be named`,
    );
  }
  assert.match(
    introText,
    /текущи\p{L}* требовани\p{L}*/u,
    'sdd: current requirements must be distinguished from the proposed Change',
  );
  assert.match(introText, /validate/u, 'sdd: the validate boundary must be named');
  assert.match(
    introText,
    /стандарт\p{L}* анализа/u,
    'sdd: the analysis standard must be explained',
  );
  assert.match(introText, /0\.1\.0-draft/u, 'sdd: the standard version is named');
  assert.match(
    introText,
    /Перед этим: подготовка «Markdown, Git, GitLab»/u,
    'sdd: the hero names the guide before it',
  );
  assert.doesNotMatch(
    introText,
    /limit-credit-term|credit-term-change|6 до 360/u,
    'sdd: the term exercise lives nowhere in the preparation',
  );
  assert.doesNotMatch(
    JSON.stringify(intro.steps.map((step) => step.actions)),
    /openspec (?:init|new|instructions|validate)|git (?:add|commit|clone)/u,
    'sdd: the preparation guide needs neither Git nor the OpenSpec CLI',
  );
  assert.match(
    fourthText,
    /(?:собственн\p{L}*|ваш) принят\p{L}* результат шага 3/u,
    '3-star: step 5 must name the learner-owned step 3 entry',
  );
  assert.match(
    fourthText,
    /выданный организатором проверенный учебный комплект/u,
    '3-star: step 5 must name the organizer-verified kit entry',
  );
};
