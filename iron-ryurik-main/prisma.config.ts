import path from "node:path";
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Prisma CLI не читает .env.local — загружаем явно
config({ path: path.join(__dirname, ".env.local"), override: true });

export default defineConfig({
  schema: path.join(__dirname, "prisma/schema.prisma"),
  datasource: {
    // Migrate использует прямое соединение (порт 5432, без pgbouncer)
    url: process.env.DIRECT_URL!,
  },
});
