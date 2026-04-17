import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { AdminOccupancyCard } from "@/features/gym-state/components/admin-occupancy-card";
import { getGymOccupancy } from "@/features/gym-state/service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDaysFromNowRange, getMoscowDayRange } from "@/lib/datetime";
import { formatMoscowDate } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";
import { markPastSessionsCompleted } from "@/features/sessions/service";

export default async function AdminDashboardPage() {
  const now = new Date();
  const todayRange = getMoscowDayRange(now);
  const weekRange = getDaysFromNowRange(7, now);

  await markPastSessionsCompleted().catch((error) => {
    console.error("[admin-dashboard] markPastSessionsCompleted failed", error);
  });

  let gymOccupancy = 0;
  try {
    gymOccupancy = await getGymOccupancy();
  } catch (error) {
    console.error("[admin-dashboard] getGymOccupancy failed", error);
  }

  let cards:
    | Array<{
        title: string;
        value: number;
      }>
    | null = null;

  try {
    const [
      todaySessionsCount,
      weekSessionsCount,
      activeMembershipsCount,
      totalClientsCount,
    ] = await withPrismaReadRetry(
      async () => {
        const todayCount = await prisma.session.count({
          where: {
            status: "scheduled",
            startsAt: {
              gte: todayRange.start,
              lt: todayRange.end,
            },
          },
        });

        const weekCount = await prisma.session.count({
          where: {
            status: "scheduled",
            startsAt: {
              gte: weekRange.start,
              lt: weekRange.end,
            },
          },
        });

        const membershipCount = await prisma.membership.count({
          where: {
            status: "active",
            endsAt: {
              gte: now,
            },
          },
        });

        const clientCount = await prisma.user.count({
          where: {
            role: "client",
            deletedAt: null,
          },
        });

        return [todayCount, weekCount, membershipCount, clientCount] as const;
      },
      1,
      "admin.dashboard.stats",
    );

    cards = [
      { title: "Сегодня сессий", value: todaySessionsCount },
      { title: "На неделе", value: weekSessionsCount },
      { title: "Активных абонементов", value: activeMembershipsCount },
      { title: "Всего клиентов", value: totalClientsCount },
    ];
  } catch (error) {
    console.error("[admin-dashboard] failed to load stats", error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Панель администратора"
        description={formatMoscowDate(now)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <AdminOccupancyCard initialOccupancy={gymOccupancy} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Сканер QR</CardTitle>
          <CardDescription>
            Подтверждение посещений клиентов и списание занятий по QR-коду.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/admin/scan" />}>
            Сканировать QR
          </Button>
        </CardContent>
      </Card>

      {cards ? (
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader>
                <CardDescription>{card.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Статистика временно недоступна</CardTitle>
            <CardDescription>
              Не удалось получить данные из базы. Обновите страницу через пару секунд.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
