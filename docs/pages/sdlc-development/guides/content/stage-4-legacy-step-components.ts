import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Разделите текущее состояние на три компонента',
    why: 'У\u00a0расчёта, проверки ввода и\u00a0экрана разные требования. Имена компонентов одинаковы в\u00a0изменении и\u00a0в\u00a0будущей главной спецификации; разбиение выбирает команда.',
    actions: [
      'Используйте три компонента: <code>payment-calculation</code> — расчёт платежа; <code>input-validation</code> — допустимые значения и\u00a0ошибки; <code>calculator-screen</code> — поля, результат и\u00a0работа страницы.',
      '<pre class="legacy-repo-tree" tabindex="0"><code>credit-calculator/                        метарепозиторий продукта — общая папка в Git\n├── AGENTS.md                             правила работы для модели\n├── README.md                             что лежит в репозитории и с чего начать\n├── docs/\n│   └── legacy/                           исходные документы; только читать, это источник\n│       ├── tz-2021.docx                  старое ТЗ версии 1.0 (Word)\n│       └── confluence-page.html          экспорт страницы Confluence\n├── intents/                              смысл доработок от владельца продукта; пусто\n└── openspec/\n    ├── config.yaml                       настройки OpenSpec\n    ├── specs/                            главная спецификация; пусто\n    └── changes/                          папки изменений в работе; пусто</code></pre>',
      '<p>Исходное состояние — база от организатора: папки и\u00a0правила, требований и\u00a0изменений нет. Результат <a href="#step-04">шага 4 «Поручите модели черновик baseline-current-state»</a> — первое изменение в <code>openspec/changes/</code>:</p><pre class="legacy-repo-tree" tabindex="0"><code>openspec/\n└── changes/\n    └── baseline-current-state/       изменение, которое создаёт ученик\n        ├── proposal.md               зачем изменение и что в него входит\n        ├── tasks.md                  сверка каждого сценария с продуктом\n        └── specs/                    ADDED-требования по компонентам\n            ├── payment-calculation/spec.md\n            ├── input-validation/spec.md\n            └── calculator-screen/spec.md</code></pre>',
      '<code>AGENTS.md</code> — правила для модели; <code>README.md</code> — вход для человека; <code>docs/legacy/</code> — исходные документы только для чтения; <code>intents/</code> — будущие запросы владельца продукта, пока пусто.',
      '<code>openspec/specs/</code> — главная спецификация, пока пусто; <code>openspec/changes/</code> — место первого изменения. Модель создаст <code>baseline-current-state/specs/&lt;компонент&gt;/spec.md</code> внутри папки изменений.',
    ],
    links: [],
    result:
      'Вы можете отнести каждое требование к\u00a0компоненту и\u00a0показать, где лежат источники, изменение и\u00a0будущая главная спецификация.',
    trouble:
      'Если требование попало в\u00a0два компонента, выберите одно место и\u00a0при необходимости добавьте ссылку. Пока не создавайте файлы в\u00a0openspec/specs/: их создаст OpenSpec после архива.',
    advanced: null,
    nextUse: { href: '#step-04' },
  },
];
