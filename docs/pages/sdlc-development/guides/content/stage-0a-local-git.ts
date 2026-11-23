import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';
import { steps as commitSteps } from './stage-0a-local-commits.ts';
import { steps as branchSteps } from './stage-0a-local-branches.ts';

export const steps: LearnerStep[] = [
  ...commitSteps,
  {
    anchor: 'step-05',
    legacyAnchor: 'git-ignore',
    title: 'Оставьте вне Git секреты и черновик',
    why: 'Держать вне истории пароли, токены и лишние файлы.',
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема; при узком окне доступна горизонтальная прокрутка"><svg viewBox="0 0 1200 212" role="img" aria-labelledby="course0a-ignore-t course0a-ignore-d"><title id="course0a-ignore-t">Черновик и правило исключения</title><desc id="course0a-ignore-d">В .gitignore записано имя нового черновика; сам черновик остаётся только на компьютере.</desc><defs><marker id="course0a-ignore-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><rect x="24.0" y="24" width="500.0" height="164" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text x="42.0" y="60" class="course-figure__title">На компьютере</text><text x="42.0" y="96" class="course-figure__small">intent.md</text><text x="42.0" y="124" class="course-figure__small">черновик.txt</text><text x="42.0" y="152" class="course-figure__small">.gitignore</text><path d="M524.0 104h152" stroke="#216650" stroke-width="2.5" marker-end="url(#course0a-ignore-arrow)"/><text x="600.0" y="90" text-anchor="middle" class="course-figure__small course-figure__arrow-label">Commit правила</text><rect x="676.0" y="24" width="500.0" height="164" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text x="694.0" y="60" class="course-figure__title">В истории Git</text><text x="694.0" y="96" class="course-figure__small">intent.md</text><text x="694.0" y="124" class="course-figure__small">.gitignore — правило</text><text x="694.0" y="152" class="course-figure__small">черновик.txt не добавлен</text></svg></div><figcaption>В .gitignore записано имя нового черновика; сам черновик остаётся только на компьютере.</figcaption></figure>',
    },
    actions: [
      'В VS Code: создайте в папке <code>с-git</code> файл <code>.env</code> со строкой <code>TOKEN=пример</code> и файл <code>черновик.txt</code> с любой заметкой. Используйте только вымышленное значение. Папки <code>node_modules/</code> здесь нет, правило для неё добавим заранее.<br>В терминале: новые файлы видны как неотслеживаемые:<pre><code>git status --short</code></pre>',
      'В VS Code: создайте <code>.gitignore</code> и запишите три строки: <code>.env</code>, <code>node_modules/</code> и <code>черновик.txt</code>. Если файл уже есть, добавьте недостающие строки, сохранив прежние правила. Сохраните файл.<br>В терминале: проверьте содержимое:<pre><code>cat .gitignore</code></pre>',
      'В VS Code: убедитесь, что .env и черновик.txt пропали из Changes, а .gitignore появился как новый файл. Для демонстрации полного добавления выберите <strong>Stage All Changes</strong> («Подготовить все правки»).<br>В терминале:<pre><code>git add .</code></pre>Исключённые файлы не подготовлены даже при полном добавлении.',
      'В VS Code: проверьте, что в <strong>Staged Changes</strong> только .gitignore.<br>В терминале:<pre><code>git status --short</code></pre>Одна строка <code>A  .gitignore</code>.',
      'В VS Code: сравните список файлов в Explorer со списком Git. В терминале:<pre><code>git ls-files</code></pre>Только .gitignore и intent.md; .env и черновика нет, содержимое node_modules/ тоже исключается.',
      'В VS Code: нажмите <strong>Commit</strong> с сообщением «Оставить черновик и секреты вне Git».<br>В терминале:<pre><code>git commit -m &quot;Оставить черновик и секреты вне Git&quot;</code></pre>Третья запись содержит правила, а не секреты и черновик.',
      'В VS Code: сравните папку истории <code>.git</code> и файл правил <code>.gitignore</code>. В <code>.gitignore</code> указывают шаблоны путей, например <code>.env</code> и <code>*.key</code>. Правила действуют на файлы, которые Git ещё не отслеживает. Сами пароли и токены в этот файл не вписывайте.',
    ],
    gitNote: 'Для чтения правил .gitignore команда Git не нужна.',
    result:
      'В Git записано правило исключения; .env, содержимое node_modules/ и черновик остаются только на компьютере.',
    trouble:
      'Если .env всё равно виден в Source Control, он мог попасть в отслеживаемые раньше: правило его не уберёт. Обратитесь к организатору; секрет из истории удаляют отдельно. Если черновик.txt всё равно виден в Source Control как новый, проверьте имя в .gitignore: оно должно совпадать с именем файла без лишних пробелов. Если черновик.txt уже был выбран через <code>git add</code>, правило его не уберёт: спросите организатора, как убрать файл из выбранных правок.',
    advanced: null,
    links: [['Шаблоны .gitignore для стеков и IDE', 'https://github.com/github/gitignore']],
    nextUse: { href: '#step-06' },
  },
  ...branchSteps,
];
