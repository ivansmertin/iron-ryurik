import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionForm } from "@/features/sessions/components/session-form";
import { listSessionTrainers } from "@/features/sessions/queries";

export default async function NewSessionPage() {
  const trainers = await listSessionTrainers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Новая сессия"
        description="Создайте групповое занятие для расписания."
      />

      <Card>
        <CardHeader>
          <CardTitle>Параметры занятия</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionForm
            mode="create"
            defaultValues={{
              title: "",
              description: "",
              trainerId: "",
              date: "",
              startTime: "",
              durationMinutes: 60,
              capacity: 8,
              cancellationDeadlineHours: 2,
              dropInEnabled: false,
              dropInPrice: undefined,
            }}
            trainers={trainers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
