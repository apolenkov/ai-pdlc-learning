import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Структурная проверка intent.md этапа «Намерение и план».
// Смысл не проверяется: структура ≠ смысл; рецензент проверяет,
// что описана проблема, а не решение.

export type IntentLintMode = 'analysis' | 'stage1';

export interface IntentViolation {
  readonly rule: string;
  readonly message: string;
}

const headerFields = ['Инициатор', 'Владелец решения', 'Состояние', 'Источник'] as const;
const assistantField = 'Помощник (аналитик)';
const analysisSections = [
  'Проблема',
  'Результат',
  'Границы',
  'Признаки успеха',
  'Открытые вопросы',
] as const;
const measurementFields = [
  'Метрика',
  'До',
  'Цель',
  'Срок проверки',
  'Способ измерения',
  'Ответственный',
] as const;
const planSection = 'План изменений';
const risksSection = 'Риски';

const placeholderPattern = /<[^<>\n]*>/u;
const undefinedPattern = /не\s+определ[её]н[оаы]?/iu;
const changeIdPattern = /^change-\d+$/u;

interface Section {
  readonly title: string;
  readonly body: string;
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

const parseSections = (markdown: string): Section[] => {
  const pattern = /^##\s+(.+?)\s*$/gmu;
  const matches = [...markdown.matchAll(pattern)];
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const next = index + 1 < matches.length ? (matches[index + 1]?.index ?? markdown.length) : markdown.length;
    return { title: match[1]?.trim() ?? '', body: markdown.slice(start, next) };
  });
};

const findSection = (sections: Section[], name: string): Section | undefined =>
  sections.find(
    (section) =>
      section.title === name ||
      section.title.startsWith(`${name} `) ||
      section.title.startsWith(`${name}[`),
  );

const fieldValue = (text: string, field: string): string | undefined => {
  const match = new RegExp(`${escapeRegExp(field)}\\s*:\\s*([^\\n]+)`, 'u').exec(text);
  return match?.[1]?.trim();
};

const splitRow = (line: string): string[] => {
  const cells = line.trim().split('|').map((cell) => cell.trim());
  if (cells[0] === '') cells.shift();
  if (cells[cells.length - 1] === '') cells.pop();
  return cells;
};

const lintHeader = (header: string, violations: IntentViolation[]): void => {
  for (const field of headerFields) {
    const value = fieldValue(header, field);
    if (value === undefined || value === '') {
      violations.push({ rule: 'header-field', message: `Шапка без поля «${field}» или поле пустое.` });
    } else if (placeholderPattern.test(value)) {
      violations.push({ rule: 'placeholder', message: `Поле «${field}» содержит заглушку <…>.` });
    }
  }
  const assistant = fieldValue(header, assistantField);
  if (assistant !== undefined && placeholderPattern.test(assistant)) {
    violations.push({ rule: 'placeholder', message: `Поле «${assistantField}» содержит заглушку <…>.` });
  }
};

const lintSections = (
  sections: Section[],
  names: readonly string[],
  violations: IntentViolation[],
): Map<string, Section> => {
  const found = new Map<string, Section>();
  for (const name of names) {
    const section = findSection(sections, name);
    if (section === undefined || section.body.trim() === '') {
      violations.push({ rule: 'empty-section', message: `Раздел «${name}» отсутствует или пустой.` });
    } else {
      found.set(name, section);
      if (placeholderPattern.test(section.body)) {
        violations.push({ rule: 'placeholder', message: `Раздел «${name}» содержит заглушку <…>.` });
      }
    }
  }
  return found;
};

const hasReason = (value: string): boolean => {
  const match = undefinedPattern.exec(value);
  if (match === null || match.index === undefined) return true;
  return /[-—:][\s\S]*\S/u.test(value.slice(match.index + match[0].length));
};

const lintMeasurements = (body: string, violations: IntentViolation[]): void => {
  for (const field of measurementFields) {
    const value = fieldValue(body, field);
    if (value === undefined || value === '') {
      violations.push({ rule: 'measurement-field', message: `«Признаки успеха» без поля «${field}» или поле пустое.` });
    } else if (placeholderPattern.test(value)) {
      violations.push({ rule: 'placeholder', message: `Поле «${field}» содержит заглушку <…>.` });
    } else if (!hasReason(value)) {
      violations.push({
        rule: 'undefined-without-reason',
        message: `Поле «${field}»: «не определено» допустимо только с причиной после тире или двоеточия.`,
      });
    }
  }
};

const lintPlanTable = (body: string, violations: IntentViolation[]): void => {
  const lines = body.split('\n').filter((line) => line.trim().startsWith('|'));
  if (lines.length < 3) {
    violations.push({ rule: 'plan-table', message: 'Раздел «План изменений» без таблицы изменений.' });
    return;
  }
  const rows = lines.slice(2).map(splitRow).filter((cells) => cells.length > 0);
  if (rows.length === 0) {
    violations.push({ rule: 'plan-table', message: 'Раздел «План изменений» без таблицы изменений.' });
    return;
  }
  const seen = new Set<string>();
  for (const cells of rows) {
    if (cells.length < 6) {
      violations.push({ rule: 'plan-table', message: 'Строка «Плана изменений» короче шести ячеек.' });
      continue;
    }
    const id = cells[0] ?? '';
    if (!changeIdPattern.test(id)) {
      violations.push({ rule: 'plan-id', message: `Идентификатор «${id}» не вида change-N.` });
    } else if (seen.has(id)) {
      violations.push({ rule: 'duplicate-change-id', message: `Идентификатор «${id}» повторяется.` });
    } else {
      seen.add(id);
    }
    for (const cell of cells) {
      if (cell === '') {
        violations.push({ rule: 'empty-plan-cell', message: `Строка «${id}» содержит пустую ячейку.` });
        break;
      }
      if (placeholderPattern.test(cell)) {
        violations.push({ rule: 'placeholder', message: `Строка «${id}» содержит заглушку <…>.` });
        break;
      }
    }
  }
};

export const lintIntent = (markdown: string, mode: IntentLintMode = 'stage1'): IntentViolation[] => {
  const violations: IntentViolation[] = [];
  const sections = parseSections(markdown);
  const firstSection = markdown.search(/^##\s+.+?$/mu);
  lintHeader(firstSection === -1 ? markdown : markdown.slice(0, firstSection), violations);
  const found = lintSections(sections, analysisSections, violations);
  if (mode === 'stage1') {
    const success = found.get('Признаки успеха');
    if (success !== undefined) lintMeasurements(success.body, violations);
    const plan = findSection(sections, planSection);
    if (plan === undefined || plan.body.trim() === '') {
      violations.push({ rule: 'empty-section', message: `Раздел «${planSection}» отсутствует или пустой.` });
    } else {
      lintPlanTable(plan.body, violations);
    }
    const risks = findSection(sections, risksSection);
    if (risks === undefined || risks.body.trim() === '') {
      violations.push({ rule: 'empty-section', message: `Раздел «${risksSection}» отсутствует или пустой.` });
    } else if (placeholderPattern.test(risks.body)) {
      violations.push({ rule: 'placeholder', message: `Раздел «${risksSection}» содержит заглушку <…>.` });
    }
  }
  return violations;
};

const parseMode = (argv: string[]): IntentLintMode => {
  const flag = argv.indexOf('--mode');
  const raw = flag >= 0 ? argv[flag + 1] : undefined;
  const inline = argv.find((arg) => arg.startsWith('--mode='));
  const mode = inline !== undefined ? inline.slice('--mode='.length) : (raw ?? 'stage1');
  if (mode !== 'analysis' && mode !== 'stage1') {
    throw new Error(`Неизвестный режим: ${mode}. Допустимо --mode analysis|stage1.`);
  }
  return mode;
};

const invokedPath =
  process.argv[1] !== undefined ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  const file = process.argv[2];
  if (file === undefined || file.startsWith('--')) {
    throw new Error(
      'Использование: node --experimental-strip-types tools/intent-lint.ts <файл> [--mode analysis|stage1]',
    );
  }
  const mode = parseMode(process.argv.slice(2));
  const markdown = await readFile(resolve(file), 'utf8');
  const violations = lintIntent(markdown, mode);
  if (violations.length > 0) {
    for (const violation of violations) {
      process.stderr.write(`- [${violation.rule}] ${violation.message}\n`);
    }
    process.stderr.write(`intent lint: ${violations.length} нарушений (режим ${mode})\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`intent lint passed (режим ${mode})\n`);
  }
}
