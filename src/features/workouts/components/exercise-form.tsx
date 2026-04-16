"use client";

import { useActionState, useEffect, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod/v4";
import { toast } from "sonner";
import { FieldError } from "@/components/admin/field-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/action-state";
import {
  exerciseCatalogSchema,
  type ExerciseCatalogFormValues,
} from "@/features/workouts/schemas";

const CATEGORIES: Array<{ value: ExerciseCatalogFormValues["category"]; label: string }> = [
  { value: "strength_legs", label: "Силовая: ноги" },
  { value: "strength_upper", label: "Силовая: верх" },
  { value: "strength_core", label: "Силовая: корпус" },
  { value: "plyometrics", label: "Плиометрика" },
  { value: "running_drills", label: "Беговые упражнения / СБУ" },
  { value: "cardio", label: "Кардио" },
  { value: "mobility", label: "Мобилити" },
  { value: "other", label: "Другое" },
];

const EQUIPMENT: Array<{ value: ExerciseCatalogFormValues["equipment"]; label: string }> = [
  { value: "barbell", label: "Штанга" },
  { value: "dumbbell", label: "Гантели" },
  { value: "kettlebell", label: "Гиря" },
  { value: "machine", label: "Тренажёр" },
  { value: "bodyweight", label: "Собственный вес" },
  { value: "treadmill", label: "Беговая дорожка" },
  { value: "bike", label: "Велостанок / велотренажёр" },
  { value: "rower", label: "Гребной тренажёр" },
  { value: "other", label: "Другое" },
];

type FormValues = z.input<typeof exerciseCatalogSchema>;

function getServerFieldError(state: ActionState, fieldName: keyof FormValues) {
  if (!state || !("fieldErrors" in state)) {
    return undefined;
  }

  return state.fieldErrors[fieldName]?.[0];
}

export function ExerciseForm({
  mode,
  action,
  defaultValues,
}: {
  mode: "create" | "edit";
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues: FormValues;
}) {
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(action, undefined);

  const form = useForm<FormValues>({
    resolver: zodResolver(exerciseCatalogSchema),
    defaultValues,
  });

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  const fieldError = <FieldName extends keyof FormValues>(fieldName: FieldName) =>
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
          <Label htmlFor="name">Название</Label>
          <Input id="name" {...form.register("name")} aria-invalid={Boolean(fieldError("name"))} />
          <FieldError message={fieldError("name")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Категория</Label>
          <Select id="category" {...form.register("category")}>
            {CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <FieldError message={fieldError("category")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="equipment">Оборудование</Label>
          <Select id="equipment" {...form.register("equipment")}>
            {EQUIPMENT.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <FieldError message={fieldError("equipment")} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea id="description" {...form.register("description")} />
          <FieldError message={fieldError("description")} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="videoUrl">Ссылка на видео</Label>
          <Input id="videoUrl" placeholder="https://..." {...form.register("videoUrl")} />
          <FieldError message={fieldError("videoUrl")} />
        </div>

        <label className="flex items-center gap-3 self-end rounded-lg border px-3 py-2">
          <Checkbox {...form.register("isActive")} />
          <span className="text-sm font-medium">Упражнение активно</span>
        </label>
      </div>

      <Button type="submit" disabled={pending}>
        {pending
          ? "Сохраняем..."
          : mode === "create"
            ? "Создать упражнение"
            : "Сохранить изменения"}
      </Button>
    </form>
  );
}
