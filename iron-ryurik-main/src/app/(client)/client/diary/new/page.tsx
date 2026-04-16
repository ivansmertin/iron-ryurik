import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/features/auth/get-user";
import { createClientWorkoutLog } from "@/features/workouts/actions";
import { WorkoutLogForm } from "@/features/workouts/components/workout-log-form";
import { listExercises } from "@/features/workouts/queries";
import { getMoscowDateInputValue, getMoscowTimeInputValue } from "@/lib/datetime";

function getDefaultDateTimeLocal() {
  const now = new Date();
  return `${getMoscowDateInputValue(now)}T${getMoscowTimeInputValue(now)}`;
}

export default async function ClientNewWorkoutPage() {
  await requireUser("client");
  const exercises = await listExercises();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Новая тренировка"
        description="Добавьте запись в дневник тренировок."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/client/diary" />}>
            К дневнику
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Параметры тренировки</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkoutLogForm
            mode="create"
            action={createClientWorkoutLog}
            exercises={exercises.map((exercise) => ({
              id: exercise.id,
              name: exercise.name,
            }))}
            defaultValues={{
              performedAt: getDefaultDateTimeLocal(),
              durationMin: 60,
              rpe: 5,
              notes: "",
              exerciseIds: [],
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
