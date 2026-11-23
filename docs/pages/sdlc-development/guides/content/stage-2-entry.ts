import { courseStepLabel } from './references.ts';
import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

const branchActions: string[] = [
  'В VS Code: откройте папку шага 1. Далее работайте из корня клона. Выбирайте UI или терминал, не повторяйте действия.',
  'В VS Code: проверьте в строке состояния ветку <code>course/your_login/stage-1-error-result</code> и то, что Source Control пуст. В терминале:<pre><code>git status --short --branch</code></pre>Ожидается только <code>## course/your_login/stage-1-error-result...origin/course/your_login/stage-1-error-result</code>, без строк файлов. При другой ветке или изменениях откройте «Продвинутый вариант».',
  'В VS Code: выполните <strong>Git: Fetch</strong> в палитре команд. В терминале:<pre><code>git fetch origin</code></pre>Сведения origin обновятся; пустой вывод допустим.',
  'В VS Code: проверьте привязку через <strong>Git: Show Git Output</strong>. В терминале:<pre><code>git rev-parse --abbrev-ref --symbolic-full-name @{upstream}</code></pre>Ожидается <code>origin/course/your_login/stage-1-error-result</code>. При отсутствии или другом upstream остановитесь и сверьте публикацию с организатором.',
  'В VS Code: после Fetch снова проверьте ветку и отсутствие входящих/исходящих коммитов в Source Control. В терминале:<pre><code>git status --short --branch</code></pre>Ожидается <code>## course/your_login/stage-1-error-result...origin/course/your_login/stage-1-error-result</code> без суффикса в квадратных скобках и без строк файлов. <code>[ahead N]</code> означает неотправленные коммиты, <code>[behind N]</code> — отставание, <code>[ahead N, behind M]</code> — расхождение. При суффиксе сверьте версию с организатором; ветку шага 2 ещё не создавайте.',
  'В VS Code: нажмите имя текущей ветки → <strong>Create new branch</strong> → введите <code>course/your_login/stage-2-reset</code>. Либо В терминале:<pre><code>git switch -c course/your_login/stage-2-reset</code></pre>Ветка от проверенного шага 1, не main.',
  'В VS Code: сверьте имя новой ветки и пустой Source Control. В терминале:<pre><code>git status --short --branch</code></pre>Ожидается <code>## course/your_login/stage-2-reset</code> без строк файлов: новая ветка ещё не опубликована. Далее редактируйте <code>specification.md</code>.',
];

export const steps: LearnerStep[] = [
  {
    title: `Вход: ветка шага\u00a0${courseStepLabel('1')} и\u00a0задача в\u00a0Jira`,
    actions: [
      'Откройте тот же замысел из шага 1 курса: здесь разбираем сброс формы. Если новое ожидание не подтверждено, уточните его с\u00a0владельцем продукта и\u00a0сохраните ответ в\u00a0источнике.',
      'Откройте личную задачу шага 2 курса в\u00a0проекте вашей команды; выданную задачу не дублируйте. Если задачи нет, создайте её с\u00a0родителем\u00a0— учебным эпиком курса\u00a0— и\u00a0назначьте на себя по <a href="s1-git.html#step-01">порядку из шага\u00a01\u00a0«Требования в Git»</a>. Запишите цель: проверить черновик требования сброса; результат: восемь сценариев и\u00a0принятый запрос из ветки шага 2 курса в ветку шага 1 курса.',
      'Откройте ту же папку в\u00a0VS Code на опубликованной личной ветке шага 1 курса. Убедитесь, что specification.md совпадает с <a href="s1-git.html#step-05">учебным образцом шага\u00a01\u00a0«Требования в Git»</a>, а\u00a0Source Control пуст.',
    ],
    result:
      'В\u00a0Jira зафиксированы вход шага 1 курса, цель шага 2 курса и\u00a0необходимость одобрения по правилу приёмки.',
    links: [],
    trouble:
      'Если задача уже есть, не создавайте дубликат. Если учебный эпик недоступен, уточните родителя у\u00a0организатора и\u00a0не создавайте новый эпик.',
    advanced: null,
    example: {
      label: 'Описание Jira',
      content:
        'Вход: ветка course/your_login/stage-1-error-result в моём форке — личной копии репозитория на сервере.\nЦель: сохранить пять сценариев шага 1 и добавить сброс формы.\nРезультат: запрос шага 2 → ветка шага 1 (в GitLab — Merge Request, MR). Одобрение дают люди после меня, модель его не ставит и не запрашивает.\nОдна ссылка на изменение: сначала ветка шага 1, затем запрос шага 2.',
    },
    figure: {
      html: '<figure class="course-figure course-figure--wide"><svg viewBox="0 0 1200 132" role="img" aria-labelledby="r2-input-title r2-input-desc"><title id="r2-input-title">Замысел → проверка изменения</title><desc id="r2-input-desc">Сброс формы — следующая часть того же замысла. Требования проверяют в\u00a0версии шага 2, задача связывает статус и\u00a0результат.</desc><g><rect x="12" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="24" y="48" class="course-figure__title" style="font-size:18px">Замысел</text><text x="24" y="78" class="course-figure__small">смысл сброса</text></g><path d="M295.5 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="310.5" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="322.5" y="48" class="course-figure__title" style="font-size:18px">Шаг 1</text><text x="322.5" y="78" class="course-figure__small">принятые сценарии</text></g><path d="M594 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="609" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="621" y="48" class="course-figure__title" style="font-size:18px">Шаг 2</text><text x="621" y="78" class="course-figure__small">проверенный черновик</text></g><path d="M892.5 64h12m-5-5 5 5-5 5" stroke="#216650" fill="none"/><g><rect x="907.5" y="18" width="280.5" height="96" rx="12" fill="#fffdf8" stroke="#216650"/><text x="919.5" y="48" class="course-figure__title" style="font-size:18px">Ревью</text><text x="919.5" y="78" class="course-figure__small">согласование версии</text></g></svg><figcaption>Сброс формы — следующая часть того же замысла. Требования проверяют в\u00a0версии шага 2 курса, задача связывает статус и\u00a0результат.</figcaption></figure>',
    },
    nextUse: { href: '#step-02' },
    why: 'Опубликованный результат шага 1 курса и\u00a0тот же замысел определяют основу шага 2 курса. Проверяйте сброс поверх своей версии, чтобы не потерять ранее записанные сценарии.',
  },
  {
    title: 'Ветка шага 2 курса от результата шага 1 курса',
    actions: branchActions,
    why: 'Своя ветка — <a href="p2-git.html#step-06">подготовка «Markdown, Git, GitLab»: раздел «Создайте ветку для другой границы»</a>. Здесь шаг\u00a02 курса начинается от вашей опубликованной ветки шага 1 курса, в\u00a0той же папке.',
    gitNote: 'Для просмотра проекта в GitLab команда Git не нужна.',
    result:
      'Ветка шага 2 курса создана в\u00a0VS Code от опубликованного результата шага 1 курса в\u00a0той же рабочей копии; при отдельном позднем старте это отмечено в transfer.md.',
    links: [],
    trouble:
      'Если в\u00a0VS Code открыта не та ветка или в\u00a0Source Control есть изменения, остановитесь и\u00a0сверьте источник через блок «Продвинутый вариант». Не подставляйте main, не удаляйте изменения и\u00a0не применяйте принудительную отправку. Если ветка уже существует, проверьте, не создана ли она раньше, и\u00a0продолжайте только в\u00a0своей учебной ветке.<details class="beginner-extra beginner-extra--secondary"><summary>Отдельный старт — без результата шага 1 курса</summary><div class="beginner-extra__body"><p>Это подготовленный учебный образец, а не ваша история шага 1. Замените your_login на свой логин.</p><ol><li>В GitLab: создайте Fork учебного репозитория <code>ai-pdlc-learning-stage-2</code> из группы вашей команды и скопируйте HTTPS-адрес.</li><li>В VS Code: вызовите <strong>Git: Clone</strong> с адресом своего форка. Либо из папки учебных проектов В терминале:<pre><code>git clone https://gitlab.example.invalid/your_login/ai-pdlc-learning-stage-2.git</code></pre>Клон готов.</li><li>В VS Code: откройте папку клона. Для перехода в неё из папки учебных проектов В терминале:<pre><code>cd ai-pdlc-learning-stage-2</code></pre>Текущая папка — корень клона.</li><li>В VS Code: выполните <strong>Git: Create Branch From...</strong>, задайте личную ветку шага 1 и выберите origin/main. Либо В терминале:<pre><code>git switch -c course/your_login/stage-1-error-result origin/main</code></pre>Создана ветка восстановления шага 1.</li><li>В VS Code: выполните README по восстановлению личного результата шага 1: добавьте точное правило, пятый сценарий, замените решённый вопрос и заполните <code>transfer.md</code>. Перед сохранением прочитайте разницу.</li><li>В VS Code: выберите specification.md и transfer.md через <strong>Stage Changes</strong>. В терминале:<pre><code>git add specification.md transfer.md</code></pre>Оба файла выбраны для версии.</li><li>В VS Code: откройте каждый файл в <strong>Staged Changes</strong>. В терминале:<pre><code>git diff --cached</code></pre>Видны только восстановленный результат и сведения об отдельном входе.</li><li>В VS Code: нажмите <strong>Commit</strong> с пояснением восстановления. В терминале:<pre><code>git commit -m &quot;docs: восстановить результат шага 1&quot;</code></pre>Версия сохранена; ошибку сначала исправьте.</li><li>В VS Code: нажмите <strong>Publish Branch</strong> или <strong>Push</strong>. В терминале:<pre><code>git push -u origin course/your_login/stage-1-error-result</code></pre>Ветка шага 1 опубликована и привязана к origin.</li><li>В VS Code: проверьте ветку и пустой Source Control. В терминале:<pre><code>git status --short --branch</code></pre>Ожидается <code>## course/your_login/stage-1-error-result...origin/course/your_login/stage-1-error-result</code> без строк файлов и без суффикса в квадратных скобках. Затем выполните основной порядок создания ветки шага 2.</li></ol></div></details>',
    advanced:
      '<p>При другой ветке сначала проверьте пустой Source Control. В VS Code: выберите свою опубликованную ветку шага 1 через имя ветки. В терминале:<pre><code>git switch course/your_login/stage-1-error-result</code></pre>Нет ветки — уточните источник у организатора. Далее те же пары, без повторного создания ветки:</p><ol>' +
      branchActions.map((action) => '<li>' + action + '</li>').join('') +
      '</ol>',
    example: {
      label: 'Ожидаемое состояние перед созданием ветки',
      content:
        'папка: ai-pdlc-learning-stage-1\nтекущая ветка: course/your_login/stage-1-error-result\nновая ветка: course/your_login/stage-2-reset\nизменений в Source Control нет',
    },
    screenshots: [
      {
        src: 'assets/route-r2-vscode-create-branch.png',
        previews: [
          {
            src: 'assets/route-r2-vscode-create-branch-600.webp',
            width: 600,
          },
          {
            src: 'assets/route-r2-vscode-create-branch-1200.webp',
            width: 1200,
          },
        ],
        width: 2880,
        height: 700,
        alt: 'Палитра создания ветки в\u00a0VS Code: введено имя course/demo/stage-2-reset, в\u00a0списке — варианты «Create new branch»; редактор пуст, в\u00a0дереве Explorer выбран specification.md.',
        caption:
          'Создание ветки шага 2 курса в\u00a0VS Code: имя новой ветки введено в\u00a0палитру над рабочей областью опубликованного результата шага 1 курса — редактор пуст, specification.md выбран в\u00a0дереве Explorer. В\u00a0кадре — демонстрационные имена course/demo/…, ваши ветки называются course/your_login/…',
      },
    ],
    figure: {
      html: '<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 150" role="img" aria-labelledby="r2-branch-t r2-branch-d"><title id="r2-branch-t">Опубликованная ветка шага 1 → личная ветка шага 2</title><desc id="r2-branch-d">При чистом списке изменений ученик создаёт ветку шага 2 от своей опубликованной ветки шага 1 в\u00a0том же репозитории, сохраняя предыдущий результат.</desc><defs><marker id="r2-branch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="16" y="20" width="340" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="36" y="52">Вход · шаг 1</text><text class="course-figure__small" x="36" y="82">stage-1-error-result</text><text class="course-figure__small" x="36" y="106">Пять сценариев и\u00a0правило ошибки</text></g><g><rect x="430" y="20" width="340" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="450" y="52">Та же папка в\u00a0VS Code</text><text class="course-figure__small" x="450" y="82">Source Control: правок нет</text><text class="course-figure__small" x="450" y="106">Создать ветку от шага 1</text></g><g><rect x="844" y="20" width="340" height="110" rx="12" fill="#e3f0ea" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="864" y="52">Своя ветка шага 2</text><text class="course-figure__small" x="864" y="82">stage-2-reset</text><text class="course-figure__small" x="864" y="106">Изменять specification.md</text></g><path d="M356 75H430" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r2-branch-arrow)"/><path d="M770 75H844" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r2-branch-arrow)"/></svg></div><figcaption>Полные имена веток — ниже. При отдельном старте происхождение результата записывается в\u00a0transfer.md, как описано в\u00a0помощи.</figcaption></figure>',
    },
    nextUse: { href: '#step-03' },
  },
];
