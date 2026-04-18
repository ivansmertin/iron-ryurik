import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { TabLinks } from "@/components/admin/tab-links";
import { SessionBookingButton } from "@/features/bookings/components/session-booking-button";
import {
  clientSchedulePeriods,
  getClientScheduleData,
  type ClientSchedulePeriod,
} from "@/features/bookings/queries";

import { requireUser } from "@/features/auth/get-user";
import { getSearchParamValue } from "@/lib/search-params";
import { formatMoscowDayHeading, formatMoscowTime } from "@/lib/formatters";
import { getMoscowDateKey } from "@/lib/datetime";

type SchedulePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getPeriodHref(period: ClientSchedulePeriod) {
  return period === "this-week" ? "/client/schedule" : `/client/schedule?period=${period}`;
}

function getPeriodFromSearchParam(value: string): ClientSchedulePeriod {
  if (clientSchedulePeriods.includes(value as ClientSchedulePeriod)) {
    return value as ClientSchedulePeriod;
  }

  return "this-week";
}

function getSessionOccupancyVariant(bookedCount: number, capacity: number) {
  if (capacity <= 0) {
    return "outline" as const;
  }

  const fill = bookedCount / capacity;

  if (fill < 0.5) {
    return "default" as const;
  }

  if (fill < 0.8) {
    return "secondary" as const;
  }

  return "destructive" as const;
}

function groupSessionsByDay(
  sessions: Awaited<ReturnType<typeof getClientScheduleData>>["sessions"],
) {
  const groups = new Map<
    string,
    {
      date: Date;
      sessions: typeof sessions;
    }
  >();

  for (const session of sessions) {
    const key = getMoscowDateKey(session.startsAt);
    const existing = groups.get(key);

    if (existing) {
      existing.sessions.push(session);
      continue;
    }

    groups.set(key, {
      date: session.startsAt,
      sessions: [session],
    });
  }

  return Array.from(groups.values());
}

export default async function ClientSchedulePage({
  searchParams,
}: SchedulePageProps) {
  const user = await requireUser("client");
  const resolvedSearchParams = await searchParams;
  const period = getPeriodFromSearchParam(getSearchParamValue(resolvedSearchParams.period));
  const now = new Date();





  let scheduleData: Awaited<ReturnType<typeof getClientScheduleData>> | null = null;

  try {
    scheduleData = await getClientScheduleData(user.id, period, now);
  } catch (error) {
    console.error("[client-schedule] failed to load schedule", error);
  }

  if (!scheduleData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Расписание"
          description="Групповые занятия и свободные тренировки зала. Записывайтесь на удобное время и следите за заполнением."
        />

        <TabLinks
          items={clientSchedulePeriods.map((item) => ({
            href: getPeriodHref(item),
            label:
              item === "this-week"
                ? "На этой неделе"
                : item === "next-week"
                  ? "На следующей неделе"
                  : "Позже",
            isActive: period === item,
          }))}
        />

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Расписание временно недоступно</CardTitle>
            <CardDescription>
              Обновите страницу через пару секунд. Если ошибка повторяется, пул
              соединений или база сейчас заняты.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { sessions, bookableMembership } = scheduleData;
  const groupedSessions = groupSessionsByDay(sessions);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Расписание"
        description="Групповые занятия и свободные тренировки зала. Записывайтесь на удобное время и следите за заполнением."
      />

      <TabLinks
        items={clientSchedulePeriods.map((item) => ({
          href: getPeriodHref(item),
          label:
            item === "this-week"
              ? "На этой неделе"
              : item === "next-week"
                ? "На следующей неделе"
                : "Позже",
          isActive: period === item,
        }))}
      />

      <div className="space-y-6">
        {groupedSessions.length ? (
          groupedSessions.map(({ date, sessions: daySessions }) => (
            <section key={getMoscowDateKey(date)} className="space-y-3">
              <h2 className="font-heading text-xl font-semibold">
                {formatMoscowDayHeading(date)}
              </h2>
              <div className="grid gap-4">
                {daySessions.map((session) => {
                  const bookedCount = session.bookings.length;
                  const isBooked = session.bookings.some(
                    (booking) => booking.userId === user.id,
                  );
                  const hasPlaces = bookedCount < session.capacity;
                  const buttonMode = isBooked
                    ? "booked"
                    : bookableMembership
                      ? hasPlaces
                        ? "bookable"
                        : "full"
                      : session.dropInEnabled
                        ? hasPlaces
                          ? ("drop-in" as const)
                          : "full"
                        : "no-membership";

                  return (
                    <Card key={session.id} className="border-border/70 shadow-sm">
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <CardDescription>
                              {formatMoscowTime(session.startsAt)}, {session.durationMinutes} мин
                            </CardDescription>
                            <CardTitle>{session.title || "Без названия"}</CardTitle>
                          </div>
                          <Badge variant={getSessionOccupancyVariant(bookedCount, session.capacity)}>
                            Записано: {bookedCount}/{session.capacity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {session.description ? (
                          <p
                            className="text-muted-foreground text-sm"
                            style={{
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 2,
                              overflow: "hidden",
                            }}
                          >
                            {session.description}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-3">
                          <SessionBookingButton
                            sessionId={session.id}
                            sessionTitle={session.title}
                            mode={buttonMode}
                            price={session.dropInPrice ? Number(session.dropInPrice) : undefined}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Пока нет доступных слотов</CardTitle>
              <CardDescription>
                В этом периоде тренер ещё не добавил групповые занятия.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
