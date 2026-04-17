import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoscowDateTime } from "@/lib/formatters";

type WorkoutLogListItem = {
  id: string;
  performedAt: Date;
  durationMin: number | null;
  rpe: number | null;
  notes: string | null;
  session: {
    title: string | null;
  } | null;
  exercises: Array<{ id: string }>;
};

type WorkoutLogListProps = {
  items: WorkoutLogListItem[];
  basePath: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function WorkoutLogList({
  items,
  basePath,
  emptyTitle,
  emptyDescription,
}: WorkoutLogListProps) {
  if (!items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{emptyTitle}</CardTitle>
          <CardDescription>{emptyDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardDescription>{formatMoscowDateTime(item.performedAt)}</CardDescription>
              <CardTitle>{item.session?.title ?? "Тренировка"}</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`${basePath}/${item.id}`} />}
            >
              Открыть
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {item.durationMin ? `Длительность: ${item.durationMin} мин` : "Длительность не указана"}
              {item.rpe ? ` • RPE: ${item.rpe}` : ""}
            </p>
            <p className="text-muted-foreground">
              Упражнений: {item.exercises.length}
            </p>
            {item.notes ? (
              <p className="line-clamp-3 whitespace-pre-wrap">{item.notes}</p>
            ) : item.session ? (
              <p className="text-muted-foreground">Заметки пока не заполнены</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
