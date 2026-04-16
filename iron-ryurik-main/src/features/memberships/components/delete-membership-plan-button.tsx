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
import { deleteMembershipPlan } from "@/features/memberships/actions";

export function DeleteMembershipPlanButton({
  planId,
  disabled,
}: {
  planId: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    deleteMembershipPlan.bind(null, planId),
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
        Удалить
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить план?</AlertDialogTitle>
          <AlertDialogDescription>
            План будет удалён без возможности восстановления.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction}>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
              {pending ? "Удаляем..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
