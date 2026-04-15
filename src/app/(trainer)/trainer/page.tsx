import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/features/auth/get-user";
import { listTrainerClients, listTrainerSlots, getTrainerDashboardStats } from "@/features/trainer/queries";
import { markPastSessionsCompleted } from "@/features/sessions/service";
import {
  formatMoscowDate,
  formatMoscowDateTime,
  formatMoscowDateShort,
  formatMoscowRelativeDateTime,
  formatMoscowTime,
} from "@/lib/formatters";

function DashboardStatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function TrainerDashboardPage() {
  const user = await requireUser("trainer");
  const now = new Date();

  await markPastSessionsCompleted().catch((error) => {
    console.error("[trainer-dashboard] markPastSessionsCompleted failed", error);
  });

  let dashboardData:
    | Awaited<ReturnType<typeof getTrainerDashboardStats>>
    | null = null;
  let upcomingSlotsData:
    | Awaited<ReturnType<typeof listTrainerSlots>>
    | null = null;
  let recentClientsData:
    | Awaited<ReturnType<typeof listTrainerClients>>
    | null = null;

  try {
    [dashboardData, upcomingSlotsData, recentClientsData] = await Promise.all([
      getTrainerDashboardStats(user.id, now),
      listTrainerSlots({
        trainerId: user.id,
        page: 1,
        pageSize: 4,
        tab: "upcoming",
      }),
      listTrainerClients({
        trainerId: user.id,
        page: 1,
        pageSize: 4,
        query: "",
      }),
    ]);
  } catch (error) {
    console.error("[trainer-dashboard] failed to load dashboard", error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Панель тренера"
        description={`Сегодня ${formatMoscowDate(now)}. Здесь собраны личные слоты, клиенты и заметки.`}
        actions={
          <>
            <Button nativeButton={false} render={<Link href="/trainer/slots/new" />}>
              Новый слот
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/trainer/clients" />}>
              Мои клиенты
            </Button>
          </>
        }
      />

      {dashboardData && upcomingSlotsData && recentClientsData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <DashboardStatCard
              title="Сегодня слотов"
              value={dashboardData.todaySlotsCount}
              description="Личные слоты на текущий день."
            />
            <DashboardStatCard
              title="На неделе"
              value={dashboardData.weekSlotsCount}
              description="Слоты на ближайшие 7 дней."
            />
            <DashboardStatCard
              title="Моих клиентов"
              value={dashboardData.clientsCount}
              description="Клиенты, закреплённые за тренером."
            />
            <DashboardStatCard
              title="Программ"
              value={dashboardData.programsCount}
              description="Все программы, созданные для клиентов."
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardDescription>Ближайший слот</CardDescription>
                  <CardTitle>
                    {dashboardData.nextSlot?.title ?? "Без названия"}
                  </CardTitle>
                </div>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/trainer/slots" />}
                >
                  Открыть слоты
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboardData.nextSlot ? (
                  <>
                    <p className="text-sm">
                      {formatMoscowRelativeDateTime(dashboardData.nextSlot.startsAt, now)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {formatMoscowDateTime(dashboardData.nextSlot.startsAt)} ·{" "}
                      {dashboardData.nextSlot.durationMinutes} мин
                    </p>
                    <div className="text-muted-foreground text-xs">
                      Статус: {dashboardData.nextSlot.status}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Пока нет предстоящих слотов. Создайте первый личный слот.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardDescription>Последние клиенты</CardDescription>
                  <CardTitle>Быстрый доступ</CardTitle>
                </div>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/trainer/clients" />}
                >
                  Все клиенты
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentClientsData.items.length ? (
                  recentClientsData.items.map((client) => {
                    const latestProgram = client.programs[0];

                    return (
                      <Link
                        key={client.id}
                        href={`/trainer/clients/${client.id}`}
                        className="block rounded-xl border p-4 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium">{client.fullName}</p>
                            <p className="text-muted-foreground text-sm">{client.email}</p>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatMoscowDateShort(client.createdAt)}
                          </p>
                        </div>
                        <div className="mt-3 text-sm">
                          {latestProgram ? (
                            <>
                              <p className="font-medium">{latestProgram.name}</p>
                              <p className="text-muted-foreground text-xs">
                                {formatMoscowDate(latestProgram.startsAt)}
                                {latestProgram.endsAt
                                  ? ` - ${formatMoscowDate(latestProgram.endsAt)}`
                                  : ""}
                              </p>
                            </>
                          ) : (
                            <p className="text-muted-foreground text-sm">Программа ещё не назначена.</p>
                          )}
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Пока нет клиентов. Список появится после назначения программ.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardDescription>Ближайшие слоты</CardDescription>
                <CardTitle>План на день</CardTitle>
              </div>
              <Button nativeButton={false} render={<Link href="/trainer/slots/new" />}>
                Создать слот
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingSlotsData.items.length ? (
                upcomingSlotsData.items.map((slot) => (
                  <Link
                    key={slot.id}
                    href={`/trainer/slots/${slot.id}`}
                    className="block rounded-xl border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{slot.title ?? "Без названия"}</p>
                        <p className="text-muted-foreground text-sm">
                          {formatMoscowRelativeDateTime(slot.startsAt, now)}
                        </p>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {formatMoscowTime(slot.startsAt)} · {slot.durationMinutes} мин
                      </p>
                    </div>
                    {slot.description ? (
                      <p className="text-muted-foreground mt-2 text-sm">{slot.description}</p>
                    ) : null}
                  </Link>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  Пока нет предстоящих слотов. Добавьте первый слот, чтобы заполнить календарь.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Данные тренера временно недоступны</CardTitle>
            <CardDescription>
              Не удалось загрузить статистику. Обновите страницу через пару секунд.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link href="/trainer/slots" />}>
              Мои слоты
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/trainer/clients" />}>
              Мои клиенты
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
