import { approval } from './stage-2-approval.ts';
import { merge } from './stage-2-merge.ts';
import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Сохраните и\u00a0отправьте результат шага 2 курса',
    actions: [
      'В VS Code: в Source Control откройте разницу <code>specification.md</code>. В терминале:<pre><code>git diff -- specification.md</code></pre>Ожидаются только правки сброса формы; пять прежних сценариев сохранены.',
      'В VS Code: выберите specification.md через <strong>Stage Changes</strong>. В терминале:<pre><code>git add specification.md</code></pre>Файл появится в Staged Changes.',
      'В VS Code: при отдельном старте выберите также обновлённый transfer.md; в обычном маршруте пункт пропустите. В терминале:<pre><code>git add transfer.md</code></pre>Для отдельного старта выбраны также сведения о восстановленном входе.',
      'В VS Code: просмотрите ошибки пробелов в выбранных правках. Точнее В терминале:<pre><code>git diff --cached --check</code></pre>Пустой вывод — ошибок формата нет; при сообщениях сначала исправьте их и повторите выбор файлов.',
      'В VS Code: откройте каждый файл в <strong>Staged Changes</strong>. В терминале:<pre><code>git diff --cached</code></pre>Видны все выбранные правки, включая transfer.md только при отдельном старте.',
      'В VS Code: нажмите <strong>Commit</strong> с пояснением <code>docs: описать сброс формы</code>. В терминале:<pre><code>git commit -m &quot;docs: описать сброс формы&quot;</code></pre>Сохранена проверенная версия шага 2.',
      'В VS Code: нажмите <strong>Publish Branch</strong> или <strong>Push</strong> в свой форк; <strong>Sync Changes</strong> не используйте. В терминале:<pre><code>git push -u origin course/your_login/stage-2-reset</code></pre>Ветка опубликована в вашем форке; upstream указывает на одноимённую ветку origin.',
      'В VS Code: проверьте пустой Source Control; в GitLab откройте отправленную ветку. В терминале:<pre><code>git status --short --branch</code></pre>Ожидается <code>## course/your_login/stage-2-reset...origin/course/your_login/stage-2-reset</code> без строк файлов и без суффикса в квадратных скобках. Порядок сохранения — <a href="p2-git.html#step-04">подготовка «Markdown, Git, GitLab»: раздел «Измените документ и сравните историю»</a>.',
    ],
    why: 'Если забыли, что такое сохранение версии и\u00a0разница между версиями, откройте <a href="p2-git.html#step-04">подготовка «Markdown, Git, GitLab»: раздел «Измените документ и сравните историю»</a>. Разница показывает, что именно изменилось, а\u00a0смысл требований проверяете вы.',
    result:
      'Результат шага 2 курса сохранён отдельной проверенной версией и\u00a0опубликован в\u00a0личной ветке вашего форка.',
    links: [],
    trouble:
      'При <code>nothing to commit</code> проверьте сохранение файла. При отказе отправки проверьте <code>git remote get-url origin</code>. Ветки шагов 1 и\u00a02 курса находятся в\u00a0одном корпоративном форке; принудительную отправку не используйте.',
    advanced:
      '<p>Тот же маршрут сохранения, если выбран терминал. Выполняйте его вместо, а не после кнопок основного маршрута.</p><ol><li>В VS Code: в Source Control откройте разницу <code>specification.md</code>. В терминале:<pre><code>git diff -- specification.md</code></pre>Ожидаются только правки сброса формы; пять прежних сценариев сохранены.</li><li>В VS Code: выберите specification.md через <strong>Stage Changes</strong>. В терминале:<pre><code>git add specification.md</code></pre>Файл появится в Staged Changes.</li><li>В VS Code: при отдельном старте выберите также обновлённый transfer.md; в обычном маршруте пункт пропустите. В терминале:<pre><code>git add transfer.md</code></pre>Для отдельного старта выбраны также сведения о восстановленном входе.</li><li>В VS Code: просмотрите ошибки пробелов в выбранных правках. Точнее В терминале:<pre><code>git diff --cached --check</code></pre>Пустой вывод — ошибок формата нет; при сообщениях сначала исправьте их и повторите выбор файлов.</li><li>В VS Code: откройте каждый файл в <strong>Staged Changes</strong>. В терминале:<pre><code>git diff --cached</code></pre>Видны все выбранные правки, включая transfer.md только при отдельном старте.</li><li>В VS Code: нажмите <strong>Commit</strong> с пояснением <code>docs: описать сброс формы</code>. В терминале:<pre><code>git commit -m &quot;docs: описать сброс формы&quot;</code></pre>Сохранена проверенная версия шага 2.</li><li>В VS Code: нажмите <strong>Publish Branch</strong> или <strong>Push</strong> в свой форк; <strong>Sync Changes</strong> не используйте. В терминале:<pre><code>git push -u origin course/your_login/stage-2-reset</code></pre>Ветка опубликована в вашем форке; upstream указывает на одноимённую ветку origin.</li><li>В VS Code: проверьте пустой Source Control; в GitLab откройте отправленную ветку. В терминале:<pre><code>git status --short --branch</code></pre>Ожидается <code>## course/your_login/stage-2-reset...origin/course/your_login/stage-2-reset</code> без строк файлов и без суффикса в квадратных скобках. Порядок сохранения — <a href="p2-git.html#step-04">подготовка «Markdown, Git, GitLab»: раздел «Измените документ и сравните историю»</a>.</li></ol><ol><li>В VS Code: если организатор запросил идентификатор версии, откройте последний коммит в истории. Точнее В терминале:<pre><code>git rev-parse HEAD</code></pre>Увидите полный идентификатор версии; для обычной сдачи он не нужен.</li></ol>',
    screenshots: [
      {
        src: 'assets/route-r2-vscode-staged-diff.png',
        previews: [
          {
            src: 'assets/route-r2-vscode-staged-diff-600.webp',
            width: 600,
          },
          {
            src: 'assets/route-r2-vscode-staged-diff-1200.webp',
            width: 1200,
          },
        ],
        width: 2880,
        height: 1800,
        alt: 'VS Code Source Control: в\u00a0Staged Changes только specification.md, в\u00a0Changes — ноль файлов; открыт сравнительный просмотр добавленного правила сброса и\u00a0сценариев.',
        caption:
          'Перед сохранением версии проверьте выбранные к\u00a0сохранению правки: подготовлен только specification.md, раздел изменений пуст. Это снимок учебного проекта до сохранения версии; публикацию ветки затем проверьте в\u00a0своём форке.',
      },
    ],
    figure: {
      html: '<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 150" role="img" aria-labelledby="r2-save-t r2-save-d"><title id="r2-save-t">Проверить → сохранить → отправить шаг 2</title><desc id="r2-save-d">Автор выбирает только требования сброса, сохраняет версию и\u00a0отправляет личную ветку шага 2 в\u00a0свой форк.</desc><defs><marker id="r2-save-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="16" y="20" width="340" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="36" y="52">Проверьте разницу</text><text class="course-figure__small" x="36" y="82">specification.md: сброс</text><text class="course-figure__small" x="36" y="106">Сценарии шага 1 сохранены</text></g><g><rect x="430" y="20" width="340" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="450" y="52">Сохраните версию</text><text class="course-figure__small" x="450" y="82">Выбрать файл → Commit</text><text class="course-figure__small" x="450" y="106">docs: описать сброс формы</text></g><g><rect x="844" y="20" width="340" height="110" rx="12" fill="#e3f0ea" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="864" y="52">Отправьте ветку шага 2</text><text class="course-figure__small" x="864" y="82">Publish Branch / Push → ваш форк</text><text class="course-figure__small" x="864" y="106">Source Control: правок нет</text></g><path d="M356 75H430" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r2-save-arrow)"/><path d="M770 75H844" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r2-save-arrow)"/></svg></div><figcaption>При отдельном позднем старте сохраняется также transfer.md. Отправка — <a href="p2-git.html#step-09">подготовка «Markdown, Git, GitLab»: раздел «Запишите и отправьте новую правку»</a>.</figcaption></figure>',
    },
    nextUse: { href: '#step-06' },
  },
  {
    title:
      'Запрос на слияние из ветки шага 2 курса в ветку шага 1 курса и\u00a0замечание к\u00a0строке',
    actions: [
      'В GitLab: автор открывает <strong>Merge requests → New merge request</strong> в своём форке: source <code>course/your_login/stage-2-reset</code>, target <code>course/your_login/stage-1-error-result</code>. Сверьте обе ветки и нажмите <strong>Create merge request</strong>.',
      'В GitLab: добавьте в описание запроса ссылку на задачу Jira, восемь ожидаемых сценариев и фактически выполненные проверки. В Jira замените входную ссылку одной ссылкой на этот запрос.',
      'В GitLab: откройте <strong>Changes</strong>; ожидаются только изменения шага 2 поверх вашего результата шага 1. В поле <strong>Reviewers</strong> добавьте владельца продукта, аналитика и техлида; дайте ссылку организатору — по <a href="index.html#acceptance-rule">правилу приёмки</a>.',
      'В GitLab: проверяющий читает полный файл и Changes, у конкретной строки нажимает кнопку комментария, пишет что неясно, почему мешает проверке и что уточнить, затем отправляет комментарий.',
      'В VS Code: автор переносит согласованное поведение в specification.md в той же ветке шага 2. Повторите выбор файлов, проверку разницы, Commit и Push по командам из <a href="#step-05">шага сохранения</a>. Правка появится в том же запросе. На следующем шаге отправьте его на повторное ревью.',
    ],
    why: 'Запрос и\u00a0его исходная и\u00a0целевая ветки — <a href="p2-git.html#step-10">подготовка «Markdown, Git, GitLab»: раздел «Откройте Merge Request для intent.md»</a>. Здесь обе ветки личные и\u00a0находятся в\u00a0вашем форке; целевая ветка шага 1 курса, не main.',
    gitNote: 'Для комментария к строке в GitLab команда Git не нужна.',
    result:
      'Автор открыл запрос из ветки шага 2 курса в личную ветку шага 1 курса; проверяющий оставил замечание к\u00a0строке, автор ответил правкой в\u00a0той же ветке.',
    links: [],
    trouble:
      'Если в\u00a0форке нет раздела Merge requests, включите его: Settings → General → Visibility, project features, permissions → Merge requests → Save changes. Если запрос на слияние показывает исходный импорт или всю историю, выбрана неверная ветка, в\u00a0которую принимают правки, или ветки опубликованы в\u00a0разных репозиториях. Укажите вместо неё личную ветку шага 1 курса в\u00a0том же форке; при недоступной ветке остановитесь и\u00a0проверьте свой форк на сервере; не используйте принудительную отправку и\u00a0main.<p>Если комментарий касается всего документа, назовите раздел и\u00a0сценарий; не оставляйте принятое решение только в\u00a0переписке.</p>',
    advanced: null,
    example: {
      label: 'Пара веток запроса на слияние',
      content:
        'source (исходная ветка): course/your_login/stage-2-reset\nbase (целевая ветка): course/your_login/stage-1-error-result\nОжидаемая разница (diff): добавления шага 2 поверх опубликованного шага 1.',
    },
    mockup: {
      kind: 'gitlab-new-mr',
      title: 'GitLab · New merge request',
      source: 'demo-learner/ai-pdlc-learning-stage-1 · course/demo-learner/stage-2-reset',
      base: 'demo-learner/ai-pdlc-learning-stage-1 · course/demo-learner/stage-1-error-result',
      caption:
        'Merge requests → New merge request. Исходная ветка (Source) — новая личная ветка шага 2 курса; целевая ветка (Target; base в\u00a0учебном примере) — предыдущая личная ветка шага 1 курса в\u00a0том же форке. Замените вымышленные значения на свои.',
    },
    figure: {
      html: '<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 150" role="img" aria-labelledby="r2-mr-t r2-mr-d"><title id="r2-mr-t">Шаг 2 → запрос → ветка шага 1</title><desc id="r2-mr-d">Запрос показывает только новые требования шага 2 и\u00a0адресован предыдущей личной ветке в\u00a0том же форке; до принятия она не меняется.</desc><defs><marker id="r2-mr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="16" y="20" width="340" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="36" y="52">Источник · шаг 2</text><text class="course-figure__small" x="36" y="82">stage-2-reset</text><text class="course-figure__small" x="36" y="106">Сохранённый сброс формы</text></g><g><rect x="430" y="20" width="340" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="450" y="52">Запрос · Merge Request</text><text class="course-figure__small" x="450" y="82">Только требования шага 2</text><text class="course-figure__small" x="450" y="106">Ссылка на задачу Jira</text></g><g><rect x="844" y="20" width="340" height="110" rx="12" fill="#e3f0ea" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="864" y="52">Цель · ветка шага 1</text><text class="course-figure__small" x="864" y="82">stage-1-error-result</text><text class="course-figure__small" x="864" y="106">До принятия остаётся прежней</text></g><path d="M356 75H430" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r2-mr-arrow)"/><path d="M770 75H844" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r2-mr-arrow)"/></svg></div><figcaption>Откройте запрос и\u00a0передайте его на проверку; принятие — отдельное действие.</figcaption></figure>',
    },
    nextUse: { href: '#step-07' },
  },
  approval,
  merge,
];
