import assert from 'node:assert/strict';
import type { LearnerStep } from './learner-guide-types.ts';

/** VS Code 1.141.0: the palette command is "Git: Clone"; the Welcome link is "Clone Git Repository...". */
export const assertVsCodeCloneNames = (text: string, message: string): void => {
  assert.match(
    text,
    /<strong>Git: Clone<\/strong>/u,
    `${message}: palette name must be exactly "Git: Clone" as a whole element`,
  );
  assert.match(
    text,
    /<strong>Clone Git Repository\.\.\.<\/strong>/u,
    `${message}: Welcome link must be exactly "Clone Git Repository..." as a whole element`,
  );
};

export const prose = (value: unknown): string => JSON.stringify(value).replaceAll('\\n', '\n');
export const leafTexts = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(leafTexts);
  if (value && typeof value === 'object') return Object.values(value).flatMap(leafTexts);
  return [];
};
export const examples = (step: LearnerStep): string =>
  [step.example, ...(step.examples ?? [])].map((example) => example?.content ?? '').join('\n');
/** Visible explanations remain part of the same step's mandatory route. */
export const visibleStepText = (step: LearnerStep): string =>
  [step.why ?? '', ...step.actions, step.result].join('\n');
/** Secondary help lives in existing fields, outside the numbered actions. */
export const stepDisclosures = (step: LearnerStep): string[] =>
  [
    ...`${step.trouble}\n${step.advanced ?? ''}`.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/gu),
  ].map(([html]) => html);

export const collapsedAction = (action: string): boolean => {
  const opening = action.trimStart().match(/^<details\b[^>]*>/u)?.[0] ?? '';
  return opening.startsWith('<details') && !/\bopen\b/u.test(opening);
};
