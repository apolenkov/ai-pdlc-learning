import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Где хранятся смысл, требования и\u00a0статус',
    why: 'В\u00a0нашем учебном процессе задача хранит статус и\u00a0обсуждение, замысел — что нужно и зачем, спецификация — поведение. Ссылки связывают их. В\u00a0другой команде источник может быть устроен иначе; его нужно назвать явно.',
    figure: {
      html: '<figure class="course-figure course-figure--wide"><svg viewBox="0 0 1200 132" role="img" aria-labelledby="intro-3-title intro-3-desc"><title id="intro-3-title">Где хранятся смысл, требования и\u00a0статус</title><desc id="intro-3-desc">Источники названы и\u00a0связаны; обсуждение, подготовленный документ и\u00a0принятая версия различаются.</desc><g><rect x="12" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="24" y="48" class="course-figure__title" style="font-size:18px">Обращение</text><text x="24" y="78" class="course-figure__small">источник</text></g><path d="M295.5 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="310.5" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="322.5" y="48" class="course-figure__title" style="font-size:18px">Замысел</text><text x="322.5" y="78" class="course-figure__small">смысл</text></g><path d="M594 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="609" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="621" y="48" class="course-figure__title" style="font-size:18px">Требования</text><text x="621" y="78" class="course-figure__small">поведение</text></g><path d="M892.5 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="907.5" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="919.5" y="48" class="course-figure__title" style="font-size:18px">Задача</text><text x="919.5" y="78" class="course-figure__small">статус и\u00a0связи</text></g></svg></figure>',
    },
    actions: [
      'Назовите, где ваша команда хранит исходное обращение, согласованный смысл, требования и\u00a0статус.',
      'Свяжите задачу с\u00a0конкретной версией документа; в\u00a0документе укажите источник запроса.',
      'Если ревью уточнило поведение, внесите согласованное уточнение в\u00a0требования до принятия новой версии.',
    ],
    result:
      'Источники названы и\u00a0связаны; обсуждение, подготовленный документ и\u00a0принятая версия различаются.',
    trouble:
      'Если источники расходятся, найдите ссылку на обращение и\u00a0последнее подтверждённое решение с\u00a0датой. Неподтверждённую версию отметьте вопросом; по одной дате страницы решение не выбирают.',
    advanced: null,
    links: [],
    nextUse: { href: '#step-04' },
  },
];
