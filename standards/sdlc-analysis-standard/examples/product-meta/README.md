# Credit Calculator product metarepository

Синтетический 3★-эталон хранит только продуктовый контекст и связи. Код
сервиса не копируется сюда: его источник и полный SHA находятся в
`services.lock.yaml`.

## Локальная проверка

```sh
npm ci
make doctor
make bootstrap
make validate
make start
```

Без Make: `npm run doctor`, `npm run bootstrap`, `npm run validate` и
`npm run start`. Команды не требуют Jira, токенов или внешней записи.
