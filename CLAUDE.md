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

### Мокирование Prisma в тестах (vitest-mock-extended)
- **ПРАВИЛЬНЫЙ** паттерн — мокировать СИНГЛТОН из `@/lib/prisma`, не саму библиотеку:
  ```ts
  import { mockDeep, mockReset } from "vitest-mock-extended";
  import { prisma } from "@/lib/prisma";

  vi.mock("@/lib/prisma", () => ({
    prisma: mockDeep<import("@prisma/client").PrismaClient>(),
  }));

  const mockPrisma = prisma as ReturnType<typeof mockDeep<import("@prisma/client").PrismaClient>>;

  beforeEach(() => { mockReset(mockPrisma); });
  ```
- **НЕЛЬЗЯ** писать `vi.mock("@prisma/client")` — это мокает библиотеку целиком, синглтон `prisma` при этом не заменяется
- `$transaction` нужно мокировать явно: `mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma))`

### Миграции с триггерами на auth.* — НЕ migrate dev
- `prisma migrate dev` создаёт shadow DB, которая не имеет доступа к схеме `auth` Supabase → миграция падает
- Для любой SQL-миграции, затрагивающей `auth.*` (функции, триггеры), использовать:
  ```bash
  # 1. Применить SQL напрямую
  pnpm exec prisma db execute --file prisma/migrations/<timestamp>_<name>/migration.sql
  # 2. Отметить миграцию как выполненную в истории Prisma
  pnpm exec prisma migrate resolve --applied <timestamp>_<name>
  ```
- Обычные миграции (только `public.*`) — `prisma migrate dev` работает нормально

### prisma generate без реальных переменных окружения
- `prisma.config.ts` читает `.env.local` через dotenv при старте — без переменных команда упадёт
- Для генерации клиента без реального подключения (CI, чистая машина):
  ```bash
  DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm db:generate
  ```
- Скрипт `postinstall` в `package.json` также вызывает `prisma generate` — при `pnpm install` нужны те же env-переменные или они уже должны быть в окружении

### Driver Adapter — new PrismaClient() нельзя использовать напрямую
- В этом проекте Prisma Client работает через `@prisma/adapter-pg` (pg pool на порту 6543)
- **НЕЛЬЗЯ** писать `new PrismaClient()` без адаптера — он попытается подключиться напрямую через Prisma engine и не будет использовать пулер
- Весь доступ к БД идёт через синглтон `prisma` из `src/lib/prisma.ts`; импортировать `PrismaClient` напрямую и инстанциировать его вне этого файла — запрещено
