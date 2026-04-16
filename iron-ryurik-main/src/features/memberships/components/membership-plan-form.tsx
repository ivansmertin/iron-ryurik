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
import type { ActionState } from "@/lib/action-state";
import {
  createMembershipPlan,
  updateMembershipPlan,
} from "@/features/memberships/actions";
import { membershipPlanSchema } from "@/features/memberships/schemas";

type MembershipPlanFormValues = z.input<typeof membershipPlanSchema>;

function getServerFieldError(
  state: ActionState,
  fieldName: keyof MembershipPlanFormValues,
) {
  if (!state || !("fieldErrors" in state)) {
    return undefined;
  }

  return state.fieldErrors[fieldName]?.[0];
}

export function MembershipPlanForm({
  mode,
  planId,
  defaultValues,
}: {
  mode: "create" | "edit";
  planId?: string;
  defaultValues: MembershipPlanFormValues;
}) {
  const [, startTransition] = useTransition();
  const action =
    mode === "create"
      ? createMembershipPlan
      : updateMembershipPlan.bind(null, planId ?? "");
  const [state, formAction, pending] = useActionState(action, undefined);
  const form = useForm<MembershipPlanFormValues>({
    resolver: zodResolver(membershipPlanSchema),
    defaultValues,
  });

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  const fieldError = <FieldName extends keyof MembershipPlanFormValues>(
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
          <Label htmlFor="name">Название</Label>
          <Input
            id="name"
            aria-invalid={Boolean(fieldError("name"))}
            {...form.register("name")}
          />
          <FieldError message={fieldError("name")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="visits">Количество занятий</Label>
          <Input
            id="visits"
            type="number"
            min={1}
            max={100}
            aria-invalid={Boolean(fieldError("visits"))}
            {...form.register("visits")}
          />
          <FieldError message={fieldError("visits")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="durationDays">Срок действия, дней</Label>
          <Input
            id="durationDays"
            type="number"
            min={1}
            max={365}
            aria-invalid={Boolean(fieldError("durationDays"))}
            {...form.register("durationDays")}
          />
          <FieldError message={fieldError("durationDays")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Цена</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step="0.01"
            aria-invalid={Boolean(fieldError("price"))}
            {...form.register("price")}
          />
          <FieldError message={fieldError("price")} />
        </div>

        <label className="flex items-center gap-3 self-end rounded-lg border px-3 py-2">
          <Checkbox {...form.register("isActive")} />
          <span className="text-sm font-medium">План активен</span>
        </label>
      </div>

      <Button type="submit" disabled={pending}>
        {pending
          ? "Сохраняем..."
          : mode === "create"
            ? "Создать план"
            : "Сохранить изменения"}
      </Button>
    </form>
  );
}
