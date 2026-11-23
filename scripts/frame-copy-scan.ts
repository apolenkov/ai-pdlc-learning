import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * Сканер кадровых текстов роликов для стража терминологии (reviewer P7-R2, п.2):
 *  1) одиночное «менеджер» в строковых литералах `video/<ролик>/film/compositions/*.html`
 *     и в `film/briefs/*.md` — роль без имени человека запрещена (исключения ниже);
 *  2) «отметки» в смысле одобрения в VTT и в строковых литералах композиций — запрещены;
 *     разрешены только галочки задач («отметки задач», «отметка без доказательства» и т.п.).
 * Гейт перенесён из integration-скрипта в репозиторий, чтобы проверка жила с кодом.
 */

const root = resolve(import.meta.dirname, '..');
const videoRoot = resolve(root, 'video');

export type FrameProblem = Readonly<{ file: string; line: number; message: string }>;

/** 1-based номер строки по смещению в тексте. */
const lineAt = (text: string, index: number): number => text.slice(0, index).split('\n').length;

/** Строковые литералы HTML-композиции без комментариев: «что видно в кадре». */
export const compositionLiterals = (html: string): readonly { text: string; line: number }[] => {
  const out: { text: string; line: number }[] = [];
  let i = 0;
  while (i < html.length) {
    const rest = html.slice(i);
    if (rest.startsWith('//')) {
      const nl = html.indexOf('\n', i);
      i = nl === -1 ? html.length : nl + 1;
      continue;
    }
    if (rest.startsWith('/*')) {
      const end = html.indexOf('*/', i + 2);
      i = end === -1 ? html.length : end + 2;
      continue;
    }
    const quote = html[i]!;
    if (quote !== '"' && quote !== "'" && quote !== '`') {
      i += 1;
      continue;
    }
    let j = i + 1;
    let buf = '';
    while (j < html.length && html[j] !== quote) {
      if (html[j] === '\\') {
        buf += html[j + 1] ?? '';
        j += 2;
        continue;
      }
      buf += html[j];
      j += 1;
    }
    out.push({ text: buf, line: lineAt(html, i) });
    i = j + 1;
  }
  return out;
};

/** Каталоги всех роликов с кадрами (включая landing-*): video/<каталог>/film. */
const filmDirs = async (): Promise<string[]> =>
  (await readdir(videoRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && existsSync(join(videoRoot, entry.name, 'film')))
    .map((entry) => entry.name)
    .sort();

/** Исключения одиночного «менеджер»: роль enabling-team, «пакетный менеджер», имя человека рядом. */
const managerExceptions: readonly RegExp[] = [
  /Менеджер внедрения/iu,
  /пакетн[а-яё]*\s+менеджер/iu,
  /[А-ЯЁ][а-яё]{2,}(?:\s+[А-ЯЁ][а-яё]{2,})?\s*[—-]\s*менеджер/iu,
  /[А-ЯЁ][а-яё]{2,}(?:ой|ов|ев|ин|ын|ине|ину)\s*,?\s*менеджер/iu,
];

/** Одиночное «менеджер» — нарушение, если это роль без имени человека. */
export const singleManagerProblems = (file: string, text: string): FrameProblem[] => {
  const problems: FrameProblem[] = [];
  for (const match of text.matchAll(/менеджер[а-яё]*/giu)) {
    const from = Math.max(0, (match.index ?? 0) - 80);
    const window = text.slice(from, (match.index ?? 0) + 100).replaceAll(/\s+/gu, ' ');
    if (managerExceptions.some((re) => re.test(window))) continue;
    problems.push({
      file,
      line: lineAt(text, match.index ?? 0),
      message: `роль «${match[0]}» без имени человека: «${window.trim()}»`,
    });
  }
  return problems;
};

/** Галочки задач — единственное, что разрешено со словом «отмет». */
const markingExceptions: readonly RegExp[] = [
  /Задачу отмечают только после проверки/iu,
  /Задачи[^]{0,160}отметила модель/iu,
  /отметки задач/iu,
  /отметка без доказательства/iu,
  /отметка не ставится/iu,
];

/** «Отметки» в смысле одобрения — нарушение; разрешены только галочки задач. */
export const markingProblems = (file: string, video: string, text: string): FrameProblem[] => {
  const problems: FrameProblem[] = [];
  for (const match of text.matchAll(/отмет|отмеч/giu)) {
    const from = Math.max(0, (match.index ?? 0) - 80);
    const window = text.slice(from, (match.index ?? 0) + 100).replaceAll(/\s+/gu, ' ');
    if (markingExceptions.some((re) => re.test(window))) continue;
    if (video === 'block-delivery' && /отмечают/iu.test(window)) continue;
    problems.push({
      file,
      line: lineAt(text, match.index ?? 0),
      message: `«${match[0]}» в смысле одобрения: «${window.trim()}»`,
    });
  }
  return problems;
};

/** Кадры и брифы всех роликов: «менеджер» допустим только при имени человека. */
export const frameManagerProblems = async (): Promise<FrameProblem[]> => {
  const problems: FrameProblem[] = [];
  for (const dir of await filmDirs()) {
    const compDir = join(videoRoot, dir, 'film', 'compositions');
    if (existsSync(compDir)) {
      for (const name of (await readdir(compDir)).filter((f) => f.endsWith('.html')).sort()) {
        const html = await readFile(join(compDir, name), 'utf8');
        for (const literal of compositionLiterals(html))
          problems.push(
            ...singleManagerProblems(`video/${dir}/film/compositions/${name}`, literal.text),
          );
      }
    }
    const briefsDir = join(videoRoot, dir, 'film', 'briefs');
    if (existsSync(briefsDir)) {
      for (const name of (await readdir(briefsDir)).filter((f) => f.endsWith('.md')).sort()) {
        const md = await readFile(join(briefsDir, name), 'utf8');
        problems.push(...singleManagerProblems(`video/${dir}/film/briefs/${name}`, md));
      }
    }
  }
  return problems;
};

/** VTT и строковые литералы кадров: «отметки» в смысле одобрения запрещены. */
export const frameMarkingProblems = async (): Promise<FrameProblem[]> => {
  const problems: FrameProblem[] = [];
  for (const dir of await filmDirs()) {
    const filmDir = join(videoRoot, dir);
    for (const name of (await readdir(filmDir)).filter((f) => f.endsWith('.vtt')).sort()) {
      const vtt = await readFile(join(filmDir, name), 'utf8');
      problems.push(...markingProblems(`video/${dir}/${name}`, dir, vtt));
    }
    const compDir = join(filmDir, 'film', 'compositions');
    if (!existsSync(compDir)) continue;
    for (const name of (await readdir(compDir)).filter((f) => f.endsWith('.html')).sort()) {
      const html = await readFile(join(compDir, name), 'utf8');
      for (const literal of compositionLiterals(html))
        problems.push(
          ...markingProblems(`video/${dir}/film/compositions/${name}`, dir, literal.text),
        );
    }
  }
  return problems;
};
