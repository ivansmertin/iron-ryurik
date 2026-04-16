"use client";

import Link from "next/link";
import { useActionState, useEffect, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod/v4";
import { toast } from "sonner";
import { FieldError } from "@/components/admin/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UpdateClientProfileActionState } from "@/features/clients/actions";
import {
  updateClientProfile,
} from "@/features/clients/actions";
import {
  updateClientProfileSchema,
  type UpdateClientProfileFormValues,
} from "@/features/clients/schemas";

type ProfileFormValues = z.input<typeof updateClientProfileSchema>;

function getServerFieldError(
  state: UpdateClientProfileActionState,
  fieldName: keyof ProfileFormValues,
) {
  if (!state || !("fieldErrors" in state)) {
    return undefined;
  }

  return state.fieldErrors[fieldName]?.[0];
}

export function ClientProfileForm({
  email,
  defaultValues,
}: {
  email: string;
  defaultValues: UpdateClientProfileFormValues;
}) {
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(
    updateClientProfile,
    undefined,
  );
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(updateClientProfileSchema),
    defaultValues,
  });

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
      return;
    }

    if (state?.ok === true) {
      toast.success("Профиль сохранён");
    }
  }, [state]);

  const fieldError = <FieldName extends keyof ProfileFormValues>(
    fieldName: FieldName,
  ) =>
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
          <Label htmlFor="fullName">ФИО</Label>
          <Input
            id="fullName"
            aria-invalid={Boolean(fieldError("fullName"))}
            {...form.register("fullName")}
          />
          <FieldError message={fieldError("fullName")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled />
          <p className="text-muted-foreground text-xs">
            Email менять нельзя. Это отдельная задача.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Телефон</Label>
          <Input
            id="phone"
            placeholder="+7..."
            aria-invalid={Boolean(fieldError("phone"))}
            {...form.register("phone")}
          />
          <FieldError message={fieldError("phone")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sport">Спорт</Label>
          <select
            id="sport"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            aria-invalid={Boolean(fieldError("sport"))}
            {...form.register("sport")}
          >
            <option value="">Не указано</option>
            <option value="running">Бег</option>
            <option value="trail">Трейл</option>
            <option value="triathlon">Триатлон</option>
            <option value="skiing">Лыжи</option>
            <option value="other">Другое</option>
          </select>
          <FieldError message={fieldError("sport")} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем..." : "Сохранить профиль"}
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<Link href="/reset-password" />}
        >
          Сменить пароль
        </Button>
      </div>
    </form>
  );
}
