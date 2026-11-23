import type { Chapter } from './player-types.ts';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const hasTiming = (value: object): boolean =>
  'start' in value &&
  isFiniteNumber(value.start) &&
  'speechStart' in value &&
  isFiniteNumber(value.speechStart) &&
  'end' in value &&
  isFiniteNumber(value.end);

const isChapter = (value: unknown): value is Chapter => {
  if (!value || typeof value !== 'object' || !hasTiming(value)) return false;
  return (
    'n' in value &&
    isFiniteNumber(value.n) &&
    'title' in value &&
    typeof value.title === 'string' &&
    'step' in value &&
    (value.step === null || isFiniteNumber(value.step)) &&
    (!('pageStep' in value) ||
      value.pageStep === null ||
      value.pageStep === undefined ||
      isFiniteNumber(value.pageStep))
  );
};

export const readChapters = (text: string): Chapter[] | null => {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed) || !parsed.every(isChapter)) return null;
    const chapters = parsed.filter((chapter) => chapter.title !== 'Конечная заставка');
    return chapters.length ? chapters : null;
  } catch {
    return null;
  }
};
