import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Зачем нужен шаг\u00a05\u00a0«Контекст продукта»: проблема → цель',
    actions: [
      'Найдите пять признаков целевой картины: один источник на\u00a0каждый вид сведений; одобрение на\u00a0конкретной версии; модель видит тот же\u00a0контекст, что и\u00a0люди; цепочка «требование → код → выпуск» с\u00a0полными номерами версий (SHA — номер версии в\u00a0Git); правила записаны в\u00a0репозитории и\u00a0в\u00a0шаблоне запроса, а\u00a0GitLab проверяет то, что умеет.',
      'Спросите себя, кому из\u00a0команды какая часть картины нужна: следующий шаг покажет роли.',
    ],
    why: 'Пока требования лежат в\u00a0документах и\u00a0письмах, их приходится пересказывать, а\u00a0версии теряются. Метарепозиторий делает требование одним проверяемым файлом с\u00a0историей, а\u00a0одобрение привязывает к\u00a0версии.',
    result:
      'Вы можете объяснить, зачем нужен метарепозиторий продукта и\u00a0что меняется для команды.',
    trouble:
      'Если картина кажется далёкой от\u00a0практики, перейдите к\u00a0шагу 2: роли покажут, кто что делает уже на\u00a0шаге 5 курса.',
    figure: {
      html: '<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с горизонтальной прокруткой при узком окне"><svg viewBox="0 12 1200 204" role="img" aria-labelledby="was-t was-d"><title id="was-t">Проблема → цель: от писем и документов к метарепозиторию</title><desc id="was-d">Слева разрозненные документы и пересказ разработчику; справа метарепозиторий продукта в Git, запрос с одобрением на версии и закреплённые версии кода.</desc><defs><marker id="was-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="24" y="24" width="516" height="180" rx="12" fill="#fbf1df" stroke="#a86716" stroke-width="1.5"/><text class="course-figure__title" x="44" y="56">Проблема</text><text class="course-figure__small" x="44" y="86">Требования в Word, Confluence и письмах.</text><text class="course-figure__small" x="44" y="110">Разработчик пересказывает и гадает,</text><text class="course-figure__small" x="44" y="134">что согласовано.</text><text class="course-figure__small" x="44" y="158">Версий несколько, истории нет.</text><text class="course-figure__small" x="44" y="182">Одобрение без привязки к версии.</text></g><path d="M540 114H660" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#was-arrow)"/><g><rect x="660" y="24" width="516" height="180" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="680" y="56">Цель</text><text class="course-figure__small" x="680" y="86">Метарепозиторий продукта в Git:</text><text class="course-figure__small" x="680" y="110">intents/ и openspec/ — одно место (в учебном примере).</text><text class="course-figure__small" x="680" y="134">Изменение — один запрос с одобрением на версии.</text><text class="course-figure__small" x="680" y="158">Код в репозиториях сервисов, версии — по SHA.</text><text class="course-figure__small" x="680" y="182">Jira — только статус и ссылки.</text></g></svg></div><figcaption>Один источник на каждый вид сведений — и людям, и модели проще работать с одним и тем же контекстом.</figcaption></figure>',
    },
    nextUse: { href: '#step-02' },
    links: [],
    advanced: null,
    screenshots: [],
  },
];
