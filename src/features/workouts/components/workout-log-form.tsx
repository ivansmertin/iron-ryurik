"use client";

import { useActionState, useEffect, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod/v4";
import { toast } from "sonner";
import { FieldError } from "@/components/admin/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/action-state";
import { workoutLogSchema } from "@/features/workouts/schemas";

type WorkoutLogFormValues = z.input<typeof workoutLogSchema>;

type WorkoutLogFormProps = {
  mode: "create" | "edit";
  exercises: Array<{ id: string; name: string }>;
  defaultValues: WorkoutLogFormValues;
} & (
  | {
      mode: "create";
      action: (state: ActionState, formData: FormData) => Promise<ActionState>;
    }
  | {
      mode: "edit";
      action: (state: ActionState, formData: FormData) => Promise<ActionState>;
    }
);

function getServerFieldError(state: ActionState, fieldName: keyof WorkoutLogFormValues) {
  if (!state || !("fieldErrors" in state)) {
    return undefined;
  }

  return state.fieldErrors[fieldName]?.[0];
}

export function WorkoutLogForm({
  mode,
  action,
  exercises,
  defaultValues,
}: WorkoutLogFormProps) {
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(action, undefined);

  const form = useForm<WorkoutLogFormValues>({
    resolver: zodResolver(workoutLogSchema),
    defaultValues,
  });

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  const fieldError = <FieldName extends keyof WorkoutLogFormValues>(fieldName: FieldName) =>
    form.formState.errors[fieldName]?.message?.toString() ??
    getServerFieldError(state, fieldName);

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit((_values, event) => {
        const formElement = event?.currentTarget;
        if (!formElement) {
          return;
        }

        startTransition(() => {
          formAction(new FormData(formElement));
        });
      })}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="performedAt">Дата и время</Label>
          <Input
            id="performedAt"
            type="datetime-local"
            aria-invalid={Boolean(fieldError("performedAt"))}
            {...form.register("performedAt")}
          />
          <FieldError message={fieldError("performedAt")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="durationMin">Длительность, минут</Label>
          <Input
            id="durationMin"
            type="number"
            min={1}
            max={360}
            aria-invalid={Boolean(fieldError("durationMin"))}
            {...form.register("durationMin")}
          />
          <FieldError message={fieldError("durationMin")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rpe">Нагрузка (RPE 1-10)</Label>
          <Input
            id="rpe"
            type="number"
            min={1}
            max={10}
            aria-invalid={Boolean(fieldError("rpe"))}
            {...form.register("rpe")}
          />
          <FieldError message={fieldError("rpe")} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Заметки</Label>
          <Textarea
            id="notes"
            aria-invalid={Boolean(fieldError("notes"))}
            placeholder="Как прошла тренировка, что получилось/не получилось."
            {...form.register("notes")}
          />
          <FieldError message={fieldError("notes")} />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Упражнения</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {exercises.length ? (
            exercises.map((exercise) => (
              <label
                key={exercise.id}
                className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  value={exercise.id}
                  className="accent-foreground h-4 w-4 rounded border"
                  {...form.register("exerciseIds")}
                />
                <span>{exercise.name}</span>
              </label>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              Активных упражнений пока нет. Попросите администратора добавить справочник.
            </p>
          )}
        </div>
        <FieldError message={fieldError("exerciseIds")} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending
          ? "Сохраняем..."
          : mode === "create"
            ? "Сохранить тренировку"
            : "Сохранить изменения"}
      </Button>
    </form>
  );
}
