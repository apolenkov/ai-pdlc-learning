# Линия маршрута курса и «конфетка» TASK-554 · план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** липкая полоса маршрута П → С → Д с «вы здесь», пройденным и минутами, шестерёнки от прокрутки, превью ролика на
карте, отмечаемая самопроверка со «щелчком» и итоговой карточкой на Д1, блок «Как пользоваться картой» (A/B).

**Architecture:** чистые модули (данные маршрута, состояние, хранилище отметок, разметка) в
`docs/pages/sdlc-development/route-strip/`, импортируются из `course-motion.ts` (уже грузится на каждой странице курса с
`data-atmos`, бюджет 50 КБ под тестом). Монтирование полосы не зависит от `data-no-motion`/reduced-motion; движение —
только без reduced-motion. Минуты роликов — генерируемый `guides/route-durations.json` (как блок карты: `course-map.ts --write`
+ тест на совпадение).

**Tech Stack:** TypeScript (esbuild, `node --experimental-strip-types --test`), CSS, `motion` 14.2.0 (уже в бандле).

**Spec:** `docs/superpowers/specs/2026-10-15-course-route-strip-design.md` (принят 008 15.10). Решение 008 сверх спеки:
из плашки «Вы здесь» убрать список шагов, оставить «← предыдущий · Карта курса · следующий →».

## Global Constraints

- Слова групп: «Подготовка», «Практика», «Разработка»; диапазоны «П1–П3», «С1–С4», «Д1».
- Минуты: `≈ N мин` (округление вверх до минуты); подпись «пройдено ≈ N мин · осталось ≈ M мин роликов».
- Сумма времени: все шаги `route` + обе ветки (`branches`), без `extras` (П3+); шаг без манифеста не входит.
- Хранилище: только `localStorage`, ключ `customdev-course:v1`, значение `{"checked":{"<stageId>":[индексы]}}`; ошибка
  чтения/разбора → пустое состояние; ничего не отправляется.
- `prefers-reduced-motion: reduce` → ни одной анимации (полоса, шестерёнки, щелчок, превью статичны/выключены).
- Полоса ≤ 56 px на десктопе, ≤ 44 px при ширине ≤ 600 px; не теснит меню и якоря.
- Бандл `course-motion.js` ≤ 50 КБ (существующий тест `scripts/course-motion.test.ts`).
- Стиль CustomDev: токены `--customdev-*` из `site-nav.css`, зелёный = пройдено/цель, без новых шрифтов.
- Файлы 013 не трогать: `site-navigation-contract.ts`, `update-site-navigation.ts`, `renderer/hero.ts`, `<title>`-строки,
  `content/stage-4-legacy.ts`, `example-pages.ts`, `build-metarepository-guide.ts`.

## Review Focus

1. Повреждённый/чужой `localStorage` (не JSON, другой формат, `localStorage` бросает в приватном режиме) — страница
   работает, отметок нет. Тест — Task 2.
2. Страница ветки С4а/С4б: текущая — точка ветки, С4 пройден, вторая ветка «впереди», «осталось» считает её. Тест — Task 1.
3. Ролик без манифеста (`seconds: null`) — шаг виден, в суммах не участвует, подпись не показывает «NaN». Тест — Task 1.
4. Якорь (`#step-03`, `#lesson-video`) после монтирования полосы не уходит под неё. Проверка — Task 7 (браузер).
5. Сборка без видео (`PAGES_WITH_VIDEO` не задан) — превью и значок «▶» не появляются, ошибок в консоли нет. Проверка — Task 5.

---

### Task 1: Данные маршрута и состояние

**Files:**
- Create: `docs/pages/sdlc-development/route-strip/model.ts`
- Modify: `scripts/course-map.ts` (запись `guides/route-durations.json` в `--write`, функция `routeDurations()`)
- Create: `docs/pages/sdlc-development/guides/route-durations.json` (генерируется)
- Test: `scripts/route-strip-model.test.ts`, дополнение `scripts/course-map.test.ts`

**Interfaces:**
- Produces:
  - `type Group = 'prep' | 'practice' | 'after'`
  - `type RouteStep = { id: string; code: string; group: Group; title: string; href: string; seconds: number | null; branchOf: string | null }`
  - `buildRoute(names: CourseNames, durations: Record<string, number | null>): RouteStep[]` — `route` по порядку, ветки
    сразу после своего `of`; `href` — `guides[id].file`; `title` — `guides[id].short`.
  - `type StepState = 'passed' | 'current' | 'ahead'`
  - `routeState(steps: RouteStep[], currentId: string | null, done: ReadonlySet<string>): { states: Record<string, StepState>; group: Group | null; passedSeconds: number; leftSeconds: number }`
  - `minutes(seconds: number): string` → `≈ N мин`
  - `GROUP_WORDS: Record<Group, string>` = Подготовка / Практика / Разработка; `GROUP_RANGE` = П1–П3 / С1–С4 / Д1
  - `routeDurations(): Promise<Record<string, number | null>>` в `course-map.ts` (через `filmDuration`)

- [ ] **Step 1: тесты модели** (`route-strip-model.test.ts`, фикстура из реального `course-names.json` и вымышленных секунд):
  - `buildRoute` даёт коды по порядку `П1 П2 П3 С1 С2 С3 С4·вступление С4 С4а С4б Д1`, у С4а/С4б `branchOf === '3-star'`, П3+ нет.
  - `routeState(steps, '2', ∅)`: П1–С1 `passed`, С2 `current`, остальное `ahead`; `group === 'practice'`.
  - `routeState(steps, '4-new', ∅)`: С4 `passed`, С4а `current`, С4б `ahead`; `leftSeconds` включает С4б и Д1.
  - `routeState(steps, '2', {'3','delivery'})`: С3 и Д1 `passed` при текущем С2.
  - `routeState(steps, null, ∅)` (карта): все `ahead`, `passedSeconds === 0`, `leftSeconds === сумма всех не-null`.
  - шаг с `seconds: null` не входит ни в одну сумму; `minutes(61) === '≈ 2 мин'`, `minutes(0) === '≈ 0 мин'`.
- [ ] **Step 2:** запустить `node --experimental-strip-types --test scripts/route-strip-model.test.ts` → FAIL (нет модуля).
- [ ] **Step 3:** реализовать `model.ts` (чистые функции, без DOM) и `routeDurations()` + запись JSON в `course-map.ts --write`;
  тест в `course-map.test.ts`: файл `route-durations.json` совпадает с `routeDurations()` (как проверка блока карты).
- [ ] **Step 4:** `node --experimental-strip-types scripts/course-map.ts --write`; тесты → PASS.
- [ ] **Step 5:** commit `feat(site): route model and film minutes for the course strip`.

### Task 2: Хранилище отметок самопроверки

**Files:**
- Create: `docs/pages/sdlc-development/route-strip/progress.ts`
- Test: `scripts/route-strip-progress.test.ts`

**Interfaces:**
- Produces:
  - `const PROGRESS_KEY = 'customdev-course:v1'`
  - `readChecked(store: Pick<Storage,'getItem'> | null): Record<string, number[]>`
  - `writeChecked(store: Pick<Storage,'setItem'> | null, stageId: string, indexes: number[]): void` (ошибки записи глотаются)
  - `doneStages(checked: Record<string, number[]>, totals: Record<string, number>): Set<string>` — этап сделан, когда
    отмечены все `totals[id]` пунктов.
  - `resetChecked(store: Pick<Storage,'removeItem'> | null): void`
  - `safeStorage(): Storage | null` — `localStorage` или `null`, если доступ бросает.

- [ ] **Step 1: тесты** на фейковом `Map`-хранилище: запись/чтение; `getItem` → `'{'` / `'[]'` / `'{"checked":5}'` → `{}`;
  `getItem` бросает → `{}`; `doneStages` при 3 из 3 → содержит id, при 2 из 3 → нет; `resetChecked` удаляет ключ.
- [ ] **Step 2:** запуск → FAIL. **Step 3:** реализация. **Step 4:** PASS.
- [ ] **Step 5:** commit `feat(site): self-check marks stored only in the reader's browser`.

### Task 3: Полоса маршрута и шестерёнки (C, D)

**Files:**
- Create: `docs/pages/sdlc-development/route-strip/strip.ts`, `route-strip/gears.ts`
- Modify: `docs/pages/sdlc-development/course-motion.ts` (монтирование до проверки `data-atmos`/motion),
  `docs/pages/sdlc-development/course-motion.css` (стили полосы, резерв `--site-nav-reserve` на страницах
  `html:has(body[data-stage]), html:has(#course-map)` = база + высота полосы, по тем же брейкпоинтам, что у меню)
- Test: `scripts/route-strip-render.test.ts`

**Interfaces:**
- Consumes: Task 1 (`buildRoute`, `routeState`, `minutes`, `GROUP_WORDS`, `GROUP_RANGE`), Task 2 (`readChecked`, `doneStages`, `safeStorage`).
- Produces:
  - `renderStrip(steps: RouteStep[], state: ReturnType<typeof routeState>, currentId: string | null): string` —
    `<nav class="course-route" aria-label="Маршрут курса">`: три группы `<span>Подготовка <small>П1–П3</small></span>`
    со списком точек-ссылок (код под точкой; `aria-current="step"` у текущей; скрытый текст «пройден»/«вы здесь»);
    справа `Практика · С2` и `пройдено ≈ N мин · осталось ≈ M мин роликов`; на карте — `Начните с П1 · ≈ M мин роликов`.
  - `mountStrip(doc: Document): void` — читает `body[data-stage]` или наличие `#course-map`, вставляет полосу сразу после
    `[data-global-nav]`, подписывается на событие `course-route:update` (Task 4) для перерисовки.
  - `gearsSvg(): string` (≤ 2 КБ, две сцепленные шестерёнки 18 и 12 px) и `spinGears(root: Element): void`
    (угол = `scrollY * 0.25` град., малая `-angle * 1.5`; `requestAnimationFrame` на событии `scroll`, `passive`).
- [ ] **Step 1: тесты** `renderStrip`: на С2 — три слова групп и диапазоны, 11 точек-ссылок с `href` гайдов, ровно одна
  `aria-current="step"`, текст «пройдено ≈» и «осталось ≈»; на карте — «Начните с П1», нет `aria-current`;
  ни в одном выводе нет `NaN` и `undefined`.
- [ ] **Step 2:** FAIL. **Step 3:** реализация `strip.ts`, `gears.ts`, монтирование в `course-motion.ts`:
  `mountStrip(document)` всегда; `spinGears` только если не reduced-motion и не `data-no-motion`. Ширина ≤ 600 px — CSS:
  точки скрыты, видны код, этап, «осталось ≈ N мин», тонкая шкала прогресса; шестерёнки остаются 14 px, если не теснят.
- [ ] **Step 4:** PASS; `node --test scripts/course-motion.test.ts` (бюджет 50 КБ) → PASS.
- [ ] **Step 5:** commit `feat(site): sticky course route strip with gears`.

### Task 4: Плашка «Вы здесь», самопроверка, щелчок, «Маршрут пройден» (F3, решение 008)

**Files:**
- Modify: `docs/pages/sdlc-development/guides/renderer/navigation.ts` (`renderRoutePosition`: убрать `route-position__groups`
  и `route-position__title`; оставить `route-position__links`), `guides/learning-enhancements.css` (стили плашки),
  `course-motion.ts` (`tracePlate` удалить — следов больше нет), `course-motion.css`
- Create: `docs/pages/sdlc-development/route-strip/selfcheck.ts`
- Test: правка `scripts/learner-guide-*.test.ts` и `scripts/course-names-contract.test.ts`, где ждут группы плашки;
  новый `scripts/route-strip-selfcheck.test.ts` (чистая часть)

**Interfaces:**
- Consumes: Task 2 (`readChecked`, `writeChecked`, `doneStages`, `resetChecked`), Task 1.
- Produces:
  - `enhanceSelfCheck(doc: Document, stageId: string): void` — каждый `li` в `section.card ul.check` получает
    `button role="checkbox" aria-checked`, состояние из хранилища; все отмечены → `celebrate(section)` (вспышка ✓ ≤ 600 мс,
    тост «<код> пройден — точка на маршруте отмечена»), `dispatchEvent(new CustomEvent('course-route:update'))`.
  - `renderFinale(steps: RouteStep[], done: ReadonlySet<string>, totalSeconds: number): string` — карточка «Маршрут пройден»
    (коды всех шагов, `≈ M мин роликов`, ссылка на карту, «Все шаги отмечены», если `done` покрывает весь `route` и хотя бы
    одну ветку); монтируется после самопроверки на странице `data-stage="delivery"`.
  - Ссылка «Сбросить отметки» на карте (в блоке «Как пользоваться картой»), вызывает `resetChecked` и `course-route:update`.
- [ ] **Step 1: тесты**: `renderRoutePosition('2', …)` не содержит `route-position__group`, содержит `rel="prev"`,
  `Карта курса`, `rel="next"`; `renderFinale` с полным `done` → «Все шаги отмечены», без — нет; сумма минут как в Task 1.
- [ ] **Step 2:** FAIL. **Step 3:** реализация; обновить старые тесты плашки под новое ожидание (без групп).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** commit `feat(site): checkable self-check with a success click and the route finale`.

### Task 5: Превью ролика на карте (F2)

**Files:**
- Create: `docs/pages/sdlc-development/route-strip/preview.ts`
- Modify: `course-motion.ts` (вызов на карте), `guides/learning-enhancements.css` (значок, кадр превью)

**Interfaces:**
- Produces: `mountPreviews(doc: Document): void` — для каждой `.course-map__step` с видимым `li[data-film]`: значок
  «▶ m:ss» (ссылка на ролик гайда); только `matchMedia('(hover: hover)')` и без reduced-motion: наведение ≥ 350 мс →
  кадр 16:9 над карточкой, `<video muted playsinline preload="none">` с `src` mp4 гайда (путь — из видео-манифеста гайда
  в `data-film` или ссылки ролика), отрезок 4 с из середины по кругу; уход/blur → `pause()`, `removeAttribute('src')`, `load()`.
- [ ] **Step 1:** браузер (agent-browser, локальная сборка с видео): наведение на П2 → видео играет без звука ≤ 4 с по кругу;
  уход → сеть не грузит mp4 дальше; сборка без видео → значков нет, консоль чистая; reduced-motion → только значок.
- [ ] **Step 2:** реализация. **Step 3:** проверка из Step 1 → PASS, кадры в `review/shots-route/`.
- [ ] **Step 4:** commit `feat(site): quiet film preview on map cards`.

### Task 6: Блок «Как пользоваться картой» (A, B)

**Files:**
- Modify: `docs/pages/sdlc-development/guides/index.html` (только блок `#how-to-use-map`), `guides/learning-enhancements.css`,
  `scripts/build-learning-pages.test.ts` (тест полосы блока)

**Interfaces:**
- Produces: слот плеера `<div class="map-howto__film" id="map-howto-film"></div>` между заголовком и карточками
  (наполняет `guide-video.ts` в части ролика block-map); подписи на SVG — «Подготовка», «Практика», «Разработка»;
  легенда под линией «точка — гайд · заливка — пройден»; ссылка «Сбросить отметки» (Task 4).
- [ ] **Step 1:** тест: в блоке три подписи-слова по порядку, слот плеера идёт раньше `ol.map-howto__steps`.
- [ ] **Step 2:** FAIL → правка → PASS. **Step 3:** commit `feat(site): film slot on top and worded route in the map how-to`.

### Task 7: Проверка в браузере и выпускные кадры

- [ ] `PAGES_WITH_VIDEO=1 npm run build:site`, статический сервер на `dist/site`; agent-browser 1440 и 390, светлая/тёмная,
  reduced-motion: карта, П1, С2, С4а, Д1. Проверить: полоса липкая и не дёргается; якорь `#step-03` и `#lesson-video`
  видны под полосой; шестерёнки крутятся только при прокрутке; щелчок на С2 → точка С2 зелёная после перехода на карту;
  «Сбросить отметки» очищает; на Д1 карточка «Маршрут пройден»; на 390 одна строка полосы.
- [ ] Кадры целиком в `~/work/handoffs/customdev-unify/review/shots-route/`; любой видимый дефект — исправить до ревью.
- [ ] `npm test`, `npm run lint`, `npm run typecheck`; commit правок проверки, если были.
