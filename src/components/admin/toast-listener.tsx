"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function resolveToastMessage(toastKey: string) {
  if (toastKey.startsWith("session-cancelled:")) {
    const rawCount = toastKey.split(":")[1];
    const count = Number(rawCount);

    return {
      type: "success" as const,
      message: Number.isFinite(count)
        ? `Занятие отменено, аннулировано бронирований: ${count}.`
        : "Занятие отменено.",
    };
  }

  const messages: Record<string, { type: "success" | "error"; message: string }> = {
    "session-created": {
      type: "success",
      message: "Занятие создано.",
    },
    "session-updated": {
      type: "success",
      message: "Изменения сохранены.",
    },
    "plan-created": {
      type: "success",
      message: "План абонемента создан.",
    },
    "plan-updated": {
      type: "success",
      message: "План абонемента обновлён.",
    },
    "plan-deleted": {
      type: "success",
      message: "План абонемента удалён.",
    },
    "membership-issued": {
      type: "success",
      message: "Абонемент выдан клиенту.",
    },
    "notes-updated": {
      type: "success",
      message: "Заметки сохранены.",
    },
  };

  return messages[toastKey] ?? null;
}

export function AdminToastListener({ toastKey }: { toastKey?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!toastKey) {
      return;
    }

    const resolved = resolveToastMessage(toastKey);

    if (resolved) {
      toast[resolved.type](resolved.message);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("toast");

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams, toastKey]);

  return null;
}
