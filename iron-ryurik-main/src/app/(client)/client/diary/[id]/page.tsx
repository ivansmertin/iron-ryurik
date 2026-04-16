import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/features/auth/get-user";
import { updateClientWorkoutLog } from "@/features/workouts/actions";
import { WorkoutLogForm } from "@/features/workouts/components/workout-log-form";
import { getClientWorkoutLogById, listExercises } from "@/features/workouts/queries";
import { getMoscowDateInputValue, getMoscowTimeInputValue } from "@/lib/datetime";
import { formatMoscowDateTime } from "@/lib/formatters";

type ClientWorkoutDetailsPageProps = {
  params: Promise<{ id: string }>;
};

function toDateTimeLocalValue(value: Date) {
  return `${getMoscowDateInputValue(value)}T${getMoscowTimeInputValue(value)}`;
}

export default async function ClientWorkoutDetailsPage({
  params,
}: ClientWorkoutDetailsPageProps) {
  const user = await requireUser("client");
  const { id } = await params;

  const [workoutLog, exercises] = await Promise.all([
    getClientWorkoutLogById(user.id, id),
    listExercises(),
  ]);

  if (!workoutLog) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Тренировка"
        description={formatMoscowDateTime(workoutLog.performedAt)}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/client/diary" />}>
            К дневнику
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Редактирование</CardTitle>
          <CardDescription>
            Вы можете обновить параметры тренировки и состав упражнений.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkoutLogForm
            mode="edit"
            action={updateClientWorkoutLog.bind(null, workoutLog.id)}
            exercises={exercises.map((exercise) => ({
              id: exercise.id,
              name: exercise.name,
            }))}
            defaultValues={{
              performedAt: toDateTimeLocalValue(workoutLog.performedAt),
              durationMin: workoutLog.durationMin ?? undefined,
              rpe: workoutLog.rpe ?? undefined,
              notes: workoutLog.notes ?? "",
              exerciseIds: workoutLog.exercises.map((exerciseLog) => exerciseLog.exercise.id),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
