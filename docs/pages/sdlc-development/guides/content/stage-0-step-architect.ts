import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Когда нужен архитектор',
    why: 'В\u00a0учебном процессе технический разбор нужен при изменении данных, интеграций, безопасности, производительности или при неразрешённом споре. Глубина design зависит от задачи; это не обязательный второй документ для каждого запроса.',
    figure: {
      html: '<figure class="course-figure course-figure--wide"><svg viewBox="0 0 1200 132" role="img" aria-labelledby="intro-6-title intro-6-desc"><title id="intro-6-title">Когда нужен архитектор</title><desc id="intro-6-desc">Понятно, когда нужен технический разбор и\u00a0как его результат связан с\u00a0требованиями.</desc><g><rect x="12" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="24" y="48" class="course-figure__title" style="font-size:18px">Запрос</text><text x="24" y="78" class="course-figure__small">границы</text></g><path d="M295.5 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="310.5" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="322.5" y="48" class="course-figure__title" style="font-size:18px">Признаки</text><text x="322.5" y="78" class="course-figure__small">риски и\u00a0спор</text></g><path d="M594 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="609" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="621" y="48" class="course-figure__title" style="font-size:18px">Разбор</text><text x="621" y="78" class="course-figure__small">решение по источникам</text></g><path d="M892.5 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="907.5" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="919.5" y="48" class="course-figure__title" style="font-size:18px">Ревью</text><text x="919.5" y="78" class="course-figure__small">принятие людьми</text></g></svg><figcaption>Понятно, когда нужен технический разбор и\u00a0как его результат связан с\u00a0требованиями.</figcaption></figure>',
    },
    actions: [
      'Проверьте, затрагивает ли запрос данные, связи с\u00a0другими системами, безопасность или производительность.',
      'Если участники не согласны с техническим решением, подключите архитектора: спор решает он.',
      'Для замысла 1 (калькулятор) ни одного признака нет: объясните, почему design.md не нужен; для замысла 2 (банковский лимит) назовите признак — связь с системой банка.',
    ],
    result:
      'Понятно, когда нужен технический разбор и\u00a0как его результат связан с\u00a0требованиями.',
    trouble:
      'Если неясно, нужен ли архитектор, сверьте четыре признака из шага и\u00a0опишите затронутые связи. Обсудите спорный случай с техлидом или архитектором до принятия требований.',
    advanced: null,
    links: [],
    nextUse: { href: '#step-07' },
  },
];
