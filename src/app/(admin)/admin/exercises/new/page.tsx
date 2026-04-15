import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createExercise } from "@/features/workouts/actions";
import { ExerciseForm } from "@/features/workouts/components/exercise-form";

export default function AdminNewExercisePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Новое упражнение"
        description="Добавьте упражнение в общий справочник."
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
            mode="create"
            action={createExercise}
            defaultValues={{
              name: "",
              category: "running_drills",
              equipment: "bodyweight",
              description: "",
              videoUrl: "",
              isActive: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
