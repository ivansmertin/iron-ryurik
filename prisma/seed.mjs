import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_WORKING_HOUR = {
  isOpen: false,
  opensAtMinutes: 9 * 60,
  closesAtMinutes: 21 * 60,
};

function isPrismaErrorCode(error, code) {
  return (
    Boolean(error) &&
    typeof error === "object" &&
    "code" in error &&
    error.code === code
  );
}

async function seedGymScheduleSettings() {
  try {
    await prisma.gymSettings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        freeSlotCapacity: 8,
        freeSlotDurationMinutes: 60,
        freeSlotDropInPrice: 0,
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    if (!isPrismaErrorCode(error, "P2022")) {
      throw error;
    }

    // Legacy schema compatibility: the freeSlotDropInPrice column
    // may be absent until latest migrations are applied.
    await prisma.gymSettings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        freeSlotCapacity: 8,
        freeSlotDurationMinutes: 60,
      },
      select: {
        id: true,
      },
    });
  }

  await Promise.all(
    Array.from({ length: 7 }, (_, index) => index + 1).map((weekday) =>
      prisma.gymWorkingHour.upsert({
        where: { weekday },
        update: {},
        create: {
          weekday,
          ...DEFAULT_WORKING_HOUR,
        },
      }),
    ),
  );
}

async function main() {
  await seedGymScheduleSettings();
}

main()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
