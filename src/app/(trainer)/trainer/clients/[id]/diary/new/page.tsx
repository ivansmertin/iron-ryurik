import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/features/auth/get-user";
import { createTrainerClientWorkoutLog } from "@/features/workouts/actions";
import { WorkoutLogForm } from "@/features/workouts/components/workout-log-form";
import { canTrainerAccessClient, getExercises } from "@/features/workouts/queries";
import { getMoscowDateInputValue, getMoscowTimeInputValue } from "@/lib/datetime";

type TrainerClientNewWorkoutPageProps = {
  params: Promise<{ id: string }>;
};

function getDefaultDateTimeLocal() {
  const now = new Date();
  return `${getMoscowDateInputValue(now)}T${getMoscowTimeInputValue(now)}`;
}

export default async function TrainerClientNewWorkoutPage({
  params,
}: TrainerClientNewWorkoutPageProps) {
  const trainer = await requireUser("trainer");
  const { id } = await params;
  const hasAccess = await canTrainerAccessClient(trainer.id, id);
  if (!hasAccess) {
    notFound();
  }

  const exercises = await getExercises(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Новая запись для клиента"
        description="Заполните тренировку от имени клиента."
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
          <CardTitle>Параметры тренировки</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkoutLogForm
            mode="create"
            action={createTrainerClientWorkoutLog.bind(null, id)}
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
