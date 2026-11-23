import { escapeHtml } from '../site-navigation-contract.ts';

const productRoleMapRows = [
  'Владелец продукта',
  'Техлид',
  'Разработчик',
  'Инженер качества',
  'Аналитик',
  'Архитектор',
  'Коуч или наставник',
  'Команда развития процессов AI PDLC',
  'DevOps-команда',
  'Поддержка пользователей',
  'Обратная связь',
] as const;

export const roleSchemaPanels =
  (): string => `<section class="reference-panel" aria-labelledby="roles-rule-title">
      <header><div><h2 id="roles-rule-title">Роль ≠ человек</h2><p>Роль: функция в процессе, не должность; один человек может держать несколько ролей.</p></div></header>
      <ul class="reference-rule-list">
        <li><strong>Автор ≠ утверждающий.</strong> Этап пишет один участник, результат утверждает другой — решение не подтверждает само себя.</li>
        <li><strong>Исключение — этап 1.</strong> Намерение пишет и утверждает владелец продукта: замысел и его границы держит один человек.</li>
        <li><strong>Этапы 2–7 идут без исключений.</strong> У каждого этапа свои автор и утверждающий.</li>
      </ul>
    </section>
    <section id="roles-c4" class="reference-panel" aria-labelledby="roles-c4-title">
      <header><div><h2 id="roles-c4-title">Архитектура по уровням C4</h2><p>Уровни модели <a href="https://c4model.com">C4\u00a0Саймона Брауна</a> и\u00a0распределение работы в\u00a0команде.</p></div></header>
      <div class="reference-table-wrap">
        <table class="reference-table">
          <thead><tr><th scope="col">Уровень</th><th scope="col">Кто пишет</th><th scope="col">Где</th><th scope="col">Кто утверждает</th></tr></thead>
          <tbody>
            <tr><th scope="row">1. Контекст</th><td data-label="Кто пишет">Архитектор</td><td data-label="Где">ADR</td><td data-label="Кто утверждает">Архитектор (ADR)</td></tr>
            <tr><th scope="row">2. Контейнеры</th><td data-label="Кто пишет">Архитектор</td><td data-label="Где">ADR</td><td data-label="Кто утверждает">Архитектор (ADR)</td></tr>
            <tr><th scope="row">3. Компоненты</th><td data-label="Кто пишет">Архитектор</td><td data-label="Где"><code>design.md</code></td><td data-label="Кто утверждает">Владелец продукта</td></tr>
            <tr><th scope="row">4. Код</th><td data-label="Кто пишет">Архитектор</td><td data-label="Где"><code>design.md</code></td><td data-label="Кто утверждает">Владелец продукта</td></tr>
          </tbody>
        </table>
      </div>
      <ul class="reference-rule-list">
        <li>Аналитик и техлид проверяют <code>design.md</code>.</li>
        <li>Для уровней 3 и\u00a04 агент готовит черновик по\u00a0репозиторию.</li>
        <li>ADR может предложить любой в\u00a0команде после совета с\u00a0архитектором; подписывает архитектор.</li>
      </ul>
    </section>`;

export const roleTeamPanels =
  (): string => `<section class="reference-panel" aria-labelledby="roles-team-title">
      <header><div><h2 id="roles-team-title">Команда продукта и общие роли</h2><p>Продукт держит команда продукта; часть ролей приходит из команды развития или платформы и обслуживает несколько продуктов.</p></div></header>
      <div class="reference-team-grid">
        <div><h3>Команда продукта</h3><p>Ведёт продукт от намерения до наблюдения.</p><ul><li>владелец продукта</li><li>техлид</li><li>разработчики</li><li>инженер качества</li><li>аналитик</li></ul></div>
        <div><h3>Общие роли</h3><p>Приходят из команды развития процессов AI PDLC или от платформы.</p><ul><li>архитектор — подпись ADR его, решение может быть общим на несколько продуктов</li><li>коуч или наставник</li><li>Команда развития процессов AI PDLC</li></ul></div>
        <div><h3>Обратная связь</h3><p>Отдельная роль, не часть поддержки пользователей.</p><ul><li>собирает сигналы эксплуатации и наблюдения</li><li>возвращает их в новое намерение</li></ul></div>
      </div>
    </section>
    <section class="reference-panel" aria-labelledby="roles-map-title">
      <header><div><h2 id="roles-map-title">Карта ролей продукта</h2><p>Шаблон «роль → кто держит» заполняется на продукт. Без фамилий: в учебном примере — должности.</p></div></header>
      <dl class="reference-role-map">${productRoleMapRows
        .map(
          (role) =>
            `<div><dt>${escapeHtml(role)}</dt><dd><span class="reference-role-map__slot">кто держит</span></dd></div>`,
        )
        .join('')}</dl>
    </section>`;
