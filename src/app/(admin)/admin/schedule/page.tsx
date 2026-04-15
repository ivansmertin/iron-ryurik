import Link from "next/link";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { PageHeader } from "@/components/admin/page-header";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { SessionStatusBadge } from "@/components/admin/status-badges";
import { TabLinks } from "@/components/admin/tab-links";
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
import { formatMoscowDateTime } from "@/lib/formatters";
import { getSearchParamValue, parsePositivePage } from "@/lib/search-params";
import { CancelSessionButton } from "@/features/sessions/components/cancel-session-button";
import {
  listSessions,
  sessionListTabs,
  type SessionListTab,
} from "@/features/sessions/queries";

const PAGE_SIZE = 20;

type SchedulePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getTabFromSearchParam(value: string): SessionListTab {
  if (sessionListTabs.includes(value as SessionListTab)) {
    return value as SessionListTab;
  }

  return "upcoming";
}

function getTabHref(tab: SessionListTab) {
  return tab === "upcoming" ? "/admin/schedule" : `/admin/schedule?tab=${tab}`;
}

export default async function SchedulePage({
  searchParams,
}: SchedulePageProps) {
  const resolvedSearchParams = await searchParams;
  const tab = getTabFromSearchParam(getSearchParamValue(resolvedSearchParams.tab));
  const page = parsePositivePage(resolvedSearchParams.page);
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);
  const sessions = await listSessions({
    tab,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title="Расписание"
        description="Групповые занятия зала"
        actions={
          <Button nativeButton={false} render={<Link href="/admin/schedule/new" />}>
            Создать сессию
          </Button>
        }
      />

      <TabLinks
        items={[
          {
            href: getTabHref("upcoming"),
            label: "Предстоящие",
            isActive: tab === "upcoming",
          },
          {
            href: getTabHref("past"),
            label: "Прошедшие",
            isActive: tab === "past",
          },
          {
            href: getTabHref("cancelled"),
            label: "Отменённые",
            isActive: tab === "cancelled",
          },
        ]}
      />

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {sessions.items.length ? (
          sessions.items.map((session) => (
            <Card key={session.id} className="border-border/70 shadow-sm">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium">{session.title || "Без названия"}</p>
                    <p className="text-muted-foreground text-sm">
                      {formatMoscowDateTime(session.startsAt)}
                    </p>
                  </div>
                  <SessionStatusBadge status={session.status} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{session.durationMinutes} мин</span>
                  <span>
                    Записано: {session.bookings.length}/{session.capacity}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/admin/schedule/${session.id}`} />}
                  >
                    Редактировать
                  </Button>
                  {session.status === "scheduled" ? (
                    <CancelSessionButton sessionId={session.id} />
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border/70 shadow-sm">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Для выбранного фильтра занятий пока нет.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden border-border/70 shadow-sm md:block">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата и время</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Длительность</TableHead>
                <TableHead>Вместимость</TableHead>
                <TableHead>Записано</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.items.length ? (
                sessions.items.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{formatMoscowDateTime(session.startsAt)}</TableCell>
                    <TableCell className="font-medium">
                      {session.title || "Без названия"}
                    </TableCell>
                    <TableCell>{session.durationMinutes} мин</TableCell>
                    <TableCell>{session.capacity}</TableCell>
                    <TableCell>
                      {session.bookings.length}/{session.capacity}
                    </TableCell>
                    <TableCell>
                      <SessionStatusBadge status={session.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/admin/schedule/${session.id}`} />}
                        >
                          Редактировать
                        </Button>
                        {session.status === "scheduled" ? (
                          <CancelSessionButton sessionId={session.id} />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                    Для выбранного фильтра занятий пока нет.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls
        page={page}
        totalPages={sessions.totalPages}
        pathname="/admin/schedule"
        searchParams={{
          tab: tab === "upcoming" ? undefined : tab,
        }}
      />
    </div>
  );
}
