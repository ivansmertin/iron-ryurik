"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bookSession } from "@/features/bookings/actions";
import { formatMoscowRelativeDateTime } from "@/lib/formatters";

type BookingButtonMode = "bookable" | "booked" | "full" | "no-membership";

const buttonLabels: Record<BookingButtonMode, string> = {
  bookable: "Записаться",
  booked: "Вы записаны",
  full: "Мест нет",
  "no-membership": "Нет абонемента",
};

const buttonTitles: Partial<Record<BookingButtonMode, string>> = {
  "no-membership": "Нужен активный абонемент с оставшимися занятиями",
};

export function SessionBookingButton({
  sessionId,
  sessionTitle,
  mode,
}: {
  sessionId: string;
  sessionTitle: string | null;
  mode: BookingButtonMode;
}) {
  const [state, formAction, pending] = useActionState(
    bookSession.bind(null, sessionId),
    undefined,
  );

  useEffect(() => {
    if (!state) {
      return;
    }

    if (state.ok === false) {
      toast.error(state.error);
      return;
    }

    toast.success(
      `Вы записаны на ${sessionTitle ?? "занятие"} ${formatMoscowRelativeDateTime(
        new Date(state.startsAt),
      )}`,
    );
  }, [sessionTitle, state]);

  if (mode !== "bookable") {
    return (
      <Button
        type="button"
        variant={mode === "booked" ? "secondary" : "outline"}
        disabled
        title={buttonTitles[mode]}
      >
        {buttonLabels[mode]}
      </Button>
    );
  }

  return (
    <form action={formAction}>
      <Button type="submit" disabled={pending}>
        {pending ? "Записываем..." : buttonLabels[mode]}
      </Button>
    </form>
  );
}
