# План полос: 30 копий kit.js на общий источник

Общая часть (`build-kit.mjs`, `kit/parts/`, `kit/variants/`) приходит первым MR в `main`; полосы 2, 3,
5 и 6 стоят на ней и вливаются после общей части. Лимит файла — 20 000 Б, у частей kit.js сейчас
максимум 12 056 Б.

Цель рефакторинга — воспроизводить **каждую опубликованную** копию из общего источника, а не
сводить копии к одному виду. Расхождения — варианты источника (`video/_shared/kit/variants/`),
а не правки вида; см. `video/_shared/KIT.md`.

## Что делает полоса

1. Вписывает свои четыре-пять роликов в `video/_shared/kit/targets/lane-N.txt` (по имени в строке).
   Для роликов с вариантом B/C/D/E/F/G добавляет `video/_shared/kit/targets/<ролик>.json`:
   `{ "variant": "B", "bodySha256": "<полное bodySha256 варианта>" }`. Sha берётся из поля
   `bodySha256` файла `video/_shared/kit/variants/<X>.json`, **не из `targets/INVENTORY.md`**: там
   примечание ¹ у пяти landing-* путает sha файла с баннером и sha тела. Поле `bodySha256`
   обязательно (для A — `REFERENCE_SHA256`); ролики варианта A, как и раньше, конфига не требуют.
2. Части не правит: варианты уже лежат в `kit/variants/`, механизм — в `build-kit.mjs`;
   `REFERENCE_SHA256` не меняется.
3. `node video/_shared/build-kit.mjs` — копии своих роликов становятся порождаемыми, рядом
   появляется `film/kit/.gitattributes` с меткой `linguist-generated`.
4. `node video/_shared/build-kit.mjs --check` и `node video/_shared/sync.mjs --check` — синхронность,
   целостность списков полос и per-video sha тела.
5. Кадры до/после: «до» — опубликованная копия (snapshot чистой копии ролика из базовой ветки),
   «после» — рабочая копия после сборки; три кадра ключевых сцен, md5 до == md5 после, пиксель-diff 0
   (команда и времена — в `video/_shared/KIT.md`). Кадры и JSON сравнения — в `.scratch/` рабочей
   копии, в отчёт полосы — таблица пиксель-diff.
6. Коммит в свою kit-ветку; MR полосы целится в `main` и вливается после MR общей части.
   `npm test` и `npm run typecheck` — тяжёлые проверки, не больше двух одновременно на машину.

## Полосы

| Полоса | Ролики | Вариант копии | Что делает полоса | Остаётся локально |
|---|---|---|---|---|
| 1 — базовая | landing-before-after, landing-enabling, landing-hero, landing-hero-v3, landing-overview | A (`e82edd4b`) | уже порождены общей частью; в этой ветке не меняются, кадры перепроверяет полоса 4 | — |
| 2 | block-map, et-film-long, intent-overview, landing-overview-long2, landing-pdlc | A | добавить пять имён в `targets/lane-2.txt`, собрать, кадры до/после | — |
| 3 | landing-team-long, pdlc-guide-long, pdlc-guide-short (A), block-i2, block-i3 (C) | A + C | список полосы + конфиги C (`variant C`, полный `bodySha256` из `variants/C.json`), сборка, кадры | — |
| 4 | block-r1, block-r2, block-0, block-delivery, block-team | B | первая: механизм вариантов в `build-kit.mjs`, `kit/variants/B..G.json`, конфиги и сборка своих пяти, кадры | — |
| 5 | block-sdd, block-r4legacy (B), block-p4, block-r4 (E), block-i4 (C) | B + E + C | список полосы + конфиги B/E/C, сборка, кадры | — |
| 6 | block-r3, block-r4new (D), block-dark-factory (F), block-i1 (G), block-0a (H) | D + F + G + H | список полосы + конфиги D/F/G, сборка, кадры | H block-0a: свой `split` шапки, старый словарь и тест-фикстуры — вариант не выражается, остаётся ручной копией (в списки полос не входит) |

## Порядок слияния

1. Общая часть (полоса 4) — первой: механизм вариантов (`build-kit.mjs`, `kit/variants/*`), конфиги
   и копии своих пяти; `REFERENCE_SHA256` и части не меняются.
2. Полосы 2, 3, 5, 6 — после общей части в любом порядке: у них только свои `targets/lane-N.txt`,
   конфиги `targets/<ролик>.json` и порождаемые копии. Правок частей больше нет, конфликтов в
   `kit/parts/` нет.
3. Полоса 1 — уже в общей части; её копии обязаны остаться байт-в-байт (вариант A), кадры полосы 1
   перепроверяет полоса 4.

Списки роликов полос лежат в разных файлах `targets/lane-N.txt`, конфиги — в отдельных
`targets/<ролик>.json`, метка сгенерированного — в `film/kit/.gitattributes` каждого ролика.
Общие `kit/parts/`, `kit/variants/` и `build-kit.mjs` после полосы 4 никто не правит.
