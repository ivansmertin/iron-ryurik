"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/features/bookings/actions";
import { formatMoscowDateShort, formatMoscowTime } from "@/lib/formatters";

export function CancelBookingButton({
  bookingId,
  sessionTitle,
  buttonLabel = "Отменить запись",
}: {
  bookingId: string;
  sessionTitle: string | null;
  buttonLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(
    cancelBooking.bind(null, bookingId),
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
      `Запись на ${sessionTitle ?? "занятие"} отменена. ${formatMoscowDateShort(
        new Date(state.startsAt),
      )} в ${formatMoscowTime(new Date(state.startsAt))}.`,
    );
  }, [sessionTitle, state]);

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="destructive" size="sm" disabled={pending} />}
      >
        {buttonLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Отменить запись?</AlertDialogTitle>
          <AlertDialogDescription>
            Отмена возможна только не позже чем за 12 часов до начала. Занятие
            ещё не списано, поэтому отмена просто освободит резерв.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction}>
          <AlertDialogFooter>
            <AlertDialogCancel>Назад</AlertDialogCancel>
            <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
              {pending ? "Отменяем..." : "Отменить запись"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
