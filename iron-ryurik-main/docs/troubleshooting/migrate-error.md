# pnpm db:migrate — диагностика ошибки

**Дата:** 2026-04-14
**Команда:** `pnpm db:migrate` (`prisma migrate dev`)
**Prisma:** 7.7.0
**Next.js:** 16.2.3

## Полный вывод

```
> iron-rurik@0.1.0 db:migrate
> prisma migrate dev

◇ injected env (12) from .env.local // tip: ⌘ override existing { override: true }
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma\schema.prisma.
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-eu-central-1.pooler.supabase.com:5432"

Error: P1017: Server has closed the connection.
```

Exit code: 1

## Диагноз

Ошибка **сетевая** (P1017 — соединение закрыто сервером).

`prisma.config.ts` использует `DIRECT_URL` (порт 5432, direct connection через Supavisor).
Конфиг загрузился корректно — Prisma успешно прочитала и `prisma.config.ts`, и `schema.prisma`.
Ошибка возникает на этапе подключения к БД, до выполнения миграций.

**Вероятная причина:** российский провайдер режет прямое TCP-соединение до
`aws-1-eu-central-1.pooler.supabase.com:5432`. Для работы нужен VPN
(AmneziaVPN), как указано в CLAUDE.md.

## Рекомендация

- Подключить VPN перед запуском `pnpm db:migrate`
- Ошибка **не в коде** и **не в конфиге** — `prisma.config.ts` менять не нужно
- После подключения VPN повторить `pnpm db:migrate`
