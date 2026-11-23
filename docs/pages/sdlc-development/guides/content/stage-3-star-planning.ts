import type { LearnerStep } from '../../../../../scripts/learner-guide-types.ts';

export const steps: LearnerStep[] = [
  {
    title: 'Откройте задачу шага\u00a05\u00a0«Контекст продукта» в\u00a0Jira',
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 152" role="img" aria-labelledby="r4jira-t r4jira-d" ><title id="r4jira-t">Задача шага 5 связывает отчёт и\u00a0файл изменения</title><desc id="r4jira-d">В\u00a0Jira хранят ссылки на отчёт подготовки и\u00a0файл изменения; диапазон записан в\u00a0файле. Затем требование обсуждают с\u00a0моделью.</desc><defs><marker id="r4jira-arrow-paper" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#c6c9be"/></marker><marker id="r4jira-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker><marker id="r4jira-arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#a86716"/></marker><marker id="r4jira-arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#3f6f88"/></marker></defs><g><rect x="24" y="32" width="300" height="100" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="44" y="64" >Отчёт подготовки</text><text class="course-figure__small" x="44" y="90" >база, версии,</text><text class="course-figure__small" x="44" y="112" >список изменений</text></g><path d="M324 82H404" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r4jira-arrow-green)"/><text class="course-figure__small" x="364" y="64" text-anchor="middle">приложить</text><g><rect x="404" y="32" width="340" height="100" rx="12" fill="#fff6e3" stroke="#a86716" stroke-width="1.5"/><text class="course-figure__title" x="424" y="64" >Задача шага 5 в\u00a0Jira</text><text class="course-figure__small" x="424" y="90" >ссылка на файл изменения</text><text class="course-figure__small" x="424" y="112" >диапазон — только в\u00a0файле</text></g><path d="M744 82H824" fill="none" stroke="#3f6f88" stroke-width="2.5" marker-end="url(#r4jira-arrow-blue)"/><text class="course-figure__small" x="784" y="64" text-anchor="middle">дальше</text><g><rect x="824" y="32" width="352" height="100" rx="12" fill="#e4edf2" stroke="#3f6f88" stroke-width="1.5"/><text class="course-figure__title" x="844" y="64" >Назад к\u00a0модели</text><text class="course-figure__small" x="844" y="90" >обсудить требование</text><text class="course-figure__small" x="844" y="112" >по фактам отчёта</text></g></svg></div><figcaption>Учебная схема: отчёт → задача со ссылкой на файл изменения → обсуждение с\u00a0моделью.</figcaption></figure>',
    },
    actions: [
      'В\u00a0браузере откройте выданную лично вам задачу (Task) в\u00a0проекте вашей команды. Если её нет, создайте задачу с\u00a0согласованным родителем, названием «Ограничить допустимую сумму кредита в\u00a0учебном калькуляторе» и\u00a0назначьте её на себя (исполнитель — <code>Assignee</code>, ваша учётная запись): это ваша личная задача шага 5 курса. Форма создания задачи в\u00a0Jira (Create Issue): тип Task, заполните Summary (название) и\u00a0описание, Priority оставьте Medium; исполнитель (Assignee)\u00a0— вы.',
      'Приложите итоговый отчёт подготовки из <a href="#step-03">шага 3 «Подготовьте окружение навыком проекта»</a> или согласованную ссылку на него: он содержит проверку выданной базы, отдельные версии планирования и\u00a0сервиса, хранилище и\u00a0фактический список действующих изменений. Номера версий повторно в\u00a0Jira не переписывайте; секреты не прикладывайте. Снимки в\u00a0папке <code>.workspace</code> — только для чтения.',
      'Условие из блока ниже используйте как учебный запрос модели; диапазон храните в\u00a0файле изменения, а\u00a0в\u00a0Jira добавьте ссылку. Полный пример — комплект с\u00a0add-reset-and-years-term и\u00a0add-payment-summary: есть платёж, общая сумма и\u00a0переплата. Короткий маршрут — комплект без add-payment-summary: используйте только фактические поля и\u00a0сценарии.',
    ],
    links: [],
    result:
      'Диапазон записан только в\u00a0файле изменения. В\u00a0Jira — ссылка на этот файл и\u00a0отчёт подготовки; реализация не выполнялась.',
    trouble:
      'Если точная задача или родитель не выданы, сохраните данные для организатора и\u00a0не подставляйте случайный ключ. Не отмечайте будущие проверки или реализацию успешными.',
    advanced: null,
    example: {
      label: 'Учебный запрос модели',
      content:
        'Цель: в совмещённом учебном Store-примере ai-pdlc-learning-stage-4-requirements согласовать изменение limit-credit-amount без кода. Store id sdd-credit-calculator-product-meta — историческое имя выданного комплекта, не общая модель meta-repo + Store.\nДиапазон суммы: от 10 000 до 100 000 000 ₽ включительно; вне диапазона ошибка и очистка всех фактически существующих результатов. Для полного примера это платёж, общая сумма и переплата.\nВход: приложенный отчёт подготовки и выданная база; используйте только фактические действующие изменения (active Changes) из отчёта.\nВыход: ссылка на запрос на слияние (Merge Request, MR) для планирования (planning MR) в выданную базу. Перенос в код (Apply) не выполняется.',
    },
    examples: [
      {
        label: 'Описание Jira · замените подсказки своими ссылками',
        content:
          'Цель: согласовать изменение limit-credit-amount без реализации кода.\nТребования: <ссылка на файл в вашей ветке>.\nОтчёт подготовки: <ссылка на отчёт>.\nПосле создания запроса на слияние добавьте сюда его ссылку.',
      },
    ],
    nextUse: { href: '#step-06' },
    why: 'Задача связывает запрос и\u00a0рабочую версию требований. Диапазон хранится в\u00a0файле изменения, в\u00a0Jira — ссылка на этот источник и\u00a0его состояние.',
  },
  {
    title: 'Обсудите требование с\u00a0моделью вопросами',
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 152" role="img" aria-labelledby="r4grill-t r4grill-d" ><title id="r4grill-t">Вопросы модели и\u00a0подтверждённый список</title><desc id="r4grill-d">Замысел 2 обсуждают вопросами с\u00a0моделью: модель спрашивает по фактам, человек отвечает; итог — подтверждённый список заменяемых ожиданий.</desc><defs><marker id="r4grill-arrow-paper" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#c6c9be"/></marker><marker id="r4grill-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker><marker id="r4grill-arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#a86716"/></marker><marker id="r4grill-arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#3f6f88"/></marker></defs><g><rect x="24" y="32" width="300" height="100" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="44" y="64" >Замысел 2</text><text class="course-figure__small" x="44" y="90" >лимит суммы из системы банка</text><text class="course-figure__small" x="44" y="112" >признак архитектора</text></g><path d="M324 82H404" fill="none" stroke="#3f6f88" stroke-width="2.5" marker-end="url(#r4grill-arrow-blue)"/><text class="course-figure__small" x="364" y="64" text-anchor="middle">вопросы</text><g><rect x="404" y="32" width="340" height="100" rx="12" fill="#e4edf2" stroke="#3f6f88" stroke-width="1.5"/><text class="course-figure__title" x="424" y="64" >Модель спрашивает</text><text class="course-figure__small" x="424" y="90" >по итогам сверки</text><text class="course-figure__small" x="424" y="112" >не больше 5 вопросов</text></g><path d="M744 82H824" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r4grill-arrow-green)"/><text class="course-figure__small" x="784" y="64" text-anchor="middle">ответы</text><g><rect x="824" y="32" width="352" height="100" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="844" y="64" >Список подтверждён</text><text class="course-figure__small" x="844" y="90" >что заменяем</text><text class="course-figure__small" x="844" y="112" >новой разницей</text></g></svg></div><figcaption>Учебная схема: замысел → вопросы модели → подтверждённый список замен.</figcaption></figure>',
    },
    actions: [
      'В\u00a0текущей сессии модели отправьте два коротких сообщения ниже, дождавшись ответа на первое: сначала сверку по файлам без правок, затем обсуждение вопросами — готовый навык обсуждения вопросами из папки проекта (<code>grill-with-docs</code>) — по подтверждённым фактам.',
      'Обязательно прочитайте фактический состав и\u00a0найдите каждое старое успешное ожидание с\u00a0суммой ниже нового минимума, а\u00a0также все реально существующие поля результата.',
      'В\u00a0полном примере подтвердите условия упражнения: границы включены; дробные суммы допустимы; ошибка очищает платёж, общую сумму и\u00a0переплату. Два ожидания для 101\u00a0₽ заменяются новыми для 10\u00a0001\u00a0₽ / 0% / 2 месяца: платёж 5\u00a0001\u00a0₽, общая сумма 10\u00a0001\u00a0₽, переплата 0\u00a0₽.',
      'В\u00a0коротком маршруте не придумывайте add-payment-summary, второе ожидание 101 ₽, общую сумму или переплату. Зафиксируйте фактическое число конфликтов и\u00a0полей, согласуйте замену только затронутых ожиданий допустимым примером и\u00a0сохраните все незатронутые сценарии.',
      'Модель сводит ответы в\u00a0решения; подтвердите итог и\u00a0список открытых вопросов, затем решите, осталась ли развилка для следующего шага. Без вашего подтверждения решения нет.',
    ],
    why: 'Подтвердите условия упражнения после сверки файлов. Пишет design.md архитектор, черновик готовит модель; в шаге <a href="#step-09">«Независимая проверка моделью, затем люди»</a> ниже на этой странице его независимо проверит новая задача Kilo без истории черновика (или другая утверждённая модель), затем архитектор проверит связь с\u00a0банком и\u00a0оставит комментарий.',
    links: [],
    result:
      'Сверка файлов получена со ссылками: хранилище, действующие изменения, поля результата и\u00a0успешные ожидания ниже 10\u00a0000\u00a0₽. Вы подтвердили условия упражнения и\u00a0список замен: в\u00a0полном примере затронуты два ожидания. Исходные файлы сохранены.',
    trouble:
      'Это учебное упражнение: ответ от лица условного аналитика давайте только с\u00a0пометкой «учебное допущение». Для принятия нужно одобрение по правилу приёмки. Исходные изменения не правьте и\u00a0не удаляйте. Если модель меняет документы, удаляет старые сценарии, придумывает отсутствующее поле или изменение либо считает сумму как округлённый платёж × срок, остановите её. Сейчас нужны вопросы и\u00a0подтверждённое решение. Если Kilo оборвался по длине ответа или не вернул пригодный для следующего шага результат, шаг считается незавершённым: не переходите к\u00a0разбору с\u00a0моделью или созданию изменения. Сохраните видимую ошибку и\u00a0название модели и\u00a0обратитесь к\u00a0организатору; лимит самостоятельно не повышайте.',
    advanced:
      '<details class="beginner-extra"><summary>Продвинутый вариант · OpenCode</summary><div class="beginner-extra__body"><p>Если Kilo недоступен, продолжите работу в сессии OpenCode из <a href="#step-03">шага 3 «Подготовьте окружение навыком проекта»</a> — в той же папке требований на ветке <code>course/&lt;LOGIN&gt;/stage-4-amount-limits</code> — и отправьте те же два сообщения по одному, дождавшись ответа на первое. Ограничения те же: сверка без правок, не более 5 вопросов и 3 рекомендаций; файлы и изменения не меняются, решения и открытые вопросы ждут вашего подтверждения.</p></div></details>',
    screenshots: [
      {
        src: 'assets/route-r4-kilo-grill-result-current.jpg',
        previews: [
          {
            src: 'assets/route-r4-kilo-grill-result-current-600.webp',
            width: 600,
          },
          {
            src: 'assets/route-r4-kilo-grill-result-current-1146.webp',
            width: 1146,
          },
        ],
        width: 1146,
        height: 603,
        alt: 'Панель Kilo в\u00a0VS Code: ответ модели с\u00a0вопросами по изменению limit-credit-amount с\u00a0исправленным подсчётом сценариев.',
        caption:
          'Реальный кадр разговора с\u00a0моделью по вопросам об учебном изменении limit-credit-amount, снятый во временной рабочей копии: показан исправленный подсчёт сценариев, модель сообщает об отсутствии нерешённых вопросов. Пересчитайте сценарии по своим файлам и\u00a0подтвердите условия упражнения. Кадр не подтверждает новых решений, изменённых файлов или одобрения людей.',
      },
    ],
    example: {
      label: 'Сообщение 1 в\u00a0Kilo · сверка без правок',
      content:
        'Проверь Store id/root и прочитай CONTEXT.md, product.yaml, services.lock.yaml, docs/course/planning-provenance.json, все imports.activeChanges и docs/course/requirements-traceability.md. Файлы .workspace/planning/stage-3 и .workspace/services/credit-calculator читай только как контекст: оба снимка (snapshot) только для чтения, требования можно менять лишь в openspec/ корня requirements checkout, SHA планирования не подменяй закреплённую версию сервиса.\nКоротко ответь со ссылками на файлы: текущий Store, реальные active Changes, фактически существующие поля результата и каждое успешное ожидание с суммой ниже 10 000 ₽. Только опись, только чтение (опись найденного) — ничего не меняй и не создавай Change.',
    },
    examples: [
      {
        label: 'Сообщение 2 в\u00a0Kilo · обсуждение вопросами',
        content:
          'Используй original project skill grill-with-docs по подтверждённым фактам инвентаризации. Обсудим limit-credit-amount: сумма от 10 000 до 100 000 000 ₽ включительно; вне диапазона ошибка и «—» во всех фактически существующих результатах.\nУточни включённые границы, соседние значения, дробные суммы и reset/switch/error recovery. Спроси, какие фактически найденные конфликтующие ожидания заменяем новым описанием изменения (delta); исходные Changes остаются неизменными. Для полного примера ожидаются два сценария 101 ₽ и три поля результата; если add-payment-summary отсутствует, не придумывай второй конфликт, общую сумму или переплату.\nНе более 5 вопросов и не более 3 рекомендаций. Не придумывай ответы, не меняй файлы и не создавай Change — дождись моих ответов, затем перечисли решения и открытые вопросы и жди моего подтверждения.',
      },
    ],
    nextUse: { href: '#step-07' },
  },
  {
    title: 'Разберите развилку, только если она осталась',
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 224" role="img" aria-labelledby="r4explore-t r4explore-d" ><title id="r4explore-t">Развилка: сравнить и\u00a0выбрать</title><desc id="r4explore-d">Открытые вопросы сравнивают по вариантам без правок файлов; выбранное решение подтверждает человек, а\u00a0при отсутствии вопросов шаг пропускается.</desc><defs><marker id="r4explore-arrow-paper" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#c6c9be"/></marker><marker id="r4explore-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker><marker id="r4explore-arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#a86716"/></marker><marker id="r4explore-arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#3f6f88"/></marker></defs><g><rect x="24" y="32" width="260" height="170" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="44" y="64" >Открытые вопросы</text><text class="course-figure__small" x="44" y="90" >после обсуждения</text><text class="course-figure__small" x="44" y="112" >решаете вы</text><text class="course-figure__small" x="44" y="134" >пример: границы,</text><text class="course-figure__small" x="44" y="156" >дроби, сброс,</text><text class="course-figure__small" x="44" y="178" >очистка результатов</text></g><path d="M284 71H360" fill="none" stroke="#3f6f88" stroke-width="2.5" marker-end="url(#r4explore-arrow-blue)"/><text class="course-figure__small" x="322" y="53" text-anchor="middle">сравнить</text><path d="M284 165H360" fill="none" stroke="#3f6f88" stroke-width="2.5" marker-end="url(#r4explore-arrow-blue)"/><g><rect x="360" y="32" width="300" height="78" rx="12" fill="#fff6e3" stroke="#a86716" stroke-width="1.5"/><text class="course-figure__title" x="380" y="64" >Вариант А</text><text class="course-figure__small" x="380" y="90" >плюсы и\u00a0цена</text></g><g><rect x="360" y="126" width="300" height="78" rx="12" fill="#fff6e3" stroke="#a86716" stroke-width="1.5"/><text class="course-figure__title" x="380" y="158" >Вариант Б</text><text class="course-figure__small" x="380" y="184" >плюсы и\u00a0цена</text></g><path d="M660 71C700 71,700 118,760 118" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r4explore-arrow-green)"/><path d="M660 165C700 165,700 118,760 118" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r4explore-arrow-green)"/><text class="course-figure__small" x="710" y="55" text-anchor="middle">выбрать</text><g><rect x="760" y="32" width="416" height="170" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="780" y="64" >Выбранное решение</text><text class="course-figure__small" x="780" y="90" >Итог подтверждаете вы.</text><text class="course-figure__small" x="780" y="112" >Если вопросов не осталось,</text><text class="course-figure__small" x="780" y="134" >запишите это в\u00a0файл</text><text class="course-figure__small" x="780" y="156" >и\u00a0пропустите шаг сравнения:</text><text class="course-figure__small" x="780" y="178" >решение — за вами.</text></g></svg></div><figcaption>Учебная схема: вопросы → сравнение вариантов → подтверждённое решение.</figcaption></figure>',
    },
    actions: [
      'Прочитайте открытые вопросы обсуждения. Если все существенные решения приняты, подтвердите как человек отсутствие развилки, запишите пропуск шага и\u00a0переходите к\u00a0созданию изменения.',
      'Только если остался важный выбор между вариантами (настоящая развилка), отправьте сообщение ниже: модель сравнивает варианты по текущим документам, но не меняет файлы.',
      'После выбора подтвердите итог. Разбирайте развилку, только если после обсуждения остались вопросы; не повторяйте в\u00a0ней уже принятое решение.',
    ],
    links: [
      ['OpenSpec: официальная документация', '../corporate-resources.html#external-resources'],
    ],
    result:
      'Вы подтвердили выбранное решение либо отсутствие развилки и\u00a0пропуск шага; можно создавать изменение.',
    trouble:
      'Если разбор лишь пересказывает уже принятое решение или начинает писать изменение, остановите его и\u00a0вернитесь к\u00a0подтверждённому итогу обсуждения.',
    advanced:
      '<details class="beginner-extra"><summary>Продвинутый вариант · OpenCode</summary><div class="beginner-extra__body"><p>При настоящей развилке отправьте то же сообщение без изменений в продолженной сессии OpenCode из <a href="#step-03">шага 3 «Подготовьте окружение навыком проекта»</a> — в той же папке требований на ветке <code>course/&lt;LOGIN&gt;/stage-4-amount-limits</code>. Результат тот же: сравнение вариантов по документам хранилища и фактическим действующим изменениям без правок файлов и без создания изменения; итог подтверждаете вы.</p></div></details>',
    screenshots: [
      {
        src: 'assets/route-r4-kilo-grill-result-current.jpg',
        previews: [
          {
            src: 'assets/route-r4-kilo-grill-result-current-600.webp',
            width: 600,
          },
          {
            src: 'assets/route-r4-kilo-grill-result-current-1146.webp',
            width: 1146,
          },
        ],
        width: 1146,
        height: 603,
        alt: 'Панель Kilo в\u00a0VS Code: модель сообщает, что нерешённых вопросов не осталось и\u00a0разбор вариантов не нужен.',
        caption:
          'Тот же реальный кадр ответов на вопросы: в\u00a0этом примере нерешённых вопросов не осталось, поэтому шаг пропускается без разбора с\u00a0моделью. Кадр показывает только пропуск и\u00a0не демонстрирует разбор — при настоящей развилке используйте сообщение «Только при оставшейся развилке».',
      },
    ],
    example: {
      label: 'Только при оставшейся развилке',
      content:
        'Используй разбор вариантов OpenSpec (команда Explore) только для перечисленных нерешённых вопросов обсуждения вопросами (grill). Сравни варианты и последствия по документам текущего хранилища (Store) и всем действующим изменениям (active Changes); задай вопросы для выбора. Не меняй файлы и не создавай изменение (Change). После выбора обнови итог и дождись моего подтверждения.',
    },
    nextUse: { href: '#step-08' },
    why: 'Обсуждение нужно только для нерешённого выбора между допустимыми вариантами. Если выбор уже подтверждён, шаг можно пропустить; описание банковской интеграции в\u00a0design.md остаётся частью <a href="#step-08">шага 8 «Создайте изменение лимита суммы»</a>.',
  },
  {
    title: 'Создайте изменение лимита суммы',
    figure: {
      html: '<figure class="course-figure course-figure--wide"><div class="course-figure__viewport" role="group" tabindex="0" aria-label="Схема с\u00a0горизонтальной прокруткой при узком окне"><svg viewBox="0 0 1200 152" role="img" aria-labelledby="r4propose-t r4propose-d" ><title id="r4propose-t">Новое изменение зависит от всех активных</title><desc id="r4propose-d">По подтверждённому итогу создаётся изменение limit-credit-amount с\u00a0предложением, уточнёнными требованиями, черновиком устройства от модели для проверки архитектором и\u00a0задачами; таблица связей обновляется, исходные файлы не меняются.</desc><defs><marker id="r4propose-arrow-paper" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#c6c9be"/></marker><marker id="r4propose-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#216650"/></marker><marker id="r4propose-arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#a86716"/></marker><marker id="r4propose-arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#3f6f88"/></marker></defs><g><rect x="24" y="32" width="280" height="100" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="44" y="64" >Итог обсуждения</text><text class="course-figure__small" x="44" y="90" >что заменяем,</text><text class="course-figure__small" x="44" y="112" >какие поля чистим</text></g><path d="M304 82H380" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r4propose-arrow-green)"/><text class="course-figure__small" x="342" y="64" text-anchor="middle">создать</text><g><rect x="380" y="32" width="450" height="100" rx="12" fill="#e3f0ea" stroke="#216650" stroke-width="1.5"/><text class="course-figure__title" x="400" y="64" >limit-credit-amount</text><text class="course-figure__small" x="400" y="90" >предложение, разница, задачи</text><text class="course-figure__small" x="400" y="112" >design.md проверяет архитектор</text></g><path d="M830 82H906" fill="none" stroke="#216650" stroke-width="2.5" marker-end="url(#r4propose-arrow-green)"/><text class="course-figure__small" x="868" y="64" text-anchor="middle">связать</text><g><rect x="906" y="32" width="270" height="100" rx="12" fill="#fffdf8" stroke="#c6c9be" stroke-width="1.5"/><text class="course-figure__title" x="926" y="64" >Таблица связей</text><text class="course-figure__small" x="926" y="90" >все заголовки</text><text class="course-figure__small" x="926" y="112" >связаны</text></g></svg></div><figcaption>Учебная схема: подтверждённый итог → новое изменение → обновлённая таблица связей.</figcaption></figure>',
    },
    actions: [
      'В\u00a0той же сессии отправьте сообщение для черновика изменения (команда <code>Propose</code>).',
      'Прочитайте каждую строку созданных файлов: предложение, новые и\u00a0уточнённые требования, описание устройства решения и\u00a0задачи. Пишет design.md архитектор, черновик подготовила модель по команде аналитика; в шаге <a href="#step-09">«Независимая проверка моделью, затем люди»</a> ниже на этой странице его независимо проверит новая задача Kilo без истории черновика (или другая утверждённая модель), затем архитектор проверит его и\u00a0оставит комментарий.',
      'Обновите таблицу связей по фактическим источникам: каждому заголовку требования во всех полученных основных спецификациях и\u00a0действующих изменениях должна соответствовать строка с\u00a0источником, путём файла, номером и\u00a0статусом. Добавьте строки для нового изменения. Сохраните номер и\u00a0статус каждой унаследованной строки и\u00a0считайте их по файлам, а\u00a0не по фиксированному числу.',
      'Не запускайте перенос, архивацию и\u00a0синхронизацию; после создания переходите к\u00a0отдельной проверке моделью.',
    ],
    why: 'Изменение зависит от каждого фактического изменения и\u00a0заменяет только подтверждённые ожидания. Пишет design.md архитектор, черновик готовит модель по команде аналитика; независимая проверка в шаге <a href="#step-09">«Независимая проверка моделью, затем люди»</a> ниже на этой странице предшествует проверке архитектора.',
    links: [['Шаблон документов изменения', 'https://openspec.dev/docs/schemas/spec-driven']],
    result:
      'В\u00a0хранилище создано новое изменение limit-credit-amount с\u00a0полным пакетом по шаблону, зависимостью от всех фактических действующих изменений и\u00a0только подтверждёнными заменами и\u00a0полями; код не менялся.',
    trouble:
      'Если модель потеряла изменение, придумала отсутствующее изменение или поле, создала состояние общей главной ветки, изменила версию сервиса или предложила реализацию, остановитесь на этом шаге и\u00a0верните её к\u00a0подтверждённым итогам сверки и\u00a0обсуждения. Частичное новое изменение продолжайте, не дублируйте.',
    advanced:
      '<details class="beginner-extra"><summary>Продвинутый вариант · OpenCode</summary><div class="beginner-extra__body"><p>В продолженной сессии OpenCode из <a href="#step-03">шага 3 «Подготовьте окружение навыком проекта»</a> — та же папка требований, ветка <code>course/&lt;LOGIN&gt;/stage-4-amount-limits</code> — отправьте то же сообщение для создания черновика изменения без изменений, включая явный <code>--store sdd-credit-calculator-product-meta</code>. Результат и границы те же: новое изменение limit-credit-amount зависит от всех фактических действующих изменений, исходные изменения и код не меняются, версия сервиса сохраняется, перенос, архивация и синхронизация не выполняются — после создания структура проверяется и работа останавливается для проверки.</p></div></details>',
    screenshots: [
      {
        src: 'assets/route-r4-vscode-propose-result.png',
        previews: [
          {
            src: 'assets/route-r4-vscode-propose-result-600.webp',
            width: 600,
          },
          {
            src: 'assets/route-r4-vscode-propose-result-1200.webp',
            width: 1200,
          },
        ],
        width: 2880,
        height: 1800,
        alt: 'VS Code: в\u00a0тестовой копии требований открыт proposal.md нового изменения limit-credit-amount; рядом видны design.md, tasks.md и\u00a0spec.md.',
        caption:
          'Ожидаемые файлы изменения в\u00a0VS Code на одноразовой проверке. Замена 101 ₽ на 10 001 ₽ здесь — проверочное допущение, не согласованное решение; снимок не подтверждает запрос или одобрение.',
      },
    ],
    example: {
      label: 'Сообщение пользователя в\u00a0Kilo',
      content:
        'Используй OpenSpec Propose для нового limit-credit-amount в Store sdd-credit-calculator-product-meta с явным --store и проверенным root. Создай proposal, описания изменений требований (delta specs), design и tasks по подтверждённому grill.\nПрочитай каждый фактический imports.activeChanges из docs/course/planning-provenance.json; новый Change зависит от всех них. Папка openspec/specs может быть пустой — так и должно быть до архива принятого изменения: главную спецификацию туда соберёт openspec archive; исходное состояние в openspec/specs не создавай и не выдумывай.\nДиапазон 10 000–100 000 000 ₽ включительно; вне его очищаются только подтверждённые grill фактически существующие результаты. Замени новым описанием изменения (delta) ровно найденные конфликтующие ожидания, сохрани исходные Changes неизменными и не добавляй отсутствующие поля или Changes. Для полного примера это два ожидания 101 ₽ и пример 10 001 ₽ / 0% / 2 месяца → платёж 5 001 ₽, общая сумма 10 001 ₽, переплата 0 ₽; в коротком маршруте используй фактический более узкий договор.\nОбнови трассировку, оставь незавершёнными все задачи реализации. Не меняй код и закреплённую версию сервиса и не выполняй Apply, archive или sync. Провалидируй структуру и остановись для review.',
    },
    nextUse: { href: '#step-09' },
  },
];
