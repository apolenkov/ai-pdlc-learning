export const workspaceMap = (id: string): string =>
  id === '3-star'
    ? `<section class="card card--wide workspace-map" id="workspace-map" aria-labelledby="workspace-map-title">
  <h2 id="workspace-map-title">Где требования, а\u00a0где код</h2>
  <p>На шаге\u00a05\u00a0«Контекст продукта» вы готовите требования. В рабочей модели метарепозиторий <code>product-meta</code> хранит контекст, ссылки и <code>services.lock.yaml</code>, а отдельный Store <code>product-specs</code> — требования и изменения OpenSpec. Репозитории сервисов хранят код.</p>
  <p>Здесь выдан совмещённый учебный Store-пример: <code>ai-pdlc-learning-stage-4-requirements</code> содержит требования и учебный контекст. Историческое имя Store <code>sdd-credit-calculator-product-meta</code> сохранено для выданного комплекта; оно не объединяет meta-repo и Store в рабочей модели. Проверенную базу и связки комплекта подготавливает организатор — архитектор, техлид или разработчик. Учебный комплект — две рабочие копии репозиториев рядом: личную копию репозитория требований вы клонируете через VS Code от выданной ветки, а копию кода подготавливает навык. Третью папку для этого комплекта создавать не нужно.</p>
  <p>Вы правите только планирование в репозитории требований, а код на зафиксированном снимке сервиса читаете как контекст, не меняя его. Строка <code>store:</code> в <code>openspec/config.yaml</code> кода указывает имя зарегистрированного Store; его корень — выданная рабочая копия требований с папкой <code>openspec/</code>. Задачи реализации остаются неотмеченными; передача разработчику идёт позже и отдельно — в свёрнутом <a href="#implementation">блоке передачи</a> ниже.</p>
  <figure class="workspace-map__figure">
    <div class="workspace-map__folders">
      <section class="workspace-map__folder" aria-labelledby="planning-folder-title">
        <h3 id="planning-folder-title"><code>ai-pdlc-learning-stage-4-requirements</code></h3>
        <code class="workspace-map__path">ai-pdlc-learning-stage-4-requirements/</code>
        <ul><li><code>openspec/</code> — редактируемый корень требований: Changes, спецификации и задачи.</li><li>Задачи реализации остаются неотмеченными — их закрывает разработчик после проверки кода.</li><li><code>.workspace/</code> — снимки только для чтения, не место разработки.</li></ul>
      </section>
      <div class="workspace-map__connection"><span class="workspace-map__arrow" aria-hidden="true"></span><strong>Указатель на Store</strong><span>Команды из папки кода находят через указатель активные требования и задачи в папке требований.</span></div>
      <section class="workspace-map__folder" aria-labelledby="code-folder-title">
        <h3 id="code-folder-title"><code>ai-pdlc-learning-stage-4-code</code></h3>
        <code class="workspace-map__path">ai-pdlc-learning-stage-4-code/</code>
        <ul><li><code>src/</code> — код калькулятора на выданном снимке сервиса.</li><li><code>test/</code> — тесты приложения.</li><li><code>openspec/config.yaml</code> — указатель, а не вторая копия требований.</li></ul>
      </section>
    </div>
  </figure>
</section>`
    : '';
