"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/get-user";
import { updateGymOccupancy } from "./service";

type OccupancyActionResult = { value: number } | { error: string };

export async function setExactOccupancyAction(
  value: number
): Promise<OccupancyActionResult> {
  await requireUser("admin");

  try {
    const updatedValue = await updateGymOccupancy({ exactValue: value });
    revalidatePath("/admin", "layout");
    revalidatePath("/client", "layout");
    return { value: updatedValue };
  } catch {
    return { error: "Не удалось обновить значение. Попробуйте еще раз." };
  }
}

export async function changeOccupancyAction(
  delta: number
): Promise<OccupancyActionResult> {
  await requireUser("admin");

  try {
    const updatedValue = await updateGymOccupancy({ delta });
    revalidatePath("/admin", "layout");
    revalidatePath("/client", "layout");
    return { value: updatedValue };
  } catch {
    return { error: "Не удалось обновить значение. Попробуйте еще раз." };
  }
}
