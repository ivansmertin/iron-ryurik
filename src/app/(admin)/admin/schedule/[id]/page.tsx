import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { SessionStatusBadge } from "@/components/admin/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMoscowDateInputValue,
  getMoscowTimeInputValue,
} from "@/lib/datetime";
import { formatMoscowDateTime } from "@/lib/formatters";
import { CancelSessionButton } from "@/features/sessions/components/cancel-session-button";
import { ReturnFreeSlotButton } from "@/features/sessions/components/return-free-slot-button";
import { SessionForm } from "@/features/sessions/components/session-form";
import { getSessionById, listSessionTrainers } from "@/features/sessions/queries";

type SessionDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SessionDetailsPage({
  params,
}: SessionDetailsPageProps) {
  const { id } = await params;
  const [session, trainers] = await Promise.all([
    getSessionById(id),
    listSessionTrainers(),
  ]);

  if (!session) {
    notFound();
  }

  const activeBookingsCount = session.bookings.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={session.title || "Занятие без названия"}
        description={formatMoscowDateTime(session.startsAt)}
        actions={
          session.status === "scheduled" ? (
            <div className="flex flex-wrap gap-2">
              {session.origin === "manual" && session.startsAt > new Date() ? (
                <ReturnFreeSlotButton sessionId={session.id} />
              ) : null}
              <CancelSessionButton sessionId={session.id} buttonLabel="Отменить занятие" />
            </div>
          ) : null
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Редактирование сессии</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Активных записей: {activeBookingsCount}
            </p>
          </div>
          <SessionStatusBadge status={session.status} />
        </CardHeader>
        <CardContent>
          <SessionForm
            mode="edit"
            sessionId={session.id}
            defaultValues={{
              title: session.title ?? "",
              description: session.description ?? "",
              trainerId: session.trainerId ?? "",
              date: getMoscowDateInputValue(session.startsAt),
              startTime: getMoscowTimeInputValue(session.startsAt),
              durationMinutes: session.durationMinutes,
              capacity: session.capacity,
              cancellationDeadlineHours: session.cancellationDeadlineHours,
            }}
            updateOptions={{
              hasActiveBookings: activeBookingsCount > 0,
              isPastSession: session.startsAt < new Date(),
              currentStartsAt: session.startsAt,
              currentDurationMinutes: session.durationMinutes,
              currentCapacity: session.capacity,
            }}
            trainers={trainers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
