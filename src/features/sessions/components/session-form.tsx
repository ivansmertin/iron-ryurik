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
import { createSession, updateSession } from "@/features/sessions/actions";
import {
  createSessionSchema,
  updateSessionSchema,
  type UpdateSessionSchemaOptions,
} from "@/features/sessions/schemas";

type SessionFormSchema =
  | typeof createSessionSchema
  | ReturnType<typeof updateSessionSchema>;

type SessionFormValues = z.input<SessionFormSchema>;

type SessionFormProps = {
  mode: "create" | "edit";
  sessionId?: string;
  defaultValues: SessionFormValues;
  updateOptions?: UpdateSessionSchemaOptions;
};

function getServerFieldError(
  state: ActionState,
  fieldName: keyof SessionFormValues,
) {
  if (!state || !("fieldErrors" in state)) {
    return undefined;
  }

  return state.fieldErrors[fieldName]?.[0];
}

export function SessionForm({
  mode,
  sessionId,
  defaultValues,
  updateOptions,
}: SessionFormProps) {
  const [, startTransition] = useTransition();
  const action =
    mode === "create" ? createSession : updateSession.bind(null, sessionId ?? "");
  const [state, formAction, pending] = useActionState(action, undefined);
  const schema =
    mode === "create"
      ? createSessionSchema
      : updateSessionSchema(
          updateOptions ?? {
            hasActiveBookings: false,
            currentStartsAt: new Date(),
            currentDurationMinutes: 60,
            currentCapacity: 8,
          },
        );

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  const hasActiveBookings = updateOptions?.hasActiveBookings ?? false;
  const isPastSession = updateOptions?.isPastSession ?? false;
  const lockScheduleFields = hasActiveBookings || isPastSession;
  const lockDuration = hasActiveBookings || isPastSession;
  const lockCapacity = isPastSession;
  const fieldError = <FieldName extends keyof SessionFormValues>(fieldName: FieldName) =>
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
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Название</Label>
          <Input
            id="title"
            aria-invalid={Boolean(fieldError("title"))}
            {...form.register("title")}
          />
          <FieldError message={fieldError("title")} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
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
            disabled={lockScheduleFields}
            aria-invalid={Boolean(fieldError("date"))}
            {...form.register("date")}
          />
          <FieldError message={fieldError("date")} />
          {lockScheduleFields ? (
            <p className="text-muted-foreground text-xs">
              {hasActiveBookings
                ? "Нельзя изменить: уже есть записи."
                : "Нельзя изменить дату прошедшего занятия."}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="startTime">Время начала</Label>
          <Input
            id="startTime"
            type="time"
            disabled={lockScheduleFields}
            aria-invalid={Boolean(fieldError("startTime"))}
            {...form.register("startTime")}
          />
          <FieldError message={fieldError("startTime")} />
          {lockScheduleFields ? (
            <p className="text-muted-foreground text-xs">
              {hasActiveBookings
                ? "Нельзя изменить: уже есть записи."
                : "Нельзя изменить время прошедшего занятия."}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Длительность, минут</Label>
          <Input
            id="durationMinutes"
            type="number"
            min={15}
            max={240}
            step={5}
            disabled={lockDuration}
            aria-invalid={Boolean(fieldError("durationMinutes"))}
            {...form.register("durationMinutes")}
          />
          <FieldError message={fieldError("durationMinutes")} />
          {lockDuration ? (
            <p className="text-muted-foreground text-xs">
              {hasActiveBookings
                ? "Нельзя изменить: уже есть записи."
                : "Нельзя изменить длительность прошедшего занятия."}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity">Вместимость</Label>
          <Input
            id="capacity"
            type="number"
            min={hasActiveBookings ? updateOptions?.currentCapacity : 1}
            max={20}
            disabled={lockCapacity}
            aria-invalid={Boolean(fieldError("capacity"))}
            {...form.register("capacity")}
          />
          <FieldError message={fieldError("capacity")} />
          {hasActiveBookings ? (
            <p className="text-muted-foreground text-xs">
              Можно только увеличить вместимость: уже есть записи.
            </p>
          ) : null}
          {lockCapacity && !hasActiveBookings ? (
            <p className="text-muted-foreground text-xs">
              Нельзя изменить вместимость прошедшего занятия.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Сохраняем..."
            : mode === "create"
              ? "Создать сессию"
              : "Сохранить изменения"}
        </Button>
      </div>
    </form>
  );
}
