"use client";

import { useActionState, useEffect, useOptimistic, startTransition } from "react";
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
  cancellationDeadlineHours,
  buttonLabel = "Отменить запись",
}: {
  bookingId: string;
  sessionTitle: string | null;
  cancellationDeadlineHours: number;
  buttonLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(
    cancelBooking.bind(null, bookingId),
    undefined,
  );

  const [isOptimisticCancelled, addOptimisticCancel] = useOptimistic(
    false,
    () => true
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

  if (isOptimisticCancelled) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Отменено
      </Button>
    );
  }

  const handleAction = (formData: FormData) => {
    startTransition(() => {
      addOptimisticCancel(true);
    });
    formAction(formData);
  };

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
            Отмена возможна только не позже чем за {cancellationDeadlineHours} ч до начала.
            Занятие ещё не списано, поэтому отмена просто освободит резерв.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={handleAction}>
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
