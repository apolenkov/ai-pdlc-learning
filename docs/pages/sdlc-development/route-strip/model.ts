// Course route for the sticky strip: steps in reading order, their state and film minutes. Pure data, no DOM.

export type Group = 'prep' | 'practice' | 'after';
/** Second course of the registry; entries without it are shared preparation or the analysis course. */
export type CourseId = 'analysis' | 'intent';
export type RouteStep = {
  id: string;
  code: string;
  number: string;
  group: Group;
  title: string;
  href: string;
  seconds: number | null;
  branchOf: string | null;
  course?: string;
};
export type StepState = 'passed' | 'current' | 'ahead';
type Names = {
  route: { id: string; code: string; number: string; group: string; course?: string }[];
  branches: { id: string; of: string; code: string; number: string; branchOf: string }[];
  guides: Record<string, { short: string; file: string }>;
};

/** Steps of one course view: preparation is shared, other steps keep their own course. */
export const inCourse = (entry: { group: string; course?: string }, courseId: CourseId): boolean =>
  entry.course === 'intent'
    ? courseId === 'intent'
    : entry.group === 'prep' || courseId === 'analysis';

export const GROUP_WORDS: Record<Group, string> = {
  prep: 'Подготовка',
  practice: 'Практика',
  after: 'Разработка',
};
export { routeLabel, stepRefLabel } from '../guides/renderer/common.ts';

export const routeTotal = (steps: RouteStep[]): number =>
  Math.max(
    0,
    ...steps.filter((step) => step.number).map((step) => Number.parseInt(step.number, 10)),
  );

export const asGroup = (group: string): Group => {
  if (group === 'prep' || group === 'practice' || group === 'after') return group;
  throw new Error(`Unknown route group: ${group}`);
};

export const buildRoute = (
  names: Names,
  durations: Record<string, number | null>,
  courseId: CourseId = 'analysis',
): RouteStep[] => {
  const step = (
    id: string,
    code: string,
    number: string,
    group: Group,
    branchOf: string | null,
    course?: string,
  ): RouteStep => ({
    id,
    code,
    number,
    group,
    title: names.guides[id]!.short,
    href: names.guides[id]!.file,
    seconds: durations[id] ?? null,
    branchOf,
    ...(course ? { course } : {}),
  });
  return names.route
    .filter((entry) => inCourse(entry, courseId))
    .flatMap((entry) => [
      step(entry.id, entry.code, entry.number, asGroup(entry.group), null, entry.course),
      ...names.branches
        .filter((branch) => branch.of === entry.id)
        .map((branch) =>
          step(branch.id, branch.code, branch.number, asGroup(entry.group), branch.branchOf),
        ),
    ]);
};

/** Passed = every step before the current one in reading order (a sibling branch is not "before") + steps with all self-checks marked. */
export const routeState = (
  steps: RouteStep[],
  currentId: string | null,
  done: ReadonlySet<string>,
) => {
  const current = steps.find((step) => step.id === currentId);
  const index = current ? steps.indexOf(current) : -1;
  const states: Record<string, StepState> = {};
  let passedSeconds = 0;
  let leftSeconds = 0;
  steps.forEach((step, at) => {
    const sibling = current?.branchOf != null && step.branchOf === current.branchOf;
    const before = at < index && !(sibling && step !== current);
    const state: StepState =
      step === current ? 'current' : before || done.has(step.id) ? 'passed' : 'ahead';
    states[step.id] = state;
    // A branch passed only by position may be one the reader skipped: its minutes count nowhere.
    if (state === 'passed' && step.branchOf && !done.has(step.id)) return;
    if (state === 'passed') passedSeconds += step.seconds ?? 0;
    else leftSeconds += step.seconds ?? 0;
  });
  return { states, done, group: current?.group ?? null, passedSeconds, leftSeconds };
};

export const minutes = (seconds: number): string => `≈ ${Math.ceil(seconds / 60)} мин`;
