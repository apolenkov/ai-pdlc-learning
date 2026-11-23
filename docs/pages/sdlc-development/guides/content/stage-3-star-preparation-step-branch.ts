import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Создайте ветку для требований после успешной подготовки',
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 152" role="img" aria-labelledby="r4branch-t r4branch-d" ><title id="r4branch-t">Новая ветка от выданной базы</title><desc id="r4branch-d">От проверенной выданной базы создаётся ваша ветка для требований; папка кода остаётся без изменений.</desc><defs><marker id="r4branch-arrow-paper" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#c6c9be"/></marker><marker id="r4branch-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker><marker id="r4branch-arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#a86716"/></marker><marker id="r4branch-arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#3f6f88"/></marker></defs><g><rect x="24" y="32" width="310" height="100" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="44" y="64" >Выданная база</text><text class="course-figure__small" x="44" y="90" >IMPORT_BASE_BRANCH</text><text class="course-figure__small" x="44" y="112" >номер версии сверен до изменений</text></g><path d="M334 82H430" fill="none" stroke="#a86716" stroke-width="2.5" marker-end="url(#r4branch-arrow-amber)"/><text class="course-figure__small" x="382" y="64" text-anchor="middle">новая ветка</text><g><rect x="430" y="32" width="746" height="100" rx="12" fill="#fff6e3" stroke="#a86716" stroke-width="1.5"/><text class="course-figure__title" x="450" y="64" >Ветка для требований</text><text class="course-figure__file" x="450" y="90" >course/&lt;LOGIN&gt;/stage-4-amount-limits</text><text class="course-figure__small" x="450" y="112" >только требования; код не трогаем</text></g></svg></div><figcaption>Учебная схема: от выданной базы — ваша ветка для правок требований.</figcaption></figure>',
    },
    actions: [
      'Только после успешного отчёта навыка создайте ветку для требований в\u00a0той же папке требований. Для каждого действия выберите VS Code или терминал, не выполняйте оба варианта. Замените <code>&lt;LOGIN&gt;</code> своим логином.<br>В VS Code: нажмите имя ветки слева внизу → <strong>Create new branch</strong> (Создать ветку) → введите <code>course/&lt;LOGIN&gt;/stage-4-amount-limits</code>.<br>В терминале:<pre><code>git switch -c course/&lt;LOGIN&gt;/stage-4-amount-limits</code></pre>В VS Code слева внизу появится имя новой ветки; терминал сообщит о\u00a0переключении на новую ветку.',
      'Проверьте ветку и\u00a0чистоту рабочей копии требований.<br>В VS Code: слева внизу должно быть имя <code>course/&lt;LOGIN&gt;/stage-4-amount-limits</code>, а\u00a0список изменений в\u00a0Source Control — пустым.<br>В терминале:<pre><code>git status --short --branch</code></pre>Ожидается только строка <code>## course/&lt;LOGIN&gt;/stage-4-amount-limits</code> с\u00a0вашим логином, без строк файлов. При другом имени ветки или непустом списке изменений не продолжайте: покажите результат организатору.',
      'В VS Code: продолжайте прежнюю сессию модели из той же папки требований; после перерыва откройте панель Kilo и\u00a0продолжите существующий диалог. Не повторяйте уже успешную подготовку и\u00a0не открывайте снимок сервиса как рабочий проект.',
    ],
    why: 'Ветка создаётся от выданной базы в\u00a0той же папке требований; это не ветка кода и\u00a0не разрешение на реализацию.<br>Если забыли, что такое ветка (своя дорожка для правок), — <a href="p2-git.html#step-06">шаг «Создайте ветку для другой границы» подготовки «Markdown, Git, GitLab»</a>.',
    links: [],
    gitNote: 'Для продолжения диалога в Kilo команда Git не нужна.',
    result:
      'Создана ветка для требований от выданной базы; подготовленная рабочая копия кода остаётся без ветки и\u00a0чистой.',
    trouble:
      'Если полная подготовка не завершена, папка требований или текущая версия изменились либо ветка уже существует, остановитесь. Не переключайте копию кода и\u00a0не создавайте изменение до проверки ветки.',
    advanced:
      '<details class="beginner-extra"><summary>Через терминал · корень папки требований</summary><div class="beginner-extra__body"><p>Откройте встроенный терминал VS Code в\u00a0корне той же папки требований. Используйте терминальные строки пунктов «Создайте ветку» и\u00a0«Проверьте ветку» этого шага: сначала создайте ветку, затем проверьте её имя и\u00a0чистоту рабочей копии. Если уже создали ветку через VS Code, повторно создавать её не нужно — переходите к\u00a0проверке.</p></div></details>',
    screenshots: [
      {
        src: 'assets/route-r4-vscode-create-branch.png',
        previews: [
          {
            src: 'assets/route-r4-vscode-create-branch-600.webp',
            width: 600,
          },
          {
            src: 'assets/route-r4-vscode-create-branch-1200.webp',
            width: 1200,
          },
        ],
        width: 2880,
        height: 1000,
        alt: 'Палитра создания ветки в\u00a0VS Code: в\u00a0поле введено course/demo/stage-4-amount-limits и\u00a0подсвечен пункт Create new branch (Создать ветку).',
        caption:
          'Создание ветки для требований в\u00a0VS Code: выданная база — учебная course/qa/stage-4-new-code-base, в\u00a0палитру введено демонстрационное имя course/demo/stage-4-amount-limits и\u00a0подсвечен пункт «Create new branch» (Создать ветку), но он не выбран. Ваша база задаётся полем IMPORT_BASE_BRANCH, а\u00a0имя ветки — своё course/&lt;LOGIN&gt;/stage-4-amount-limits; кадр показывает только выбор имени — создание ветки и\u00a0результат подготовки он не подтверждает.',
      },
    ],
    nextUse: { href: '#step-05' },
  },
];
