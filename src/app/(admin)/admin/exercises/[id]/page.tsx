import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateExercise } from "@/features/workouts/actions";
import { ExerciseForm } from "@/features/workouts/components/exercise-form";
import { getExerciseById } from "@/features/workouts/queries";

type AdminExerciseDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminExerciseDetailsPage({
  params,
}: AdminExerciseDetailsPageProps) {
  const { id } = await params;
  const exercise = await getExerciseById(id);

  if (!exercise) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={exercise.name}
        description="Редактирование упражнения."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/exercises" />}>
            К справочнику
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Параметры упражнения</CardTitle>
        </CardHeader>
        <CardContent>
          <ExerciseForm
            mode="edit"
            action={updateExercise.bind(null, exercise.id)}
            defaultValues={{
              name: exercise.name,
              category: exercise.category,
              equipment: exercise.equipment,
              description: exercise.description ?? "",
              videoUrl: exercise.videoUrl ?? "",
              isActive: exercise.isActive,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
