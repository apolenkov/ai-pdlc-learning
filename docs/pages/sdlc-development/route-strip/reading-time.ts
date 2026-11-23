// Reading time per guide (TASK-557): counted only while the tab is visible, kept only in this browser, never sent.
import { safeStorage } from './progress.ts';
import { STEPS } from './strip.ts';

export const READING_KEY = 'customdev-course-time:v1';
export type Times = Record<string, number>;
export type Store = Pick<Storage, 'getItem' | 'setItem'> | null;

export const readTimes = (store: Pick<Storage, 'getItem'> | null): Times => {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(READING_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] => Number.isFinite(entry[1]) && entry[1] >= 0,
      ),
    );
  } catch {
    return {};
  }
};

export const addSeconds = (store: Store, stageId: string, seconds: number): Times => {
  const times = readTimes(store);
  if (seconds <= 0) return times;
  const next = { ...times, [stageId]: (times[stageId] ?? 0) + seconds };
  try {
    store?.setItem(READING_KEY, JSON.stringify(next));
  } catch {
    // shortcut: a full or blocked storage just forgets the time; the page keeps working.
  }
  return next;
};

/** Rounded, not ceiled like film minutes: a quarter-minute visit reads as «меньше минуты», not «≈ 1 мин». */
export const spent = (seconds: number): string =>
  seconds < 60 ? 'меньше минуты' : `≈\u00a0${Math.round(seconds / 60)}\u00a0мин`;

/** Only stages of the route count towards the total, so a renamed or removed step leaves no stale minutes. */
export const renderReading = (times: Times, stageId: string): string => {
  const here = times[stageId] ?? 0;
  const route = STEPS.reduce((sum, step) => sum + (times[step.id] ?? 0), 0);
  return `На этом шаге вы провели ${spent(here)}, на всём маршруте — ${spent(route)}. Время хранится только в этом браузере и никуда не отправляется; считается, пока вкладка на экране.`;
};

// shortcut: a visible tab counts even if the reader stepped away; a gap between ticks (sleep, frozen tab) counts at most two ticks.
const TICK_MS = 15_000;

export const trackReading = (doc: Document, stageId: string): void => {
  const section = doc.getElementById('lesson-check')?.closest('section');
  if (!section || !STEPS.some((step) => step.id === stageId)) return;
  const note = doc.createElement('p');
  note.className = 'reading-time';
  // Under the self-check list, above the collapsed handoff, so opening it does not push the note away.
  section.insertBefore(note, section.querySelector(':scope > #implementation'));
  countReading(doc, stageId, note);
};

/** The counting half of trackReading, kept apart from the DOM so a test can drive it with a fake page and clock. */
export const countReading = (
  page: Pick<Document, 'visibilityState' | 'addEventListener'> & {
    defaultView: Pick<Window, 'addEventListener'> | null;
  },
  stageId: string,
  note: { textContent: string | null },
  now: () => number = Date.now,
  store: Store = safeStorage(),
): void => {
  let since = page.visibilityState === 'visible' ? now() : 0;
  const flush = (): void => {
    if (since) {
      const at = now();
      const seconds = Math.min(at - since, TICK_MS * 2) / 1000;
      since = at;
      note.textContent = renderReading(addSeconds(store, stageId, seconds), stageId);
    } else note.textContent = renderReading(readTimes(store), stageId);
  };
  page.addEventListener('visibilitychange', () => {
    flush();
    since = page.visibilityState === 'visible' ? now() : 0;
  });
  page.defaultView?.addEventListener('pagehide', flush);
  setInterval(flush, TICK_MS);
  flush();
};
