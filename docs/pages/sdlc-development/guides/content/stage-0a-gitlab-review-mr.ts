import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    anchor: 'step-10',
    title: 'Откройте Merge Request для intent.md',
    why: 'Merge Request (MR) — запрос проверить правки между исходной веткой и целевой. Изменения переносит не MR, а Merge позже. Целевую ветку и проверяющих определяет проект; в этом примере целевая ветка — main.',
    actions: [
      'В GitLab: в выбранном проекте откройте <strong>Merge requests</strong> («Запросы на слияние») → <strong>New merge request</strong> («Создать запрос»). В GitHub такой запрос называется Pull Request. Pull получает изменения из GitLab.',
      'В GitLab: выберите <strong>Source branch</strong> («Исходная ветка») limit-rows и <strong>Target branch</strong> («Целевая ветка») main. При форке также проверьте исходный и целевой проекты. Нажмите <strong>Compare branches and continue</strong> («Сравнить ветки и продолжить»).',
      'В GitLab: во вкладке <strong>Changes</strong> должна быть только новая строка intent.md. В описании MR укажите цель «Добавить предел выгрузки» и способ проверки: прочитать список «Границы» в intent.md и сравнить его с прежней версией.',
      'В GitLab: в <strong>Reviewer</strong> («Проверяющий») выберите коллегу и нажмите <strong>Create merge request</strong> («Создать запрос»). GitLab присвоит номер, например !1. Сохраните ссылку: следующие шаги относятся к этому MR.',
    ],
    gitNote: 'Для создания MR в GitLab команда Git не нужна.',
    result:
      'В одном MR видны добавленная строка, авторская ветка и целевая main: под заголовком запроса — ветки limit-rows → main, справа — раздел Reviewer, ниже — вкладки Commits и Changes.',
    trouble:
      'Если ветка limit-rows не появилась, сначала проверьте, отправлен ли Push в нужный проект. Если непонятна целевая ветка или нет права создать запрос, уточните у владельца проекта.',
    advanced: null,
    links: [
      [
        'Создание Merge Request',
        'https://docs.gitlab.com/user/project/merge_requests/creating_merge_requests/',
      ],
    ],
    nextUse: { href: '#step-11' },
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с горизонтальной прокруткой при узком окне"><svg viewBox="0 12 1200 108" role="img" aria-labelledby="flow-step-06-title flow-step-06-desc"><title id="flow-step-06-title">Предложить изменение</title><desc id="flow-step-06-desc">Ветка limit-rows → Создать MR → Merge Request !1 → Указать цель → Целевая ветка main.</desc><defs><marker id="flow-step-06-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="24" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="160" y="72" text-anchor="middle">Ветка limit-rows</text></g><g><rect x="464" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="600" y="72" text-anchor="middle">Merge Request !1</text></g><g><rect x="904" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="1040" y="72" text-anchor="middle">Целевая ветка main</text></g><path d="M296 66H464" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#flow-step-06-arrow)"/><text class="course-figure__small course-figure__arrow-label" x="380" y="52" text-anchor="middle">Создать MR</text><path d="M736 66H904" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#flow-step-06-arrow)"/><text class="course-figure__small course-figure__arrow-label" x="820" y="52" text-anchor="middle">Указать цель</text></svg></div><figcaption>Предложить изменение: ветка limit-rows → Создать MR → Merge Request !1 → Указать цель → целевая ветка main.</figcaption></figure>',
    },
  },
  {
    anchor: 'step-11',
    legacyAnchor: 'gitlab-review',
    title: 'Прочитайте замечание к тому же запросу',
    why: 'Проверка коллегами (ревью) помогает найти неясности в документе. Участник читает изменения и оставляет замечание к строке. Одобрение владельца продукта ещё не объединяет ветки.',
    links: [['Как проводить ревью в GitLab', 'https://docs.gitlab.com/tutorials/reviews/']],
    actions: [
      'В GitLab: проверяющий открывает <strong>Changes</strong> («Изменения») того же MR и читает новый пункт. Замечание примера: «Что увидит пользователь, если строк больше 10 000?»',
      'В GitLab: для одного замечания нажмите <strong>Add comment now</strong> («Опубликовать комментарий»). При <strong>Start a review</strong> («Начать ревью») завершите и опубликуйте его: черновики видны только вам.',
      'В GitLab: автор читает опубликованное замечание и условия Merge. Комментарий, <strong>Approve</strong> («Одобрить») и <strong>Merge</strong> («Слить») — разные действия. Если коллега ещё не проверил запрос, результат — ожидание ревью. Отсутствие автоматической проверки не означает её успех.',
    ],
    gitNote: 'Для комментария к строке в MR команда Git не нужна.',
    result: 'В том же MR есть понятное замечание к intent.md; правка ещё не принята.',
    nextUse: { href: '#step-12' },
    trouble:
      'Если страница недоступна, остаётся черновик комментария или неясен статус проверки, не объявляйте запрос готовым. Сохраните работу и попросите владельца проекта или проверяющего объяснить следующее действие.',
    advanced: null,
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с горизонтальной прокруткой при узком окне"><svg viewBox="0 12 1200 108" role="img" aria-labelledby="flow-gitlab-review-title flow-gitlab-review-desc"><title id="flow-gitlab-review-title">Проверить документ</title><desc id="flow-gitlab-review-desc">Changes в !1 → Комментарий → Замечание в !1 → Опубликовать → Замечание видно автору.</desc><defs><marker id="flow-gitlab-review-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="24" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="160" y="72" text-anchor="middle">Changes в !1</text></g><g><rect x="464" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="600" y="72" text-anchor="middle">Замечание в !1</text></g><g><rect x="904" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="1040" y="72" text-anchor="middle">Замечание видно автору</text></g><path d="M296 66H464" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#flow-gitlab-review-arrow)"/><text class="course-figure__small course-figure__arrow-label" x="380" y="52" text-anchor="middle">Комментарий</text><path d="M736 66H904" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#flow-gitlab-review-arrow)"/><text class="course-figure__small course-figure__arrow-label" x="820" y="52" text-anchor="middle">Опубликовать</text></svg></div><figcaption>Проверить документ: Changes в !1 → Комментарий → Замечание в !1 → Опубликовать → Замечание видно автору.</figcaption></figure>',
    },
  },
];
