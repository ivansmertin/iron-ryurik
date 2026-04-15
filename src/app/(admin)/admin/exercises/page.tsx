import Link from "next/link";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { BooleanBadge } from "@/components/admin/status-badges";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteExerciseButton } from "@/features/workouts/components/delete-exercise-button";
import { listExercises } from "@/features/workouts/queries";
import { getSearchParamValue } from "@/lib/search-params";

type AdminExercisesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminExercisesPage({
  searchParams,
}: AdminExercisesPageProps) {
  const resolvedSearchParams = await searchParams;
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);
  const exercises = await listExercises({ includeInactive: true });

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title="Справочник упражнений"
        description="Каталог упражнений для дневника тренировок."
        actions={
          <Button nativeButton={false} render={<Link href="/admin/exercises/new" />}>
            Добавить упражнение
          </Button>
        }
      />

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {exercises.length ? (
          exercises.map((exercise) => (
            <Card
              key={exercise.id}
              className={`border-border/70 shadow-sm ${!exercise.isActive ? "opacity-60" : ""}`}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{exercise.name}</p>
                  <BooleanBadge
                    value={exercise.isActive}
                    trueLabel="Активно"
                    falseLabel="Неактивно"
                  />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{exercise.category}</span>
                  <span>{exercise.equipment}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/admin/exercises/${exercise.id}`} />}
                  >
                    Редактировать
                  </Button>
                  <DeleteExerciseButton exerciseId={exercise.id} />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border/70 shadow-sm">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Справочник пока пуст.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden border-border/70 shadow-sm md:block">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Оборудование</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exercises.length ? (
                exercises.map((exercise) => (
                  <TableRow
                    key={exercise.id}
                    className={!exercise.isActive ? "opacity-60" : undefined}
                  >
                    <TableCell className="font-medium">{exercise.name}</TableCell>
                    <TableCell>{exercise.category}</TableCell>
                    <TableCell>{exercise.equipment}</TableCell>
                    <TableCell>
                      <BooleanBadge
                        value={exercise.isActive}
                        trueLabel="Активно"
                        falseLabel="Неактивно"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/admin/exercises/${exercise.id}`} />}
                        >
                          Редактировать
                        </Button>
                        <DeleteExerciseButton exerciseId={exercise.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    Справочник пока пуст.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
