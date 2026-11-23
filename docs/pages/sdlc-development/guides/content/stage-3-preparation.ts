import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

const branchActions = [
  'Для каждого действия выберите UI или терминал, второй способ не повторяйте. В VS Code: откройте ту же папку шагов 1–2, проверьте принятую ветку <code>course/your_login/stage-2-reset</code> и пустой Source Control.<br>В терминале:<pre><code>git status --short --branch</code></pre>Ожидается stage-2-reset без файловых изменений; при другом состоянии сверьтесь с организатором до создания ветки.',
  'В VS Code: нажмите имя ветки → <strong>Create new branch</strong> → <code>course/your_login/stage-3-reset-years</code>.<br>В терминале:<pre><code>git switch -c course/your_login/stage-3-reset-years</code></pre>Создана личная ветка от принятого результата шага 2 курса.',
  'В VS Code: после создания проверьте имя <code>course/your_login/stage-3-reset-years</code> и пустой Source Control.<br>В терминале:<pre><code>git status --short --branch</code></pre>Ожидается <code>## course/your_login/stage-3-reset-years</code> без файловых изменений. Ваш specification.md остался в той же папке; можно переходить к смене правил этапа.',
];

export const steps: LearnerStep[] = [
  {
    title: 'Откройте замысел и\u00a0задачу шага 3 курса',
    why: 'Один замысел сохраняет смысл запроса во всём маршруте. Проверенные требования шага 2 курса — исходная версия, которую нужно перенести без потерь.',
    actions: [
      'Прочитайте свой замысел и\u00a0принятый результат шага 2 курса. Назовите часть про срок в\u00a0годах и\u00a0источник ответа; не создавайте новый замысел ради перехода к шагу 3 курса.',
      'В\u00a0браузере откройте выданную лично вам задачу в\u00a0проекте вашей команды. Если её нет, создайте задачу с\u00a0согласованным родителем, названием «Перенести спецификацию в\u00a0OpenSpec и\u00a0добавить срок в\u00a0годах» и\u00a0укажите себя исполнителем. Форма создания задачи в\u00a0Jira (Create Issue): тип Task, заполните Summary (название) и\u00a0описание, Priority оставьте Medium; исполнитель (Assignee)\u00a0— вы.',
      'В\u00a0Jira храните статус, обсуждение и\u00a0ссылку на изменение. Пока оставьте ссылку на принятый запрос шага 2 курса; после создания запроса шага 3 курса замените её одной ссылкой на запрос на слияние (Merge Request, MR).',
      'Проверьте вход и\u00a0откройте в\u00a0VS Code прежнюю рабочую копию шагов 1–2 курса — папку репозитория на вашем компьютере.',
    ],
    result:
      'Jira связывает принятый результат шага 2 курса с\u00a0результатом шага 3 курса: требованиями и\u00a0планом без реализации.',
    links: [],
    trouble:
      'Если задача или родитель не определены, сохраните ссылку и\u00a0ветку для организатора; не подставляйте случайный Jira-ключ и\u00a0не объявляйте будущую функцию реализованной.',
    advanced: null,
    example: {
      label: 'Связь с\u00a0задачей Jira',
      content:
        'Jira: одна ссылка на запрос с add-reset-and-years-term.\nВ proposal.md: замысел 1, принятый запрос шага 2, ветка course/your_login/stage-2-reset.\nВыход: proposal.md, разница требований, tasks.md и таблица связей; design.md по признакам.\nКод не меняется, реализация не запускается.',
    },
    figure: {
      html: '<figure class="course-figure course-figure--wide"><svg viewBox="0 0 1200 132" role="img" aria-labelledby="r3-input-title r3-input-desc"><title id="r3-input-title">Вход в шаг 3: замысел и\u00a0проверенный результат шага 2</title><desc id="r3-input-desc">Принятые требования и\u00a0тот же замысел становятся источниками комплекта OpenSpec.</desc><g><rect x="12" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="24" y="48" class="course-figure__title" style="font-size:18px">Замысел</text><text x="24" y="78" class="course-figure__small">согласованный смысл</text></g><path d="M295.5 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="310.5" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="322.5" y="48" class="course-figure__title" style="font-size:18px">Шаг 2</text><text x="322.5" y="78" class="course-figure__small">восемь сценариев</text></g><path d="M594 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="609" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="621" y="48" class="course-figure__title" style="font-size:18px">Шаг 3</text><text x="621" y="78" class="course-figure__small">перенос и\u00a0срок в\u00a0годах</text></g><path d="M892.5 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="907.5" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="919.5" y="48" class="course-figure__title" style="font-size:18px">Передача</text><text x="919.5" y="78" class="course-figure__small">источники и\u00a0версия</text></g></svg><figcaption>Принятые требования и\u00a0тот же замысел становятся источниками комплекта OpenSpec.</figcaption></figure>',
    },
    nextUse: { href: '#step-02' },
  },
  {
    title: 'Создайте свою ветку от результата шага 2 курса',
    entryMode: {
      a: 'А — со своим результатом шага\u00a02',
      b: 'Б — отдельный старт с учебного образца',
    },
    variantB:
      '<h4>Вариант Б — старт с учебного образца шага 3 курса</h4><p>Учебный образец — подготовленная точка входа с\u00a0приложением и\u00a0собственным проверяемым состоянием, а\u00a0не ваша история шагов 1–2 курса. Для каждого действия выберите UI или терминал, не выполняйте оба способа подряд.</p><ol><li>В GitLab: откройте образец и нажмите Fork → своё пространство → Create fork. Создан ваш форк.</li><li>В VS Code: выберите Git: Clone, адрес своего форка и папку назначения. В терминале:<pre><code>git clone https://gitlab.example.invalid/your_login/ai-pdlc-learning-stage-3.git</code></pre>Увидите новую папку ai-pdlc-learning-stage-3 с файлами и историей.</li><li>В VS Code: откройте созданную папку через File → Open Folder. В терминале родительской папки:<pre><code>cd ai-pdlc-learning-stage-3</code></pre>Увидите приглашение терминала с именем папки.</li><li>В VS Code: выполните Git: Create Branch From → origin/main → course/your_login/stage-3-base. В терминале:<pre><code>git switch -c course/your_login/stage-3-base origin/main</code></pre>Увидите сообщение о переключении на новую ветку.</li><li>Установите зависимости проекта. В терминале:<pre><code>npm ci</code></pre>Увидите установку пакетов без ошибок.</li><li>Запустите проверку проекта. В терминале:<pre><code>npm run check</code></pre>Увидите успешный результат проверки.</li><li>В VS Code: нажмите Publish Branch и выберите свой форк origin. В терминале:<pre><code>git push -u origin course/your_login/stage-3-base</code></pre>Увидите строки отправки.</li><li>В VS Code: нажмите имя ветки → Create new branch → course/your_login/stage-3-reset-years. В терминале:<pre><code>git switch -c course/your_login/stage-3-reset-years</code></pre>Увидите сообщение о переключении на новую ветку.</li><li>В VS Code: проверьте имя ветки в строке состояния и пустой Source Control. В терминале:<pre><code>git status --short --branch</code></pre>Увидите имя stage-3-reset-years и пустой список изменений.</li></ol><p>После команд следуйте README учебного образца от раздела «Сверьте baseline» («Сверьте исходное состояние») и\u00a0продолжайте этот гайд со смены правил этапа. Дальше по маршруту: перенос восьми сценариев и\u00a0удаление specification.md к\u00a0образцу не применяются — состав требований и\u00a0числа фиксируйте только по его фактическим файлам.</p>',
    actions: branchActions,
    why: 'Своя ветка наследует принятую версию шага 2 курса. Работа с\u00a0веткой — <a href="p2-git.html#step-06">подготовка «Markdown, Git, GitLab»: раздел «Создайте ветку для другой границы»</a>.',
    gitNote: 'Для создания форка в GitLab команда Git не нужна.',
    result:
      'Личная ветка <code>course/your_login/stage-3-reset-years</code> создана от проверенного исходного состояния; список изменений пуст.',
    links: [],
    trouble:
      'Если в\u00a0строке состояния другая ветка или список изменений не пуст, остановитесь; при сомнении в\u00a0источнике сверьте точную сохранённую версию в\u00a0закрытом блоке «Продвинутый вариант». Работайте только в личной ветке <code>course/your_login/stage-3-reset-years</code>; не подставляйте main вместо неё; правки и историю сохраняйте; принудительную отправку не применяйте.',
    advanced: `<p>Те же действия из принятой ветки шага 2 курса. Выберите UI или терминал для каждого пункта, не создавайте ветку повторно.</p><ol>${branchActions.map((action) => `<li>${action}</li>`).join('')}</ol><p>HEAD — последняя сохранённая версия выбранной ветки. Только при сомнении в источнике, до создания ветки: в GitLab откройте последний рассмотренный коммит принятого MR шага 2 и скопируйте SHA.<br>В терминале:<pre><code>git rev-parse HEAD</code></pre>Идентификатор должен совпасть с рассмотренным коммитом; при расхождении сохраните состояние и обратитесь к организатору.</p>`,
    screenshots: [
      {
        src: 'assets/route-r3-vscode-create-branch.png',
        previews: [
          {
            src: 'assets/route-r3-vscode-create-branch-600.webp',
            width: 600,
          },
          {
            src: 'assets/route-r3-vscode-create-branch-1200.webp',
            width: 1200,
          },
        ],
        width: 2880,
        height: 620,
        alt: 'Палитра веток VS Code с\u00a0введённым именем course/demo/stage-3-reset-years и\u00a0выбранным пунктом Create new branch; новая ветка создаётся от базы course/demo/stage-2-reset.',
        caption:
          'Создание ветки шага 3 курса в\u00a0VS Code над принятым результатом шага 2 курса: имя course/demo/stage-3-reset-years введено в\u00a0палитру, базой служит ветка stage-2-reset, а\u00a0новая ветка наследует последнюю версию без поиска её идентификатора.',
      },
    ],
    figure: {
      html: '<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 178" role="img" aria-labelledby="r3-branch-t r3-branch-d"><title id="r3-branch-t">Новая ветка от принятой версии шага 2</title><desc id="r3-branch-d">Ученик проверяет принятую ветку шага 2 и\u00a0чистоту списка изменений, затем создаёт личную ветку шага 3 в\u00a0той же рабочей копии.</desc><defs><marker id="r3-branch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="24" y="24" width="336" height="134" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="44" y="56">Принятый шаг 2</text><text class="course-figure__small" x="44" y="86">course/your_login/</text><text class="course-figure__small" x="44" y="110">stage-2-reset</text><text class="course-figure__small" x="44" y="134">Source Control — список пуст.</text></g><path d="M360 115H432" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r3-branch-arrow)"/><g><rect x="432" y="24" width="336" height="134" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="452" y="56">Та же папка · VS Code</text><text class="course-figure__small" x="452" y="86">Create new branch</text><text class="course-figure__small" x="452" y="110">Наследуем последний вариант шага 2.</text><text class="course-figure__small" x="452" y="134">Вторую копию не скачиваем.</text></g><path d="M768 115H840" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r3-branch-arrow)"/><g><rect x="840" y="24" width="336" height="134" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="860" y="56">Своя ветка шага 3</text><text class="course-figure__small" x="860" y="86">course/your_login/</text><text class="course-figure__small" x="860" y="110">stage-3-reset-years</text><text class="course-figure__small" x="860" y="134">Дальше — правила этапа.</text></g></svg></div><figcaption>Новая ветка создаётся от проверенного источника в\u00a0той же рабочей копии — вторая копия не\u00a0скачивается.</figcaption></figure>',
    },
    nextUse: { href: '#step-03' },
  },
  {
    title: 'Обновите правила и\u00a0подготовьте OpenSpec',
    entryMode: {
      a: 'А — со своим результатом шага\u00a02',
      b: 'Б — отдельный старт с учебного образца',
    },
    variantB:
      '<h4>Вариант Б — учебный образец</h4><p>В\u00a0учебном образце шага 3 курса OpenSpec и\u00a0инструкции уже настроены: правка AGENTS.md и\u00a0команда init не нужны — прочитайте <code>AGENTS.md</code> и <code>openspec/config.yaml</code>, затем переходите к\u00a0созданию папки изменения. При выборе OpenCode на личном компьютере по корпоративной инструкции его инициализация создаёт <code>.opencode/skills</code>; проверяйте и\u00a0сохраняйте только фактически созданный каталог.</p>',
    actions: [
      'В\u00a0VS Code обновите <code>AGENTS.md</code>: замените только раздел правил текущего этапа блоком ниже; команды, соглашения и\u00a0остальные запреты сохраните. Модель читает <code>AGENTS.md</code> при каждом вызове, поэтому файл задаёт границы этапа: что сейчас можно и\u00a0нельзя, в\u00a0частности нельзя выполнять шаг за\u00a0ученика. Зачем нужен этот файл\u00a0— в\u00a0<a href="p4-metarepository.html#readme-agents">подготовке «Мета-репозиторий», раздел «README.md, AGENTS.md и\u00a0CONTEXT.md»</a>.',
      'Там же обновите раздел текущего этапа в <code>README.md</code>: замените <code>Текущий этап: шаг 2; требования в specification.md</code> на <code>Текущий этап: шаг 3; переносим восемь сценариев шага 2 в openspec/changes/add-reset-and-years-term; исходник specification.md остаётся до сверки</code>. README читают человек и проверка курса: по нему видно, где сейчас лежат требования. После сверки обновите итоговую ссылку на\u00a0шаге 6.',
      'Во встроенном терминале VS Code из корня проекта выполните <code>openspec init --tools none --language ru --no-animation .</code>: команда создаёт структуру OpenSpec; <code>--tools none</code> означает «без создания инструкций для модели».',
      'Проверьте созданные файлы: <code>openspec/config.yaml</code> (настройки OpenSpec) и <code>openspec/specs/.gitkeep</code> (служебный файл для сохранения пустой папки главных спецификаций в\u00a0Git). В <code>.kilo/skills</code> уже лежат инструкции для модели; <code>init</code> их не создаёт и\u00a0не меняет. Логины, кеш и\u00a0личные настройки в\u00a0Git не добавляйте. Затем переходите к\u00a0работе с\u00a0изменением.',
    ],
    why: 'Инструкции для модели в <code>.kilo/skills</code> уже входят в\u00a0рабочую копию. <code>openspec init --tools none</code> создаёт структуру OpenSpec; модель не запускается. Команда <code>init</code> не создаёт и\u00a0не меняет эти инструкции.',
    result:
      'Правила AGENTS.md согласованы с\u00a0шагом 3 курса; структура OpenSpec подготовлена в\u00a0существующем репозитории документов. Markdown — текстовый формат с\u00a0разметкой; инструкции для модели уже входят в\u00a0рабочую копию.',
    links: [],
    trouble:
      'Если <code>node</code> или <code>openspec</code> не найдены, инициализация завершилась ошибкой или открыта другая корневая папка, остановитесь и\u00a0передайте точную ошибку организатору. Если <code>.kilo/skills</code> отсутствует в\u00a0рабочей копии, передайте состояние организатору: не создавайте инструкции сами.',
    advanced:
      '<p>В VS Code: откройте встроенный терминал в корне той же рабочей копии на ветке <code>course/your_login/stage-3-reset-years</code>. Это альтернатива основному порядку: правки AGENTS.md и README.md делайте в редакторе, уже выполненный init повторно не запускайте. Команды по шагам:</p><ol><li>Проверьте версию Node. В терминале:<pre><code>node --version</code></pre>Увидите номер версии Node.</li><li>Проверьте версию OpenSpec. В терминале:<pre><code>openspec --version</code></pre>Увидите номер версии OpenSpec.</li><li>В VS Code: проверьте список Source Control.<br>В терминале:<pre><code>git status --short</code></pre>После редактирования ожидаются AGENTS.md и README.md; пустой вывод допустим только до этих правок. Посторонние изменения сначала разберите с организатором.</li><li>Настройте OpenSpec в папке. В терминале:<pre><code>openspec init --tools none --language ru --no-animation .</code></pre>Увидите сообщение о настройке OpenSpec.</li><li>В VS Code: снова проверьте Source Control.<br>В терминале:<pre><code>git status --short</code></pre>Увидите новые файлы OpenSpec в списке изменений.</li></ol>',
    example: {
      label: 'Встроенный терминал VS Code · корень репозитория',
      content: 'openspec init --tools none --language ru --no-animation .',
    },
    examples: [
      {
        label:
          'Раздел правил шага 3 курса для AGENTS.md (заменяет правила предыдущего этапа; остальной файл сохраняется)',
        content:
          'Текущий этап: ручная работа ученика с OpenSpec (шаг 3). Разрешены документы планирования OpenSpec и трассировка требований.\nНа этом этапе приложение не разрабатывается и не проверяется: все унаследованные и новые требования остаются в активном изменении с незавершёнными задачами.\nЗапрещены код, реализация по задачам, архивирование и перенос разницы и закрытие задач реализации. Модель подключается только в отдельном необязательном упражнении после принятия документов шага 3.',
      },
    ],
    screenshots: [
      {
        src: 'assets/route-r3-vscode-init-current.jpg',
        previews: [
          {
            src: 'assets/route-r3-vscode-init-current-600.webp',
            width: 600,
          },
          {
            src: 'assets/route-r3-vscode-init-current-1152.webp',
            width: 1152,
          },
        ],
        width: 1152,
        height: 768,
        alt: 'Проводник VS Code после openspec init --tools none на ветке course/demo/stage-3-reset-years: раскрытый .kilo/skills с\u00a0openspec-explore, openspec-propose и\u00a0openspec-update-change и\u00a0новый корень openspec с\u00a0changes, спецификации и\u00a0config.yaml; в\u00a0редакторе открыт созданный config.yaml со schema: spec-driven и\u00a0Language: ru.',
        caption:
          'Реальный кадр после openspec init --tools none на демо-ветке course/demo/stage-3-reset-years: маркер 1 — .kilo/skills, уже входившие в\u00a0рабочую копию; маркер 2 — созданный командой корень openspec с\u00a0открытым config.yaml. Обновление AGENTS.md и\u00a0README.md кадром не подтверждается — проверьте в\u00a0своей рабочей копии.',
        markers: [
          {
            label: '1',
            left: 5,
            top: 12.4,
            width: 19.5,
            height: 18.5,
          },
          {
            label: '2',
            left: 5,
            top: 34.4,
            width: 15,
            height: 10.5,
          },
        ],
      },
    ],
    figure: {
      html: '<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 178" role="img" aria-labelledby="r3-init-t r3-init-d"><title id="r3-init-t">Правила этапа и\u00a0корень OpenSpec</title><desc id="r3-init-d">Ученик обновляет правила и\u00a0README, выполняет init и\u00a0проверяет созданные файлы без изменения приложения.</desc><defs><marker id="r3-init-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="24" y="24" width="336" height="134" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="44" y="56">Правила этапа</text><text class="course-figure__small" x="44" y="86">AGENTS.md и\u00a0README.md</text><text class="course-figure__small" x="44" y="110">Шаг 3 — только документы.</text><text class="course-figure__small" x="44" y="134">Общие ограничения сохраняются.</text></g><path d="M360 115H432" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r3-init-arrow)"/><g><rect x="432" y="24" width="336" height="134" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="452" y="56">Инициализация</text><text class="course-figure__small" x="452" y="86">openspec init --tools none</text><text class="course-figure__small" x="452" y="110">Создать OpenSpec без инструкций модели.</text><text class="course-figure__small" x="452" y="134">В\u00a0существующей папке проекта.</text></g><path d="M768 115H840" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r3-init-arrow)"/><g><rect x="840" y="24" width="336" height="134" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="860" y="56">Проверка результата</text><text class="course-figure__small" x="860" y="86">config.yaml — настройки</text><text class="course-figure__small" x="860" y="110">.gitkeep — хранит пустую папку</text><text class="course-figure__small" x="860" y="134">.kilo/skills — инструкции модели.</text></g></svg></div><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 154" role="img" aria-labelledby="r3-design-t r3-design-d"><title id="r3-design-t">Нужен ли design.md?</title><desc id="r3-design-d">В\u00a0замысле шага 3 нет хранения данных, внешних интеграций, изменений безопасности и\u00a0требований к производительности: design.md не нужен.</desc><g><rect x="24" y="24" width="264" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="44" y="56">Данные</text><text class="course-figure__small" x="44" y="86">Не храним введённые цифры.</text><text class="course-figure__small" x="44" y="110">Признак не затронут.</text></g><g><rect x="320" y="24" width="264" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="340" y="56">Связи с\u00a0системами</text><text class="course-figure__small" x="340" y="86">Никуда не отправляем цифры.</text><text class="course-figure__small" x="340" y="110">Другие системы не меняем.</text></g><g><rect x="616" y="24" width="264" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="636" y="56">Безопасность</text><text class="course-figure__small" x="636" y="86">Права доступа не меняем.</text><text class="course-figure__small" x="636" y="110">Признак не затронут.</text></g><g><rect x="912" y="24" width="264" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="932" y="56">Скорость работы</text><text class="course-figure__small" x="932" y="86">Расчёт остаётся локальным.</text><text class="course-figure__small" x="932" y="110">Признак не затронут.</text></g></svg></div><figcaption>Для этого замысла design.md не нужен. Если появится признак или спор, архитектор запишет решение в\u00a0design.md и\u00a0оставит комментарий.</figcaption></figure><figure class="course-figure course-figure--wide course-figure--process layout-shift"><div class="course-figure__viewport layout-shift__wide" role="group" tabindex="0" aria-label="Схема с горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 296" role="img" aria-labelledby="ls-r3-t ls-r3-d"><title id="ls-r3-t">Временная раскладка → целевая</title><desc id="ls-r3-d">Слева учебный репозиторий шагов 1–3: specification.md, intents/ и openspec/ в одном репозитории. Справа рабочая модель команды: product-meta хранит контекст и ссылки, отдельный product-specs — openspec/specs/ и openspec/changes/, а код сервисов лежит в своих репозиториях с указателем store: product-specs. Учебное исключение шага 5 описано в подписи.</desc><defs><marker id="ls-r3-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><rect x="24" y="16" width="520" height="236" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="44" y="48">Сейчас · шаги 1–3</text><text class="course-figure__file" x="44" y="82">ai-pdlc-learning-…/</text><text class="course-figure__file" x="64" y="110">specification.md</text><text class="course-figure__small" x="300" y="110">шаги 1–2</text><text class="course-figure__file" x="64" y="138">intents/</text><text class="course-figure__small" x="300" y="138">из подготовки</text><text class="course-figure__file" x="64" y="166">openspec/</text><text class="course-figure__small" x="300" y="166">появляется на шаге 3</text><text class="course-figure__file" x="84" y="194">specs/ · changes/</text><text class="course-figure__small" x="44" y="232">Всё в одном репозитории: временно, для обучения.</text><path d="M552 134H632" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#ls-r3-arrow)"/><rect x="640" y="16" width="536" height="264" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="660" y="48">Цель · рабочая модель команды</text><text class="course-figure__file" x="660" y="82">product-meta/</text><text class="course-figure__small" x="900" y="82">контекст и ссылки</text><text class="course-figure__file" x="680" y="110">README.md · product.yaml</text><text class="course-figure__file" x="680" y="138">services.lock.yaml · intents/</text><text class="course-figure__file" x="660" y="166">product-specs/</text><text class="course-figure__small" x="900" y="166">отдельный Store</text><text class="course-figure__file" x="680" y="194">openspec/specs/ · openspec/changes/</text><text class="course-figure__file" x="660" y="230">service-a/</text><text class="course-figure__small" x="900" y="230">код, свой репозиторий</text><text class="course-figure__file" x="680" y="258">store: product-specs</text><text class="course-figure__small" x="960" y="258">указатель на Store</text></svg></div><div class="course-figure__viewport layout-shift__narrow" role="group" tabindex="0" aria-label="Схема раскладки для узкого окна"><svg viewBox="0 0 360 548" role="img" aria-labelledby="lsn-r3-t lsn-r3-d"><title id="lsn-r3-t">Временная раскладка → целевая (узкий экран)</title><desc id="lsn-r3-d">Сверху учебный репозиторий шагов 1–3: specification.md, intents/ и openspec/ в одном репозитории. Вторая часть схемы — рабочая модель команды: product-meta хранит контекст и ссылки, отдельный product-specs — openspec/specs/ и openspec/changes/, а код сервиса лежит в своём репозитории с указателем store: product-specs. Учебное исключение шага 5 описано в подписи.</desc><defs><marker id="lsn-r3-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><rect x="8" y="8" width="344" height="212" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="24" y="40">Сейчас · шаги 1–3</text><text class="course-figure__file" x="24" y="68">ai-pdlc-learning-…/</text><text class="course-figure__file" x="40" y="94">specification.md</text><text class="course-figure__small" x="230" y="94">шаги 1–2</text><text class="course-figure__file" x="40" y="120">intents/</text><text class="course-figure__small" x="230" y="120">из подготовки</text><text class="course-figure__file" x="40" y="146">openspec/</text><text class="course-figure__small" x="230" y="146">с шага 3</text><text class="course-figure__file" x="56" y="172">specs/ · changes/</text><text class="course-figure__small" x="24" y="204">Всё в одном репозитории: временно.</text><path d="M180 224V250" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#lsn-r3-arrow)"/><rect x="8" y="256" width="344" height="284" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="24" y="288">Цель · рабочая модель команды</text><text class="course-figure__file" x="24" y="316">product-meta/</text><text class="course-figure__small" x="200" y="316">контекст и ссылки</text><text class="course-figure__file" x="40" y="342">README.md · product.yaml</text><text class="course-figure__file" x="40" y="368">services.lock.yaml · intents/</text><text class="course-figure__file" x="24" y="396">product-specs/</text><text class="course-figure__small" x="200" y="396">отдельный Store</text><text class="course-figure__file" x="40" y="422"><tspan x="40">openspec/specs/</tspan><tspan x="40" dy="22">openspec/changes/</tspan></text><text class="course-figure__file" x="24" y="482">service-a/</text><text class="course-figure__small" x="200" y="482">свой репозиторий</text><text class="course-figure__file" x="40" y="512">store: product-specs</text></svg></div><figcaption><strong>Временная раскладка → целевая.</strong> В работе команды meta-repo и Store — отдельные репозитории, код сервисов хранится отдельно. На шаге 5 курса выдан совмещённый учебный Store-пример <code>ai-pdlc-learning-stage-4-requirements</code>: контекст и требования вместе, код — в <code>ai-pdlc-learning-stage-4-code</code>. Историческое имя Store <code>sdd-credit-calculator-product-meta</code> сохранено для комплекта; это учебное исключение, а не рабочая модель команды.</figcaption></figure>',
    },
    nextUse: { href: '#step-04' },
  },
];
