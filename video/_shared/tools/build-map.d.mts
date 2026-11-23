import type { CourseNames } from '../../../scripts/course-map.ts';

type MapStop = {
  id: string;
  num: string;
  code: string;
  title: string;
  label: string;
  group: string;
};

export const GOALS: Record<string, [string, string]>;
export function stops(names?: CourseNames, route?: { id: string; number: string; title: string; group: string; branchOf: string | null }[]): {
  steps: MapStop[];
  branches: (MapStop & { parent: string })[];
  extras: (MapStop & { parent: string; extra: boolean })[];
  groups: Record<string, string>;
};
