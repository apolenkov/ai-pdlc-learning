import { guideInfo } from '../docs/pages/sdlc-development/guides/renderer/common.ts';
import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import {
  buildRoute,
  routeLabel,
  stepRefLabel,
} from '../docs/pages/sdlc-development/route-strip/model.ts';

import { escapeHtml } from './site-navigation-contract.ts';

const names: unknown = courseNames;
if (
  !names ||
  typeof names !== 'object' ||
  !('teamName' in names) ||
  typeof names.teamName !== 'string' ||
  !names.teamName.trim()
) {
  throw new Error('course-names.json: teamName must be a nonempty string');
}
export const teamName: string = names.teamName;

if (
  !('courseTitle' in names) ||
  typeof names.courseTitle !== 'string' ||
  !names.courseTitle.trim()
) {
  throw new Error('course-names.json: courseTitle must be a nonempty string');
}
export const courseTitle: string = names.courseTitle;

const steps = buildRoute(courseNames, {});

export const resolveCourseNames = (html: string): string =>
  html
    .replaceAll('{{LIFECYCLE_NAME}}', () => escapeHtml(courseNames.lifecycleName))
    .replaceAll('{{TEAM_NAME}}', () => escapeHtml(teamName))
    .replaceAll('{{COURSE_TITLE}}', () => escapeHtml(courseTitle))
    .replace(
      /\{\{(STEP|SHORT_STEP|CARD_STEP|NUMBER|TITLE|HREF):([^}]+)\}\}/gu,
      (_, kind: string, id: string) => {
        const step = steps.find((entry) => entry.id === id);
        if (!step) throw new Error(`Unknown course step: ${id}`);
        const guide = guideInfo(id);
        if (kind === 'TITLE') return escapeHtml(guide.title);
        if (kind === 'HREF') return escapeHtml(guide.file);
        if (kind === 'NUMBER') return escapeHtml(step.number);
        if (kind === 'CARD_STEP') return escapeHtml(stepRefLabel(step).replace('\u00a0', ' '));
        return escapeHtml(kind === 'SHORT_STEP' ? stepRefLabel(step) : routeLabel(step));
      },
    );
