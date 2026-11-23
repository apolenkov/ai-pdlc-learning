import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Что такое SDD: от пожелания к проверяемому требованию',
    actions: [
      'Прочитайте определение: SDD — разработка, управляемая спецификацией. Сначала команда фиксирует, что меняется, в\u00a0каких границах и\u00a0как проверят результат, и\u00a0только потом пишет код.',
      'Спецификация состоит из\u00a0пяти разделов: цель и границы, требования и сценарии, проектные замечания, открытые вопросы, условия готовности. Работа идёт по циклу: спецификация → проверки качества → реализация → подтверждения → коррекция.',
      'Различайте три вещи: <strong>требование</strong> — что должно быть; <strong>реализация</strong> — как это сделано в\u00a0коде; <strong>проверка</strong> — как убеждаются, что реализация соответствует.',
      'На схеме найдите в\u00a0проверяемом сценарии данные, действие и\u00a0ожидаемый результат.',
    ],
    why: 'Модель быстро пишет и\u00a0правит документы, поэтому каждое изменение должно быть проверяемым. Форма «Дано / Когда / Тогда» (в\u00a0OpenSpec — GIVEN / WHEN / THEN) делает поведение наблюдаемым; слово SHALL значит «должен». Реализация остаётся отдельным этапом.',
    result:
      'Вы отличаете требование от\u00a0реализации и\u00a0проверки и\u00a0можете объяснить, почему требование пишется до\u00a0кода. Проверяемое поведение вы запишете в шаге 1 курса и перенесёте в OpenSpec в шаге 3 курса.',
    links: [],
    trouble:
      'Найдите в\u00a0требовании исходные данные, действие и\u00a0ожидаемый результат. Если результат нельзя наблюдать, уточните формулировку с\u00a0куратором.',
    advanced: null,
    example: {
      label: 'Пожелание → проверяемый сценарий калькулятора',
      content:
        'Дано: сумма 120 000 ₽, ставка 0%, срок 12 месяцев.\nКогда: нажали «Рассчитать».\nТогда: ежемесячный платёж 10 000 ₽.',
    },
    screenshots: [],
    figure: {
      html: '<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 154" role="img" aria-labelledby="sdd-checkable-t sdd-checkable-d"><title id="sdd-checkable-t">От пожелания к\u00a0проверке</title><desc id="sdd-checkable-d">Расплывчатое пожелание превращается в\u00a0данные, действие и\u00a0наблюдаемый результат калькулятора.</desc><defs><marker id="sdd-checkable-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="24" y="24" width="336" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="44" y="56">Пожелание</text><text class="course-figure__small" x="44" y="86">«Калькулятор должен быть понятным»</text><text class="course-figure__small" x="44" y="110">Нельзя решить, выполнено ли оно.</text></g><path d="M360 115H432" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#sdd-checkable-arrow)"/><g><rect x="432" y="24" width="336" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="452" y="56">Дано / Когда</text><text class="course-figure__small" x="452" y="86">Дано: 120 000 ₽, 0%, 12 месяцев.</text><text class="course-figure__small" x="452" y="110">Когда: нажали «Рассчитать».</text></g><path d="M768 115H840" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#sdd-checkable-arrow)"/><g><rect x="840" y="24" width="336" height="110" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="860" y="56">Тогда</text><text class="course-figure__small" x="860" y="86">Платёж — 10 000 ₽.</text><text class="course-figure__small" x="860" y="110">Результат можно сверить с\u00a0числом.</text></g></svg></div><figcaption>Требование задаёт ожидаемое поведение; проверка сравнивает с\u00a0ним результат реализации.</figcaption></figure>',
    },
    nextUse: { href: '#step-02' },
  },
  {
    title: 'Где лежат требования и изменение',
    actions: [
      'Проследите связь главных спецификаций с\u00a0папкой изменения и\u00a0архивом.',
      'По таблице назовите автора, читателя и\u00a0момент использования каждого файла.',
      `Прочитайте жизненный цикл: изменение создают, форму проверяет <code>validate</code>, смысл проверяют люди, принятое изменение после реализации архивирует разработчик. Подробнее — в подготовке «Зачем меняем процесс», <a href="p1-zachem.html#step-05">шаг 5 «Жизнь одного изменения»</a>.`,
    ],
    why: '<code>openspec validate</code> проверяет форму документов; смысл и полноту проверяет ревью — по <a href="index.html#acceptance-rule">правилу приёмки</a>. <code>design.md</code> нужен, если задеты данные, интеграции (связи с\u00a0другими системами), безопасность или производительность; при споре подключается архитектор.',
    result:
      'Вы различаете текущие требования, предлагаемую разницу и\u00a0историю принятых изменений. В шаге 3 курса вы подготовите своё изменение. В шаге 5 курса те же файлы лежат в хранилище требований продукта.',
    links: [
      [
        'Дополнительно: полный цикл OpenSpec — статья Haulmont на Хабре',
        'https://habr.com/ru/companies/haulmont/articles/1085536/',
      ],
    ],
    trouble:
      'Начните с\u00a0proposal.md — зачем. Разница поведения находится в\u00a0specs/…/spec.md; tasks.md задаёт порядок работ. design.md появляется по\u00a0признакам.',
    advanced: null,
    screenshots: [],
    figure: {
      html: '<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 202" role="img" aria-labelledby="sdd-files-t sdd-files-d"><title id="sdd-files-t">Карта файлов OpenSpec</title><desc id="sdd-files-d">Главные спецификации служат исходным состоянием. Папка изменения содержит предложение, разницу и\u00a0задачи, design по признакам. После принятия и\u00a0реализации разница обновляет главную спецификацию, папка сохраняется в\u00a0архиве.</desc><defs><marker id="sdd-files-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="24" y="24" width="336" height="158" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="44" y="56">openspec/specs/</text><text class="course-figure__small" x="44" y="86">Главные спецификации.</text><text class="course-figure__small" x="44" y="110">Текущие принятые требования.</text><text class="course-figure__small" x="44" y="134">Читают все участники.</text></g><path d="M360 115H432" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#sdd-files-arrow)"/><g><rect x="432" y="24" width="336" height="158" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="452" y="56">openspec/changes/&lt;имя&gt;/</text><text class="course-figure__small" x="452" y="86">proposal.md — зачем меняем</text><text class="course-figure__small" x="452" y="110">specs/…/spec.md — разница</text><text class="course-figure__small" x="452" y="134">design.md — только по признакам</text><text class="course-figure__small" x="452" y="158">tasks.md — работы и\u00a0проверки</text></g><path d="M768 115H840" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#sdd-files-arrow)"/><g><rect x="840" y="24" width="336" height="158" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="860" y="56">openspec/changes/archive/</text><text class="course-figure__small" x="860" y="86">История принятого изменения.</text><text class="course-figure__small" x="860" y="110">Сохраняют после реализации.</text><text class="course-figure__small" x="860" y="134">Разница → главная спецификация.</text></g></svg></div><table class="course-figure__table"><caption>Кто пишет и\u00a0кто проверяет</caption><thead><tr><th scope="col">Файл</th><th scope="col">Автор и\u00a0момент</th><th scope="col">Читатель</th></tr></thead><tbody><tr><th scope="row">proposal.md</th><td>Автор изменения — перед согласованием объёма</td><td>Ревью: владелец продукта, аналитик, техлид; исполнитель</td></tr><tr><th scope="row">specs/…/spec.md</th><td>Аналитик — до реализации</td><td>Ревью: владелец продукта, аналитик, техлид; автор проверок</td></tr><tr><th scope="row">design.md</th><td>Архитектор — по признакам, перед кодом; черновик может готовить модель</td><td>Техлид и\u00a0аналитик</td></tr><tr><th scope="row">tasks.md</th><td>Исполнитель готовит план; закрывает после проверки результата</td><td>Владелец решения (в примере — владелец продукта) принимает сделанное</td></tr></tbody></table><figcaption>Главную спецификацию вручную не правят: её обновляет архив изменения после принятия и\u00a0проверки реализации.</figcaption></figure>',
    },
    nextUse: { href: '#step-03' },
  },
];
