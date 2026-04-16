"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/get-user";
import { updateGymOccupancy } from "./service";

export async function setExactOccupancyAction(
  value: number
): Promise<{ error?: string }> {
  try {
    await requireUser("admin");
    await updateGymOccupancy({ exactValue: value });
    revalidatePath("/admin", "layout");
    revalidatePath("/client", "layout");
    return {};
  } catch (error) {
    return { error: "Не удалось обновить значение. Попробуйте еще раз." };
  }
}

export async function changeOccupancyAction(
  delta: number
): Promise<{ error?: string }> {
  try {
    await requireUser("admin");
    await updateGymOccupancy({ delta });
    revalidatePath("/admin", "layout");
    revalidatePath("/client", "layout");
    return {};
  } catch (error) {
    return { error: "Не удалось обновить значение. Попробуйте еще раз." };
  }
}
