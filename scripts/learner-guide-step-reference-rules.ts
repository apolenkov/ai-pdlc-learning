import courseNames from '../docs/pages/sdlc-development/course-names.json' with { type: 'json' };
import routeSteps from '../docs/pages/sdlc-development/guides/route-steps.json' with { type: 'json' };
import { guideContent } from './guide-content.ts';

/* TASK-571 rule engine: a numbered step is named in «ёлочках», and the word «шаг» takes the
   case the preposition before it requires (OWNER-1658, 16.10 16:59): из/от/до/для/после →
   «шага N», в/на/при → «шаге N», к/по → «шагу N», перед/над/за/между/под → «шагом N»,
   without a preposition → «шаг N»; a range is plural («шагов 1–3»), and a verb right after
   the quote is preceded by a comma. learner-guide-step-references.test.ts owns the runs,
   the floors and the negative controls; this module owns the tables and the checker. Route
   numbers, registered titles, the retired codes С\d and the exhaustive «N · Имя» navigation
   contract stay in learner-guide-route-labels.test.ts. */

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

export const normalize = (value: string): string =>
  value
    .replace(
      /&(nbsp|amp|lt|gt|quot|apos);|&#(\d+);|&#x([\da-f]+);/giu,
      (_, entity: string, decimal: string, hex: string) =>
        entity
          ? (ENTITIES[entity.toLowerCase()] ?? '')
          : String.fromCodePoint(Number.parseInt(decimal || hex, decimal ? 10 : 16)),
    )
    // NBSP is the trap: the guides use it between words, an unnormalized scan finds nothing.
    .replace(/[\u00a0\u202f]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

export const visibleText = (html: string): string =>
  normalize(
    html
      .replace(/<!--[^]*?-->/gu, '')
      .replace(/<(svg|code|pre|script|style|head)\b[^>]*>[^]*?<\/\1>/giu, ' ')
      .split(/(<[^>]*>)/gu)
      .map((part) => (part.startsWith('<') ? ' ' : part))
      .join(''),
  );

/* Navigation keeps «N · Имя» (Q-0030) in the route strip, position rail, catalog menu and
   page header; prose quotes the step name instead. */
export const proseText = (html: string): string =>
  visibleText(
    html
      .replace(/<nav\b[^>]*>[^]*?<\/nav>|<h1\b[^>]*>[^]*?<\/h1>/giu, ' ')
      .replace(/<span class="route-kind">[^]*?<\/span>/gu, ' '),
  );

/** Figure text is reader-facing too, but visibleText drops whole <svg> blocks: every
    <desc>/<text>/<title> node is checked on its own, so a word standing before a reference
    inside the same node really governs it. A scheme is one of the twelve places the owner
    read, and a broken case there must not slip through. */
export const svgNodes = (html: string): string[] =>
  [...html.matchAll(/<svg\b[^>]*>[^]*?<\/svg>/giu)].flatMap((svg) =>
    [...svg[0].matchAll(/<(desc|text|title)\b[^>]*>([^]*?)<\/\1>/giu)].map((node) =>
      normalize(node[2]!.replace(/<[^>]*>/gu, ' ')),
    ),
  );

/** Every form of «шаг» that can carry a number: singular and plural, five cases. */
export const STEP_FORMS = 'шаг шага шагу шагом шаге шаги шагов шагам шагами шагах'.split(' ');

/** Preposition → the forms it governs. «с» governs the genitive («начните с шага 1») and the
    instrumental («правила согласованы с шагом 3»); «в»/«на» also take the accusative of
    direction and object («передача в шаг 5», «ссылка на шаг 5»). */
const GENITIVE = 'из от до для после у без около кроме вместо вне внутри'.split(' ');
const PREPOSITIONAL = ['в', 'во', 'на', 'о', 'об', 'обо', 'при'];
const DATIVE = ['к', 'ко', 'по'];
const INSTRUMENTAL = ['перед', 'передо', 'над', 'за', 'между', 'под', 'подо'];
export const PREPOSITION_FORMS: Record<string, readonly string[]> = {
  ...Object.fromEntries(GENITIVE.map((word) => [word, ['шага', 'шагов']])),
  ...Object.fromEntries(PREPOSITIONAL.map((word) => [word, ['шаге', 'шагах', 'шаг']])),
  ...Object.fromEntries(DATIVE.map((word) => [word, ['шагу', 'шагам']])),
  ...Object.fromEntries(INSTRUMENTAL.map((word) => [word, ['шагом', 'шагами']])),
  с: ['шага', 'шагов', 'шагом'],
  со: ['шага', 'шагов', 'шагом'],
};

/* Words that take a step reference in the genitive («сценариев шага 2», «результатом шага 2»).
   The list is explicit and taken from the course text. It is enforced inside a figure node
   only: there the text is one contiguous fragment, while in the flattened page a word can
   belong to a neighbouring element (a route label ending in «изменение требований» sits
   right before a nominative reference in the next span, a table cell does the same), so the
   page text is left unjudged there — that is the M11 boundary the verifier reported. */
const GENITIVE_GOVERNORS = new Set(
  (
    'diff sha базах базу базы блока вашего версии версию версия ветви ветвь ветка ветке ветки ветку ' +
    'вход входа входом выполнения документ документы достаточно ждёт задача задаче задачи задачу ' +
    'запрос запроса изменение изменения инструкции историю история итоговый картина комплект копию ' +
    'копия лимит маршрут метарепозиторий образца образце образцом основа основу папке планирования ' +
    'порядком порядку правил правило правки практика практике практику проверки продолжении работа ' +
    'работой работы раздел разделы результат результата результатом репозиторий своего сдачу слияние ' +
    'спецификация ссылку сценариев сценарии сценарий требований требования условию цель цикл циклу частью'
  ).split(' '),
);

/** Without a preposition the reference is nominative («шаг 2 «Имя»») or genitive when a noun
    governs it («ветка шага 1»); a range («шагов 1–3», «шаги 1–7») is always plural. */
export const BARE_FORMS: readonly string[] = ['шаг', 'шага', 'шаги', 'шагов'];
const RANGE_FORMS: readonly string[] = ['шаги', 'шагов', 'шагам', 'шагах', 'шагами'];
const EN_DASH = '\u2013';

/* An explicit verb list: guessing endings would flag nouns («в кредите», «дети»). The
   imperative suffix -йте/-ьте is unambiguous and is matched on top of the list. */
const VERBS = new Set(
  (
    'пришли пришёл пришла знаете умеете есть нет начали увидели выбрана готово нужно работали ' +
    'сделали выполнили проверяли удалили забыли используете хотите продолжайте выберите проверьте ' +
    'получите передайте откройте сохраните создайте нажмите убедитесь сверьте зафиксируйте ' +
    'перенесите добавьте удалите вернитесь перейдите начните сделайте посмотрите прочитайте ' +
    'заполните назначьте отправьте сравните подготовьте обсудите оставьте примите скопируйте ' +
    'восстановите подтвердите запишите проследите назовите отделите повторите работайте ' +
    'проверяйте переходите скажите напишите включите отметьте установите исправьте замените дополните'
  ).split(' '),
);
const isVerb = (word: string): boolean =>
  VERBS.has(word.toLowerCase()) || /(?:йте|ьте)$/u.test(word);
// JavaScript \b does not recognize Cyrillic letters as word characters (see
// learner-guide-route-labels.test.ts), so the conditional opener uses a letter lookahead.
const CONDITIONAL = /^(?:Если|Когда|Раз|Коли|Коль)(?![\p{L}])/u;

const names: Record<string, { title: string; short: string; file: string }> = courseNames.guides;

/** Step titles by number: registered course steps (both courses) and the internal steps of
    every guide, numbered by their position on the page. */
const namesByNumber = new Map<string, Set<string>>();
const registerName = (number: string, title: string): void => {
  if (!number.trim()) return;
  const titles = namesByNumber.get(number) ?? new Set<string>();
  titles.add(normalize(title));
  namesByNumber.set(number, titles);
};
for (const step of routeSteps) registerName(step.number, step.title);
for (const guide of Object.values(guideContent.stages))
  guide.steps.forEach((step, index) => registerName(String(index + 1), step.title));

const courseStepTitles = new Set(routeSteps.map((step) => normalize(step.title)));
const internalStepTitles = new Map(
  Object.entries(guideContent.stages).map(([id, guide]) => [
    id,
    new Set(guide.steps.map((step) => normalize(step.title))),
  ]),
);
const guideByTitle = new Map<string, string>();
for (const [id, guide] of Object.entries(names)) {
  guideByTitle.set(normalize(guide.title), id);
  guideByTitle.set(normalize(guide.short), id);
}

const STEP_REFERENCE =
  /(?<![\p{L}])([Шш]аг(?:а|е|у|ом|и|ов|ам|ах|ами)?)\s+(\d+[аб]?)(?:\s*([–—-])\s*(\d+[аб]?))?(?:\s*«([^»\n]{1,90})»)?/gu;

export const stepReferences = (text: string) =>
  [...text.matchAll(STEP_REFERENCE)].map((match) => ({
    text: match[0],
    form: match[1]!.toLowerCase(),
    number: match[2]!,
    separator: match[3] ?? null,
    name: match[5] ?? null,
    index: match.index,
    quoteStart: match[5] === undefined ? -1 : match.index + match[0].indexOf('«'),
    end: match.index + match[0].length,
  }));
export type StepReference = ReturnType<typeof stepReferences>[number];

/** A comma-separated list of step references continues the case of its head:
    «как на шаге 5 «Контекст продукта», шаге 2» keeps the prepositional «шаге». */
const REFERENCE_CHAIN =
  /(?:[Шш]аг(?:а|е|у|ом|и|ов|ам|ах|ами)?\s+\d+[аб]?(?:\s*[–—-]\s*\d+[аб]?)?(?:\s*«[^»]+»)?\s*,\s*)+$/u;

export type CaseContext = {
  preposition: string | null;
  governor: string | null;
  standalone: boolean;
};

/** The word directly before the reference decides its case: a preposition is checked against
    the table, a genitive governor against the genitive, any other adjacent word governs the
    case itself, and after punctuation the reference stands alone — then it is nominative. */
export const caseContext = (text: string, index: number): CaseContext => {
  let cursor = index;
  for (let hops = 0; hops < 4; hops += 1) {
    const before = text.slice(Math.max(0, cursor - 200), cursor);
    const chain = before.match(REFERENCE_CHAIN);
    if (chain) {
      cursor -= chain[0].length;
      continue;
    }
    const word = before.match(/([\p{L}]+)\s*$/u);
    if (!word) return { preposition: null, governor: null, standalone: true };
    const candidate = word[1]!.toLowerCase();
    return {
      preposition: PREPOSITION_FORMS[candidate] ? candidate : null,
      governor: GENITIVE_GOVERNORS.has(candidate) ? candidate : null,
      standalone: false,
    };
  }
  return { preposition: null, governor: null, standalone: true };
};

const sentenceStart = (text: string, index: number): number =>
  ['. ', '! ', '? ', '; ', ': ', '\n'].reduce(
    (start, boundary) => Math.max(start, text.lastIndexOf(boundary, index)),
    0,
  );

const ATTRIBUTION = /(?:в\s+)?(?:гайд[еу]|подготовк[еи]|подготовка|гайд)\s*«([^»]+)»/giu;

/** The guide a reference is attributed to («… в гайде «Markdown, Git, GitLab»»). */
const attributedGuide = (text: string, reference: StepReference): string | null => {
  const forward = text.slice(reference.end, reference.end + 90);
  const sentenceEnd = forward.search(/[.!?](?:\s|$)/u);
  const window = sentenceEnd < 0 ? forward : forward.slice(0, sentenceEnd);
  const ahead = [...window.matchAll(ATTRIBUTION)][0];
  if (ahead) return ahead[1]!;
  const start = Math.max(sentenceStart(text, reference.index) + 1, reference.index - 90);
  return [...text.slice(start, reference.index).matchAll(ATTRIBUTION)].at(-1)?.[1] ?? null;
};

/** An internal step name must belong to the guide the sentence attributes it to. */
const attributionProblems = (text: string, reference: StepReference, source: string): string[] => {
  if (courseStepTitles.has(normalize(reference.name!))) return [];
  const guideTitle = attributedGuide(text, reference);
  const guideId = guideTitle ? guideByTitle.get(normalize(guideTitle)) : undefined;
  if (!guideId || internalStepTitles.get(guideId)?.has(normalize(reference.name!))) return [];
  return [
    `${source}: guide: «${reference.text}» — «${reference.name}» is not a step of «${guideTitle}»`,
  ];
};

/** A registered step name right after the number is the unquoted form the owner rejects: the
    name must be registered for that very number, so a padded internal number or a title of
    another step is not mistaken for the name of this reference. */
const unquotedName = (text: string, reference: StepReference): string | null => {
  if (reference.name || reference.separator) return null;
  const following = text.slice(reference.end).replace(/^\s+/u, '');
  return (
    [...(namesByNumber.get(reference.number) ?? [])].find(
      (title) =>
        following.startsWith(title) &&
        !/[\p{L}]/u.test(following.slice(title.length, title.length + 1)),
    ) ?? null
  );
};

/** A conditional clause that already has its predicate must close with a comma before the
    verb of the main clause («Если вы пришли из шага 2 «Имя», продолжайте…»). */
const commaProblems = (text: string, reference: StepReference, source: string): string[] => {
  const start = sentenceStart(text, reference.index) + 1;
  const clause = text.slice(
    start,
    reference.quoteStart >= 0 ? reference.quoteStart : reference.index,
  );
  if (!CONDITIONAL.test(clause.trimStart())) return [];
  const after = text.slice(reference.end).match(/^\s*([\p{L}]+)/u)?.[1];
  if (!after || !isVerb(after)) return [];
  if (![...clause.matchAll(/[\p{L}]+/gu)].some((word) => isVerb(word[0]))) return [];
  return [`${source}: comma: «${reference.text}» — a verb after the quote is preceded by a comma`];
};

export type CheckerOptions = { navigationForm?: boolean; genitiveGovernors?: boolean };

const caseProblems = (
  text: string,
  reference: StepReference,
  source: string,
  options: CheckerOptions,
): string[] => {
  const context = caseContext(text, reference.index);
  const expected = context.preposition
    ? PREPOSITION_FORMS[context.preposition]!
    : context.standalone
      ? BARE_FORMS
      : context.governor && options.genitiveGovernors
        ? ['шага', 'шагов']
        : null;
  if (!expected || expected.includes(reference.form)) return [];
  const governor = context.preposition ?? context.governor ?? 'standalone';
  return [`${source}: case: «${reference.text}» — «${governor}» requires ${expected.join(' / ')}`];
};

const rangeProblems = (reference: StepReference, separator: string, source: string): string[] => {
  const problems: string[] = [];
  if (!RANGE_FORMS.includes(reference.form))
    problems.push(
      `${source}: range: «${reference.text}» — a range uses plural forms (${RANGE_FORMS.join(' / ')})`,
    );
  if (separator !== EN_DASH)
    problems.push(`${source}: range: «${reference.text}» — a range uses the en dash`);
  if (reference.name)
    problems.push(`${source}: range: «${reference.text}» — a range is not named by one step title`);
  return problems;
};

const namedProblems = (text: string, reference: StepReference, source: string): string[] => {
  if (!namesByNumber.get(reference.number)?.has(normalize(reference.name!)))
    return [
      `${source}: name: «${reference.text}» — «${reference.name}» is not the name of step ${reference.number}`,
    ];
  return [
    ...attributionProblems(text, reference, source),
    ...commaProblems(text, reference, source),
  ];
};

export const stepReferenceProblems = (
  text: string,
  source: string,
  options: CheckerOptions = {},
): string[] => {
  const problems: string[] = [];
  for (const reference of stepReferences(text)) {
    problems.push(...caseProblems(text, reference, source, options));
    const unquoted = unquotedName(text, reference);
    if (unquoted)
      problems.push(
        `${source}: quote: «${reference.text}» + «${unquoted}» — a step name follows the number without «ёлочки»`,
      );
    if (reference.separator)
      problems.push(...rangeProblems(reference, reference.separator, source));
    if (reference.name) problems.push(...namedProblems(text, reference, source));
  }
  if (options.navigationForm)
    for (const match of text.matchAll(
      /(?<![\p{L}])[Шш]аг(?:а|е|у|ом|и|ов|ам|ах|ами)?\s+\d+[аб]?\s*·/gu,
    ))
      problems.push(
        `${source}: navigation: «${match[0]}» — the "N · name" form is navigation-only`,
      );
  return problems;
};
