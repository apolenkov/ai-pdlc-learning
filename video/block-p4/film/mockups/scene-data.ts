// Illustrative states only. No audio, production durations or word alignment.
export type State = {
  id: string;
  step?: number;
  title: string;
  machine?: 1 | 2;
  html: string;
  kind?: 'result' | 'explain';
};
const cmd = (value: string) =>
  `<p class="place">В терминале:</p><pre class="command">${value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>`;
const pair = (ui: string, value: string, note: string) =>
  `<div class="ui-action"><p class="place">В GitLab: ${ui}</p><p>${note}</p></div>${cmd(value)}`;
export const scene03: State[] = [
  {
    id: 'setup',
    step: 0,
    title: 'Создайте Store один раз',
    machine: 1,
    html: `<p class="context">Рабочая папка вне другого Git-репозитория</p>${cmd('openspec store setup product-specs --path ~/openspec/product-specs')}<p class="result">Папка, первый коммит и регистрация Store</p>`,
  },
  {
    id: 'empty-project',
    step: 1,
    title: 'Подготовьте удалённый репозиторий',
    machine: 1,
    html: '<p class="place">В GitLab: пустой проект product-specs</p><p>Без README. Скопируйте адрес Clone with SSH.</p><p class="context">Создание проекта — действие интерфейса. Команда Git не нужна.</p>',
  },
  {
    id: 'remote',
    step: 1,
    title: 'Свяжите локальный Store с проектом',
    machine: 1,
    html: cmd('git -C ~/openspec/product-specs remote add origin <адрес>'),
  },
  {
    id: 'first-push',
    step: 1,
    title: 'Отправьте первый коммит',
    machine: 1,
    html: pair(
      'Publish Branch/Push',
      'git -C ~/openspec/product-specs push -u origin HEAD',
      'Опубликуйте начальную версию Store.',
    ),
  },
  {
    id: 'clone',
    step: 2,
    title: 'Получите Store на другой машине',
    machine: 2,
    html: `<p class="place">В GitLab: Code → Clone with SSH</p><p>Скопируйте адрес репозитория product-specs.</p>${cmd('git clone <адрес> ~/openspec/product-specs')}`,
  },
  {
    id: 'register',
    step: 2,
    title: 'Зарегистрируйте клон',
    machine: 2,
    html: `${cmd('openspec store register ~/openspec/product-specs')}<p class="result">Store registered: product-specs</p>`,
  },
  {
    id: 'mkdir',
    step: 3,
    title: 'Сначала создайте каталог настроек',
    machine: 2,
    html: `<p class="context">Корень репозитория кода api</p>${cmd('mkdir -p openspec')}<p>Настройку готовит один участник; коллеги получают её из Git.</p>`,
  },
  {
    id: 'config',
    step: 3,
    title: 'Затем запишите указатель на Store',
    machine: 2,
    html: `${cmd("printf 'store: product-specs\\n' > openspec/config.yaml")}<div class="config"><p>Содержимое openspec/config.yaml</p><pre>store: product-specs</pre></div>`,
  },
  {
    id: 'init',
    step: 3,
    title: 'Только после строки store: — init',
    machine: 2,
    html: `${cmd('openspec init --tools <инструмент>')}<p class="context">Укажите инструменты команды. Без store: появятся локальные specs/changes.</p><p>Конфигурацию и команды агента отправьте отдельным MR репозитория кода.</p>`,
  },
  {
    id: 'new-change',
    step: 4,
    title: 'Создайте изменение из api',
    machine: 2,
    html: `${cmd('openspec new change exp-001-export')}<p>Результат находится в Store:</p><pre>product-specs/openspec/changes/exp-001-export/</pre><p class="context">Пока изменение только в локальном клоне; коллеги его не видят.</p>`,
  },
  {
    id: 'branch',
    step: 4,
    title: 'Отдельная ветка требований',
    machine: 2,
    html: pair(
      'Create Branch',
      'git -C ~/openspec/product-specs switch -c change/exp-001-export',
      'Создайте ветку change/exp-001-export в Store.',
    ),
  },
  {
    id: 'stage',
    step: 4,
    title: 'Выберите файлы изменения',
    machine: 2,
    html: pair(
      'Stage Changes',
      'git -C ~/openspec/product-specs add openspec/changes/exp-001-export',
      'Подготовьте изменение требований к коммиту.',
    ),
  },
  {
    id: 'commit',
    step: 4,
    title: 'Сохраните версию требований',
    machine: 2,
    html: pair(
      'Commit',
      'git -C ~/openspec/product-specs commit -m "feat: exp-001 export"',
      'Создайте коммит выбранных файлов.',
    ),
  },
  {
    id: 'push',
    step: 4,
    title: 'Опубликуйте ветку Store',
    machine: 2,
    html: pair(
      'Publish Branch/Push',
      'git -C ~/openspec/product-specs push -u origin change/exp-001-export',
      'Отправьте ветку для ревью.',
    ),
  },
  {
    id: 'merge-request',
    step: 4,
    title: 'Отправьте требования на ревью',
    machine: 2,
    html: '<p class="place">В GitLab: MR в main Store</p><div class="route"><code>change/exp-001-export</code><span>→</span><code>main</code></div><p>Команда Git не нужна.</p><p class="context">Это требования, не отправка кода. Требования принимают раньше реализации.</p>',
  },
  {
    id: 'doctor',
    step: 5,
    title: 'Проверьте структуру Store',
    machine: 2,
    kind: 'result',
    html: `${cmd('openspec store doctor product-specs')}<div class="results"><p>OpenSpec root: ok</p><p>Metadata: ok</p><p>Issues: none</p></div><p class="context">Doctor проверяет корень OpenSpec и метаданные, не принятие требований.</p>`,
  },
  {
    id: 'pull-warning',
    step: 5,
    title: 'Перед работой обновите локальный Store',
    machine: 2,
    html: '<div class="warning"><p>Синхронизации нет — перед работой забирайте изменения через <code>git pull</code>.</p></div>',
  },
];
export const scene05: State[] = [
  {
    id: 'contract',
    title: 'Контракт задачи связывает контекст и версии',
    html: '<div class="contract"><div><h2>Продукт a · запрос EXP-001</h2><p>Store: product-specs</p><p>Рабочая ветка и каталог каждого репозитория</p><p>Приёмка: сценарии и ожидаемый результат</p></div><dl><dt>Store · коммит требований</dt><dd>&lt;полный SHA Store&gt;</dd><dt>web · исходная версия</dt><dd>&lt;полный SHA web&gt;</dd><dt>api · исходная версия</dt><dd>&lt;полный SHA api&gt;</dd></dl></div><p class="context">Пример: значения подставляют из согласованного контекста, не угадывают.</p>',
  },
  {
    id: 'missing-field',
    title: 'Пустое обязательное поле останавливает работу',
    html: '<div class="missing"><p>api · исходный SHA</p><div class="empty-field">Не заполнено</div><p>Работа не подготовлена: согласуйте версию до реализации.</p></div>',
    kind: 'explain',
  },
  {
    id: 'planning',
    title: 'Планирование: требования принимают до кода',
    html: '<div class="phase"><h2>Store · MR требований</h2><p>Предложенное изменение и спецификации</p><p>Одобрение относится к коммиту требований.</p><p class="context">Код web и api начинается после принятия требований.</p></div>',
  },
  {
    id: 'code',
    title: 'Реализация: у каждого репозитория свой MR',
    html: '<div class="columns"><article><h2>web · MR кода</h2><p>Код и тесты</p><p>Свой полный SHA</p><p>Свои проверки и ревью</p></article><article><h2>api · MR кода</h2><p>Код и тесты</p><p>Свой полный SHA</p><p>Свои проверки и ревью</p></article></div><p class="context">Оба ссылаются на принятый коммит требований Store.</p>',
  },
  {
    id: 'task-status',
    title: 'Статусы задач — отдельным запросом в Store',
    html: '<div class="columns"><div class="code-group"><h2>MR кода</h2><p>web · код и тесты</p><p>api · код и тесты</p></div><article class="active"><h2>Store · отдельный MR</h2><p>Принятое изменение</p><p>Подтверждённые статусы tasks.md</p><p class="context">Статус подтверждают проверки.</p></article></div><p class="context">tasks.md остаётся в Store, не переезжает в репозитории кода.</p>',
  },
  {
    id: 'join',
    title: 'Архив ждёт все слияния',
    kind: 'result',
    html: '<div class="join-inputs"><span>web · MR кода</span><span>api · MR кода</span><span>Store · MR статусов</span></div><svg class="join-lines" viewBox="0 0 1600 100" aria-hidden="true"><path d="M266 0V40H800V100M800 0V100M1334 0V40H800" fill="none" stroke="currentColor" stroke-width="3"/></svg><div class="join-result">Все MR кода и статусов слиты</div><p class="context">Иллюстрация условия, не подтверждение реальных слияний.</p>',
  },
  {
    id: 'archive',
    title: 'Архив: отдельный MR в Store',
    kind: 'result',
    html: '<div class="phase"><p class="result">Пример: код и подтверждённые статусы слиты.</p><h2>Store · MR архива</h2><p>Действующие спецификации и архив изменения</p><p>Ссылки на итоговый полный SHA web и api</p></div>',
  },
  {
    id: 'release',
    title: 'Выпуск подтверждают по каждому сервису',
    html: '<div class="columns"><article><h2>web · выпуск</h2><p>Версия и проверенный SHA</p><p>CI и приёмка в целевой среде</p></article><article><h2>api · выпуск</h2><p>Версия и проверенный SHA</p><p>CI и приёмка в целевой среде</p></article></div><p class="context">Слияние не доказывает выпуск. Если выпуск отложен — укажите это явно.</p>',
  },
];
