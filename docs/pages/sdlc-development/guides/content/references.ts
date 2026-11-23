import routeSteps from '../route-steps.json' with { type: 'json' };
import { stepRefLabel } from '../renderer/common.ts';
import type { GuideContent } from '../../../../../scripts/learner-guide-types.ts';

export const courseStepLabel = (number: string): string => {
  const step = routeSteps.find((entry) => entry.number === number);
  if (!step) throw new Error(`Unknown course step: ${number}`);
  return stepRefLabel(step);
};

export const guideReferences: GuideContent['guideReferences'] = {
  '0': [
    ['Корпоративные ресурсы курса', '../corporate-resources.html', 'resources'],
    ['Подготовка «Markdown, Git, GitLab»', 'p2-git.html', 'reference'],
  ],
  '1': [
    ['Корпоративные ресурсы курса', '../corporate-resources.html', 'resources'],
    [
      'Учебный образец шага\u00a01\u00a0«Требования в Git» на GitHub',
      'https://github.com/apolenkov/ai-pdlc-learning-stage-1/tree/main',
      'reference',
    ],
  ],
  '2': [
    ['Корпоративные ресурсы курса', '../corporate-resources.html', 'resources'],
    [
      'Учебный образец на GitHub для старта с шага\u00a02\u00a0«Проверяем и согласуем»',
      'https://github.com/apolenkov/ai-pdlc-learning-stage-2/tree/main',
      'reference',
    ],
  ],
  '3': [
    ['Корпоративные ресурсы курса', '../corporate-resources.html', 'resources'],
    [
      'Учебный образец на GitHub для старта с шага\u00a03\u00a0«Изменение в OpenSpec»',
      'https://github.com/apolenkov/ai-pdlc-learning-stage-3/tree/main',
      'reference',
    ],
  ],
  delivery: [
    ['Корпоративные ресурсы курса', '../corporate-resources.html#kilo-vscode', 'resources'],
    ['Передача из шага\u00a05\u00a0«Контекст продукта»', 's4-product.html', 'reference'],
  ],
  '4-team': [
    ['Корпоративные ресурсы курса', '../corporate-resources.html#git', 'resources'],
    [`шаг\u00a0${courseStepLabel('5')} · практика`, 's4-product.html', 'reference'],
  ],
  '4-new': [
    ['Корпоративные ресурсы курса', '../corporate-resources.html#kilo-vscode', 'resources'],
    [`шаг\u00a0${courseStepLabel('5')} · следующий запрос`, 's4-product.html', 'reference'],
  ],
  '4-legacy': [
    ['Корпоративные ресурсы курса', '../corporate-resources.html#kilo-vscode', 'resources'],
    [`шаг\u00a0${courseStepLabel('5')} · следующий запрос`, 's4-product.html', 'reference'],
  ],
  sdd: [
    ['Корпоративные ресурсы курса', '../corporate-resources.html', 'resources'],
    [
      'Презентация «Аналитический процесс, SDD и OpenSpec» (7 слайдов)',
      '../analytics-process-sdd.html',
      'reference',
    ],
  ],
  '3-star': [
    ['Корпоративные ресурсы курса', '../corporate-resources.html#kilo-vscode', 'resources'],
    [
      'Учебный образец метарепозитория на GitHub',
      'https://github.com/apolenkov/ai-pdlc-learning-stage-4-requirements/tree/main',
      'reference',
    ],
  ],
  '0a': [
    ['Корпоративные ресурсы курса', '../corporate-resources.html', 'resources'],
    ['К главной курса', 'index.html', 'reference'],
  ],
};
