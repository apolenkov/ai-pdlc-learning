import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

const traceActions = [
  'Для каждого действия выберите UI или терминал, второй способ не повторяйте. В VS Code: создайте папку <code>docs/course</code>, если её нет.<br>В терминале:<pre><code>mkdir -p docs/course</code></pre>Папка существует; её прежнее содержимое сохранено.',
  'В VS Code: создайте <code>docs/course/requirements-traceability.md</code> или откройте существующий файл без перезаписи.<br>В терминале:<pre><code>touch docs/course/requirements-traceability.md</code></pre>Новый файл пуст; существующий текст сохранён. Заполните его по своему режиму входа в редакторе.',
];
const validateAction =
  'Выполните строгую проверку формы во встроенном терминале. В терминале:<pre><code>openspec validate add-reset-and-years-term --strict</code></pre>Ожидается <code>Change &#39;add-reset-and-years-term&#39; is valid</code>. При ошибках исправьте названные правила и повторите проверку до удаления исходника.';
const inspectActions = [
  'В VS Code: проверьте список Source Control, включая новые файлы OpenSpec и таблицу связей.<br>В терминале:<pre><code>git status --short</code></pre>Новые файлы видны как <code>??</code>; откройте каждый в редакторе и прочитайте.',
  'В VS Code: прочитайте разницу изменённых отслеживаемых файлов в Source Control.<br>В терминале:<pre><code>git diff</code></pre>Видны только незаписанные правки отслеживаемых файлов, не содержимое новых файлов. Проверьте ссылки и полный состав по списку Source Control.',
];
const removeAction =
  'Только маршрут А и только после подтверждения таблицы 8/8. В VS Code: удалите <code>specification.md</code> в проводнике и выберите его удаление через Stage Changes.<br>В терминале:<pre><code>git rm specification.md</code></pre>Удаление подготовлено к Commit; исходная версия остаётся в принятой ветке шага 2 и истории Git.';

export const steps: LearnerStep[] = [
  {
    title: 'Проверьте перенос и\u00a0удалите specification.md',
    entryMode: {
      a: 'А — со своим результатом шага\u00a02',
      b: 'Б — отдельный старт с учебного образца',
    },
    variantB: `<h4>Вариант Б — учебный образец</h4><p>Выберите UI или терминал для каждого действия.</p><ol>${traceActions.map((action) => `<li>${action}</li>`).join('')}<li>В VS Code: в таблице сопоставьте подтверждённые в main требования и сценарии с доказательствами, а с активным изменением — только будущий сброс формы, срок в годах и незавершённые задачи реализации. Строки переноса 8/8 не создавайте. Таблица отражает фактический образец.</li><li>В VS Code: обновите README ссылкой на openspec/changes/add-reset-and-years-term. Ссылка ведёт к активному изменению.</li><li>${validateAction}</li>${inspectActions.map((action) => `<li>${action}</li>`).join('')}</ol><p>specification.md не удаляйте: такого рабочего источника в образце нет. Переходите к разнице выбранных правок.</p>`,
    actions: [
      ...traceActions,
      `Заполните таблицу 8/8 в <code>docs/course/requirements-traceability.md</code>: каждый сценарий шага 2 курса → требование/сценарий активного изменения → незавершённая задача → будущая проверка. Запишите репозиторий, запрос на слияние шага 2 курса и\u00a0принятую ветку. Пример заголовка таблицы: <code>| Сценарий шага 2 | Требование и сценарий изменения | Задача tasks.md | Будущая проверка |</code>. Сохраните заполненную таблицу в редакторе.`,
      'Обновите <code>README.md</code>: замените ссылку на specification.md ссылкой на openspec/changes/add-reset-and-years-term — README читают человек и проверка курса: по нему видно, где сейчас лежат требования. Сохраняйте остальные правила. Если есть <code>ai/request.md</code>, замените ссылку на старый файл ссылкой на актуальное изменение и\u00a0сохраните тот же запрет; отсутствующий файл не создавайте. Обновлённые ссылки видны в редакторе.',
      validateAction,
      ...inspectActions,
      removeAction,
      validateAction,
    ],
    why: 'Таблица переноса связывает каждый сценарий с\u00a0новым требованием, задачей и\u00a0будущей проверкой.',
    gitNote: 'Для правки таблицы и ссылок в редакторе команда Git не нужна.',
    result: `spec.md активного изменения в OpenSpec — единственная редактируемая спецификация требований; все ссылки и\u00a0правила ведут к\u00a0активному изменению, состав сопоставлен с\u00a0исходными сценариями по таблице связей.`,
    links: [],
    trouble:
      'Если хотя бы один сценарий не сопоставлен, ссылка всё ещё ведёт к\u00a0старой спецификации или проверка формы падает, не удаляйте файл. Если уже удалили, восстановите его из принятой ветки шага 2 курса и\u00a0завершите сверку.',
    advanced: `<p>Откройте терминал в корне той же копии на ветке <code>course/your_login/stage-3-reset-years</code>. Это альтернатива, не повторяйте уже сделанное в UI. Заполнение таблицы и обновление ссылок остаются в редакторе.</p><ol>${[...traceActions, validateAction, ...inspectActions, removeAction, validateAction].map((action) => `<li>${action}</li>`).join('')}<li>В VS Code: проверьте пробелы в разнице файлов Source Control.<br>В терминале:<pre><code>git diff --check</code></pre>Пустой вывод — замечаний нет. Новые файлы и подготовленное удаление отдельно проверяются на следующем шаге перед Commit.</li></ol>`,
    example: {
      label: 'Встроенный терминал VS Code · проверка перед удалением',
      content: 'openspec validate add-reset-and-years-term --strict',
    },
    screenshots: [
      {
        src: 'assets/route-r3-vscode-traceability.png',
        previews: [
          {
            src: 'assets/route-r3-vscode-traceability-600.webp',
            width: 600,
          },
          {
            src: 'assets/route-r3-vscode-traceability-1200.webp',
            width: 1200,
          },
        ],
        width: 2880,
        height: 1800,
        alt: 'В\u00a0редакторе VS Code открыт docs/course/requirements-traceability.md с\u00a0таблицей связей восьми сценариев шага 2 курса; в\u00a0Source Control удаление specification.md помещено в\u00a0выбранные к\u00a0сохранению правки, остальные файлы OpenSpec ещё ожидают выбора.',
        caption:
          'Сопоставление перед удалением: requirements-traceability.md связывает восемь сценариев шага 2 курса с\u00a0активным изменением. Проверка формы выполнена успешно; удаление specification.md уже выбрано к\u00a0сохранению.',
      },
    ],
    figure: {
      html: '<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 202" role="img" aria-labelledby="r3-transfer-t r3-transfer-d"><title id="r3-transfer-t">Удаление исходника после проверки переноса</title><desc id="r3-transfer-d">Аналитик сопоставляет восемь сценариев, проверяет форму и\u00a0ссылки и\u00a0только затем удаляет specification.md; история шага 2 сохраняет исходник.</desc><defs><marker id="r3-transfer-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="24" y="24" width="336" height="158" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="44" y="56">Сопоставьте 8/8</text><text class="course-figure__small" x="44" y="86">docs/course/</text><text class="course-figure__small" x="44" y="110">requirements-traceability.md</text><text class="course-figure__small" x="44" y="134">Сценарий → требование → задача</text><text class="course-figure__small" x="44" y="158">→ будущая проверка.</text></g><path d="M360 115H432" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r3-transfer-arrow)"/><g><rect x="432" y="24" width="336" height="158" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="452" y="56">Проверьте спецификацию</text><text class="course-figure__small" x="452" y="86">OpenSpec проверяет форму документов</text><text class="course-figure__small" x="452" y="110">Человек — смысл переноса</text><text class="course-figure__small" x="452" y="134">README и\u00a0AGENTS → шаг 3</text><text class="course-figure__small" x="452" y="158">ai/request.md — только если был.</text></g><path d="M768 115H840" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r3-transfer-arrow)"/><g><rect x="840" y="24" width="336" height="158" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="860" y="56">Удалите исходник</text><text class="course-figure__small" x="860" y="86">Только после сверки 8/8.</text><text class="course-figure__small" x="860" y="110">specification.md — удаление.</text><text class="course-figure__small" x="860" y="134">Версия шага 2 остаётся в\u00a0истории Git.</text><text class="course-figure__small" x="860" y="158">Удаление выбрано к\u00a0сохранению.</text></g></svg></div><figcaption>Удаление исходника выполняется только после подтверждённой таблицы связей; версия остаётся в\u00a0истории Git.</figcaption></figure>',
    },
    nextUse: { href: '#step-07' },
  },
];
