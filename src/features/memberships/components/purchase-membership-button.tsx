"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { purchaseMembershipClient } from "@/features/memberships/actions";

export function PurchaseMembershipButton({
  planId,
  price,
}: {
  planId: string;
  price: string;
}) {
  const [state, formAction, pending] = useActionState(
    purchaseMembershipClient.bind(null, planId),
    undefined,
  );

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="w-full">
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Оформляем заявку..." : `Оформить заявку за ${price} ₽`}
      </Button>
    </form>
  );
}
