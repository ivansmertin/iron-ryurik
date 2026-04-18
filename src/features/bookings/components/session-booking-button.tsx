"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useOptimistic,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bookSession } from "@/features/bookings/actions";
import { formatMoscowRelativeDateTime } from "@/lib/formatters";

type BookingButtonMode =
  | "bookable"
  | "booked"
  | "full"
  | "no-membership"
  | "drop-in";

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

  const [optimisticMode, addOptimisticMode] = useOptimistic(
    mode,
    () => "booked" as BookingButtonMode,
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

  // Use the optimistic mode for rendering the "booked" state
  if (optimisticMode !== "bookable" && optimisticMode !== "drop-in") {
    return (
      <Button
        type="button"
        variant={optimisticMode === "booked" ? "secondary" : "outline"}
        disabled
        title={buttonTitles[optimisticMode]}
      >
        {buttonLabels[optimisticMode]}
      </Button>
    );
  }

  const label =
    optimisticMode === "drop-in" && price
      ? `Записаться за ${price} ₽`
      : buttonLabels[optimisticMode];

  const handleAction = (formData: FormData) => {
    startTransition(() => {
      addOptimisticMode("booked");
      formAction(formData);
    });
  };

  return (
    <form action={handleAction}>
      <Button
        type="submit"
        disabled={pending}
        title={buttonTitles[optimisticMode]}
      >
        {pending ? "Записываем..." : label}
      </Button>
    </form>
  );
}
