import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionForm } from "@/features/sessions/components/session-form";

export default function NewSessionPage() {
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
              date: "",
              startTime: "",
              durationMinutes: 60,
              capacity: 8,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
