import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    anchor: 'step-12',
    legacyAnchor: 'gitlab-feedback',
    title: 'Исправьте intent.md в той же ветке',
    why: 'Исправление остаётся частью того же Merge Request. Новый Commit в исходной ветке обновляет запрос. После Push проверяйте именно последнюю версию.',
    links: [
      [
        'Замечания и повторное ревью',
        'https://docs.gitlab.com/user/project/merge_requests/reviews/',
      ],
    ],
    actions: [
      'В VS Code: в той же ветке limit-rows замените пункт на «- Если строк больше 10 000, система предлагает сузить фильтр», сохраните intent.md и проверьте diff в Source Control.<br>В терминале:<pre><code>git diff -- intent.md</code></pre>',
      'В VS Code: выберите intent.md через <strong>Stage Changes</strong>.<br>В терминале:<pre><code>git add intent.md</code></pre>В Staged Changes только intent.md.',
      'В VS Code: сделайте <strong>Commit</strong> с причиной «Уточнить поведение сверх предела».<br>В терминале:<pre><code>git commit -m &quot;Уточнить поведение сверх предела&quot;</code></pre>Создана запись с исправлением.',
      'В VS Code: нажмите <strong>Push</strong> («Отправить»).<br>В терминале:<pre><code>git push</code></pre>Тот же MR обновился; новая формулировка видна в Changes.',
      'В GitLab: откройте тот же MR, проверьте формулировку в Changes и ответьте на замечание. Не создавайте второй запрос. Если проверяющий просил повторное ревью, нажмите <strong>Re-request review</strong> («Запросить повторное ревью») у его имени; после согласования нажмите <strong>Resolve thread</strong> («Решить нить»). Одобрение и комментарии должны относиться к последней версии по правилам проекта.',
    ],
    gitNote:
      'Для ответа на замечание, закрытия нити и запроса повторного ревью в GitLab команда Git не нужна.',
    result: 'Тот же MR обновлён; новая формулировка видна в diff и ответе проверяющему.',
    nextUse: { href: '#step-13' },
    trouble:
      'Если Push отклонён, сохраните изменения на компьютере и обратитесь к организатору: не перезаписывайте ветку. Откат в курсе — только новым Commit через git revert. Конфликт MR возникает, когда две ветки меняют одну строку intent.md, например предел выгрузки: первую ветку приняли, вторая стала конфликтной. Правило курса: одна ветка — один человек — одно изменение; чужую ветку без спроса не правят. Для этого текстового примера используйте только редактор GitLab:<ol><li>В GitLab: откройте свой MR → Overview → <strong>Resolve conflicts</strong> («Разрешить конфликты»). Увидите конфликтующие строки.</li><li>В GitLab: согласуйте итоговую формулировку с владельцем продукта и проверяющим в комментарии MR. Продолжайте только после ответа; если смысл спорный, решение не выбирайте самостоятельно.</li><li>В GitLab: нажмите <strong>Edit inline</strong> («Править в строке»), оставьте согласованный текст и удалите маркеры <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, <code>=======</code>, <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>. В редакторе остаётся один согласованный вариант каждой конфликтующей строки.</li><li>В GitLab: задайте причину «Согласовать строку о пределе выгрузки» и нажмите <strong>Commit to source branch</strong> («Сохранить в исходную ветку»). GitLab создаст запись слияния целевой ветки в вашу исходную ветку; сам MR ещё не принят.</li><li>В GitLab: проверьте Changes, отсутствие сообщения о конфликте и новую версию в Commits; запросите повторное ревью через <strong>Re-request review</strong>. Одобрение и проверки нужны именно для этой новой версии.</li></ol>После решения в браузере в вашей копии на компьютере ещё прежняя история.<ol><li>В VS Code: в своей ветке проверьте пустой Source Control. В терминале:<pre><code>git status</code></pre>Working tree clean; иначе сохраните работу и обратитесь к организатору.</li><li>В VS Code: в той же исходной ветке выберите Pull; для перемотки без новой записи используйте терминал:<pre><code>git pull --ff-only</code></pre>Копия получила запись решения конфликта, intent.md содержит согласованный текст.</li></ol>При недоступной Resolve conflicts или отказе Pull передайте организатору ссылку на MR и текст сообщения. Не продолжайте правки поверх устаревшей копии.',
    advanced: null,
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с горизонтальной прокруткой при узком окне"><svg viewBox="0 12 1200 108" role="img" aria-labelledby="flow-gitlab-feedback-title flow-gitlab-feedback-desc"><title id="flow-gitlab-feedback-title">Обновить тот же запрос</title><desc id="flow-gitlab-feedback-desc">Исправленный intent.md → Commit → Новая запись в limit-rows → Push → Тот же !1 обновлён.</desc><defs><marker id="flow-gitlab-feedback-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="24" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="160" y="72" text-anchor="middle">Исправленный intent.md</text></g><g><rect x="464" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="600" y="72" text-anchor="middle">Новая запись в limit-rows</text></g><g><rect x="904" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="1040" y="72" text-anchor="middle">Тот же !1 обновлён</text></g><path d="M296 66H464" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#flow-gitlab-feedback-arrow)"/><text class="course-figure__small course-figure__arrow-label" x="380" y="52" text-anchor="middle">Commit</text><path d="M736 66H904" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#flow-gitlab-feedback-arrow)"/><text class="course-figure__small course-figure__arrow-label" x="820" y="52" text-anchor="middle">Push</text></svg></div><figcaption>Обновить тот же запрос: исправленный intent.md → Commit → новая запись в limit-rows → Push → тот же !1 обновлён.</figcaption></figure>',
    },
  },
  {
    anchor: 'step-13',
    legacyAnchor: 'gitlab-merge',
    title: 'Примите проверенную правку',
    why: 'Approve («Одобрить») и Merge («Слить») — разные действия. Одобрение подтверждает проверку; Merge переносит принятые правки в целевую ветку. Это делает участник с нужными правами, когда выполнены условия проекта. Это Merge после MR: он выполняется в GitLab, в отличие от слияния на компьютере на шаге 7.',
    links: [
      [
        'Правила одобрения GitLab',
        'https://docs.gitlab.com/user/project/merge_requests/approvals/',
      ],
    ],
    actions: [
      'В GitLab: в том же MR проверьте последнюю версию intent.md, разбор всех опубликованных замечаний, одобрение проверяющего и обязательные автоматические проверки.',
      'В GitLab: проверяющий открывает последнюю версию MR и нажимает <strong>Approve</strong> («Одобрить»); если автору MR запрещено самоодобрение, одобряет другой назначенный участник.',
      'В GitLab: после выполнения условий участник с нужными правами нажимает <strong>Merge</strong> («Слить»). Если прав или проверки нет, зафиксируйте ожидаемое действие.',
      'В GitLab: проверьте состояние <strong>Merged</strong> («Слит») и intent.md в main: появился пункт о предложении сузить фильтр. Main на компьютере обновится на следующем шаге.',
    ],
    gitNote: 'Для одобрения и слияния MR в GitLab команда Git не нужна.',
    result:
      'MR имеет состояние Merged, и в main проекта в GitLab появился пункт о предложении сузить фильтр. Если слияние ожидается, укажите недостающую проверку или участника.',
    nextUse: { href: '#step-14' },
    trouble:
      'Если нет кнопки Merge, статус не готов или обязательное одобрение отсутствует, не обходите ограничение. Передайте запрос владельцу проекта или участнику с нужными правами.',
    advanced: null,
    screenshots: [
      {
        src: 'assets/intent-gitlab-ready-to-merge.png',
        width: 1722,
        height: 512,
        alt: 'Фрагмент Merge Request !1: надпись Approval is optional, статус Ready to merge, строка «2 commits and 1 merge commit will be added to main» и кнопка Merge. Имя автора на снимке заменено на «Ученик».',
        caption:
          'Статус Ready to merge в учебном проекте. Правило курса: перед Merge — одно одобрение владельца продукта и разобранные комментарии; состав проверок задаёт проект.',
        previews: [
          {
            src: 'assets/intent-gitlab-ready-to-merge-600.webp',
            width: 600,
          },
          {
            src: 'assets/intent-gitlab-ready-to-merge-1200.webp',
            width: 1200,
          },
        ],
      },
    ],
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с горизонтальной прокруткой при узком окне"><svg viewBox="0 12 1200 108" role="img" aria-labelledby="flow-gitlab-merge-title flow-gitlab-merge-desc"><title id="flow-gitlab-merge-title">Принять проверенный текст</title><desc id="flow-gitlab-merge-desc">Одобрение и проверки → Условия выполнены → Участник с правом Merge → Merge после MR → !1 слит в main.</desc><defs><marker id="flow-gitlab-merge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="24" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="160" y="72" text-anchor="middle">Одобрение и проверки</text></g><g><rect x="464" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="600" y="72" text-anchor="middle">Участник с правом Merge</text></g><g><rect x="904" y="30" width="272" height="72" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__small" x="1040" y="72" text-anchor="middle">!1 слит в main</text></g><path d="M296 66H464" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#flow-gitlab-merge-arrow)"/><text class="course-figure__small course-figure__arrow-label" x="380" y="52" text-anchor="middle">Условия выполнены</text><path d="M736 66H904" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#flow-gitlab-merge-arrow)"/><text class="course-figure__small course-figure__arrow-label" x="820" y="52" text-anchor="middle">Merge после MR</text></svg></div><figcaption>Принять проверенный текст: одобрение и проверки → условия выполнены → участник с правом Merge → Merge после MR (в GitLab) → !1 слит в main.</figcaption></figure>',
    },
  },
];
