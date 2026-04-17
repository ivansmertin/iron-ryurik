"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/get-user";
import {
  ActionState,
  getActionError,
  getActionFieldErrorsFromZodError,
} from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import {
  getDatabaseActionErrorMessage,
  logPrismaError,
} from "@/lib/prisma-errors";
import {
  normalizeSportValue,
  updateClientProfileSchema,
} from "./schemas";

export async function updateClientNotes(
  clientId: string,
  _prevState: UpdateClientNotesActionState,
  formData: FormData,
): Promise<UpdateClientNotesActionState> {
  await requireUser("admin");

  const notes = String(formData.get("notes") ?? "").trim();

  const startedAt = Date.now();
  let client: { id: string } | null = null;

  try {
    client = await prisma.user.findFirst({
      where: {
        id: clientId,
        role: "client",
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    logPrismaError("clients.updateClientNotes.findClient", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось загрузить данные клиента. Попробуйте ещё раз.",
      ),
    );
  }

  if (!client) {
    return getActionError("Клиент не найден.");
  }

  try {
    await prisma.user.update({
      where: {
        id: clientId,
      },
      data: {
        notes: notes || null,
      },
    });
  } catch (error) {
    logPrismaError("clients.updateClientNotes.update", error, startedAt);

    return getActionError(
      getDatabaseActionErrorMessage(
        error,
        "Не удалось сохранить заметки. Попробуйте ещё раз.",
      ),
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);

  return {
    ok: true,
  };
}

export type UpdateClientNotesActionState =
  | {
      ok: true;
    }
  | ActionState;

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
