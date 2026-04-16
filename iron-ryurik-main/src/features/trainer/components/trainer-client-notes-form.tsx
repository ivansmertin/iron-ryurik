"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateTrainerClientNotes } from "@/features/trainer/actions";

export function TrainerClientNotesForm({
  clientId,
  defaultValue,
}: {
  clientId: string;
  defaultValue?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateTrainerClientNotes.bind(null, clientId),
    undefined,
  );

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

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
