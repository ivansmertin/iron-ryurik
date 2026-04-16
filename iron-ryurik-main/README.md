# Iron Rurik App

Ролевое веб-приложение для фитнес-студии на Next.js 16:

- `client`: расписание, записи, профиль;
- `trainer`: личные слоты, клиенты, заметки;
- `admin`: управление расписанием, клиентами и абонементами.

## Технологии

- Next.js 16 (App Router), React 19, TypeScript
- Prisma 7 + PostgreSQL (Supabase)
- Supabase Auth (`@supabase/ssr`)
- Server Actions, zod/v4, Vitest

## Быстрый старт

1. Установи зависимости:

```bash
pnpm install
```

2. Создай `.env.local` на основе `.env.example`.
3. Запусти разработку:

```bash
pnpm dev
```

4. Открой [http://localhost:3000](http://localhost:3000).

## Переменные окружения

Смотри `.env.example`. Ключевые поля:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (pooled, `:6543`, runtime Prisma client)
- `DIRECT_URL` (direct, `:5432`, миграции)
- `EMAIL_PROVIDER`, `EMAIL_FROM`, `GMAIL_*` или `BREVO_API_KEY`
- `NODE_OPTIONS=--dns-result-order=ipv4first`

## База данных и Prisma

### Важные правила

- В `User.email` **не использовать** глобальный `@unique`.
- Уникальность email обеспечивается partial unique index:
  `UNIQUE ("email") WHERE "deletedAt" IS NULL`.
- Конфиг Prisma живёт в `prisma.config.ts` (не в `schema.prisma`).

### Команды

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Если `pnpm db:migrate` падает с `P1017`, смотри `docs/troubleshooting/migrate-error.md` (обычно проблема сети/VPN, не кода).

## Аутентификация и роли

- Логин/регистрация/восстановление пароля реализованы через Server Actions.
- Канонический источник роли: `dbUser.role` из Postgres.
- Роль из `auth.user_metadata` используется только как fallback.

## Роутинг и защита

- Используется `src/proxy.ts` (Next.js 16), не `middleware.ts`.
- `proxy`:
  - не пускает анонимных пользователей в приватные сегменты (`/client`, `/trainer`, `/admin`);
  - редиректит авторизованных с auth-страниц в их ролевой раздел;
  - выравнивает приватный префикс с канонической ролью пользователя.
- На сервере дополнительно действует `requireUser()` (`src/features/auth/get-user.ts`).

## Структура проекта

- `src/app/(auth|client|trainer|admin)` — страницы и layout по ролям
- `src/features/*` — доменные модули (`actions`, `queries`, `service`, `schemas`)
- `src/lib/*` — инфраструктура (prisma, supabase, env, email, utils)
- `src/components/*` — UI-компоненты

## Проверки качества

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Известные особенности

- Для стабильного доступа к Supabase из локальной сети может требоваться VPN.
- Server Supabase client использует кастомный transport (`src/lib/supabase/transport.ts`) — не заменять без тестов.
