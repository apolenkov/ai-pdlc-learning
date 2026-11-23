import { lifecycleFigureHtml } from './stage-3-change-figure-lifecycle.ts';
import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Создайте папку изменения по инструкциям',
    actions: [
      'В той же рабочей копии на своей ветке создайте изменение <code>add-reset-and-years-term</code> один раз. В терминале:<pre><code>openspec new change add-reset-and-years-term --description &quot;Накопительное ТЗ: сброс формы и срок в месяцах или годах&quot;</code></pre>',
      'Проверьте состояние документов изменения. В терминале:<pre><code>openspec status --change add-reset-and-years-term</code></pre>Увидите состояние документов: создано ли изменение; если оно создано частично, продолжайте его без повторного создания.',
      'Получите подсказку для предложения. В терминале:<pre><code>openspec instructions proposal --change add-reset-and-years-term</code></pre>По подсказке вручную заполните <code>proposal.md</code> в VS Code: свяжите замысел, принятый запрос шага 2 курса и ветку <code>course/your_login/stage-2-reset</code>; запишите цель и границу без реализации.',
      'Получите подсказку для разницы требований. В терминале:<pre><code>openspec instructions specs --change add-reset-and-years-term</code></pre>По подсказке сами заполните каждый delta-файл разницы в <code>openspec/changes/add-reset-and-years-term/specs/</code>.',
      'Получите подсказку для описания устройства решения. В терминале:<pre><code>openspec instructions design --change add-reset-and-years-term</code></pre>Проверьте признаки: все четыре не затронуты, поэтому <code>design.md</code> в этом упражнении не нужен; причину запишите в <code>proposal.md</code>.',
      'Получите подсказку для плана задач. В терминале:<pre><code>openspec instructions tasks --change add-reset-and-years-term</code></pre>По подсказке вручную заполните <code>tasks.md</code>.',
      'Не вызывайте модель для выполнения шага 3 курса. Когда предложение, разница требований и план готовы, переходите к содержательной сверке. Архивирование — после реализации, вне шага 3 курса.',
    ],
    why: 'Команды дают инструкции, содержание пишете вы. Роль каждого файла и жизненный цикл изменения — в <a href="p3-sdd.html#step-02">подготовке «SDD и OpenSpec»: шаг 2</a>. Восемь сценариев — перенос принятой базы шага 2 курса; новое поведение — срок в годах. Панели 4–5 показывают архив изменения и обновление главной спецификации после реализации: на\u00a0шаге 3 курса изменение остаётся активным.',
    result:
      'В\u00a0add-reset-and-years-term вручную подготовлены proposal.md, разница требований и\u00a0tasks.md; отсутствие design.md обосновано, реализация не начата.',
    links: [],
    trouble:
      'Если изменение создано частично, сохраните существующие решения и\u00a0продолжите через <code>status</code> и <code>instructions</code> — команды состояния и\u00a0подсказок. Если инструмент блокирует tasks.md без design.md, передайте организатору состояние и\u00a0подсказку. Не создавайте фиктивный документ ради формы и\u00a0не запускайте реализацию.',
    advanced:
      '<details class="beginner-extra"><summary>Точный вариант · JSON</summary><div class="beginner-extra__body"><p>Добавьте к команде флаг <code>--json</code>, чтобы увидеть тот же ответ машинно: <code>openspec status --change add-reset-and-years-term --json</code>. Документы по-прежнему заполняете вручную.</p></div></details>',
    screenshots: [
      {
        src: 'assets/route-r3-vscode-openspec-change.png',
        previews: [
          {
            src: 'assets/route-r3-vscode-openspec-change-600.webp',
            width: 600,
          },
          {
            src: 'assets/route-r3-vscode-openspec-change-1200.webp',
            width: 1200,
          },
        ],
        width: 2880,
        height: 1800,
        alt: 'Проводник VS Code с\u00a0раскрытым каталогом openspec/changes/add-reset-and-years-term: спецификации, design.md, proposal.md, tasks.md, таблица связей; в\u00a0редакторе открыт proposal.md, в\u00a0строке состояния личная ветка автора снимка course/wrk/stage-3-reset-years; у\u00a0вас вместо wrk будет ваш логин.',
        caption:
          'Исторический снимок изменения add-reset-and-years-term показывает proposal.md, разницу требований, design.md, tasks.md и\u00a0таблицу связей на личной ветке автора снимка course/wrk/stage-3-reset-years. В\u00a0этой практике четыре признака не затронуты, поэтому design.md не нужен; то, что файл есть на снимке, не значит, что его нужно создавать.',
      },
    ],
    figure: {
      html: lifecycleFigureHtml,
    },
    nextUse: { href: '#step-05' },
  },
];
