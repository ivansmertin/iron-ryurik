import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { TabLinks } from "@/components/admin/tab-links";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { TrainerClaimSlotButton } from "@/features/trainer/components/trainer-claim-slot-button";
import {
  clientSchedulePeriods,
  type ClientSchedulePeriod,
} from "@/features/bookings/queries";
import { getTrainerScheduleData } from "@/features/trainer/queries";
import { reconcileFreeSlots } from "@/features/gym-schedule/service";
import { requireUser } from "@/features/auth/get-user";
import { getSearchParamValue } from "@/lib/search-params";
import { formatMoscowDayHeading, formatMoscowTime } from "@/lib/formatters";
import { getMoscowDateKey } from "@/lib/datetime";

type TrainerSchedulePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getPeriodHref(period: ClientSchedulePeriod) {
  return period === "this-week"
    ? "/trainer/schedule"
    : `/trainer/schedule?period=${period}`;
}

function getPeriodFromSearchParam(value: string): ClientSchedulePeriod {
  if (clientSchedulePeriods.includes(value as ClientSchedulePeriod)) {
    return value as ClientSchedulePeriod;
  }
  return "this-week";
}

function groupSessionsByDay(
  sessions: Awaited<ReturnType<typeof getTrainerScheduleData>>["sessions"],
) {
  const groups = new Map<string, { date: Date; sessions: typeof sessions }>();

  for (const session of sessions) {
    const key = getMoscowDateKey(session.startsAt);
    const existing = groups.get(key);
    if (existing) {
      existing.sessions.push(session);
      continue;
    }
    groups.set(key, { date: session.startsAt, sessions: [session] });
  }

  return Array.from(groups.values());
}

function getOccupancyVariant(booked: number, capacity: number) {
  if (capacity <= 0) return "outline" as const;
  const fill = booked / capacity;
  if (fill < 0.5) return "default" as const;
  if (fill < 0.8) return "secondary" as const;
  return "destructive" as const;
}

export default async function TrainerSchedulePage({
  searchParams,
}: TrainerSchedulePageProps) {
  await requireUser("trainer");
  const resolvedParams = await searchParams;
  const period = getPeriodFromSearchParam(getSearchParamValue(resolvedParams.period));
  const toastKey = getSearchParamValue(resolvedParams.toast);
  const now = new Date();

  await reconcileFreeSlots(now).catch((error) => {
    console.error("[trainer-schedule] reconcileFreeSlots failed", error);
  });

  let scheduleData: Awaited<ReturnType<typeof getTrainerScheduleData>> | null = null;

  try {
    scheduleData = await getTrainerScheduleData(period, now);
  } catch (error) {
    console.error("[trainer-schedule] failed to load schedule", error);
  }

  const periodLabels: Record<ClientSchedulePeriod, string> = {
    "this-week": "На этой неделе",
    "next-week": "На следующей неделе",
    later: "Позже",
  };

  const tabItems = clientSchedulePeriods.map((item) => ({
    href: getPeriodHref(item),
    label: periodLabels[item],
    isActive: period === item,
  }));

  if (!scheduleData) {
    return (
      <div className="space-y-6">
        <AdminToastListener toastKey={toastKey} />
        <PageHeader
          title="Общее расписание"
          description="Все групповые слоты зала. Занимайте свободные слоты и ведите занятия."
        />
        <TabLinks items={tabItems} />
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Расписание временно недоступно</CardTitle>
            <CardDescription>
              Обновите страницу через пару секунд.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const grouped = groupSessionsByDay(scheduleData.sessions);

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title="Общее расписание"
        description="Все групповые слоты зала. Занимайте свободные слоты и ведите занятия."
      />

      <TabLinks items={tabItems} />

      <div className="space-y-6">
        {grouped.length ? (
          grouped.map(({ date, sessions }) => (
            <section key={getMoscowDateKey(date)} className="space-y-3">
              <h2 className="font-heading text-xl font-semibold">
                {formatMoscowDayHeading(date)}
              </h2>
              <div className="grid gap-4">
                {sessions.map((session) => {
                  const bookedCount = session.bookings.length;
                  const isFree = session.origin === "auto_free";
                  const isOwnSlot = !!session.trainerId;

                  return (
                    <Card key={session.id} className="border-border/70 shadow-sm">
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <CardDescription>
                              {formatMoscowTime(session.startsAt)},{" "}
                              {session.durationMinutes} мин
                              {session.trainer ? (
                                <span className="ml-2 text-foreground/70">
                                  · {session.trainer.fullName}
                                </span>
                              ) : null}
                            </CardDescription>
                            <CardTitle>{session.title || "Без названия"}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            {isFree ? (
                              <Badge variant="outline">Свободный</Badge>
                            ) : null}
                            <Badge
                              variant={getOccupancyVariant(bookedCount, session.capacity)}
                            >
                              {bookedCount}/{session.capacity}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>

                      {isFree && !isOwnSlot ? (
                        <CardContent>
                          <TrainerClaimSlotButton sessionId={session.id} />
                        </CardContent>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Пока нет слотов</CardTitle>
              <CardDescription>
                В этом периоде групповых занятий ещё нет.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
