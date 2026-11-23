/**
 * Shared helpers of the course source-checks: rule 1 pairs and rule 2 above/below references.
 * The tests live in scripts/course-format-rules.test.ts; the coverage config skips *-test-support.ts.
 */
import type { LearnerGuide, LearnerStep } from './learner-guide-types.ts';

const NBSP = '\u00a0';
const normalize = (text: string): string => text.replaceAll(NBSP, ' ');

const INTERFACE_LINE = /В (?:GitLab|VS Code|интерфейсе|Source Control|браузере)/u;
const TERMINAL_LINE = /В терминале[^:]{0,24}:/u;
const NO_COMMAND_NOTE =
  /(?:команд[а-яё]*(?:\s+Git)?[^.<]{0,80}(?:не\s+нужн[а-яё]*|нет)|(?:нет|не\s+нужн[а-яё]*)[^.<]{0,80}команд[а-яё]*)/iu;
const GIT_COMMAND =
  /(?:^|[\s;&|<>(])(?:git\s+(?:add|commit|push|pull|switch|checkout|clone|status|log|diff|fetch|remote|revert|init|config|rev-parse|ls-files|stash|branch|merge|rebase|tag|reset|show)\b)/u;
const COMMAND_BLOCK = /<pre[^>]*>\s*<code>([^]*?)<\/code>\s*<\/pre>/gu;
const COMMAND_LINE =
  /^(?:git|npm|node|npx|openspec|mkdir|touch|printf|cat|cd|echo|ls|code|set|test)\b/u;

type StepsLike = { steps: readonly LearnerStep[] };

/**
 * The cheat-sheet details block of the Git preparation keeps one table of commands by the owner's
 * decision: it is the only place where several commands stand together, so it is not checked.
 */
const CHEAT_SHEET =
  /<details[^>]*>\s*<summary>Шпаргалка: все команды курса<\/summary>[^]*?<\/details>/u;

/** The advanced variant is an alternative path of the same step: its commands follow rule 1 too. */
const advancedAction = (advanced: string | null): string =>
  advanced?.replace(CHEAT_SHEET, '') ?? '';

/** Rule 1 checks of one action text: the pair order, the explanation and one command per block. */
const actionViolations = (where: string, raw: string): string[] => {
  const violations: string[] = [];
  const action = normalize(raw);
  const interfaceAt = action.search(INTERFACE_LINE);
  const terminalAt = action.search(TERMINAL_LINE);
  const gitCommand = GIT_COMMAND.test(action);
  if (interfaceAt >= 0 && terminalAt >= 0 && terminalAt < interfaceAt)
    violations.push(`${where}: the terminal line goes after the interface line`);
  // A GitLab action with an explicit «no command» note needs no terminal line (rule 1).
  if (interfaceAt >= 0 && terminalAt < 0 && gitCommand && !NO_COMMAND_NOTE.test(action))
    violations.push(`${where}: an interface action with a git command misses «В терминале»`);
  if (terminalAt >= 0 && interfaceAt < 0 && gitCommand)
    violations.push(`${where}: a terminal git action misses the interface line`);
  if (terminalAt >= 0 && !/<pre[^>]*>\s*<code>/u.test(action) && !NO_COMMAND_NOTE.test(action))
    violations.push(`${where}: «В терминале» without a command or an explicit «no command» note`);
  for (const block of action.matchAll(COMMAND_BLOCK)) {
    const commands = (block[1] ?? '').split('\n').filter((line) => COMMAND_LINE.test(line));
    if (commands.length > 1)
      violations.push(`${where}: ${commands.length} commands in one block, one command per line`);
  }
  return violations;
};

/** Rule 1 source-checks for one guide: every step keeps its interface line and terminal line together. */
export const pairViolations = (guide: StepsLike): string[] => {
  const violations: string[] = [];
  for (const [index, step] of guide.steps.entries()) {
    const actions = [
      ...step.actions.map((text, actionIndex) => ({ text, at: `item ${actionIndex + 1}` })),
      // The GitLab alternative of a step is rendered as its own details block, so it follows the same rule.
      ...(step.platformActions?.gitlab ?? []).map((text, actionIndex) => ({
        text,
        at: `gitlab action ${actionIndex + 1}`,
      })),
      // The advanced variant renders as its own details block; the cheat-sheet table is its only exception.
      ...(step.advanced ? [{ text: advancedAction(step.advanced), at: 'advanced' }] : []),
    ];
    for (const { text, at } of actions)
      violations.push(...actionViolations(`step ${index + 1}, ${at}`, text));
  }
  return violations;
};

type Item = { path: string; field: string; step: number | null; text: string; start: number };

/** The page in render order: later items are below earlier ones, as the reader scrolls. */
const pageItems = (value: LearnerGuide): Item[] => {
  const items: Omit<Item, 'start'>[] = [];
  const add = (
    path: string,
    field: string,
    step: number | null,
    text: string | undefined,
  ): void => {
    if (text?.trim()) items.push({ path, field, step, text: normalize(text) });
  };
  add('summary', 'summary', null, value.summary);
  for (const [index, item] of value.steps.entries()) {
    const prefix = `steps[${index}]`;
    add(`${prefix}.why`, 'why', index, item.why);
    add(`${prefix}.figure`, 'figure', index, item.figure?.html);
    add(
      `${prefix}.actions`,
      'actions',
      index,
      item.actions.filter((action) => !action.trimStart().startsWith('<details')).join('\n'),
    );
    add(`${prefix}.links`, 'links', index, item.links.map(([label]) => label).join('\n'));
    add(
      `${prefix}.examples`,
      'examples',
      index,
      [item.example?.content ?? '', ...(item.examples ?? []).map((entry) => entry.content)]
        .filter(Boolean)
        .join('\n'),
    );
    add(
      `${prefix}.mockup`,
      'mockup',
      index,
      item.mockup ? `${item.mockup.title} ${item.mockup.caption}` : '',
    );
    add(`${prefix}.variantB`, 'variantB', index, item.variantB);
    add(`${prefix}.result`, 'result', index, item.result);
    add(`${prefix}.gitNote`, 'gitNote', index, item.gitNote);
    add(`${prefix}.nextUse`, 'nextUse', index, item.nextUse.label);
    add(
      `${prefix}.screenshots`,
      'screenshots',
      index,
      (item.screenshots ?? []).map((shot) => `${shot.alt}\n${shot.caption}`).join('\n'),
    );
    add(`${prefix}.trouble`, 'trouble', index, item.trouble);
    add(`${prefix}.advanced`, 'advanced', index, item.advanced ?? '');
    add(
      `${prefix}.model`,
      'model',
      index,
      item.model ? `${item.model.prompt}\n${item.model.does}` : '',
    );
    // The renderer moves details-actions and the GitLab alternative after the model block:
    // a direction check must follow the DOM order, not the source order.
    add(
      `${prefix}.detailsActions`,
      'detailsActions',
      index,
      item.actions.filter((action) => action.trimStart().startsWith('<details')).join('\n'),
    );
    add(
      `${prefix}.platformActions`,
      'platformActions',
      index,
      (item.platformActions?.gitlab ?? []).join('\n'),
    );
  }
  add('check', 'check', null, value.check.join('\n'));
  add('output', 'output', null, value.output);
  let offset = 0;
  return items.map((item) => {
    const start = offset;
    offset += item.text.length + 1;
    return { ...item, start };
  });
};

/** A kind word promises a real element: a bare tag elsewhere must not make a wrong-side reference pass. */
type KindRule = { kind: RegExp; element: RegExp; fields: readonly string[] };
const KINDS: readonly KindRule[] = [
  {
    kind: /^блок/u,
    element: /<(?:figure|details|table|pre|div)\b/iu,
    fields: [
      'figure',
      'examples',
      'mockup',
      'variantB',
      'screenshots',
      'trouble',
      'advanced',
      'model',
      'detailsActions',
      'platformActions',
    ],
  },
  { kind: /^таблиц/u, element: /<table\b/iu, fields: ['figure', 'mockup', 'examples'] },
  { kind: /^схем/u, element: /<(?:figure|svg)\b/iu, fields: ['figure'] },
  {
    kind: /^(?:пример|образец)/u,
    element: /<(?:figure|pre)\b/iu,
    fields: ['figure', 'examples', 'links'],
  },
  {
    kind: /^команд/u,
    element: /<pre\b/iu,
    fields: ['actions', 'examples', 'advanced', 'trouble', 'detailsActions', 'platformActions'],
  },
  {
    kind: /^услови/u,
    element: /<(?:figure|pre|details|table)\b/iu,
    fields: ['examples', 'figure', 'actions'],
  },
  {
    kind: /^запрос/u,
    element: /<(?:figure|pre|details)\b/iu,
    fields: ['examples', 'model', 'actions', 'figure'],
  },
  { kind: /^карточк/u, element: /<figure\b/iu, fields: ['figure'] },
  { kind: /^ссыл/u, element: /<a\b/iu, fields: ['links', 'screenshots', 'examples'] },
  {
    kind: /^спис/u,
    element: /<(?:ul|ol)\b/iu,
    fields: ['figure', 'actions', 'examples'],
  },
] as const;

const KIND_WORDS = [
  'блок[а-яё]*',
  'таблиц[а-яё]*',
  'схем[а-яё]*',
  'пример[а-яё]*',
  'образец[а-яё]*',
  'команд[а-яё]*',
  'услови[а-яё]*',
  'запрос[а-яё]*',
  'карточк[а-яё]*',
  'ссыл[а-яё]*',
  'спис[а-яё]*',
].join('|');
const kindAfter = new RegExp(
  `(?<![а-яёА-ЯЁ])(?<kind>${KIND_WORDS})[^.!?,;:<>—–]{0,24}?(?<![а-яёА-ЯЁ])(?<dir>ниже|выше)(?![а-яёА-ЯЁ])`,
  'giu',
);
const kindBefore = new RegExp(
  `(?<![а-яёА-ЯЁ])(?<dir>ниже|выше)(?![а-яёА-ЯЁ])[^.!?,;:<>—–]{0,24}?(?<kind>${KIND_WORDS})`,
  'giu',
);
const kindRule = (kind: string): KindRule | undefined =>
  KINDS.find((entry) => entry.kind.test(kind.toLowerCase()));
const quotedRef =
  /«(?<name>[^»]{2,80})»[^.!?,;:<>—–]{0,24}?(?<![а-яёА-ЯЁ])(?<dir>ниже|выше)(?![а-яёА-ЯЁ])/giu;
const quotedRefReverse =
  /(?<![а-яёА-ЯЁ])(?<dir>ниже|выше)(?![а-яёА-ЯЁ])[^.!?,;:<>—–]{0,24}?«(?<name>[^»]{2,80})»/giu;
const PAGE_REFERENCE = /на\s+(?:этой\s+)?страниц|href="#/u;

/**
 * The DOM the renderer builds around a field. A kind of block is verified on this projection:
 * a plain-text field must not satisfy a reference to a table or a scheme, while the renderer's
 * own wrappers (examples become a <pre>, links become <a>, result becomes a paragraph) count.
 */
const FIELD_MARKUP: Readonly<Record<string, string>> = {
  actions: '',
  detailsActions: '<details><ol>',
  platformActions: '<details><ol>',
  figure: '',
  variantB: '',
  trouble: '<details>',
  advanced: '<details>',
  model: '<details><pre>',
  examples: '<div class="step-example"><pre>',
  links: '<div class="step-links"><a>',
  gitNote: '<p>',
  screenshots: '<figure>',
  mockup: '<div class="mockup-window">',
  levels: '<details>',
  nextUse: '',
  summary: '',
  check: '',
  output: '',
};

/** Fields whose source text is trusted HTML; plain-text fields must not provide markup evidence. */
const TRUSTED_MARKUP = new Set([
  'figure',
  'actions',
  'detailsActions',
  'platformActions',
  'variantB',
  'trouble',
  'advanced',
  'mockup',
  'why',
  'result',
]);

const fieldHtml = (candidate: Item): string =>
  `${FIELD_MARKUP[candidate.field] ?? ''}${
    TRUSTED_MARKUP.has(candidate.field) ? candidate.text : ''
  }`;

/** Rule 2 source-checks for one guide: a reference above/below points to a block on that side. */
const kindViolation = (
  item: Item,
  index: number,
  items: readonly Item[],
  kind: string,
  dir: string,
  matchIndex: number,
): string | null => {
  const rule = kindRule(kind);
  if (!rule) return null;
  const side = dir === 'ниже' ? item.text.slice(matchIndex) : item.text.slice(0, matchIndex);
  if (rule.element.test(side)) return null;
  const near = item.text.slice(Math.max(0, matchIndex - 120), matchIndex + 120);
  // A page-level reference may point across steps; a bare one stays inside its own step.
  const pageWide = dir === 'выше' || PAGE_REFERENCE.test(near);
  const candidates = dir === 'ниже' ? items.slice(index + 1) : items.slice(0, index);
  const known = candidates.some(
    (candidate) =>
      (pageWide || candidate.step === item.step) &&
      rule.fields.includes(candidate.field) &&
      rule.element.test(fieldHtml(candidate)),
  );
  return known ? null : `the ${dir} target is not on the claimed side`;
};

const quotedViolation = (
  item: Item,
  items: readonly Item[],
  target: string,
  dir: string,
  at: number,
  from: number,
): string | null => {
  const positions: number[] = [];
  for (const candidate of items) {
    let offset = candidate.text.indexOf(target);
    while (offset >= 0) {
      const position = candidate.start + offset;
      // The name inside the reference itself is not a target.
      if (position < at || position >= from) positions.push(position);
      offset = candidate.text.indexOf(target, offset + target.length);
    }
  }
  if (positions.length === 0) return 'the named block is not on the page';
  const onSide = positions.some((position) => (dir === 'ниже' ? position >= from : position < at));
  return onSide ? null : 'the named block is on the other side of the page';
};

export const referenceViolations = (value: LearnerGuide): string[] => {
  const items = pageItems(value);
  const violations: string[] = [];
  const patterns = [
    { name: 'kind', pattern: kindAfter },
    { name: 'kind', pattern: kindBefore },
    { name: 'quoted', pattern: quotedRef },
    { name: 'quoted', pattern: quotedRefReverse },
  ] as const;
  for (const [index, item] of items.entries()) {
    for (const { name, pattern } of patterns) {
      for (const match of item.text.matchAll(pattern)) {
        const dir = match.groups?.['dir'] ?? 'ниже';
        const at = item.start + match.index;
        const from = at + match[0].length;
        const where = `${item.path}: «${match[0]}»`;
        const problem =
          name === 'kind'
            ? kindViolation(item, index, items, match.groups?.['kind'] ?? '', dir, match.index)
            : quotedViolation(item, items, match.groups?.['name'] ?? '', dir, at, from);
        if (problem) violations.push(`${where}: ${problem}`);
      }
    }
  }
  return violations;
};
