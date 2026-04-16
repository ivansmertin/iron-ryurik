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
import { cancelTrainerSlot } from "@/features/trainer/actions";

export function TrainerSlotCancelButton({
  slotId,
  disabled,
  buttonLabel = "Отменить слот",
}: {
  slotId: string;
  disabled?: boolean;
  buttonLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(
    cancelTrainerSlot.bind(null, slotId),
    undefined,
  );

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="sm" disabled={disabled || pending} />
        }
      >
        {buttonLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Отменить слот?</AlertDialogTitle>
          <AlertDialogDescription>
            Слот станет отменённым и больше не будет доступен для работы в расписании.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction}>
          <AlertDialogFooter>
            <AlertDialogCancel>Назад</AlertDialogCancel>
            <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
              {pending ? "Отменяем..." : "Отменить слот"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
