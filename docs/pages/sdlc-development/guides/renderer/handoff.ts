import { renderExample } from './examples.ts';

type HandoffKind = 'markdown' | 'repo-local' | 'store';

const handoffKind = (id: string): HandoffKind =>
  id === '3-star' || id === '4-legacy' || id === '4-new'
    ? 'store'
    : id === '3'
      ? 'repo-local'
      : 'markdown';
const handoffSources = {
  markdown:
    'Передайте разработчику specification.md из своей принятой ветки: ссылку на ветку и на запрос на слияние (MR), сценарии и ссылку на ревью, если оно предусмотрено гайдом. Разработчик работает в отдельном checkout сервиса ai-pdlc-learning-stage-3; первые два учебных репозитория остаются источником ТЗ, а не местом написания кода.',
  'repo-local':
    'Передайте ссылку на принятую ветку и запрос на слияние (MR) шага\u00a03\u00a0«Изменение в OpenSpec», текущую главную спецификацию, все активные изменения и таблицу связей (requirements-traceability.md). Для сквозного маршрута главная спецификация может быть пуста; код разработчик меняет только в отдельном checkout сервиса после нового разрешения.',
  store:
    'Эта передача идёт после принятия изменения и относится к этапу разработки. Передайте название хранилища sdd-credit-calculator-product-meta, путь к его корню, версию (коммит) планирования, отдельно версию кода сервиса и полный список активных изменений. В полном примере это add-reset-and-years-term, add-payment-summary и limit-credit-amount. Требования редактируются в ai-pdlc-learning-stage-4-requirements — это совмещённый учебный Store-пример с контекстом; историческое имя sdd-credit-calculator-product-meta не задаёт рабочую модель. В рабочем продукте meta-repo хранит контекст и ссылки, отдельный &lt;продукт&gt;-specs — требования. .workspace остаётся только для чтения, код — в отдельном ai-pdlc-learning-stage-4-code.',
};
type HandoffCommand = Readonly<{ label: string; lead: string; command: string; see: string }>;
const handoffCommands: Readonly<Record<HandoffKind, readonly HandoffCommand[]>> = {
  markdown: [
    {
      label: 'Переход в рабочую копию',
      lead: 'Перейдите в рабочую копию сервиса.',
      command: 'cd "/путь/к/рабочему/ai-pdlc-learning-stage-3"',
      see: 'Увидите приглашение терминала в папке рабочей копии.',
    },
    {
      label: 'Проверка ветки',
      lead: 'Проверьте ветку и чистоту списка изменений.',
      command: 'git status --short --branch',
      see: 'Увидите имя ветки и пустой список изменений.',
    },
    {
      label: 'Установка зависимостей',
      lead: 'Установите зависимости проекта.',
      command: 'npm ci',
      see: 'Увидите установку пакетов без ошибок.',
    },
    {
      label: 'Проверка проекта',
      lead: 'Запустите проверку проекта.',
      command: 'npm run check',
      see: 'Увидите успешный результат проверки.',
    },
  ],
  'repo-local': [
    {
      label: 'Переход в репозиторий планирования',
      lead: 'Перейдите в репозиторий планирования.',
      command: 'cd "/путь/к/репозиторию планирования"',
      see: 'Увидите приглашение терминала в папке репозитория.',
    },
    {
      label: 'Проверка ветки',
      lead: 'Проверьте ветку и чистоту списка изменений.',
      command: 'git status --short --branch',
      see: 'Увидите имя ветки и пустой список изменений.',
    },
    {
      label: 'Идентификатор версии',
      lead: 'Посмотрите идентификатор сохранённой версии.',
      command: 'git rev-parse HEAD',
      see: 'Увидите полный идентификатор версии из 40 знаков; сверьте его с переданной версией.',
    },
    {
      label: 'Список активных изменений',
      lead: 'Проверьте список активных изменений.',
      command: 'openspec status --all --json',
      see: 'Увидите JSON со списком активных изменений; сверьте состав с передачей.',
    },
    {
      label: 'Проверка формы изменения',
      lead: 'Проверьте форму изменения.',
      command: 'openspec validate add-reset-and-years-term --strict',
      see: 'Увидите строку Change &#39;add-reset-and-years-term&#39; is valid; при ошибках — файл и номер правила.',
    },
  ],
  store: [
    {
      label: 'Переход в папку требований',
      lead: 'Перейдите в папку требований.',
      command: 'cd "/путь/к/ai-pdlc-learning-stage-4-requirements"',
      see: 'Увидите приглашение терминала в папке требований.',
    },
    {
      label: 'Список хранилищ',
      lead: 'Проверьте список хранилищ.',
      command: 'npm exec openspec -- store list --json',
      see: 'Увидите JSON: хранилища и их пути; проверьте sdd-credit-calculator-product-meta.',
    },
    {
      label: 'Проверка хранилища',
      lead: 'Проверьте состояние хранилища.',
      command: 'npm exec openspec -- store doctor sdd-credit-calculator-product-meta --json',
      see: 'Увидите JSON с корнем и состоянием хранилища; ошибок быть не должно.',
    },
    {
      label: 'Список активных изменений',
      lead: 'Проверьте список активных изменений в хранилище.',
      command:
        'npm exec openspec -- status --all --json --store sdd-credit-calculator-product-meta',
      see: 'Увидите JSON: корень хранилища и активные изменения; сверьте состав с передачей.',
    },
  ],
};
const renderHandoffCommands = (kind: HandoffKind) =>
  `<h4>Подготовка разработчика</h4><ol class="step-actions">${handoffCommands[kind]
    .map(
      ({ label, lead, command, see }) =>
        `<li>${lead} В терминале:${renderExample({ label, content: command })}${see}</li>`,
    )
    .join('')}</ol>`;
const afterImplementationCommands = `<h4>После реализации · корень рабочего сервиса</h4><ol class="step-actions"><li>Проверьте проект. В терминале:${renderExample({ label: 'Проверка после реализации', content: 'npm run check' })}Увидите успешный результат проверки.</li><li>Запустите сервер. В терминале:${renderExample({ label: 'Запуск сервера', content: 'npm run dev' })}Увидите адрес локального сервера; сервер работает до Ctrl+C.</li></ol>`;
const handoffMessages = {
  markdown:
    'Прочитай переданную specification.md в принятой ветке и инструкции рабочего сервиса. Проверь весь накопительный контракт, а не только последнее требование. Покажи папку, ветку, различия с существующим поведением, план реализации и проверки. Пока не меняй код. Дождись отдельного разрешения на реализацию.',
  'repo-local':
    'Прочитай текущую главную спецификацию, весь add-reset-and-years-term и add-payment-summary, если он есть, по переданной ссылке на принятую ветку. Подтверди корень требований и чистоту рабочей папки. Покажи полный список незавершённых требований и план будущей реализации, не выдумывая исходное состояние. Пока не меняй код и не запускай реализацию (Apply). Дождись отдельного разрешения.',
  store:
    'Прочитай docs/course/planning-provenance.json и каждое активное изменение в хранилище sdd-credit-calculator-product-meta с явным --store. Подтверди корень хранилища, версию планирования и отдельно версию сервиса; .workspace не редактируй. Покажи порядок будущей реализации и проверки итогового договора. Пока не запускай Apply и не меняй код. Дождись отдельного разрешения.',
};
// Where an accepted change reaches the main specification: development stage, not this course.
const archiveNote = (id: string, handoffKind: HandoffKind): string =>
  handoffKind === 'markdown' && id !== 'delivery'
    ? `<h3>Когда изменение попадает в главную спецификацию</h3><p>На шагах 1–2 курса спецификация — один файл <code>specification.md</code>, архивации нет: принятая ветка и есть действующая версия. Как это устроено в OpenSpec — <a href="p1-zachem.html#step-05">подготовка «Зачем меняем процесс», шаг 5</a>.</p>`
    : id === '4-legacy'
      ? `<h3>Когда появляется главная спецификация</h3><p>Для <code>baseline-current-state</code> реализации нет: <code>tasks.md</code> содержит сверки сценариев с наблюдениями, их подтверждает аналитик. Сразу после принятия разработчик или организатор запускает <code>openspec archive baseline-current-state</code>. Это этап разработки и не шаг курса. ADDED-требования становятся главной спецификацией <code>openspec/specs/&lt;компонент&gt;/spec.md</code>, а изменение сохраняется в <code>openspec/changes/archive/&lt;дата&gt;-baseline-current-state/</code>. Аналитик сверяет результат с принятым изменением. Главную спецификацию руками не правят — даже первую. <a href="p1-zachem.html#step-05">подготовка «Зачем меняем процесс», шаг 5</a>.</p>`
      : `<h3>Когда изменение попадает в главную спецификацию</h3><p>Это этап разработки, а не анализа: после реализации и приёмки кода разработчик запускает <code>openspec archive &lt;имя изменения&gt;</code>. Разница переносится в главную спецификацию <code>openspec/specs/&lt;возможность&gt;/spec.md</code>, а папка изменения переезжает в <code>openspec/changes/archive/&lt;дата&gt;-&lt;имя&gt;/</code>. Аналитик сверяет, что главная спецификация совпала с принятым изменением. Где посмотреть: эти две папки в репозитории требований; схема — <a href="p1-zachem.html#step-05">подготовка «Зачем меняем процесс», шаг 5</a>, панели 4–5.</p>`;

const implementationHandoff = (
  id: string,
  handoffKind: HandoffKind,
  archiveNote: string,
): string => {
  const developerHandoffUrl =
    handoffKind === 'store'
      ? 'https://github.com/apolenkov/ai-pdlc-learning-stage-4-code/blob/main/docs/developer-handoff.md'
      : 'https://github.com/apolenkov/ai-pdlc-learning-stage-3/blob/main/docs/developer-handoff.md';
  const implementationHandoffBody = `<div class="beginner-extra__body"><p>${handoffSources[handoffKind]}</p><p>Сначала согласованный источник → папки и ветка → план → отдельное разрешение на код. Эти команды проверяют подготовку и план, а не выполняют реализацию.</p>${renderHandoffCommands(handoffKind)}${renderExample({ label: 'Первое сообщение разработчика модели', content: handoffMessages[handoffKind] })}${handoffKind === 'store' ? `<p><strong>Дальше — практикум.</strong> <a href="d1-delivery.html">шаг\u00a07\u00a0«Практикум разработки»</a>: код, независимая проверка, приёмка разработчиком и аналитиком, слияние в main форков и архив.</p>` : ''}<p>Только после разрешения разработчик выполняет план, проверяет весь накопительный контракт и запускает сервис. Зелёные проверки исходной основы не означают, что новые функции уже готовы.</p>${afterImplementationCommands}<p>Откройте адрес из терминала и проверьте согласованные сценарии в браузере. При несовпадении ветки, root или SHA остановитесь; не сбрасывайте чужие правки.</p>${archiveNote}<p><a href="d1-delivery.html">шаг\u00a07\u00a0«Практикум разработки»</a> · <a href="${developerHandoffUrl}">Подробные команды передачи разработчику</a></p></div>`;
  return id === '0' ||
    id === '0a' ||
    id === '1' ||
    id === 'sdd' ||
    id === '4-team' ||
    id === 'delivery' ||
    id === 'i1' ||
    id === 'i2' ||
    id === 'i3' ||
    id === 'i4'
    ? ''
    : id === '4-legacy'
      ? `<details class="beginner-extra" id="implementation"><summary>После принятия · архив выполняет разработчик или организатор</summary><div class="beginner-extra__body">${archiveNote}</div></details>`
      : id === '4-new'
        ? `<details class="beginner-extra" id="implementation"><summary>После принятия · реализация и архив на этапе разработки</summary><div class="beginner-extra__body"><p>После принятия изменения разработчик готовит план и получает отдельное разрешение на код; реализация и приёмка относятся к этапу разработки.</p>${archiveNote}<p><a href="d1-delivery.html">шаг\u00a07\u00a0«Практикум разработки»</a></p></div></details>`
        : id === '3-star'
          ? `<details class="card card--wide beginner-extra" id="implementation"><summary>Передача разработчику после принятия изменения</summary>${implementationHandoffBody}</details>`
          : `<details class="beginner-extra" id="implementation"><summary>Как передать в разработку · после принятия изменения</summary>${implementationHandoffBody}</details>`;
};

export const guideHandoff = (id: string) => {
  const kind = handoffKind(id);
  const note = archiveNote(id, kind);
  return { archiveNote: note, implementationHandoff: implementationHandoff(id, kind, note) };
};
