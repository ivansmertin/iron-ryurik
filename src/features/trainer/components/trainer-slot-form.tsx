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
import { createTrainerSlot, updateTrainerSlot } from "@/features/trainer/actions";
import { trainerSlotSchema, type TrainerSlotFormValues } from "@/features/trainer/schemas";

type TrainerSlotFormProps = {
  mode: "create" | "edit";
  defaultValues: TrainerSlotFormValues;
} & (
  | {
      mode: "create";
      slotId?: never;
    }
  | {
      mode: "edit";
      slotId: string;
    }
);

function getServerFieldError(
  state: ActionState,
  fieldName: keyof TrainerSlotFormValues,
) {
  if (!state || !("fieldErrors" in state)) {
    return undefined;
  }

  return state.fieldErrors[fieldName]?.[0];
}

export function TrainerSlotForm({
  mode,
  slotId,
  defaultValues,
}: TrainerSlotFormProps) {
  const [, startTransition] = useTransition();
  const action =
    mode === "create"
      ? createTrainerSlot
      : updateTrainerSlot.bind(null, slotId);
  const [state, formAction, pending] = useActionState(action, undefined);

  const form = useForm<z.input<typeof trainerSlotSchema>>({
    resolver: zodResolver(trainerSlotSchema),
    defaultValues,
  });

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  const fieldError = <FieldName extends keyof TrainerSlotFormValues>(
    fieldName: FieldName,
  ) =>
    form.formState.errors[fieldName]?.message?.toString() ??
    getServerFieldError(state, fieldName);

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit((_values, event) => {
        const formElement = event?.target as HTMLFormElement;

        if (!formElement) {
          return;
        }

        startTransition(() => {
          formAction(new FormData(formElement));
        });
      })}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Название</Label>
          <Input
            id="title"
            placeholder="Например, Персональная тренировка"
            aria-invalid={Boolean(fieldError("title"))}
            {...form.register("title")}
          />
          <FieldError message={fieldError("title")} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            placeholder="Комментарий к слоту, если он нужен"
            aria-invalid={Boolean(fieldError("description"))}
            {...form.register("description")}
          />
          <FieldError message={fieldError("description")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Дата</Label>
          <Input
            id="date"
            type="date"
            aria-invalid={Boolean(fieldError("date"))}
            {...form.register("date")}
          />
          <FieldError message={fieldError("date")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startTime">Время начала</Label>
          <Input
            id="startTime"
            type="time"
            aria-invalid={Boolean(fieldError("startTime"))}
            {...form.register("startTime")}
          />
          <FieldError message={fieldError("startTime")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Длительность, минут</Label>
          <Input
            id="durationMinutes"
            type="number"
            min={15}
            max={240}
            step={5}
            aria-invalid={Boolean(fieldError("durationMinutes"))}
            {...form.register("durationMinutes")}
          />
          <FieldError message={fieldError("durationMinutes")} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">Вместимость фиксирована: 1 место.</p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Сохраняем..."
            : mode === "create"
              ? "Создать слот"
              : "Сохранить изменения"}
        </Button>
      </div>
    </form>
  );
}
