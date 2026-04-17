"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { returnSessionToFreeSlot } from "@/features/sessions/actions";

export function ReturnFreeSlotButton({ sessionId }: { sessionId: string }) {
  const [state, formAction, pending] = useActionState(
    returnSessionToFreeSlot.bind(null, sessionId),
    undefined,
  );

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction}>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Возвращаем..." : "Сделать свободной"}
      </Button>
    </form>
  );
}
