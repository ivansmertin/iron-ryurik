"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/get-user";
import {
  ActionState,
  getActionError,
  getActionFieldErrorsFromZodError,
} from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import {
  normalizeSportValue,
  updateClientProfileSchema,
} from "./schemas";

export async function updateClientNotes(
  clientId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("admin");

  const notes = String(formData.get("notes") ?? "").trim();

  const client = await prisma.user.findFirst({
    where: {
      id: clientId,
      role: "client",
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!client) {
    return getActionError("Клиент не найден.");
  }

  await prisma.user.update({
    where: {
      id: clientId,
    },
    data: {
      notes: notes || null,
    },
  });

  redirect(`/admin/clients/${clientId}?toast=notes-updated`);
}

export type UpdateClientProfileActionState =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    }
  | {
      ok: false;
      fieldErrors: Record<string, string[]>;
    }
  | undefined;

export async function updateClientProfile(
  _prevState: UpdateClientProfileActionState,
  formData: FormData,
): Promise<UpdateClientProfileActionState> {
  const user = await requireUser("client");

  const parsed = updateClientProfileSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    sport: String(formData.get("sport") ?? ""),
  });

  if (!parsed.success) {
    return getActionFieldErrorsFromZodError(parsed.error);
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      sport: normalizeSportValue(parsed.data.sport),
    },
  });

  revalidatePath("/client");
  revalidatePath("/client/profile");

  return {
    ok: true,
  };
}
