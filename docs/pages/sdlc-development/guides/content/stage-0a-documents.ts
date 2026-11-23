import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    anchor: 'step-01',
    title: 'Создайте intent.md и откройте Markdown',
    why: 'Замысел (intent.md) — короткий документ: какую проблему решаем, что входит в изменение и где задача. Его пишут до требований, чтобы участники одинаково поняли цель. Markdown оформляет обычный текст: # с пробелом — заголовок, - с пробелом — список, [текст](адрес) — ссылка, пустая строка разделяет абзацы. Позднее Git покажет изменения этого текста построчно.',
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема; при узком окне доступна горизонтальная прокрутка"><svg viewBox="0 0 1200 302" role="img" aria-labelledby="course0a-md-t course0a-md-d"><title id="course0a-md-t">Один intent.md: текст и предпросмотр</title><desc id="course0a-md-d">Один и тот же файл: слева знаки оформления, справа читаемый документ.</desc><defs><marker id="course0a-md-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><rect x="24.0" y="24" width="500.0" height="254" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text x="42.0" y="60" class="course-figure__title">Файл intent.md</text><text x="42.0" y="96" class="course-figure__small"># Выгрузка строк в CSV</text><text x="42.0" y="124" class="course-figure__small">## Проблема</text><text x="42.0" y="152" class="course-figure__small">В CSV попадают все строки.</text><text x="42.0" y="188" class="course-figure__small">## Границы</text><text x="42.0" y="220" class="course-figure__small">- Меняется только продукт A.</text><text x="42.0" y="250" class="course-figure__small">- Продукт B не затронут.</text><path d="M524.0 104h152" stroke="#216650" stroke-width="2.5" marker-end="url(#course0a-md-arrow)"/><text x="600.0" y="90" text-anchor="middle" class="course-figure__small course-figure__arrow-label">Предпросмотр</text><rect x="676.0" y="24" width="500.0" height="254" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text x="694.0" y="60" class="course-figure__title">Предпросмотр</text><text x="694.0" y="92" style="font-size:24px;font-weight:700">Выгрузка строк в CSV</text><text x="694.0" y="132" class="course-figure__title">Проблема</text><text x="694.0" y="156" class="course-figure__small">В CSV попадают все строки.</text><text x="694.0" y="188" class="course-figure__title">Границы</text><text x="694.0" y="220" class="course-figure__small">• Меняется только продукт A.</text><text x="694.0" y="250" class="course-figure__small">• Продукт B не затронут.</text></svg></div><figcaption>Один и тот же файл: слева знаки оформления, справа читаемый документ.</figcaption></figure>',
    },
    actions: [
      'В VS Code: Создайте учебную папку, а в ней папку <code>без-git</code>. Откройте её в VS Code и создайте <code>intent.md</code>. Вставьте текст ниже. Ссылка на задачу PILOT-001 вымышленная; в рабочем intent.md укажите свою задачу.',
      'В VS Code: Сохраните файл: Windows/Linux <kbd>Ctrl+S</kbd>, macOS <kbd>Cmd+S</kbd>.',
      'В VS Code: Откройте предпросмотр Markdown: Windows/Linux <kbd>Ctrl+Shift+V</kbd>, macOS <kbd>Cmd+Shift+V</kbd>. Предпросмотр сбоку от текста: Windows/Linux <kbd>Ctrl+K</kbd>, затем <kbd>V</kbd>; macOS <kbd>Cmd+K</kbd>, затем <kbd>V</kbd> — клавиши нажимают по очереди. Или выберите <strong>Open Preview</strong> («Открыть предпросмотр») в меню редактора. Сравните заголовок и список в обоих видах. Это подготовка текста в редакторе.',
    ],
    gitNote: 'Для предпросмотра Markdown команда Git не нужна.',
    result:
      'Один исходный файл и его читаемое представление; текст в обоих видах одинаковый. В предпросмотре видны заголовок, границы списком и номер задачи. README.md — первый файл репозитория: что это за продукт и с чего начать. Подробнее в разделе <a href="p4-metarepository.html#readme-agents">README.md и AGENTS.md</a>.',
    trouble:
      'Если заголовок или список не оформился, проверьте пробел после # или - и пустую строку между блоками.',
    advanced:
      '<details class="beginner-extra"><summary>Дополнительно: таблица, изображение, код и схема Mermaid</summary><div class="beginner-extra__body"><p>Когда основной шаг пройден, расширьте тот же intent.md. Скачайте <a href="examples/intent-markdown/intent.md" download>Скачать .md</a> и <a href="examples/intent-markdown/export-button.svg" download>export-button.svg</a> в одну папку: изображение подключается по относительному пути. Откройте предпросмотр и сравните с исходником ниже.</p><div class="step-example"><strong>Файл intent.md</strong><pre tabindex="0"><code># Выгрузка отфильтрованных строк в CSV\n\n## Проблема\nВ CSV попадают **все** строки отчёта, хотя пользователь отобрал фильтром только нужные.\n\n&gt; Пользователь: «Я отфильтровал 120 строк, а в файле их 4 000».\n\n## Границы\n| Случай | Ожидаемый результат |\n| --- | --- |\n| Фильтр отобрал 120 строк | В CSV 120 строк и строка заголовков |\n| Фильтр ничего не отобрал | Кнопка выгрузки неактивна |\n| Больше 10 000 строк | Система предлагает сузить фильтр |\n\n- Меняется только выгрузка в продукте A.\n- Продукт B *не затронут*.\n\n![Кнопка «Выгрузить в CSV» над таблицей отчёта](export-button.svg)\n\nПример файла выгрузки:\n\n```csv\nДата;Сумма\n01.10.2026;1200\n```\n\n```mermaid\nflowchart LR\n  F[Фильтр] --&gt; N{Сколько строк?}\n  N --&gt;|0| D[Кнопка неактивна]\n  N --&gt;|до 10 000| C[Файл CSV]\n  N --&gt;|больше 10 000| S[Сузить фильтр]\n```\n\n## Перед согласованием\n- [x] Проблема описана словами пользователя\n- [ ] Границы подтверждены владельцем решения\n\n## Задача\n`[PILOT-001](https://jira.example.invalid/browse/PILOT-001)`\n</code></pre></div><p><code>**текст**</code> — полужирный, <code>*текст*</code> — курсив, <code>&gt;</code> в начале строки — цитата. Таблицу задают строки с <code>|</code>; вторая строка <code>| --- |</code> отделяет заголовок. <code>![подпись](файл)</code> — изображение, подпись читают программы экранного доступа. Три обратные кавычки открывают и закрывают блок кода; слово после них называет язык. Блок <code>mermaid</code> превращается в схему. <code>- [ ]</code> и <code>- [x]</code> — пункты чек-листа: GitLab показывает их флажками, а предпросмотр VS Code — обычным текстом.</p><p>Где видна схема: предпросмотр VS Code рисует Mermaid сам начиная с версии 1.121 (май 2026); в более старой версии установите расширение Markdown Preview Mermaid Support. GitLab показывает схему при просмотре файла. Если вместо схемы виден исходный текст, сверьте версию редактора и закрывающие кавычки блока. Mermaid в GitLab 15.10 строже нового: если вместо схемы написано «Syntax error in graph», возьмите подпись стрелки в кавычки, например <code>--&gt;|"1–10 000"|</code>.</p></div></details>',
    links: [],
    nextUse: { href: '#step-02' },
    example: {
      label: 'intent.md — первая версия',
      content:
        '# Выгрузка отфильтрованных строк в CSV\n\n## Проблема\nВ CSV попадают все строки отчёта, хотя пользователь отобрал фильтром только нужные.\n\n## Границы\n- Меняется только выгрузка в продукте A.\n- Продукт B не затронут.\n\n## Задача\n`[PILOT-001](https://jira.example.invalid/browse/PILOT-001)`\n',
    },
  },
  {
    anchor: 'step-02',
    title: 'Сравните две ручные копии',
    why: 'Понять, зачем нужна история изменений. Git хранит все версии одного файла с причиной и автором — вместо набора копий.',
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема; при узком окне доступна горизонтальная прокрутка"><svg viewBox="0 0 1200 172" role="img" aria-labelledby="course0a-copies-t course0a-copies-d"><title id="course0a-copies-t">Две ручные копии, ещё без Git</title><desc id="course0a-copies-d">Без Git первый и изменённый варианты хранятся в двух отдельных файлах.</desc><defs><marker id="course0a-copies-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><rect x="24.0" y="24" width="544.0" height="124" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text x="42.0" y="60" class="course-figure__title">intent-1.md</text><text x="42.0" y="96" class="course-figure__small">Первая версия</text><text x="42.0" y="124" class="course-figure__small">Без пустого результата</text><rect x="632.0" y="24" width="544.0" height="124" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text x="650.0" y="60" class="course-figure__title">intent-2.md</text><text x="650.0" y="96" class="course-figure__small">То же начало</text><text x="650.0" y="124" class="course-figure__small">+ Пустой результат: заголовки.</text></svg></div><figcaption>Без Git первый и изменённый варианты хранятся в двух отдельных файлах.</figcaption></figure>',
    },
    actions: [
      'В VS Code: В <code>без-git</code> переименуйте intent.md в <code>intent-1.md</code>. Сделайте его копию <code>intent-2.md</code> и допишите в список «Границы» пункт «- Пустой результат выгружается файлом только с заголовками столбцов». Сохраните файл.',
      'В VS Code: в списке файлов (Explorer) щёлкните правой кнопкой по <code>intent-1.md</code> и выберите <strong>Select for Compare</strong>. Затем щёлкните правой кнопкой по <code>intent-2.md</code> и выберите <strong>Compare with Selected</strong>. Слева откроется прежняя версия, справа новая, добавленная строка подсвечена. Так можно сравнить любые два файла, например третью версию с первой, но копий быстро становится много: дальше эту работу берёт на себя Git.',
      'В VS Code: Рядом с <code>без-git</code> создайте отдельную папку <code>с-git</code>. Скопируйте в неё первый вариант под именем <code>intent.md</code>. Дальше работайте только с этим одним файлом. Пока сравниваем обычные файлы.',
    ],
    gitNote: 'Для сравнения двух файлов команда Git не нужна.',
    result:
      'Вы видите прежний и новый варианты, но храните их отдельными файлами. В intent-1.md нет пункта о пустом результате. В intent-2.md он есть, и в сравнении подсвечена добавленная строка. Эти копии ещё не образуют историю Git.',
    trouble:
      'Если новый пункт оказался и в intent-1.md, удалите его оттуда: первая копия должна остаться прежней. Если папки с-git ещё нет, создайте её рядом с без-git. Пункта Compare with Selected нет в меню: сначала выберите Select for Compare у первого файла. На Mac правая кнопка — это Control+клик.',
    advanced: null,
    screenshots: [
      {
        src: 'assets/route-0a-vscode-compare-two-files.png',
        previews: [
          {
            src: 'assets/route-0a-vscode-compare-two-files-600.webp',
            width: 600,
          },
          {
            src: 'assets/route-0a-vscode-compare-two-files-1200.webp',
            width: 1200,
          },
        ],
        width: 2880,
        height: 1800,
        alt: 'Сравнение intent-1.md и intent-2.md в VS Code: слева прежняя версия, справа новая; добавленная строка «Пустой результат выгружается файлом только с заголовками столбцов» подсвечена зелёным.',
        caption:
          'Так выглядит сравнение двух файлов в VS Code: слева intent-1.md, справа intent-2.md, добавленная строка подсвечена. Снимок показывает итог шага, а не меню.',
      },
    ],
    links: [],
    nextUse: { href: '#step-03' },
  },
];
