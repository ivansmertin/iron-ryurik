import Link from "next/link";
import { ClientOccupancyCard } from "@/features/gym-state/components/client-occupancy-card";
import { getGymOccupancy } from "@/features/gym-state/service";
import { PageHeader } from "@/components/admin/page-header";
import { CancelBookingButton } from "@/features/bookings/components/cancel-booking-button";
import { getClientDashboardData } from "@/features/bookings/queries";
import { requireUser } from "@/features/auth/get-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatMoscowDate,
  formatMoscowDateShort,
  formatMoscowRelativeDateTime,
} from "@/lib/formatters";

function MembershipProgress({
  visitsRemaining,
  visitsTotal,
}: {
  visitsRemaining: number;
  visitsTotal: number;
}) {
  const usedVisits = Math.max(visitsTotal - visitsRemaining, 0);
  const percent =
    visitsTotal > 0
      ? Math.min(100, Math.round((usedVisits / visitsTotal) * 100))
      : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Прогресс абонемента</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default async function ClientDashboard() {
  const user = await requireUser("client");
  const now = new Date();

  let dashboardData: Awaited<ReturnType<typeof getClientDashboardData>> | null = null;
  let gymOccupancy = 0;

  try {
    [dashboardData, gymOccupancy] = await Promise.all([
      getClientDashboardData(user.id, now),
      getGymOccupancy(),
    ]);
  } catch (error) {
    console.error("[client-dashboard] failed to load dashboard", error);
  }

  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Личный кабинет"
          description={`Сегодня ${formatMoscowDate(now)}. Здесь собраны абонемент и ближайшие записи.`}
        />
        
        <ClientOccupancyCard occupancy={gymOccupancy} />

        <Card>
          <CardHeader>
            <CardTitle>Данные кабинета временно недоступны</CardTitle>
            <CardDescription>
              Обновите страницу через пару секунд. Если ошибка повторяется, значит
              база или пул соединений сейчас заняты.
            </CardDescription>
          </CardHeader>
        </Card>

      </div>
    );
  }

  const { activeMembership, nextBooking } = dashboardData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Личный кабинет"
        description={`Сегодня ${formatMoscowDate(now)}. Здесь собраны абонемент и ближайшие записи.`}
      />

      <ClientOccupancyCard occupancy={gymOccupancy} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Мой абонемент</CardDescription>
            <CardTitle>
              {activeMembership ? activeMembership.plan.name : "Нет активного абонемента"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeMembership ? (
              <>
                <p className="text-sm">
                  Осталось {activeMembership.visitsRemaining} занятий из{" "}
                  {activeMembership.visitsTotal}
                </p>
                <p className="text-muted-foreground text-sm">
                  Действует до {formatMoscowDateShort(activeMembership.endsAt)}
                </p>
                <MembershipProgress
                  visitsRemaining={activeMembership.visitsRemaining}
                  visitsTotal={activeMembership.visitsTotal}
                />
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Нет активного абонемента.
                </p>
                <Button nativeButton={false} render={<Link href="/client/memberships/buy" />} className="w-full">
                  Купить абонемент
                </Button>
              </div>
            )}
          </CardContent>

        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Ближайшая тренировка</CardDescription>
            <CardTitle>
              {nextBooking ? nextBooking.session.title ?? "Без названия" : "Нет предстоящих записей"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextBooking ? (
              <>
                <p className="text-sm">
                  {formatMoscowRelativeDateTime(nextBooking.session.startsAt, now)}
                </p>
                <p className="text-muted-foreground text-sm">
                  Длительность: {nextBooking.session.durationMinutes} мин
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Нет предстоящих записей. Посмотрите расписание и выберите удобный слот.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex items-center gap-2">
            {nextBooking ? (
              <CancelBookingButton
                bookingId={nextBooking.id}
                sessionTitle={nextBooking.session.title}
                buttonLabel="Отменить запись"
              />
            ) : (
              <Button nativeButton={false} render={<Link href="/client/schedule" />}>
                Посмотреть расписание
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>


    </div>
  );
}
