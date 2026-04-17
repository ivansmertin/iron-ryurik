"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refundDropIn } from "@/features/drop-ins/actions";
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

type RefundDropInButtonProps = {
  dropInPassId: string;
  userFullName: string;
};

export function RefundDropInButton({
  dropInPassId,
  userFullName,
}: RefundDropInButtonProps) {
  const [pending, startTransition] = useTransition();

  const handleRefund = () => {
    startTransition(async () => {
      const result = await refundDropIn(dropInPassId);
      if (!result) {
        toast.success("Возврат успешно оформлен");
      } else if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.error("Произошла ошибка при оформлении возврата");
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="outline" size="sm" disabled={pending} />}
      >
        {pending ? "Оформление..." : "Возврат"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Оформить возврат?</AlertDialogTitle>
          <AlertDialogDescription>
            Вы собираетесь оформить возврат для клиента <strong>{userFullName}</strong>. 
            Это действие изменит статус разового визита на "Возврат". 
            Убедитесь, что вы вернули денежные средства клиенту.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={handleRefund} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Подтвердить возврат
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
