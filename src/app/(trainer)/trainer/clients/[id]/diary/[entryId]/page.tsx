import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/features/auth/get-user";
import { updateTrainerClientWorkoutLog } from "@/features/workouts/actions";
import { WorkoutLogForm } from "@/features/workouts/components/workout-log-form";
import { getTrainerClientWorkoutLogById, listExercises } from "@/features/workouts/queries";
import { getMoscowDateInputValue, getMoscowTimeInputValue } from "@/lib/datetime";
import { formatMoscowDateTime } from "@/lib/formatters";

type TrainerClientWorkoutDetailsPageProps = {
  params: Promise<{ id: string; entryId: string }>;
};

function toDateTimeLocalValue(value: Date) {
  return `${getMoscowDateInputValue(value)}T${getMoscowTimeInputValue(value)}`;
}

export default async function TrainerClientWorkoutDetailsPage({
  params,
}: TrainerClientWorkoutDetailsPageProps) {
  const trainer = await requireUser("trainer");
  const { id, entryId } = await params;

  const [workoutLog, exercises] = await Promise.all([
    getTrainerClientWorkoutLogById(trainer.id, id, entryId),
    listExercises(),
  ]);

  if (!workoutLog) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Тренировка клиента"
        description={formatMoscowDateTime(workoutLog.performedAt)}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/trainer/clients/${id}/diary`} />}
          >
            К дневнику
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Редактирование записи</CardTitle>
          <CardDescription>
            Обновите параметры тренировки и состав упражнений.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkoutLogForm
            mode="edit"
            action={updateTrainerClientWorkoutLog.bind(null, id, workoutLog.id)}
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
