import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { PageHeader } from "@/components/admin/page-header";
import { SessionStatusBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/features/auth/get-user";
import { markPastSessionsCompleted } from "@/features/sessions/service";
import { TrainerSlotCancelButton } from "@/features/trainer/components/trainer-slot-cancel-button";
import { TrainerSlotForm } from "@/features/trainer/components/trainer-slot-form";
import { getTrainerSlotById } from "@/features/trainer/queries";
import {
  getMoscowDateInputValue,
  getMoscowTimeInputValue,
} from "@/lib/datetime";
import {
  formatMoscowDate,
  formatMoscowDateTime,
  formatMoscowRelativeDateTime,
  formatMoscowTime,
} from "@/lib/formatters";
import { getSearchParamValue } from "@/lib/search-params";

type TrainerSlotDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TrainerSlotDetailsPage({
  params,
  searchParams,
}: TrainerSlotDetailsPageProps) {
  const user = await requireUser("trainer");
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);
  const now = new Date();

  await markPastSessionsCompleted().catch((error) => {
    console.error("[trainer-slot] markPastSessionsCompleted failed", error);
  });

  const slot = await getTrainerSlotById(user.id, id);

  if (!slot) {
    notFound();
  }

  const canEdit =
    slot.status === "scheduled" && slot.startsAt.getTime() > now.getTime();

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title={slot.title || "Слот без названия"}
        description={
          canEdit
            ? "Отредактируйте личный слот или отмените его."
            : "Личный слот в режиме просмотра."
        }
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/trainer/slots" />}
          >
            К слотам
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardDescription>{canEdit ? "Редактирование" : "Просмотр"}</CardDescription>
            <CardTitle>Параметры слота</CardTitle>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <TrainerSlotForm
                mode="edit"
                slotId={slot.id}
                defaultValues={{
                  title: slot.title ?? "",
                  description: slot.description ?? "",
                  date: getMoscowDateInputValue(slot.startsAt),
                  startTime: getMoscowTimeInputValue(slot.startsAt),
                  durationMinutes: slot.durationMinutes,
                }}
              />
            ) : (
              <div className="space-y-4">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-sm">Дата и время</dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatMoscowDateTime(slot.startsAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-sm">Формат</dt>
                    <dd className="mt-1 text-sm font-medium">Личный слот</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-sm">Длительность</dt>
                    <dd className="mt-1 text-sm font-medium">
                      {slot.durationMinutes} минут
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-sm">Старт</dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatMoscowDate(slot.startsAt)} в {formatMoscowTime(slot.startsAt)}
                    </dd>
                  </div>
                </dl>

                {slot.description ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">Описание</p>
                    <p className="whitespace-pre-wrap text-sm">{slot.description}</p>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Сведения</CardDescription>
            <CardTitle>{slot.title || "Без названия"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-sm">Статус</span>
              <SessionStatusBadge status={slot.status} />
            </div>

            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Когда:</span>{" "}
                {formatMoscowRelativeDateTime(slot.startsAt, now)}
              </p>
              <p>
                <span className="text-muted-foreground">Точное время:</span>{" "}
                {formatMoscowDateTime(slot.startsAt)}
              </p>
              <p>
                <span className="text-muted-foreground">Длительность:</span>{" "}
                {slot.durationMinutes} минут
              </p>
              <p>
                <span className="text-muted-foreground">Вместимость:</span> 1 место
              </p>
            </div>

            {slot.description ? (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Комментарий</p>
                <p className="whitespace-pre-wrap text-sm">{slot.description}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Для этого слота нет дополнительного комментария.
              </p>
            )}

            {canEdit ? (
              <TrainerSlotCancelButton slotId={slot.id} />
            ) : (
              <p className="text-muted-foreground text-xs">
                Этот слот больше нельзя изменить.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
