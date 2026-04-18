import { prisma } from "../src/lib/prisma";

async function verifySettings() {
  try {
    const settings = await prisma.gymSettings.upsert({
      where: { id: 1 },
      update: { freeSlotDropInPrice: 500 },
      create: { 
        id: 1, 
        freeSlotDropInPrice: 500,
        freeSlotCapacity: 8,
        freeSlotDurationMinutes: 60
      },
    });
    console.log("Settings saved:", settings);
    
    const readBack = await prisma.gymSettings.findUnique({ where: { id: 1 } });
    console.log("Read back:", readBack);
    
    if (Number(readBack?.freeSlotDropInPrice) === 500) {
      console.log("SUCCESS: freeSlotDropInPrice is working in DB");
    } else {
      console.error("FAILURE: price mismatch", readBack?.freeSlotDropInPrice);
    }
  } catch (error) {
    console.error("DB Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySettings();
