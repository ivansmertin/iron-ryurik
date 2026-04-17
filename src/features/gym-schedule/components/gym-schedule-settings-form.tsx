"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { FieldError } from "@/components/admin/field-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { saveGymScheduleSettings } from "../actions";

type WorkingHour = {
  weekday: number;
  isOpen: boolean;
  opensAtMinutes: number;
  closesAtMinutes: number;
};

type GymScheduleSettingsFormProps = {
  freeSlotCapacity: number;
  workingHours: WorkingHour[];
};

const dayLabels = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

function minutesToInputValue(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getServerFieldError(state: ActionState, fieldName: string) {
  if (!state || !("fieldErrors" in state)) {
    return undefined;
  }

  return state.fieldErrors[fieldName]?.[0];
}

export function GymScheduleSettingsForm({
  freeSlotCapacity,
  workingHours,
}: GymScheduleSettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    saveGymScheduleSettings,
    undefined,
  );
  const hoursByWeekday = new Map(
    workingHours.map((item) => [item.weekday, item]),
  );

  useEffect(() => {
    if (state?.ok === false && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  const freeSlotCapacityError = getServerFieldError(state, "freeSlotCapacity");
  const workingHoursError = getServerFieldError(state, "workingHours");

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="freeSlotCapacity">Мест в свободной тренировке</Label>
          <Input
            id="freeSlotCapacity"
            name="freeSlotCapacity"
            type="number"
            min={1}
            max={20}
            defaultValue={freeSlotCapacity}
            aria-invalid={Boolean(freeSlotCapacityError)}
          />
          <FieldError message={freeSlotCapacityError} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="freeSlotDurationMinutes">Длительность свободного слота</Label>
          <Input
            id="freeSlotDurationMinutes"
            name="freeSlotDurationMinutes"
            value="60 минут"
            disabled
            readOnly
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Рабочее время</h2>
          <p className="text-muted-foreground text-sm">
            Слоты создаются по часовой сетке внутри открытых дней.
          </p>
        </div>

        <div className="grid gap-3">
          {dayLabels.map((label, index) => {
            const weekday = index + 1;
            const item = hoursByWeekday.get(weekday) ?? {
              weekday,
              isOpen: false,
              opensAtMinutes: 9 * 60,
              closesAtMinutes: 21 * 60,
            };

            return (
              <div
                key={weekday}
                className="grid gap-3 rounded-lg border border-border/70 p-3 sm:grid-cols-[minmax(8rem,1fr)_8rem_8rem]"
              >
                <label className="flex items-center gap-3">
                  <Checkbox
                    name={`weekday-${weekday}-open`}
                    defaultChecked={item.isOpen}
                  />
                  <span className="font-medium">{label}</span>
                </label>
                <div className="space-y-1">
                  <Label htmlFor={`weekday-${weekday}-opensAt`}>Открытие</Label>
                  <Input
                    id={`weekday-${weekday}-opensAt`}
                    name={`weekday-${weekday}-opensAt`}
                    type="time"
                    step={3600}
                    defaultValue={minutesToInputValue(item.opensAtMinutes)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`weekday-${weekday}-closesAt`}>Закрытие</Label>
                  <Input
                    id={`weekday-${weekday}-closesAt`}
                    name={`weekday-${weekday}-closesAt`}
                    type="time"
                    step={3600}
                    defaultValue={minutesToInputValue(item.closesAtMinutes)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <FieldError message={workingHoursError} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем..." : "Сохранить рабочее время"}
      </Button>
    </form>
  );
}
