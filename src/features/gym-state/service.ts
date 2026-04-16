import { prisma } from "@/lib/prisma";

export async function getGymOccupancy(): Promise<number> {
  const state = await prisma.gymState.findUnique({
    where: { id: 1 },
    select: { occupancy: true },
  });

  return state?.occupancy ?? 0;
}

export async function updateGymOccupancy(payload: {
  exactValue?: number;
  delta?: number;
}) {
  return await prisma.$transaction(async (tx) => {
    const currentState = await tx.gymState.findUnique({
      where: { id: 1 },
    });

    let newOccupancy = 0;

    if (payload.exactValue !== undefined) {
      newOccupancy = payload.exactValue;
    } else if (payload.delta !== undefined) {
      const current = currentState?.occupancy ?? 0;
      newOccupancy = Math.max(0, current + payload.delta);
    }

    // Не позволяем уходить в минус
    newOccupancy = Math.max(0, newOccupancy);

    const updated = await tx.gymState.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        occupancy: newOccupancy,
      },
      update: {
        occupancy: newOccupancy,
      },
    });

    return updated.occupancy;
  });
}
