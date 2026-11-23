# Доставка роликов в Registry

`scripts/video-delivery-manifests.ts` пересчитывает пины `video/<ролик>/video-manifest.json`; имя web-рендера берётся из поля `webFile` манифеста, иначе — `video/<ролик>/film/renders/<ролик>-720p.mp4`. Ролики `landing-*` без режима `--landing-manifest` скрипт не обрабатывает: их пины лежат в CD (`landing-video-manifest.json`).

Режим `--landing-manifest <путь к CD>` (или переменная `CUSTOMDEV_DIR`) собирает пины для всех записей `landing-video-manifest.json` (в т.ч. `pdlc-guide-*`): локальный рендер — `webFile` записи, иначе `<ролик>-720p.mp4`, затем хвост принятого URL (при двух файлах побеждает `-720p`); в пакет Registry и в `url` идёт хвост принятого URL, а производный `webFile` в CD не записывается (только явный). Если имя локального файла отличается от имени в Registry, строка плана дописывает `← film/renders/<файл>`. Заливку в Registry скрипт не запускает; без `--dry` он только переписывает CD-манифест.

## Локальный кандидат «только голос»: bitrate AAC

Сборщик `video/_shared/tools/voice-only.ts` принимает `--audio-bitrate 128k|192k`.
По умолчанию — `128k`; без новой опции аргументы обоих проходов остаются прежними.
Значение `192k` меняет только `-b:a` второго прохода: первый проход, аудиофильтры,
настройки громкости, задержки, длина основы и копирование видеопотока не меняются.
Другие значения отклоняются до запуска процессов и записи результатов.

Для локальных кандидатов block-i2 и block-i4 в TASK-688 выбран нативный кодер
`aac` с `192k`. Не добавляйте ограничитель или другие фильтры. Остальные ролики
не требуют смены bitrate в рамках этой задачи.

Пример из корня репозитория (пути к конфигам и каталогу результатов задаёт оператор;
каждый конфиг должен указывать на проверенные входы своего ролика):

```sh
CONFIG_I2=/абсолютный/путь/к/block-i2.local.json
CONFIG_I4=/абсолютный/путь/к/block-i4.local.json
OUT=/абсолютный/путь/к/новому-каталогу-кандидатов

node --experimental-strip-types video/_shared/tools/voice-only.ts --from-pin "$CONFIG_I2" --audio-encoder aac --audio-bitrate 192k --out-dir "$OUT/block-i2" --plan-only
node --experimental-strip-types video/_shared/tools/voice-only.ts --from-pin "$CONFIG_I4" --audio-encoder aac --audio-bitrate 192k --out-dir "$OUT/block-i4" --plan-only
# Только после проверки плана:
node --experimental-strip-types video/_shared/tools/voice-only.ts --from-pin "$CONFIG_I2" --audio-encoder aac --audio-bitrate 192k --out-dir "$OUT/block-i2"
node --experimental-strip-types video/_shared/tools/voice-only.ts --from-pin "$CONFIG_I4" --audio-encoder aac --audio-bitrate 192k --out-dir "$OUT/block-i4"
```

`--plan-only` проверяет входы и печатает план с аргументами первого прохода;
второй проход ещё не запускается, его аргументы появятся в квитанции сборки.
Квитанция `voice-only-receipt/v2` явно записывает `audioBitrate` (`128k` или `192k`),
фактический `encoder`, аргументы `argv2`, громкость и true peak готового файла.
Существующий запасной переход на `aac_at` не изменён: если он сработает,
тот же bitrate передаётся и запасному кодеру. Сама опция не отключает этот переход.

Это команды подготовки кандидатов, а не подтверждение их приёмки или публикации.
Статус `BUILT` проверяет только окно громкости и true peak сборщика;
независимые проверки длины, видеопотока и остальных критериев выполняются отдельно
по [порядку приёмки](../skills/course-video/voice-only.md).
Пины, `MEDIA.sha256`, исключения тестов и Registry эти команды не обновляют.
Публикация требует отдельной приёмки и разрешения; этот раздел не утверждает,
что кандидаты уже собраны, приняты или опубликованы.
