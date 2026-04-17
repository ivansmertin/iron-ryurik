"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateTrainerClientNotesActionState } from "@/features/trainer/actions";
import { updateTrainerClientNotes } from "@/features/trainer/actions";

export function TrainerClientNotesForm({
  clientId,
  defaultValue,
}: {
  clientId: string;
  defaultValue?: string | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    UpdateTrainerClientNotesActionState,
    FormData
  >(
    updateTrainerClientNotes.bind(null, clientId),
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
    <form className="space-y-3" action={formAction}>
      <div className="space-y-2">
        <Label htmlFor="notes">Заметки</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaultValue ?? ""}
          maxLength={2000}
          placeholder="Что важно помнить об этом клиенте"
        />
      </div>
      <p className="text-muted-foreground text-xs">
        История изменений пока не хранится. Последняя версия заметки перезаписывает
        предыдущую.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем..." : "Сохранить заметки"}
      </Button>
    </form>
  );
}
