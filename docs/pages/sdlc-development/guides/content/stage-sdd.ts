import { courseStepLabel } from './references.ts';
import courseNames from '../../course-names.json' with { type: 'json' };
import type { LearnerGuide } from '../../../../../scripts/learner-guide-types.ts';

import { steps as basicsSteps } from './stage-sdd-steps-basics.ts';
import { steps as standardSteps } from './stage-sdd-steps-standard.ts';
import { steps as maturityRouteSteps } from './stage-sdd-steps-maturity-route.ts';
import { steps as factorySteps } from './stage-sdd-steps-factory.ts';

export const stage: LearnerGuide = {
  corporate:
    'Работайте в\u00a0разрешённых корпоративных инструментах: документы — Markdown в\u00a0Git, а\u00a0не\u00a0Confluence или Word, как в подготовке «Зачем меняем процесс». Здесь вы только читаете: Git и\u00a0OpenSpec CLI не\u00a0нужны.',
  workaround:
    'Если термин или схема остаются непонятными, запишите вопрос и\u00a0вернитесь к\u00a0нему после шага\u00a01\u00a0«Требования в Git» — практика закрепит понятия. Не снижайте требование до\u00a0пожелания.',
  title: courseNames.guides['sdd'].title,
  summary: `Перед этим: подготовка «Markdown, Git, GitLab». Здесь вы узнаете, что такое SDD и\u00a0OpenSpec, где лежат требования и\u00a0изменение и\u00a0что задаёт стандарт анализа. Дальше: подготовка «Мета-репозиторий», затем шаг\u00a01\u00a0«Требования в Git».`,
  rationale:
    '<p>Проблема: пожелания к\u00a0продукту передавали в\u00a0чатах и\u00a0документах, и\u00a0проверить их нечем. Цель SDD: сначала проверяемая спецификация, потом код. Есть стандарт анализа, и\u00a0курс учит работать по\u00a0нему.</p><p>OpenSpec делает это по шагам: <strong>proposal</strong> — зачем меняем, <strong>specs</strong> — что меняется в поведении, <strong>tasks</strong> — список работ и\u00a0проверок, <strong>validate</strong> — проверка формы, <strong>archive</strong> — перенос принятой разницы в главную спецификацию.</p><p>Модель готовит черновик, смысл проверяют люди: ревью — по <a href="index.html#acceptance-rule">правилу приёмки</a>.</p>',
  tools: [],
  roles: [
    'Аналитик читает: цель блока — понять подход и\u00a0маршрут, практики здесь нет.',
    'Ревью — по <a href="index.html#acceptance-rule">правилу приёмки</a>; принятие идёт через запрос на слияние (Merge Request, MR) в шагах 2 и 3 курса.',
  ],
  steps: [...basicsSteps, ...standardSteps, ...maturityRouteSteps, ...factorySteps],
  output: `Понимание подхода SDD, карты файлов OpenSpec, правил стандарта анализа и\u00a0маршрута курса; Git и\u00a0OpenSpec CLI для этого не\u00a0нужны. Практика оформления изменения — в\u00a0шаге\u00a0${courseStepLabel('3')}.`,
  check: [
    'Отличаю требование, реализацию и\u00a0проверку.',
    'Назову назначение proposal.md, разницы требований, design.md и\u00a0tasks.md; отличу текущие требования от\u00a0предлагаемого изменения.',
    'Знаю границы <code>openspec validate</code>: он проверяет форму; смысл и полноту проверяет ревью по <a href="index.html#acceptance-rule">правилу приёмки</a>.',
    'Могу назвать, что задаёт стандарт анализа, и\u00a0шаг курса для каждого правила.',
    `Дальше — подготовка «Мета-репозиторий», затем шаг\u00a0${courseStepLabel('1')}.`,
  ],
  next: 'metarepo',
  learning: [
    'Различить пожелание, требование и\u00a0реализацию.',
    'Назвать, что задаёт стандарт анализа.',
    'Назвать, что проверяет validate (форму), кто делает ревью (владелец продукта, аналитик, техлид) и кто принимает изменение (владелец решения, в примере — владелец продукта).',
  ],
  application:
    'Используйте проверяемое поведение и\u00a0стандарт, чтобы обсуждать небольшую доработку до\u00a0кода. В шаге 3 курса ваш результат шага 2 курса переносят в\u00a0комплект OpenSpec; в шаге 5 курса используют принятый комплект в\u00a0контексте продукта.',
};
