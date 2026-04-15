@AGENTS.md

## Известные ловушки и договорённости

### Soft delete и email uniqueness
- В `User.email` **НЕ СТАВИТЬ** глобальный `@unique` в Prisma schema
- Уникальность email обеспечена partial unique index, применённый миграцией `20260414063000_user_email_soft_delete_fix`:
  `UNIQUE ("email") WHERE "deletedAt" IS NULL`
- Причина: иначе soft-deleted пользователи блокируют повторную регистрацию того же email и trigger `handle_new_user()` падает с "Database error creating new user"
- При любых правках User/schema убедиться, что этот partial index сохраняется

### Supabase server client
- `src/lib/supabase/server.ts` использует КАСТОМНЫЙ transport через `node:http`/`node:https`
- Причина: стандартный fetch из Next server runtime имел проблемы с outbound до Supabase Auth API
- **НЕ заменять** на стандартный `createServerClient` без явной причины и тестов
- При проблемах с Supabase из server runtime — сначала смотреть этот файл и `src/features/auth/actions.ts`

### Auth flow
- Регистрация и логин идут через Server Actions (не API routes)
- Server Actions обязаны использовать **серверный** Supabase client (с cookies), НЕ anon client
- В `.env.local` должно быть `NODE_OPTIONS=--dns-result-order=ipv4first` для Node
- Для работы с Supabase из локальной разработки нужен VPN (AmneziaVPN), т.к. российские провайдеры режут прямое соединение до AWS eu-central-1

### Next.js 16: proxy.ts вместо middleware.ts
- Файл называется `src/proxy.ts`, функция называется `proxy` (не `middleware`)
- `export const runtime` указывать НЕ нужно — proxy всегда запускается на Node.js runtime
- `config.matcher` синтаксис не изменился
- В проекте должен существовать только `src/proxy.ts`; Next 16 ругается, если одновременно есть `src/middleware.ts` и `src/proxy.ts`
- Если `next dev` или Turbopack по старому кешу продолжает искать `src/middleware.ts`, чистить `.next` и не возвращать `middleware.ts`

### Кодировка
- Все UI-строки на русском
- Следить за кодировкой в терминале и в файлах — встречались артефакты с кириллицей. Файлы сохранять в UTF-8 без BOM.

### Prisma 7 конфиг
- datasource URL живёт в `prisma.config.ts` (корень проекта), **НЕ** в `schema.prisma`
- Миграции ходят через `DIRECT_URL` (порт 5432)
- Prisma Client в runtime ходит через `DATABASE_URL` (порт 6543, pooled) через driver adapter `@prisma/adapter-pg`
- Миграции с триггерами на `auth.*` нельзя прогонять через shadow DB (`migrate dev`) — применять через `prisma db execute` + `migrate resolve --applied`
- **НЕ трогать** `prisma.config.ts` без необходимости

### Триггер handle_new_user
- Функция использует `SET search_path = ''` — все типы и таблицы должны быть с явным префиксом `public.`
- Enum каст: `'client'::public."UserRole"`, НЕ `'client'::"UserRole"` — иначе "type does not exist"
