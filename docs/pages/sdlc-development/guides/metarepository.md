# Мета-репозиторий продукта

Метарепозиторий помогает человеку и агенту начать задачу с нужным контекстом: выбрать продукт, найти действующие требования, проверить исходные версии кода и понять условия приёмки. Требования и изменения хранит общий Store (хранилище требований), а код, проверки и выпуск остаются в репозиториях кода.

Учебный пример: продукт <code class="meta-token">a</code>, два репозитория кода (<code class="meta-token">web</code> и <code class="meta-token">api</code>) и общий Store <code class="meta-token">product-specs</code>. Репозитории кода ссылаются на Store указателем и своих specs/ и changes/ не хранят (в OpenSpec это режим store-only). Метарепозиторий и Store — два разных Git-репозитория. Имена <code class="meta-token">meta-repo</code>, <code class="meta-token">a</code>, <code class="meta-token">web</code>, <code class="meta-token">api</code>, <code class="meta-token">product-specs</code> и <code class="meta-token">EXP-001</code> условные; замените их реальными.

Store — механизм OpenSpec для требований, общих для нескольких репозиториев кода. Остальное — рабочая договорённость команды: контекст и ссылки — в метарепозитории, общие требования — в Store, закреплённые версии сервисов — в карточке продукта (см. [«Как работает команда продукта»](s4-team.html)).

**Что вы получите.** Найдёте свой продукт, источник требований и решений, проверенную версию кода каждого сервиса и свяжете запросы изменения: требования — до кода, архив — после.

**Перед началом.** Пройдите подготовку [Markdown и Git](p2-git.html) и [SDD и OpenSpec](p3-sdd.html). Нужны ссылка на задачу, адреса метарепозитория, Store и репозиториев кода и доступ к ним. Общедоступного рабочего <code class="meta-token">meta-repo</code> в примере нет; адрес и права уточните у организатора.

## Пять понятий {#purpose}

**Продукт** — бизнес-объект: пользователи, задачи и границы. Продукт <code class="meta-token">a</code> включает компоненты <code class="meta-token">web</code> и <code class="meta-token">api</code>; он не равен ни одному репозиторию.

**Репозиторий кода** — Git-репозиторий исходников одного компонента: ветки, тесты, CI, свои правила и запросы на слияние. У <code class="meta-token">web</code> и <code class="meta-token">api</code> они разные, поэтому проверять, сливать и подтверждать выпуск нужно по отдельности. Монорепозиторий объединяет несколько компонентов в одном Git-репозитории; метарепозиторий может ссылаться и на него.

**Метарепозиторий** — общий контекст, правила работы и ссылки между артефактами. Отвечает на вопросы «что меняем», «на основании чего» и «где результат», но не хранит вторые копии требований и исходников.

**Store** — отдельный от метарепозитория репозиторий с общими спецификациями и изменениями для нескольких репозиториев кода. По договорённости курса его имя — `<продукт>-specs`. В примере <code class="meta-token">product-specs</code> — один источник требований для <code class="meta-token">web</code> и <code class="meta-token">api</code>.

**Рабочее пространство** — локальная среда исполнителя: каталоги, инструменты и настройки. Может включать метарепозиторий, Store и рабочие копии репозиториев кода; открытые рядом каталоги сами не синхронизируются и прав агенту не дают. В OpenSpec для такой связки есть workset — см. ниже.

## Как связаны продукт, репозитории кода и Store {#map}

<figure class="meta-diagram" aria-label="Метарепозиторий продукта a, два репозитория кода и общий Store требований">
  <div class="meta-root">
    <h3 class="meta-token">meta-repo</h3>
    <p>Контекст продукта <code class="meta-token">a</code>, правила и ссылки: README.md, AGENTS.md, CONTEXT.md, product.yaml, services.lock.yaml.</p>
  </div>
  <div class="meta-branches">
    <article class="meta-branch">
      <div class="meta-scope"><h3>Продукт <code class="meta-token">a</code></h3><p>Компоненты <code class="meta-token">web</code> и <code class="meta-token">api</code>.</p></div>
      <p class="meta-link">Контекст и критерии — из метарепозитория; код и выпуск — в репозиториях кода.</p>
      <div class="meta-repo"><h3>Репозитории кода</h3><p><code class="meta-token">web</code> и <code class="meta-token">api</code>: у каждого свой SHA, MR и проверки.</p></div>
    </article>
    <article class="meta-branch">
      <div class="meta-scope"><h3>Store <code class="meta-token">product-specs</code></h3><p>Отдельный Git-репозиторий: openspec/specs и openspec/changes.</p></div>
      <p class="meta-link">В <code>openspec/config.yaml</code> каждого репозитория кода — указатель на этот Store.</p>
      <div class="meta-repo"><h3>Один источник требований</h3><p><code class="meta-token">web</code> и <code class="meta-token">api</code> читают одни specs; второй копии нет.</p></div>
    </article>
  </div>
  <figcaption>Один продукт, два репозитория кода и один Store. Метарепозиторий даёт контекст и ссылки. OpenSpec сам не делает clone, pull и push.</figcaption>
</figure>

Связи показывают передачу контекста и прослеживаемость: у <code class="meta-token">web</code> и <code class="meta-token">api</code> свои ревизии, MR и evidence.

## Store: конфигурация и подключение {#store}

Store нужен, когда требования общие для нескольких репозиториев кода. С одним репозиторием кода он не нужен: достаточно папки `openspec/` в самом репозитории — так OpenSpec работает по умолчанию.

По договорённости курса Store создают один на продукт и один раз. В репозитории кода остаётся одна строка `store:`, а на каждой машине Store регистрируют один раз.

**Создайте Store — это делает один человек.** Store создают вне другого Git-репозитория: внутри него `openspec store setup` остановится с ошибкой `Store setup path is inside another Git repository`. В терминале:

```sh
openspec store setup product-specs --path ~/openspec/product-specs
```

Увидите: вопрос `Create this store?` — нажмите Enter; затем `Store ready: product-specs`, `OpenSpec root: ready`, `Registry: registered`.

**Отправьте Store в GitLab.** В GitLab: создайте пустой проект `product-specs` без README и скопируйте адрес Clone with SSH. В терминале: подключите этот адрес:

```sh
git -C ~/openspec/product-specs remote add origin <адрес>
```

Затем отправьте первый коммит:

```sh
git -C ~/openspec/product-specs push -u origin HEAD
```

**Подключите Store на другой машине.** В GitLab: откройте `product-specs` → Code → Clone with SSH и скопируйте адрес. В терминале: клонируйте store:

```sh
git clone <адрес> ~/openspec/product-specs
```

Зарегистрируйте клон:

```sh
openspec store register ~/openspec/product-specs
```

Увидите: `Store registered: product-specs`, `Registry: registered`.

**Свяжите репозиторий кода.** Из корня репозитория кода создайте каталог конфигурации:

```sh
mkdir -p openspec
```

Запишите строку store:

```sh
printf 'store: product-specs\n' > openspec/config.yaml
```

Установите команды OpenSpec для агента:

```sh
openspec init --tools <инструмент>
```

Увидите: `Config: openspec/config.yaml (exists)`.

1. `init` запускает один человек один раз и сразу перечисляет все инструменты команды: `openspec init --tools claude,codex`.
2. Он коммитит `openspec/config.yaml` и папку с командами агента, которую создал `init` (для Claude Code это `.claude/`), в отдельной ветке и открывает MR — как в подготовке [Markdown и Git](p2-git.html). Так коллеги после клонирования сразу получают строку `store:` и те же команды агента.
3. Остальные `init` не запускают: после клонирования они только регистрируют Store на своём компьютере.
4. При обновлении OpenSpec один человек делает `openspec update` и отдельный MR.

В GitLab: создайте MR в репозиторий кода с этими файлами.

**Создайте первое изменение из репозитория кода.** Строка `store:` направляет команду в store:

```sh
openspec new change exp-001-export
```

Увидите: `Using OpenSpec root: product-specs (…)` и `Created change 'exp-001-export' at …/product-specs/openspec/changes/exp-001-export/`.

**Отправьте изменение в Store.** Пока вы его не закоммитили и не отправили, оно лежит только в вашем клоне, и коллеги его не увидят. Закоммитьте изменение в отдельной ветке Store и отправьте её на сервер. В шаге 5 откройте из этой ветки MR с требованиями. В терминале: создайте ветку:

```sh
git -C ~/openspec/product-specs switch -c change/exp-001-export
```

Добавьте изменение в коммит:

```sh
git -C ~/openspec/product-specs add openspec/changes/exp-001-export
```

```sh
git -C ~/openspec/product-specs commit -m "feat: exp-001 export"
```

Отправьте ветку:

```sh
git -C ~/openspec/product-specs push -u origin change/exp-001-export
```

В GitLab: создайте MR из этой ветки в `main` Store.

**Проверьте store:**

```sh
openspec store doctor product-specs
```

Увидите: `OpenSpec root: ok`, `Metadata: ok`, `Issues: none`.

**Два предупреждения.** Сначала строка `store:`, потом `openspec init`: иначе init создаст свои `specs/` и `changes/`, и OpenSpec напишет `…declares store 'product-specs', but this directory is a real OpenSpec root; the declaration is ignored.`

Одно имя Store — одна папка на машине: второй клон или worktree Store под тем же id не регистрируется (`already registered … One checkout per store id`). Поэтому ветки Store — требований и архива — переключаются в этом единственном клоне по очереди, а репозитории кода на вашей машине читают ту ветку, которая открыта сейчас.

Store в OpenSpec — бета: команды и форматы могут меняться между версиями. Сам OpenSpec не скачивает и не отправляет store: перед работой — `git pull`, после — commit и `git push`.

Store и репозиторий кода можно открыть в одном окне VS Code или Cursor командами `openspec workset create` и `openspec workset open`. Workset — это рабочее пространство в терминах OpenSpec, тоже бета; открытие в Claude Code и Codex сейчас отключено.

Порядок выбора корня OpenSpec: явный `--store`, затем собственные `specs`/`changes` репозитория, затем строка `store:`, затем машинный `defaultStore`.

