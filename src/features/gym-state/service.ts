import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OccupancyRow = { occupancy: number };

export async function getGymOccupancy(): Promise<number> {
  const state = await prisma.gymState.findUnique({
    where: { id: 1 },
    select: { occupancy: true },
  });

  return state?.occupancy ?? 0;
}

/**
 * Атомарное обновление occupancy через один SQL-запрос.
 * Защита от гонки: при параллельных delta-инкрементах Postgres сериализует
 * UPDATE строк через row-level lock, поэтому ни один инкремент не теряется.
 * GREATEST(0, ...) гарантирует, что значение не уйдёт в минус.
 */
export async function updateGymOccupancy(payload: {
  exactValue?: number;
  delta?: number;
}): Promise<number> {
  if (payload.exactValue !== undefined) {
    const exact = payload.exactValue;
    const rows = await prisma.$queryRaw<OccupancyRow[]>(Prisma.sql`
      INSERT INTO "GymState" ("id", "occupancy", "updatedAt")
      VALUES (1, GREATEST(0, ${exact}::int), NOW())
      ON CONFLICT ("id") DO UPDATE
        SET "occupancy" = GREATEST(0, ${exact}::int),
            "updatedAt" = NOW()
      RETURNING "occupancy";
    `);

    return rows[0]?.occupancy ?? 0;
  }

  const delta = payload.delta ?? 0;
  const rows = await prisma.$queryRaw<OccupancyRow[]>(Prisma.sql`
    INSERT INTO "GymState" ("id", "occupancy", "updatedAt")
    VALUES (1, GREATEST(0, ${delta}::int), NOW())
    ON CONFLICT ("id") DO UPDATE
      SET "occupancy" = GREATEST(0, "GymState"."occupancy" + ${delta}::int),
          "updatedAt" = NOW()
    RETURNING "occupancy";
  `);

  return rows[0]?.occupancy ?? 0;
}
