import { courseStepLabel } from './references.ts';
import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Таймлайн: три этапа, четыре запроса',
    actions: [
      'Проследите три этапа: планирование, реализация, архив. Внутри реализации — два MR: код в репозитории сервиса и подтверждённые статусы задач в Store. Всего четыре запроса, включая планирование и архив.',
      'В учебном маршруте запрос планирования идёт в выданную базу форка требований. После реализации два запроса идут в main форков: код и тесты — в форк кода, принятое изменение со статусами tasks.md — в форк требований. После их слияния отдельный MR архива идёт в main форка требований.',
      `Откройте практику <a href="s4-product.html">шага ${courseStepLabel('5')}</a> и пройдите её; реализация и архив описаны в <a href="d1-delivery.html#step-06">практикуме разработки</a>.`,
    ],
    why: 'Требования принимают до кода. Код и подтверждённые статусы задач сохраняют в разных репозиториях, поэтому это два MR, а не один. Архив выполняют после слияния обоих результатов. Связь держат полные номера версий и таблица связей.',
    result:
      'Вы видите четыре запроса в трёх этапах и можете назвать репозиторий и целевую ветку каждого.',
    trouble:
      'Если порядок запросов путается, держите правило: требования — до кода, архив — после слияния кода и подтверждённых статусов задач.',
    links: [
      ['Шаг 5 «Контекст продукта»: практика', 's4-product.html'],
      [
        `Шаг ${courseStepLabel('7')}: сквозной цикл после шага ${courseStepLabel('5')}`,
        'd1-delivery.html',
      ],
    ],
    figure: {
      html: '<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 260" role="img" aria-labelledby="time-t time-d"><title id="time-t">Три этапа, четыре запроса одного изменения</title><desc id="time-d">Первый запрос — планирование в Store. Второй и третий — код в сервис и статусы задач в Store. После слияния обоих результатов четвёртый запрос переносит архив в main Store.</desc><defs><marker id="time-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="24" y="24" width="368" height="190" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="44" y="56">1. Планирование · один MR</text><text class="course-figure__small" x="44" y="90">Требования → выданная база Store</text><text class="course-figure__small" x="44" y="124">Изменение limit-credit-amount</text><text class="course-figure__small" x="44" y="158">Одобрение и комментарии людей</text></g><path d="M392 119H416" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#time-arrow)"/><g><rect x="416" y="24" width="368" height="190" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="436" y="56">2. Реализация · два MR</text><text class="course-figure__small" x="436" y="90">Код и тесты → main форка сервиса</text><text class="course-figure__small" x="436" y="124">tasks.md → main форка требований</text><text class="course-figure__small" x="436" y="158">Слияние обоих после проверки</text></g><path d="M784 119H808" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#time-arrow)"/><g><rect x="808" y="24" width="368" height="190" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="828" y="56">3. Архив · один MR</text><text class="course-figure__small" x="828" y="90">Архив → main форка требований</text><text class="course-figure__small" x="828" y="124">Обновление главной спецификации</text><text class="course-figure__small" x="828" y="158">Аналитик сверяет результат</text></g></svg></div><table class="course-figure__table"><caption>Кто ведёт каждый этап изменения limit-credit-amount</caption><thead><tr><th scope="col">Запрос</th><th scope="col">Куда</th><th scope="col">Где в курсе</th><th scope="col">Кто ведёт и проверяет</th></tr></thead><tbody><tr><th scope="row">Планирование</th><td>Store → выданная база</td><td>Шаг 5</td><td>Аналитик готовит MR; владелец продукта одобряет; аналитик и техлид комментируют; архитектор подключается по признакам или при споре</td></tr><tr><th scope="row">Код и тесты</th><td>main форка сервиса</td><td>Практикум</td><td>Разработчик ведёт код и проверки; аналитик подтверждает сценарии; QA принимает решение по тестированию; техлид принимает MR</td></tr><tr><th scope="row">Статусы задач</th><td>main форка требований</td><td>Практикум</td><td>Разработчик сохраняет только подтверждённые статусы tasks.md; аналитик сверяет сценарии; техлид принимает MR</td></tr><tr><th scope="row">Архив</th><td>main форка требований</td><td>Практикум</td><td>Разработчик выполняет archive; аналитик сверяет главную спецификацию; техлид принимает MR</td></tr></tbody></table><figcaption>Три этапа — не три MR. В практикуме четыре запроса: планирование, код, статусы задач и архив.</figcaption></figure>',
    },
    nextUse: { href: 's4-product.html', label: 'Контекст продукта' },
    advanced: null,
    screenshots: [],
  },
];
