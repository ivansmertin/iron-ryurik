import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoscowDateTime } from "@/lib/formatters";

type DiaryReminderItem = {
  id: string;
  performedAt: Date;
  session: {
    title: string | null;
  } | null;
};

export function DiaryReminderCard({ items }: { items: DiaryReminderItem[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>Есть тренировки без заметок</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2"
            >
              <div>
                <p className="font-medium">{item.session?.title ?? "Тренировка"}</p>
                <p className="text-muted-foreground text-sm">
                  {formatMoscowDateTime(item.performedAt)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={`/client/diary/${item.id}`} />}
              >
                Добавить заметки
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
