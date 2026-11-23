// Self-check marks live only in the reader's browser; nothing leaves the machine. Any storage failure reads as "no marks".

export const PROGRESS_KEY = 'customdev-course:v1';
type Checked = Record<string, number[]>;
export type Progress = { checked: Checked; totals: Record<string, number> };

const isChecked = (value: unknown): value is Checked =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value).every(
    (marks) => Array.isArray(marks) && marks.every((index) => Number.isInteger(index)),
  );
const isTotals = (value: unknown): value is Record<string, number> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value).every((total) => Number.isInteger(total));

/** Marks per stage plus each stage's item count, so other pages can tell a finished stage without its content. */
export const readProgress = (store: Pick<Storage, 'getItem'> | null): Progress => {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(PROGRESS_KEY) ?? '{}');
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('checked' in parsed) ||
      !isChecked(parsed.checked)
    )
      return { checked: {}, totals: {} };
    const totals = 'totals' in parsed && isTotals(parsed.totals) ? parsed.totals : {};
    return { checked: parsed.checked, totals };
  } catch {
    return { checked: {}, totals: {} };
  }
};

export const writeChecked = (
  store: (Pick<Storage, 'setItem'> & Partial<Pick<Storage, 'getItem'>>) | null,
  stageId: string,
  indexes: number[],
  total: number,
): void => {
  try {
    const { checked, totals } = store?.getItem
      ? readProgress({ getItem: store.getItem.bind(store) })
      : { checked: {}, totals: {} };
    store?.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        checked: { ...checked, [stageId]: indexes },
        totals: { ...totals, [stageId]: total },
      }),
    );
  } catch {
    // shortcut: a full or blocked storage just forgets the mark; the page keeps working.
  }
};

export const doneStages = ({ checked, totals }: Progress): Set<string> =>
  new Set(
    Object.entries(totals)
      .filter(([id, total]) => total > 0 && new Set(inRange(checked[id], total)).size >= total)
      .map(([id]) => id),
  );

/** Marks that still name an item: a self-check that lost items keeps no stale indexes. */
export const inRange = (marks: number[] | undefined, total: number): number[] =>
  (marks ?? []).filter((index) => index >= 0 && index < total);

export const hasMarks = ({ checked }: Progress): boolean =>
  Object.values(checked).some((marks) => marks.length > 0);

export const resetChecked = (store: Pick<Storage, 'removeItem'> | null): void => {
  try {
    store?.removeItem(PROGRESS_KEY);
  } catch {
    // nothing stored, nothing to reset
  }
};

export const safeStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};
