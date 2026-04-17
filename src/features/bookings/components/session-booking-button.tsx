"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bookSession } from "@/features/bookings/actions";
import { formatMoscowRelativeDateTime } from "@/lib/formatters";

type BookingButtonMode = "bookable" | "booked" | "full" | "no-membership" | "drop-in";

const buttonLabels: Record<BookingButtonMode, string> = {
  bookable: "Записаться",
  booked: "Вы записаны",
  full: "Мест нет",
  "no-membership": "Нет абонемента",
  "drop-in": "Разовый визит",
};

const buttonTitles: Partial<Record<BookingButtonMode, string>> = {
  "no-membership": "Нужен активный абонемент с оставшимися занятиями",
  "drop-in": "У вас нет абонемента, но доступна разовая запись",
};

export function SessionBookingButton({
  sessionId,
  sessionTitle,
  mode,
  price,
}: {
  sessionId: string;
  sessionTitle: string | null;
  mode: BookingButtonMode;
  price?: number;
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

    const message = state.dropInPassId
      ? `Вы записаны на ${sessionTitle ?? "занятие"}. Подтверждение произойдет после оплаты в зале.`
      : `Вы записаны на ${sessionTitle ?? "занятие"} ${formatMoscowRelativeDateTime(
          new Date(state.startsAt),
        )}`;

    toast.success(message);
  }, [sessionTitle, state]);

  if (mode !== "bookable" && mode !== "drop-in") {
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

  const label = mode === "drop-in" && price 
    ? `Записаться за ${price} ₽` 
    : buttonLabels[mode];

  return (
    <form action={formAction}>
      <Button 
        type="submit" 
        disabled={pending}
        title={buttonTitles[mode]}
      >
        {pending ? "Записываем..." : label}
      </Button>
    </form>
  );
}
