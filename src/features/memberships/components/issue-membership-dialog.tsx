"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod/v4";
import { toast } from "sonner";
import { FieldError } from "@/components/admin/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { issueMembership } from "@/features/memberships/actions";
import { issueMembershipSchema } from "@/features/memberships/schemas";

type IssueMembershipFormValues = z.input<typeof issueMembershipSchema>;

type ActivePlan = {
  id: string;
  name: string;
  visits: number;
  durationDays: number;
  price: string;
};

function getServerFieldError(
  state: ActionState,
  fieldName: keyof IssueMembershipFormValues,
) {
  if (!state || !("fieldErrors" in state)) {
    return undefined;
  }

  return state.fieldErrors[fieldName]?.[0];
}

export function IssueMembershipDialog({
  clientId,
  plans,
  defaultStartDate,
}: {
  clientId: string;
  plans: ActivePlan[];
  defaultStartDate: string;
}) {
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    issueMembership.bind(null, clientId),
    undefined,
  );
  const firstPlan = plans[0];

  const form = useForm<IssueMembershipFormValues>({
    resolver: zodResolver(issueMembershipSchema),
    defaultValues: {
      planId: firstPlan?.id ?? "",
      startsAt: defaultStartDate,
      isPaid: true,
      paidAmount: firstPlan ? Number(firstPlan.price) : "",
      paidAt: defaultStartDate,
    },
  });

  const selectedPlanId = useWatch({
    control: form.control,
    name: "planId",
  });
  const isPaid = useWatch({
    control: form.control,
    name: "isPaid",
  });
  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? firstPlan;

  useEffect(() => {
    if (!selectedPlan) {
      return;
    }

    form.setValue("paidAmount", Number(selectedPlan.price), {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [form, selectedPlan]);

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  const fieldError = <FieldName extends keyof IssueMembershipFormValues>(
    fieldName: FieldName,
  ) =>
    form.formState.errors[fieldName]?.message?.toString() ??
    getServerFieldError(state, fieldName);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button disabled={plans.length === 0} />}
      >
        Выдать абонемент
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Выдать абонемент</DialogTitle>
          <DialogDescription>
            Выберите активный план и параметры оплаты.
          </DialogDescription>
        </DialogHeader>

        {plans.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Нет активных планов. Сначала создайте или активируйте план абонемента.
          </p>
        ) : (
          <form
            className="space-y-4"
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
            <div className="space-y-2">
              <Label htmlFor="planId">План</Label>
              <select
                id="planId"
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                aria-invalid={Boolean(fieldError("planId"))}
                {...form.register("planId")}
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              <FieldError message={fieldError("planId")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startsAt">Дата начала</Label>
              <Input
                id="startsAt"
                type="date"
                aria-invalid={Boolean(fieldError("startsAt"))}
                {...form.register("startsAt")}
              />
              <FieldError message={fieldError("startsAt")} />
            </div>

            <label className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <input
                type="checkbox"
                className="accent-foreground h-4 w-4 rounded border"
                {...form.register("isPaid")}
              />
              <span className="text-sm font-medium">Оплачено</span>
            </label>

            {isPaid ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Сумма</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    min={0}
                    step="0.01"
                    aria-invalid={Boolean(fieldError("paidAmount"))}
                    {...form.register("paidAmount")}
                  />
                  <FieldError message={fieldError("paidAmount")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paidAt">Дата оплаты</Label>
                  <Input
                    id="paidAt"
                    type="date"
                    aria-invalid={Boolean(fieldError("paidAt"))}
                    {...form.register("paidAt")}
                  />
                  <FieldError message={fieldError("paidAt")} />
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Выдаём..." : "Выдать"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
