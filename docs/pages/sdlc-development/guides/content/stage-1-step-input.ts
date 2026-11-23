import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Вход: замысел и\u00a0личная задача',
    why: 'Принятый замысел сохраняет смысл обращения. Шаг\u00a01\u00a0«Требования в Git» — уточнение его первой части: результат при ошибочном вводе; сброс будет на\u00a0шаге 2 курса, срок в\u00a0годах — на\u00a0шаге 3 курса.',
    figure: {
      html: '<figure class="course-figure course-figure--wide"><svg viewBox="0 0 1200 132" role="img" aria-labelledby="r1-input-title r1-input-desc"><title id="r1-input-title">Замысел → проверяемое поведение</title><desc id="r1-input-desc">Один замысел задаёт потребность; шаг 1 формулирует правило ошибки и\u00a0сценарий проверки.</desc><g><rect x="12" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="24" y="48" class="course-figure__title" style="font-size:18px">Замысел</text><text x="24" y="78" class="course-figure__small">понятный результат</text></g><path d="M295.5 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="310.5" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="322.5" y="48" class="course-figure__title" style="font-size:18px">Уточнение</text><text x="322.5" y="78" class="course-figure__small">что происходит при ошибке</text></g><path d="M594 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="609" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="621" y="48" class="course-figure__title" style="font-size:18px">Требование</text><text x="621" y="78" class="course-figure__small">наблюдаемое правило</text></g><path d="M892.5 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="907.5" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="919.5" y="48" class="course-figure__title" style="font-size:18px">Сценарий</text><text x="919.5" y="78" class="course-figure__small">данные и\u00a0результат</text></g></svg><figcaption>Один замысел задаёт потребность; шаг\u00a01 курса формулирует правило ошибки и\u00a0сценарий проверки.</figcaption></figure>',
    },
    actions: [
      `Откройте собственный замысел из подготовки «Зачем меняем процесс». Если начинаете сразу с\u00a0шага 1 курса, сначала составьте его по обращению и\u00a0ответам; разобранный пример используйте для самопроверки.`,
      'Назовите проблему, границы и\u00a0признаки успеха первой части; проверьте, что каждое ожидание имеет источник.',
      'В\u00a0корпоративной Jira откройте выданную лично вам задачу в\u00a0проекте вашей команды. Если её нет, создайте личную задачу по правилам учебного проекта; храните в\u00a0ней статус, обсуждение и\u00a0ссылку на вашу версию требований. Форма создания задачи в\u00a0Jira (Create Issue): тип Task, заполните Summary (название) и\u00a0описание, Priority оставьте Medium; исполнитель (Assignee)\u00a0— вы.',
    ],
    result:
      'Подготовлен содержательный замысел с\u00a0источником; личная задача связана с\u00a0работой шага 1 курса.',
    trouble:
      '<p>Если задачи нет, выберите родителем учебный эпик курса, название «Уточнить поведение результата кредитного калькулятора при ошибке» и\u00a0описание «Цель: уточнить правило ошибки и\u00a0добавить сценарий перехода от успешного расчёта к\u00a0ошибке. Результат: specification.md в\u00a0собственной ветке и\u00a0ссылка на неё». Проверьте <code>Assignee</code> — ваша корпоративная учётная запись.</p><p>Если Jira открывается, но проект вашей команды недоступен или нельзя создать задачу, обратитесь к\u00a0любому администратору проекта (<a href="../corporate-resources.html#jira">как получить доступ</a>). Если учебный эпик не находится при доступном проекте, уточните эпик у\u00a0организатора. Не создавайте новый эпик и\u00a0не дублируйте уже выданную задачу.</p><p>Если смысл неясен, уточните его у\u00a0владельца продукта; согласуйте уточнение и\u00a0сохраните его в\u00a0том же замысле.</p>',
    advanced: null,
    links: [
      [
        'Обращение и\u00a0ответы',
        'examples/credit-calculator-intents/request-and-answers.html',
        'обращение',
      ],
      [
        'Разобранный замысел',
        'examples/credit-calculator-intents/intents/clear-calculation-result.html',
        'замысел',
      ],
    ],
    nextUse: { href: '#step-02' },
  },
];
