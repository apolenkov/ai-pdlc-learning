import { courseStepLabel } from './references.ts';
import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const merge: LearnerStep = {
  title: 'Примите запрос и\u00a0зафиксируйте выход',
  actions: [
    'В GitLab: после актуального одобрения по правилу приёмки примите запрос в личную целевую ветку внутри своего форка; сначала сверьте target — личная ветка шага 1. В учебном форке Merge нажимаете вы; в команде слияние выполняет техлид (Maintainer) после одобрения владельца продукта и разбора комментариев — <a href="s4-team.html#step-04">как это устроено в команде</a>. Если участвовал архитектор, проверьте design.md. Общую main не меняйте.',
    'В GitLab: перед <strong>Merge</strong> снимите <strong>Delete source branch</strong>, сохраните <code>course/your_login/stage-2-reset</code>, затем нажмите Merge. В Jira запишите ссылку на принятый запрос и итог: правки шага 2 курса приняты в личную ветку шага 1 курса <code>course/your_login/stage-1-error-result</code>; проверенная исходная ветка шага 2 курса сохранена как основа шага 3 курса.',
    'В VS Code: дальше создайте ветку шага 3 в той же папке от принятой ветки шага 2, поэтому оставайтесь на <code>course/your_login/stage-2-reset</code>. Проверьте пустой Source Control; точная диагностика — в помощи «Продвинутый вариант».',
  ],
  why: `В\u00a0вашем форке по умолчанию принятие без одобрения не блокируется: проверьте одобрения по правилу приёмки. Дальше — шаг\u00a0${courseStepLabel('3')}, затем шаг\u00a0${courseStepLabel('4')}, потом шаг\u00a0${courseStepLabel('5')}.`,
  gitNote: 'Для записи результата в Jira команда Git не нужна.',
  result: `В\u00a0Jira зафиксированы принятый запрос и\u00a0сохранённая ветка <code>stage-2-reset</code> — вход в шаг\u00a0${courseStepLabel('3')}. Принятые правки модели входят в\u00a0тот же накопительный результат и\u00a0должны быть проверены людьми до принятия запроса.`,
  links: [],
  trouble:
    'Если после проверки моделью версия изменилась, прежнее одобрение не покрывает новые правки. Запросите повторное ревью; попросите владельца продукта через @ снять одобрение и одобрить заново последнюю версию. Если ветку <code>course/your_login/stage-2-reset</code> на сервере всё же удалили, восстановите её из локальной ветки: <code>git push origin course/your_login/stage-2-reset</code>. Если запрос на слияние недоступен или ветка показывает чужой результат, остановитесь и\u00a0сверьте ветки; не используйте принудительную отправку и\u00a0main.',
  advanced:
    '<p>В GitLab: Merge и запись результата в Jira выполняются только в браузере после одобрения последней версии. Сохраните исходную ветку шага 2; общую main не меняйте. Для диагностики оставайтесь на принятой исходной ветке:</p><ol><li>В VS Code: выполните <strong>Git: Fetch</strong>. В терминале:<pre><code>git fetch origin</code></pre>Сведения origin обновятся; пустой вывод допустим.</li><li>В VS Code: если организатор запросил идентификатор, откройте последний коммит в истории. Точнее В терминале:<pre><code>git rev-parse HEAD</code></pre>Увидите полный идентификатор версии; обычной сдаче достаточно ссылки на MR.</li><li>В VS Code: сверьте upstream в <strong>Git: Show Git Output</strong>. Точнее В терминале:<pre><code>git rev-parse --abbrev-ref --symbolic-full-name @{upstream}</code></pre>Ожидается <code>origin/course/your_login/stage-2-reset</code>; ошибка или иное имя требуют сверки с организатором.</li><li>В VS Code: проверьте имя ветки, пустой Source Control и отсутствие входящих/исходящих коммитов. В терминале:<pre><code>git status --short --branch</code></pre>Ожидается <code>## course/your_login/stage-2-reset...origin/course/your_login/stage-2-reset</code> без строк файлов и без суффикса в квадратных скобках. При <code>[ahead N]</code>, <code>[behind N]</code>, <code>[ahead N, behind M]</code>, отсутствии upstream или другом имени ветки сдачу остановите и передайте вывод организатору. После Merge локальная целевая ветка шага 1 сама не обновляется; здесь проверяется только исходная ветка шага 2.</li><li>В GitLab: в Repository → Branches проверьте обе личные ветки вашего форка. Точнее В терминале:<pre><code>git ls-remote --heads origin course/your_login/stage-2-reset course/your_login/stage-1-error-result</code></pre>Ожидаются две строки с идентификаторами и именами веток; совпадение этих двух идентификаторов не требуется.</li></ol>',
  screenshots: [
    {
      src: 'assets/gitlab-mr-before-merge.png',
      previews: [
        {
          src: 'assets/gitlab-mr-before-merge-600.webp',
          width: 600,
        },
        {
          src: 'assets/gitlab-mr-before-merge-1200.webp',
          width: 1200,
        },
      ],
      width: 2000,
      height: 560,
      alt: 'Блок слияния MR в GitLab: кнопка Approve («Одобрить»), статус Ready to merge («Готово к слиянию») и\u00a0кнопка Merge («Слить»); ниже указано, что сохранённая версия попадёт в\u00a0личную ветку шага 1 курса.',
      caption: `Кнопку <strong>Merge</strong> («Слить») нажимайте после одобрения последней версии по правилу приёмки. Строка под флажками показывает принятие в\u00a0личную ветку шага 1 курса; снимите <strong>Delete source branch</strong> («Удалить исходную ветку»), чтобы сохранить принятую ветку шага 2 курса как основу шага\u00a0${courseStepLabel('3')}.`,
    },
  ],
  figure: {
    html: `<figure class="course-figure course-figure--wide course-figure--process"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 150" role="img" aria-labelledby="r2-close-t r2-close-d"><title id="r2-close-t">Одобрение → принять шаг 2 → сохранить вход</title><desc id="r2-close-d">После актуального человеческого одобрения автор выполняет Merge запроса в\u00a0личную ветку шага 1, сохраняет исходную ветку шага 2 и\u00a0одну ссылку на принятый запрос в\u00a0Jira; следующая практика продолжит шаг 2.</desc><defs><marker id="r2-close-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker></defs><g><rect x="16" y="20" width="340" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="36" y="52">Последняя версия проверена</text><text class="course-figure__small" x="36" y="74">Владелец продукта — одобрение</text><text class="course-figure__small" x="36" y="94">Аналитик, Техлид — комментарии</text><text class="course-figure__small" x="36" y="114">✓ Архитектор — когда подключался</text></g><g><rect x="430" y="20" width="340" height="110" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="450" y="52">Принять шаг 2 → ветка шага 1</text><text class="course-figure__small" x="450" y="82">Merge — принять правки в\u00a0своём форке</text><text class="course-figure__small" x="450" y="106">Delete source branch: снять флажок</text></g><g><rect x="844" y="20" width="340" height="110" rx="12" fill="#e3f0ea" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="864" y="52">Jira · вход следующего блока</text><text class="course-figure__small" x="864" y="82">Одна ссылка на принятый запрос</text><text class="course-figure__small" x="864" y="106">stage-2-reset · правок нет</text></g><path d="M356 95H430" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r2-close-arrow)"/><path d="M770 95H844" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r2-close-arrow)"/></svg></div><figcaption>Оставайтесь на принятой ветке шага 2 курса: её результат нужен для шага 3 курса. Дальше — шаг\u00a0${courseStepLabel('3')}.</figcaption></figure>`,
  },
  nextUse: { href: 's3-openspec.html', label: 'Изменение в OpenSpec' },
};
