"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { claimFreeSlot } from "@/features/trainer/actions";

export function TrainerClaimSlotButton({ sessionId }: { sessionId: string }) {
  const [state, formAction, pending] = useActionState(
    claimFreeSlot.bind(null, sessionId),
    undefined,
  );

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction}>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Занимаем..." : "Занять слот"}
      </Button>
    </form>
  );
}
