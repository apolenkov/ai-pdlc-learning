// Раскладка звуковых событий ролика (TASK-588): чистая функция без ввода-вывода, чтобы её проверять тестом.
export interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
}
/** Явное событие: время и панораму задаёт автор микса (v3.3+, ролик с музыкой). */
export interface SfxEventConfig {
  kind: SfxKind;
  t: number;
  pan?: number;
  /** чем вызвано событие — попадает в таблицу доказательств микса */
  note?: string;
  phraseStart?: number;
}
export interface SfxConfig {
  /** [номер сцены, фраза из озвучки сцены] — подсветка, на которой звучит тик */
  hover?: [number, string][];
  /** секунды: выход из постера и т. п.; хвост (конец − 2,3 с) добавляется сам */
  sub?: number[];
  /** Явный список событий. Если задан — выводные правила (swipe на смене, hover, sub) не применяются. */
  events?: SfxEventConfig[];
}
/** scenes.json contains overlays that run over the following scene and add no timeline time. */
export interface SceneEntry {
  n?: number | string;
  duration: number;
  overlay?: boolean;
}
export interface SfxFileConfig {
  hover?: [number | string, string][];
  sub?: number[];
  events?: SfxEventConfig[];
}
export type SfxKind = 'swipe' | 'hover' | 'subdrop' | 'pop' | 'click' | 'keys';
export interface SfxEvent {
  kind: SfxKind;
  t: number;
  pan: number;
  /** для hover: начало фразы в озвучке, от него гейт меряет отступ */
  phraseStart?: number;
  /** чем вызвано событие (только у явных событий) */
  note?: string;
}

export const HOVER_DELAY = 0.2; // тик не на первых слогах: фраза уже началась
export const TAIL_BEFORE_END = 2.3; // subdrop на хвосте закрывает «мёртвый воздух»
export const SWIPE_LEAD = 0.18;

export function phraseStart(align: Alignment, phrase: string): number | null {
  const i = align.characters.join('').toLowerCase().indexOf(phrase.toLowerCase());
  return i < 0 ? null : (align.character_start_times_seconds[i] ?? null);
}

export function timelineScenes(scenes: SceneEntry[]): SceneEntry[] {
  return scenes.filter((scene) => !scene.overlay);
}

/** Resolve human scene ids after removing overlays; explicit events already use absolute time. */
export function hoverByScene(scenes: SceneEntry[], cfg: SfxFileConfig): SfxConfig {
  const timed = timelineScenes(scenes);
  return {
    ...(cfg.sub ? { sub: cfg.sub } : {}),
    ...(cfg.events ? { events: cfg.events } : {}),
    hover: (cfg.hover ?? []).map(([scene, phrase]) => {
      const index = timed.findIndex((entry) => String(entry.n) === String(scene));
      if (index < 0) throw new Error(`sfx: в scenes.json нет сцены «${scene}»`);
      return [index + 1, phrase];
    }),
  };
}

export function planEvents(
  sceneDurations: number[],
  aligns: Alignment[],
  cfg: SfxConfig,
): SfxEvent[] {
  if (cfg.events) {
    return cfg.events
      .map((e) => ({
        kind: e.kind,
        t: e.t,
        pan: e.pan ?? 0,
        ...(e.note !== undefined ? { note: e.note } : {}),
        ...(e.phraseStart !== undefined ? { phraseStart: e.phraseStart } : {}),
      }))
      .sort((a, b) => a.t - b.t);
  }
  const starts = sceneDurations.reduce<number[]>((a, d) => (a.push(a[a.length - 1]! + d), a), [0]);
  const total = starts[starts.length - 1]!;
  const ev: SfxEvent[] = [];
  for (const t of [...(cfg.sub ?? []), total - TAIL_BEFORE_END])
    ev.push({ kind: 'subdrop', t, pan: 0 });
  for (let k = 1; k < sceneDurations.length; k++)
    ev.push({ kind: 'swipe', t: starts[k]! - SWIPE_LEAD, pan: k % 2 ? -0.5 : 0.5 });
  let last = -1;
  (cfg.hover ?? []).forEach(([scene, phrase], j) => {
    const p = phraseStart(aligns[scene - 1]!, phrase);
    if (p === null) throw new Error(`sfx: в озвучке сцены ${scene} нет фразы «${phrase}»`);
    const abs = starts[scene - 1]! + p;
    if (Math.abs(abs - last) < 0.3) return; // две подсветки на одно слово — один тик
    last = abs;
    ev.push({ kind: 'hover', t: abs + HOVER_DELAY, pan: j % 2 ? 0.35 : -0.35, phraseStart: abs });
  });
  return ev.sort((a, b) => a.t - b.t);
}
