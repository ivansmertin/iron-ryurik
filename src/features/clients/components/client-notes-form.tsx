"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateClientNotesActionState } from "@/features/clients/actions";
import { updateClientNotes } from "@/features/clients/actions";

export function ClientNotesForm({
  clientId,
  defaultValue,
}: {
  clientId: string;
  defaultValue?: string | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    UpdateClientNotesActionState,
    FormData
  >(
    updateClientNotes.bind(null, clientId),
    undefined,
  );

  useEffect(() => {
    if (state?.ok === true) {
      toast.success("Заметки сохранены.");
      router.refresh();
      return;
    }

    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [router, state]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="notes">Заметки</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaultValue ?? ""}
          maxLength={2000}
          placeholder="Добавьте комментарий о клиенте"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем..." : "Сохранить заметки"}
      </Button>
    </form>
  );
}
