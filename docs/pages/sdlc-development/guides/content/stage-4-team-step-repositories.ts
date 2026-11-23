import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Контекст, Store и репозитории кода',
    actions: [
      'Сравните две схемы: требования рядом с кодом одного сервиса и отдельные meta-repo, Store и репозитории кода для продукта.',
      'В рабочей модели <code>product-meta</code> хранит контекст, ссылки и <code>services.lock.yaml</code>; отдельный <code>product-specs</code> — требования и изменения OpenSpec. Клон Store лежит в <code>~/openspec/product-specs</code>. В репозиториях кода — только указатель <code>store: product-specs</code> в <code>openspec/config.yaml</code>, без собственных <code>specs/</code> и <code>changes/</code>.',
      'На шаге 5 курса используется совмещённый Store-пример: репозиторий <code>ai-pdlc-learning-stage-4-requirements</code> содержит требования и учебный контекст, а зарегистрирован под именем <code>sdd-credit-calculator-product-meta</code>. Историческое имя Store не означает, что в рабочей модели meta-repo и Store — один репозиторий. Отдельная папка кода — <code>ai-pdlc-learning-stage-4-code</code>.',
      'Запомните четыре связи: Jira ↔ запрос; код ↔ полный номер принятой версии требований (<code>PLANNING_SHA</code>); метарепозиторий ↔ закреплённые версии кода в <code>services.lock.yaml</code> (<code>SERVICE_SHA</code>); каждый заголовок требования ↔ строка таблицы связей в Store.',
    ],
    why: 'Store — рабочий путь для общих требований продукта: meta-repo хранит контекст и ссылки, отдельный репозиторий <code>&lt;продукт&gt;-specs</code> — требования, репозитории сервисов — код. Если в метарепозитории уже есть <code>openspec/</code>, его можно сделать Store командой <code>openspec store register &lt;путь&gt; --yes</code>. Store пока в бете; синхронизации нет — перед работой забирайте изменения через <code>git pull</code>, после отправляйте commit и <code>git push</code>.',
    result:
      'Вы различаете контекст meta-repo, требования Store и код сервисов; можете объяснить, чем учебная совмещённая база отличается от рабочей модели.',
    trouble:
      'Если в учебном комплекте встречается имя product-meta, проверьте реальный корень Store: требования должны находиться в выданном репозитории требований, а не в случайном метарепозитории. Корень и имя подтверждает организатор.',
    links: [
      [
        'Вот куда переезжает учебная раскладка: шаг 3 «Изменение в OpenSpec» → шаг 5 «Контекст продукта»',
        's3-openspec.html#step-03',
      ],
      ['OpenSpec: хранилища (Stores)', 'https://openspec.dev/docs/stores'],
    ],
    figure: {
      html: '<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 280" role="img" aria-labelledby="repos-t repos-d"><title id="repos-t">Один сервис или продукт с отдельным Store</title><desc id="repos-d">Слева код и требования одного сервиса в одном репозитории. Справа отдельный product-meta для контекста, product-specs для требований и сервисные репозитории для кода. Запросы требований, статусов задач и архива идут в Store; запрос кода — в сервис.</desc><g><rect x="24" y="24" width="560" height="232" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="44" y="56">Один сервис · repo-local</text><text class="course-figure__small" x="44" y="90">product-repo/</text><text class="course-figure__small" x="44" y="120">src/ test/ — код</text><text class="course-figure__small" x="44" y="150">openspec/ — требования и изменения</text><text class="course-figure__small" x="44" y="190">Все запросы — в этот репозиторий.</text><text class="course-figure__small" x="44" y="220">Архив — после принятия реализации.</text></g><g><rect x="616" y="24" width="560" height="232" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="636" y="56">Продукт · meta-repo + Store + код</text><text class="course-figure__small" x="636" y="90">product-meta/ — контекст, ссылки, services.lock.yaml</text><text class="course-figure__small" x="636" y="120">product-specs/ — openspec/specs/ и changes/</text><text class="course-figure__small" x="636" y="150">service-a/, service-b/ — код и тесты</text><text class="course-figure__small" x="636" y="190">Требования, tasks.md, архив → Store</text><text class="course-figure__small" x="636" y="220">Код → репозиторий сервиса</text></g></svg></div><figcaption>Рабочая модель разделяет meta-repo и Store. Учебная база шага 5 — явно совмещённый Store-пример, а не общая норма.</figcaption></figure>',
    },
    nextUse: { href: '#step-04' },
    advanced: null,
    screenshots: [],
  },
];
