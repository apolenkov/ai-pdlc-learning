import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import test from 'node:test';

import {
  frameManagerProblems,
  frameMarkingProblems,
  markingProblems,
  singleManagerProblems,
} from './frame-copy-scan.ts';
import { GUIDE_VIDEOS } from './guide-video.ts';

const root = resolve(import.meta.dirname, '..');
const contentDir = resolve(root, 'docs/pages/sdlc-development/guides/content');

/**
 * Дешёвый страж возврата старого имени роли (решение 590): «менеджер проекта» — это
 * должность человека примера, а не роль. В текстах, которые видит и слышит ученик,
 * роль называется «владелец продукта» (ROLES-TABLE.md, SWEEP-ROLE-0224.md).
 *
 * Страж смотрит два корпуса:
 *  1) видимые тексты гайдов (`docs/pages/sdlc-development/guides/content/*.ts`);
 *  2) то, что звучит и видно в активных роликах — те, что вставляются на страницы
 *     (`GUIDE_VIDEOS` в scripts/guide-video.ts): субтитры/VTT, реплики диктора
 *     (`## Текст диктора` в раскадровке — источник следующей озвучки) и README ролика.
 *
 * Белый список — только персоналия из учебного примера: имя человека + должность.
 * Запись держится не за «разрешить строку целиком», а за число совпадений на строке
 * и окружение с именем: если на строке появится ещё одна роль без имени или пропадёт
 * персоналия, страж это назовёт ошибкой (устаревшая запись — тоже ошибка).
 *
 * Неразрывный пробел приходит в трёх видах: настоящий U+00A0 в готовом тексте,
 * экранированный `\u00a0` в исходнике .ts и HTML-сущность `&nbsp;` в разметке —
 * до проверки все три сводятся к обычному пробелу, иначе «менеджер\u00a0проекта»
 * проходил бы мимо.
 */

const flatten = (text: string): string =>
  text
    .replaceAll(String.raw`\u00a0`, ' ')
    .replaceAll(String.raw`\n`, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('\u00a0', ' ')
    .replaceAll('\u202f', ' ');

/** Роль в любом падеже: «менеджер проекта», «менеджера проекта», «менеджеру проекта». */
const rolePattern = /менеджер[а-яё]*\s+проекта/giu;

type PersonalityException = Readonly<{
  /** Файл относительно каталога гайдов. */
  file: string;
  /** Номер строки в исходнике (1-based). */
  line: number;
  /** Сколько совпадений роли на строке объясняет персоналия (HTML-ответ и text-версия). */
  matches: number;
  /** Имя человека перед должностью: без него «белый список» снова стал бы разрешением роли. */
  person: RegExp;
  reason: string;
}>;

const personalityExceptions: readonly PersonalityException[] = [
  {
    file: 'stage-4-legacy-step-discrepancies-answer.ts',
    line: 2,
    matches: 1,
    person: /Образцовой,\s*$/u,
    reason:
      'персоналия: «Марине Образцовой, менеджеру проекта» — имя + должность в HTML-ответе на расхождения (вынесен из stage-4-legacy.ts)',
  },
  {
    file: 'stage-4-legacy-step-discrepancies-preview.ts',
    line: 2,
    matches: 1,
    person: /Образцовой,\s*$/u,
    reason:
      'персоналия: «Марине Образцовой, менеджеру проекта» — имя + должность в text-версии ответа на расхождения (вынесена из stage-4-legacy.ts)',
  },
];

type Problem = Readonly<{ file: string; line: number; message: string }>;

const format = ({ file, line, message }: Problem): string => `${file}:${line} — ${message}`;

/** Проверяет один текстовый источник: роль разрешена только в персоналиях белого списка. */
const sourceProblems = (
  file: string,
  source: string,
  exceptions: readonly PersonalityException[],
  note = 'замените роль «менеджер проекта» на «владелец продукта» по ROLES-TABLE.md',
): Problem[] => {
  const lines = flatten(source).split('\n');
  const problems: Problem[] = [];
  lines.forEach((text, index) => {
    const line = index + 1;
    for (const match of text.matchAll(rolePattern)) {
      const exception = exceptions.find((item) => item.file === file && item.line === line);
      if (exception) {
        // Белый список закрывает только должность при имени; роль без имени на той же строке остаётся нарушением.
        const before = text.slice(Math.max(0, (match.index ?? 0) - 40), match.index ?? 0);
        if (exception.person.test(before)) continue;
      }
      const from = Math.max(0, (match.index ?? 0) - 60);
      problems.push({ file, line, message: `${note}: «${text.slice(from, from + 160).trim()}»` });
    }
  });
  return problems;
};

/** Проверяет запись белого списка: строка на месте, число совпадений то же, у каждого — имя человека. */
const exceptionProblems = (
  file: string,
  source: string,
  exception: PersonalityException,
): Problem[] => {
  const lines = flatten(source).split('\n');
  const text = lines[exception.line - 1];
  if (text === undefined) {
    return [
      {
        file: exception.file,
        line: exception.line,
        message: `белый список указывает на строку ${exception.line}, которой нет — запись устарела (${exception.reason})`,
      },
    ];
  }
  const problems: Problem[] = [];
  const matches = [...text.matchAll(rolePattern)];
  if (matches.length !== exception.matches) {
    problems.push({
      file: exception.file,
      line: exception.line,
      message: `ожидается ${exception.matches} совпадения роли на строке (персоналия «имя + должность»), найдено ${matches.length} — белый список устарел или на строку вернулась роль без имени`,
    });
  }
  for (const match of matches) {
    const before = text.slice(Math.max(0, (match.index ?? 0) - 40), match.index ?? 0);
    if (!exception.person.test(before)) {
      problems.push({
        file: exception.file,
        line: exception.line,
        message: `«${before}${match[0]}» — белый список держится только на имени человека из примера (${exception.person})`,
      });
    }
  }
  return problems;
};

/** Раздел раскадровки с репликами диктора: голос следующей озвучки, а не снимок прежней страницы. */
const narratorText = (markdown: string): string => {
  const kept: string[] = [];
  let inNarrator = false;
  for (const line of markdown.split('\n')) {
    const heading = /^##\s+(.+)$/u.exec(line);
    if (heading) inNarrator = /диктор|озвучк/iu.test(heading[1]!);
    if (inNarrator) kept.push(line);
  }
  return kept.join('\n');
};

/** Каталоги активных роликов: файлы ролика лежат в video/<каталог>/, кроме block-0a (docs/…/assets/video). */
const activeFilmDirs = (): string[] => {
  const dirs = GUIDE_VIDEOS.map((spec) => {
    const fromManifest = /^video\/([^/]+)\/video-manifest\.json$/u.exec(spec.manifest);
    return fromManifest?.[1] ?? basename(spec.vtt, '.vtt');
  });
  return [...new Set(dirs)].sort();
};

await test('видимые тексты гайдов не называют роль «менеджер проекта»: только должность при имени человека (590)', async () => {
  const problems: Problem[] = [];
  const files = (await readdir(contentDir)).filter((file) => file.endsWith('.ts')).sort();
  for (const file of files) {
    const source = await readFile(join(contentDir, file), 'utf8');
    const exceptions = personalityExceptions.filter((item) => item.file === file);
    problems.push(...sourceProblems(file, source, exceptions));
    for (const exception of exceptions)
      problems.push(...exceptionProblems(file, source, exception));
  }
  for (const exception of personalityExceptions) {
    if (!files.includes(exception.file)) {
      problems.push({
        file: exception.file,
        line: exception.line,
        message: `файл белого списка не найден (${exception.reason}) — запись устарела`,
      });
    }
  }
  assert.deepEqual(
    problems.map(format).sort(),
    [],
    'оставить «менеджер проекта» можно только как должность при имени человека из белого списка; ' +
      'роль — «владелец продукта» (ROLES-TABLE.md, SWEEP-ROLE-0224.md)',
  );
});

await test('активные ролики не возвращают роль «менеджер проекта» в субтитры, реплики диктора и README (590)', async () => {
  const problems: Problem[] = [];
  for (const spec of GUIDE_VIDEOS) {
    if (!existsSync(resolve(root, spec.vtt))) continue;
    const source = await readFile(resolve(root, spec.vtt), 'utf8');
    problems.push(
      ...sourceProblems(
        spec.vtt,
        source,
        [],
        'в субтитрах и озвучке роль называется «владелец продукта»',
      ),
    );
  }
  for (const dir of activeFilmDirs()) {
    const storyboard = `video/${dir}/storyboard.md`;
    if (existsSync(resolve(root, storyboard))) {
      const speech = narratorText(await readFile(resolve(root, storyboard), 'utf8'));
      problems.push(
        ...sourceProblems(
          storyboard,
          speech,
          [],
          'в репликах диктора роль называется «владелец продукта»',
        ),
      );
    }
    const readme = `video/${dir}/README.md`;
    if (existsSync(resolve(root, readme))) {
      const source = await readFile(resolve(root, readme), 'utf8');
      problems.push(
        ...sourceProblems(
          readme,
          source,
          [],
          'в README ролика роль называется «владелец продукта»',
        ),
      );
    }
  }
  assert.deepEqual(
    problems.map(format).sort(),
    [],
    'активные ролики озвучиваются и показываются ученику: роль в них — «владелец продукта» (ROLES-TABLE.md)',
  );
});

await test('отрицательный контроль: страж ловит роль и не превращает белый список в разрешение (590)', () => {
  // Роль без имени на странице — нарушение, в любом падеже.
  for (const phrase of [
    'менеджер проекта',
    'менеджера проекта',
    'менеджеру проекта',
    'Менеджер проекта',
    'менеджер  проекта',
  ]) {
    const problems = sourceProblems(
      'stage-0.ts',
      `Владелец продукта решает. ${phrase} отвечает.`,
      [],
    );
    assert.equal(problems.length, 1, `страж должен поймать «${phrase}»`);
  }
  // Неразрывный пробел в трёх видах записи — та же роль, а не исключение.
  for (const phrase of [
    'менеджер\u00a0проекта',
    String.raw`менеджер\u00a0проекта`,
    'менеджер&nbsp;проекта',
  ]) {
    const problems = sourceProblems('stage-0.ts', `Роль: ${phrase}.`, []);
    assert.equal(problems.length, 1, `страж должен поймать «${phrase}»`);
  }
  // Персоналия с именем допускается ровно на объявленной строке и ровно в объявленном числе.
  const personalia = 'Ответ Марине Образцовой, менеджеру проекта — в требованиях.';
  const allowed = [
    { file: 'stage-x.ts', line: 1, matches: 1, person: /Образцовой,\s*$/u, reason: 'контроль' },
  ] as const;
  assert.deepEqual(sourceProblems('stage-x.ts', personalia, allowed), []);
  assert.deepEqual(exceptionProblems('stage-x.ts', personalia, allowed[0]), []);
  assert.equal(
    sourceProblems('stage-x.ts', personalia, []).length,
    1,
    'та же строка без записи белого списка — нарушение',
  );
  assert.equal(
    exceptionProblems('stage-x.ts', personalia, { ...allowed[0], matches: 2 }).length,
    1,
    'изменение числа совпадений на строке — устаревшая запись, а не тихое разрешение',
  );
  assert.equal(
    sourceProblems(
      'stage-x.ts',
      'Ответ Марине Образцовой, менеджеру проекта; менеджер проекта решает.',
      allowed,
    ).length,
    1,
    'вторая роль без имени на строке персоналии — нарушение',
  );
  assert.equal(
    exceptionProblems('stage-x.ts', 'Ответ Марине, менеджеру проекта.', allowed[0]).length,
    1,
    'должность без имени человека — не персоналия',
  );
  // Ролик: роль в репликах диктора и в субтитрах ловится, исторический раздел раскадровки — нет.
  const storyboard = [
    '## Цитаты со страницы (было)',
    '- «Менеджер проекта отвечает на вопросы.»',
    '## Текст диктора',
    '**1.** Ответственность несёт владелец продукта.',
  ].join('\n');
  assert.deepEqual(
    sourceProblems('video/x/storyboard.md', narratorText(storyboard), []),
    [],
    'цитаты прежней страницы в эфир не идут',
  );
  assert.equal(
    sourceProblems(
      'video/x/storyboard.md',
      narratorText(storyboard.replace('владелец продукта', 'менеджер проекта')),
      [],
    ).length,
    1,
    'реплика диктора с ролью — нарушение',
  );
  assert.equal(
    sourceProblems('video/x/block-x.vtt', 'Аналитик, менеджер проекта, техлид.', []).length,
    1,
    'субтитры с ролью — нарушение',
  );
});

await test('видимые тексты гайдов называют роль «владелец продукта» (590)', async () => {
  const files = (await readdir(contentDir)).filter((file) => file.endsWith('.ts')).sort();
  const texts = await Promise.all(files.map((file) => readFile(join(contentDir, file), 'utf8')));
  const count = texts.reduce(
    (total, text) => total + [...flatten(text).matchAll(/владельц[а-яё]*\s+продукта/giu)].length,
    0,
  );
  assert.ok(count > 0, 'гайды называют роль «владелец продукта»');
});

await test('кадры и брифы роликов (включая landing-*): «менеджер» только при имени человека (P7-R2 п.2)', async () => {
  // Отрицательный контроль: роль ловится, исключения и персоналия — нет.
  assert.equal(singleManagerProblems('x', 'Менеджер решает.').length, 1);
  assert.equal(singleManagerProblems('x', 'Менеджер внедрения — план.').length, 0);
  assert.equal(singleManagerProblems('x', 'Пакетный менеджер дистрибутива.').length, 0);
  assert.equal(singleManagerProblems('x', 'Марина Образцова — менеджер проекта.').length, 0);
  assert.equal(
    singleManagerProblems('x', 'Вопрос Марине Образцовой, менеджеру проекта.').length,
    0,
  );
  assert.equal(singleManagerProblems('x', 'Менеджеры согласовали.').length, 1);
  assert.deepEqual(
    (await frameManagerProblems()).map(format).sort(),
    [],
    'в кадрах и брифах роль — «владелец продукта»; «менеджер» допустим только при имени человека',
  );
});

await test('VTT и кадры роликов: «отметки» в смысле одобрения запрещены, галочки задач — можно (P7-R2 п.2)', async () => {
  // Отрицательный контроль: смысл одобрения ловится, белый список «галочек задач» проходит.
  assert.equal(markingProblems('x', 'block-r1', 'Отметок за людей модель не ставит.').length, 1);
  assert.equal(markingProblems('x', 'block-team', '…техлид после всех отметок.').length, 1);
  assert.equal(
    markingProblems('x', 'block-delivery', 'Задачу отмечают только после проверки.').length,
    0,
  );
  assert.equal(
    markingProblems('x', 'block-delivery', 'отметки задач, отметка без доказательства.').length,
    0,
  );
  assert.equal(markingProblems('x', 'block-r2', 'Модель одобрений не ставит.').length, 0);
  assert.deepEqual(
    (await frameMarkingProblems()).map(format).sort(),
    [],
    'в субтитрах и кадрах — «одобрение»; «отметки задач» разрешены как галочки задач',
  );
});
