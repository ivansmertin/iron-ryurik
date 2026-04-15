"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteExercise } from "@/features/workouts/actions";

export function DeleteExerciseButton({ exerciseId }: { exerciseId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteExercise.bind(null, exerciseId),
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
        {pending ? "Удаляем..." : "Удалить"}
      </Button>
    </form>
  );
}
