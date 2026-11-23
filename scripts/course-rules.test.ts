import assert from 'node:assert/strict';
import { glob, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { test } from 'node:test';

/**
 * Source-checks of docs/COURSE-RULES.md: the learner-visible sources of the whole course
 * keep the owner's wording rules. The structural rules (interface/terminal pairs and the
 * above/below references) are checked in scripts/course-format-rules.test.ts.
 */

const root = resolve(import.meta.dirname, '..');
const pages = 'docs/pages/sdlc-development';

/** Every learner-visible source of the course: pages, their data, guides, examples, captions and the standard. */
const patterns = [
  `${pages}/**/*.html`,
  `${pages}/**/*.ts`,
  `${pages}/**/*.md`,
  `${pages}/**/*.json`,
  `${pages}/**/*.vtt`,
  'standards/sdlc-analysis-standard/**/*.md',
];

/** Author-only design notes; not a page of the course. */
const skip = new Set([`${pages}/DESIGN.md`]);

/** Step codes live in the route data by design (rule 3); their values are not learner-visible copy. */
const routeData = new Set([`${pages}/course-names.json`, `${pages}/guides/route-steps.json`]);

const sources = async (): Promise<string[]> => {
  const found = new Set<string>();
  for (const pattern of patterns)
    for await (const file of glob(pattern, { cwd: root })) if (!skip.has(file)) found.add(file);
  return [...found].sort();
};

const decodeEntities = (text: string): string =>
  text
    .replace(/&#(x[0-9a-f]+|\d+);/giu, (_, code: string) =>
      String.fromCodePoint(
        code[0]?.toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code),
      ),
    )
    .replace(/&nbsp;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/&quot;/giu, '"')
    .replace(/&(?:apos|#39);/giu, "'");

/**
 * Reader-visible copy: text nodes plus the attributes a reader hears or sees.
 * Markup tags, comments, scripts and styles are dropped, so CSS class names, hrefs and
 * URLs never count as copy. Guide sources are TypeScript with markup in strings: the same
 * extraction drops their markup, and code identifiers carry no wording of the course.
 */
const visibleHtml = (html: string): string => {
  const content = html.replace(/<!--[^]*?-->|<(script|style|template)\b[^>]*>[^]*?<\/\1>/giu, ' ');
  const attributes = [
    ...content.matchAll(/\b(?:content|alt|title|aria-label)\s*=\s*(["'])([^]*?)\1/giu),
  ]
    .map((match) => match[2])
    .join(' ');
  return decodeEntities(`${content.replace(/<[^>]+>/gu, ' ')} ${attributes}`);
};

const visibleText = (file: string, content: string): string => {
  const text = visibleHtml(content).replace(/https?:\/\/\S+/giu, ' ');
  // Comments of the guide scripts are editor notes, not copy the learner reads.
  const withoutComments = file.endsWith('.ts')
    ? text.replace(/\/\*[^]*?\*\//gu, ' ').replace(/(^|\n)\s*\/\/[^\n]*/gu, '$1 ')
    : text;
  return withoutComments.replace(/\s+/gu, ' ');
};

type WordingRule = { name: string; pattern: RegExp; banned: string; allowed: string };

/** Wording the owner banned from learner-visible copy of the course (docs/COURSE-RULES.md, rule 7). */
const wordingRules: ReadonlyArray<WordingRule> = [
  {
    name: 'the word «отметки» is not used (approval / progress / task status instead)',
    pattern: /отмет(?:к|ок)/iu,
    banned: 'Сбросить отметки',
    allowed: 'Отметьте файлы и нажмите Commit',
  },
  {
    name: 'the team is «Команда развития процессов AI PDLC», not the old names',
    pattern: /(?:enabling[\s-]*team|команда\s+внедрения)/iu,
    banned: ['Enabling', 'Team ведёт пилот'].join(' '),
    allowed: 'Команда развития процессов AI PDLC',
  },
  {
    name: 'the term is «AI PDLC», not «AI-native PDLC»',
    pattern: /AI-native\s+PDLC/iu,
    banned: 'AI-native PDLC',
    allowed: 'AI PDLC на семи этапах',
  },
  {
    name: 'no real product names in the course (Kendo)',
    pattern: /kendo/iu,
    banned: 'Kendo 20260707',
    allowed: 'Витрина заказов 20261001',
  },
  {
    name: 'the plan is «план изменений», not «roadmap»',
    pattern: /(?:roadmap|роадмап|дорожн[а-яё]*\s+карт)/iu,
    banned: 'roadmap на восемь недель',
    allowed: 'План изменений на восемь недель',
  },
  {
    name: 'artefacts and practices are written in Latin, not transliterated',
    pattern:
      /(?:пайплайн[а-яё]*|тёмн[а-яё]*\s+фабрик[а-яё]*|дарк[\s-]?фактори[а-яё]*|(?<![а-яё])интент[а-яё]*|(?<![а-яё])спек(?![а-яё])|(?<![а-яё])дора(?![а-яё]))/iu,
    banned: 'пайплайном и тёмной фабрикой',
    allowed: 'Pipeline и Dark Factory',
  },
  {
    name: 'the agent is shown as a terminal, not as a robot',
    pattern: /(?:робот|robot)\w*/iu,
    banned: 'робот соберёт пакет',
    allowed: 'агент — окно терминала >_',
  },
  {
    name: 'no «по одной команде»: each command follows its own item',
    pattern: /по одной команде/iu,
    banned: 'выполняйте по одной команде',
    allowed: 'команда стоит сразу после своего пункта',
  },
  {
    name: 'no raw step codes С1…С7, П1…П4 in visible text',
    pattern: /(?<![\wА-Яа-яЁё-])[СП][1-7](?![\wА-Яа-яЁё-])/u,
    banned: 'из С2 в С1',
    allowed: 'из шага 2 в шаг 1',
  },
  {
    name: 'no old route codes R1…R9 in visible text',
    pattern: /(?<![A-Za-z0-9])R[1-9](?![0-9])/u,
    banned: 'ACCEPTED_R4_PLANNING',
    allowed: 'шаг 5 курса',
  },
  {
    name: 'no old eight-step route numbering',
    pattern:
      /(?<![0-9])[1-7](?:\s|\\u00a0)*–(?:\s|\\u00a0)*8(?![0-9])|(?<![0-9])8(?:\s|\\u00a0)*·(?:\s|\\u00a0)*ваш(?:\s|\\u00a0)+маршрут/u,
    banned: 'Маршрут 1–3 → 4–8.',
    allowed: 'Маршрут 1–3 → 4–7.',
  },
  {
    name: 'a reference to a list in a guide is an anchor, not «в начале гайда» or «по списку выше»',
    pattern:
      /(?:списк[а-яё]*\s+(?:«[^»]{1,60}»\s+)?в\s+начале\s+гайда|(?:по|в)\s+списк[а-яё]*\s+(?:«[^»]{1,60}»\s+)?(?:выше|ниже))/iu,
    banned: 'по списку «Проверьте» в начале гайда',
    allowed: 'по ссылке на самопроверку #lesson-check',
  },
  {
    name: 'no draft-status stubs such as «Черновик, уточнит …» or «раздел готовится»',
    pattern:
      /(?:черновик\s*[,;—–-]\s*уточнит|(?:раздел[а-яё]*|страниц[а-яё]*|курс[а-яё]*|материал[а-яё]*|гайд[а-яё]*)\s+(?:сейчас\s+)?(?:черновик|готовится)|черновик[а-яё]*\s+(?:страниц[а-яё]*|курса|раздела)|(?:уточнит|уточним|уточнят)\s+(?:позже|в\s+работе|потом|после))/iu,
    banned: 'Черновик, уточнит команда',
    allowed: 'Состояние: черновик',
  },
];

/**
 * Deliberate exceptions, each with the reason written in the course itself.
 * They are asserted to be present, so a silent content change cannot widen the hole.
 */
const exceptions: ReadonlyArray<{ file: string; text: string; reason: string }> = [
  {
    file: `${pages}/guides/examples/intent-plan/weak-intent.md`,
    text: 'Границы уточним в работе.',
    reason: 'the weak intent is a deliberate bad example the course teaches to recognise',
  },
  {
    file: `${pages}/guides/examples/intent-plan/weak-complete-intent.md`,
    text: 'остальное уточним в работе.',
    reason: 'the weak complete intent is a deliberate bad example the course teaches to recognise',
  },
];

const applyExceptions = (file: string, text: string): string => {
  let visible = text;
  for (const exception of exceptions.filter((entry) => entry.file === file)) {
    assert.equal(
      visible.split(exception.text).length - 1,
      1,
      `${file}: «${exception.text}» is still expected exactly once: ${exception.reason}`,
    );
    visible = visible.replace(exception.text, '');
  }
  return visible;
};

await test('course sources keep the owner wording rules (docs/COURSE-RULES.md)', async () => {
  const files = await sources();
  // The boundary keeps the widened coverage: the whole learner-visible course, not the old analysis-only subset.
  assert.ok(files.length >= 125, `expected at least 125 course sources, found ${files.length}`);
  const violations: string[] = [];
  for (const file of files) {
    const visible = applyExceptions(
      file,
      visibleText(file, await readFile(resolve(root, file), 'utf8')),
    );
    for (const { name, pattern } of wordingRules) {
      if (routeData.has(file) && name.startsWith('no raw step codes')) continue;
      const match = pattern.exec(visible);
      if (match)
        violations.push(`${relative(dirname(root), resolve(root, file))}: ${name}: «${match[0]}»`);
    }
  }
  assert.deepEqual(violations, []);
});

/** Pending-work markers are the source form of «черновик, уточнит …»: the course does not ship them. */
const pendingRule = /\b(?:TODO|FIXME|HACK)\b|\bXXX\b|до\s+публикации/iu;

await test('course sources carry no pending-work markers (docs/COURSE-RULES.md, rule 7)', async () => {
  const files = (await sources()).filter(
    (file) => file.endsWith('.ts') || file.endsWith('.md') || file.endsWith('.html'),
  );
  const violations: string[] = [];
  for (const file of files) {
    const raw = await readFile(resolve(root, file), 'utf8');
    if (pendingRule.test(raw)) violations.push(relative(dirname(root), resolve(root, file)));
  }
  assert.deepEqual(violations, []);
});

/**
 * One command per block (docs/COURSE-RULES.md, rule 1): the learner runs commands one after another,
 * so a <pre> with two or more commands is the B2 defect. The cheat-sheet table of the Git preparation
 * is the owner's only exception; a shell script that must run as one unit is not a list of commands.
 */
const COMMAND_LINE =
  /^(?:git|npm|node|npx|openspec|mkdir|touch|printf|cat|cd|echo|ls|code|set|test)\b/u;
const PRE_BLOCK = /<pre[^>]*>\s*<code>([^]*?)<\/code>\s*<\/pre>/gu;
const CHEAT_SHEET =
  /<details[^>]*>\s*<summary>Шпаргалка: все команды курса<\/summary>[^]*?<\/details>/u;
const SHELL_SCRIPT = /^(?:if|for|while)\s|^set\s+-[a-z]+\b/u;

const decodeCode = (body: string): string =>
  body
    .replace(/\\n/gu, '\n')
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/&quot;/giu, '"')
    .replace(/&amp;/giu, '&');

/** Command lines of one block, as the learner would paste them. */
const commandLines = (block: string): string[] =>
  decodeCode(block)
    .split('\n')
    .filter((line) => COMMAND_LINE.test(line));

const commandBlockViolations = (source: string): string[] => {
  const violations: string[] = [];
  for (const match of source.replace(CHEAT_SHEET, '').matchAll(PRE_BLOCK)) {
    const block = match[1] ?? '';
    if (SHELL_SCRIPT.test(decodeCode(block).trimStart())) continue;
    const commands = commandLines(block);
    if (commands.length > 1)
      violations.push(
        `${commands.length} commands in one block, first «${commands[0]?.slice(0, 60)}»`,
      );
  }
  return violations;
};

await test('course step sources keep one command per block (docs/COURSE-RULES.md, rule 1)', async () => {
  const content = `${pages}/guides/content`;
  const found = new Set<string>();
  for await (const file of glob(`${content}/**/*.ts`, { cwd: root })) found.add(file);
  const files = [...found].sort();
  assert.ok(files.length >= 30, `expected the guide content sources, found ${files.length}`);
  const violations: string[] = [];
  for (const file of files)
    for (const violation of commandBlockViolations(await readFile(resolve(root, file), 'utf8')))
      violations.push(`${file}: ${violation}`);
  assert.deepEqual(violations, []);
});

await test('the one-command-per-block check catches injected violations (negative control)', () => {
  const block = (body: string): string => `<pre><code>${body}</code></pre>`;
  assert.equal(
    commandBlockViolations(block('git add .\\ngit commit -m "demo"')).length,
    1,
    'two commands in one block are caught',
  );
  assert.deepEqual(commandBlockViolations(block('git status')), [], 'one command passes');
  assert.deepEqual(
    commandBlockViolations(
      `<details><summary>Шпаргалка: все команды курса</summary>${block('git add .\\ngit commit -m "demo"')}</details>`,
    ),
    [],
    'the cheat-sheet table keeps several commands together',
  );
  assert.deepEqual(
    commandBlockViolations(block('if [ -d .opencode ]; then git add -- .opencode; fi\\nset -eu')),
    [],
    'a shell script that runs as one unit stays one block',
  );
});

await test('the wording checks catch injected violations (negative control)', () => {
  for (const { name, pattern, banned, allowed } of wordingRules) {
    assert.ok(pattern.test(banned), `${name}: catches «${banned}»`);
    pattern.lastIndex = 0;
    assert.ok(!pattern.test(allowed), `${name}: allows «${allowed}»`);
    pattern.lastIndex = 0;
  }
  assert.ok(pendingRule.test('// TODO доработать'));
  assert.ok(!pendingRule.test('Пометки о незавершённой работе в текст курса не попадают.'));
});
