import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { SessionStatusBadge } from "@/components/admin/status-badges";
import { TabLinks } from "@/components/admin/tab-links";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/features/auth/get-user";
import {
  listTrainerSlots,
  trainerSlotTabs,
  type TrainerSlotTab,
} from "@/features/trainer/queries";
import { TrainerSlotCancelButton } from "@/features/trainer/components/trainer-slot-cancel-button";
import { markPastSessionsCompleted } from "@/features/sessions/service";
import { formatMoscowDateTime } from "@/lib/formatters";
import { getSearchParamValue, parsePositivePage } from "@/lib/search-params";

const PAGE_SIZE = 20;

type TrainerSlotsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getTabFromSearchParam(value: string): TrainerSlotTab {
  if (trainerSlotTabs.includes(value as TrainerSlotTab)) {
    return value as TrainerSlotTab;
  }

  return "upcoming";
}

function getTabHref(tab: TrainerSlotTab) {
  return tab === "upcoming" ? "/trainer/slots" : `/trainer/slots?tab=${tab}`;
}

export default async function TrainerSlotsPage({
  searchParams,
}: TrainerSlotsPageProps) {
  const user = await requireUser("trainer");
  const resolvedSearchParams = await searchParams;
  const tab = getTabFromSearchParam(getSearchParamValue(resolvedSearchParams.tab));
  const page = parsePositivePage(resolvedSearchParams.page);
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);
  const now = new Date();

  await markPastSessionsCompleted().catch((error) => {
    console.error("[trainer-slots] markPastSessionsCompleted failed", error);
  });

  let slotsData: Awaited<ReturnType<typeof listTrainerSlots>> | null = null;

  try {
    slotsData = await listTrainerSlots({
      trainerId: user.id,
      page,
      pageSize: PAGE_SIZE,
      tab,
    });
  } catch (error) {
    console.error("[trainer-slots] failed to load slots", error);
  }

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title="Мои слоты"
        description="Личные слоты тренера: создание, редактирование и отмена."
        actions={
          <Button nativeButton={false} render={<Link href="/trainer/slots/new" />}>
            Новый слот
          </Button>
        }
      />

      <TabLinks
        items={trainerSlotTabs.map((item) => ({
          href: getTabHref(item),
          label:
            item === "upcoming"
              ? "Предстоящие"
              : item === "past"
                ? "Прошедшие"
                : "Отменённые",
          isActive: tab === item,
        }))}
      />

      {slotsData ? (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата и время</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Длительность</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slotsData.items.length ? (
                  slotsData.items.map((slot) => {
                    const canEdit =
                      slot.status === "scheduled" && slot.startsAt.getTime() > now.getTime();

                    return (
                      <TableRow key={slot.id}>
                        <TableCell>{formatMoscowDateTime(slot.startsAt)}</TableCell>
                        <TableCell className="font-medium">
                          {slot.title || "Без названия"}
                        </TableCell>
                        <TableCell>{slot.durationMinutes} мин</TableCell>
                        <TableCell>
                          <SessionStatusBadge status={slot.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              nativeButton={false}
                              render={<Link href={`/trainer/slots/${slot.id}`} />}
                            >
                              {canEdit ? "Редактировать" : "Открыть"}
                            </Button>
                            {canEdit ? <TrainerSlotCancelButton slotId={slot.id} /> : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      Для выбранного фильтра пока нет слотов.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Не удалось загрузить список слотов. Обновите страницу через пару секунд.
          </CardContent>
        </Card>
      )}

      {slotsData ? (
        <PaginationControls
          page={page}
          totalPages={slotsData.totalPages}
          pathname="/trainer/slots"
          searchParams={{
            tab: tab === "upcoming" ? undefined : tab,
          }}
        />
      ) : null}
    </div>
  );
}
