import type { ReferenceGlossaryGroup } from '../types.ts';

export const deliveryPlanning: ReferenceGlossaryGroup = {
  key: 'delivery-planning',
  label: 'Планирование и поставка',
  description: 'Единицы работ, сроки и план перехода.',
  entries: [
    {
      term: 'Jira key',
      definition: 'Ключ задачи Jira для однозначной идентификации и трассируемости.',
    },
    {
      term: 'Epic',
      definition: 'Крупная единица работ, объединяющая связанные Stories и Tasks.',
    },
    {
      term: 'Story',
      definition:
        'Результат процесса или пользовательская ценность, принимаемые по проверяемому критерию.',
    },
    {
      term: 'Task',
      definition:
        'Техническая или инфраструктурная работа, необходимая для результата Story или Epic.',
    },
    {
      term: 'SP',
      definition:
        'Story Points: относительная оценка сложности. Не переводится в часы и не заменяет календарную оценку.',
    },
  ],
};
