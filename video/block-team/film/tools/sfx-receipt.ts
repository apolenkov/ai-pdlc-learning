// Квитанция дака (TASK-588): доказательство, что музыка садится под КАЖДОЕ слово озвучки, а не под выбранные.
// Пишет её замерщик (duck.py по стемам одного прогона микса), проверяет sfx-gate.ts. Пустая или чужая
// квитанция — не доказательство: она обязана быть связана с текущим MP4 и стемами и покрывать все слова alignment.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export interface FileRef {
  path: string;
  sha256: string;
}
export interface DuckWord {
  word: string;
  db: number;
}
export interface SkippedWord {
  word: string;
  t0: number;
  t1: number;
  reason: string;
}
export interface DuckReceipt {
  mp4: FileRef;
  stems: Record<'voice' | 'sfx' | 'music' | 'music-ducked', FileRef>;
  alignment: FileRef[];
  alignmentWords: number;
  perWord: DuckWord[];
  skipped: SkippedWord[];
  min: number;
  median: number;
  max: number;
  words: number;
}

/** Пропуск без музыки под словом (тишина шины) не требует дака; любое иное слово без замера — дыра в доказательстве. */
export const MUSIC_SILENT = 'music-silent';
const STEM_KEYS = ['voice', 'sfx', 'music', 'music-ducked'] as const;

export const sha256File = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

/** Число токенов alignment: подряд идущие непробельные символы, как их считает замерщик. */
export const countTokens = (al: { characters: string[] }): number => {
  let n = 0;
  let inWord = false;
  for (const ch of al.characters) {
    const space = ch.trim() === '';
    if (!space && !inWord) n++;
    inWord = !space;
  }
  return n;
};

/** Пик WAV в дБFS (PCM 16/24/32 бит или float32), по всем каналам. */
export const wavPeakDb = (path: string): number => {
  const b = readFileSync(path);
  let fmt = 0;
  let bits = 0;
  for (let p = 12; p + 8 <= b.length;) {
    const id = b.toString('ascii', p, p + 4);
    const size = b.readUInt32LE(p + 4);
    const body = p + 8;
    if (id === 'fmt ') {
      fmt = b.readUInt16LE(body);
      bits = b.readUInt16LE(body + 14);
    } else if (id === 'data') {
      const bytes = bits / 8;
      const end = Math.min(body + size, b.length);
      let peak = 0;
      for (let i = body; i + bytes <= end; i += bytes) {
        const v =
          fmt === 3
            ? Math.abs(b.readFloatLE(i))
            : Math.abs(
                bits === 16
                  ? b.readInt16LE(i) / 32768
                  : bits === 24
                    ? b.readIntLE(i, 3) / 8388608
                    : b.readInt32LE(i) / 2147483648,
              );
        if (v > peak) peak = v;
      }
      return 20 * Math.log10(Math.max(peak, 1e-12));
    }
    p = body + size + (size % 2);
  }
  throw new Error(`${path}: нет блока data`);
};

const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const median = (v: number[]): number => {
  const s = [...v].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};

/** Проверка квитанции против файла ролика. Пустой список проблем — квитанция принята. */
export function verifyReceipt(raw: unknown, mp4: string): { problems: string[]; r?: DuckReceipt } {
  const r = raw as Partial<DuckReceipt> | null;
  const bad: string[] = [];
  if (!r || typeof r !== 'object') return { problems: ['квитанция не объект'] };

  if (!Array.isArray(r.perWord) || r.perWord.length === 0) bad.push('нет замеров по словам');
  const per = Array.isArray(r.perWord) ? r.perWord : [];
  const skipped = Array.isArray(r.skipped) ? r.skipped : [];
  if (!Array.isArray(r.skipped)) bad.push('нет списка пропусков (допустим пустой)');
  if (per.some((w) => !fin(w?.db))) bad.push('в замерах не конечные числа');
  if (![r.min, r.median, r.max].every(fin)) bad.push('min/median/max не конечные числа');
  if (r.words !== per.length) bad.push(`words=${r.words} ≠ замеров ${per.length}`);
  if (per.length && !bad.length) {
    const v = per.map((w) => w.db);
    const same = (a: number, b: number) => Math.abs(a - b) <= 0.011;
    if (
      !same(r.min!, Math.min(...v)) ||
      !same(r.max!, Math.max(...v)) ||
      !same(r.median!, median(v))
    )
      bad.push('min/median/max не совпадают с замерами по словам');
  }
  for (const s of skipped) {
    if (typeof s?.word !== 'string' || !fin(s.t0) || !fin(s.t1) || !s.reason)
      bad.push('пропуск без слова, времени или причины');
    else if (/[\p{L}\p{N}]/u.test(s.word) && s.reason !== MUSIC_SILENT)
      bad.push(`слово «${s.word}» не измерено (${s.reason})`);
  }
  if (!fin(r.alignmentWords) || r.alignmentWords <= 0) bad.push('нет числа слов alignment');
  else if (per.length + skipped.length !== r.alignmentWords)
    bad.push(
      `замеров ${per.length} + пропусков ${skipped.length} ≠ слов alignment ${r.alignmentWords}`,
    );

  // alignment: файлы на месте, хеши те же, токенов столько, сколько заявлено
  const al = Array.isArray(r.alignment) ? r.alignment : [];
  if (!al.length) bad.push('не указаны файлы alignment');
  let tokens = 0;
  for (const f of al) {
    try {
      if (sha256File(f.path) !== f.sha256) bad.push(`alignment ${f.path}: хеш не совпал`);
      tokens += countTokens(JSON.parse(readFileSync(f.path, 'utf8')));
    } catch {
      bad.push(`alignment ${f?.path}: не читается`);
    }
  }
  if (al.length && tokens !== r.alignmentWords)
    bad.push(`в файлах alignment ${tokens} слов, в квитанции ${r.alignmentWords}`);

  // связь с текущим роликом и стемами
  const same = (ref: FileRef | undefined, label: string) => {
    try {
      if (!ref || sha256File(ref.path) !== ref.sha256) bad.push(`${label}: хеш не совпал с файлом`);
    } catch {
      bad.push(`${label}: файл не читается`);
    }
  };
  if (!r.mp4) bad.push('квитанция не привязана к MP4');
  else {
    if (r.mp4.sha256 !== sha256File(mp4)) bad.push('квитанция снята с другого MP4');
  }
  for (const k of STEM_KEYS) same(r.stems?.[k], `стем ${k}`);

  return { problems: bad, r: r as DuckReceipt };
}
