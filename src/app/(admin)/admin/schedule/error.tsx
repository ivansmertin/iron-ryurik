"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ScheduleErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ScheduleErrorPage({ error, reset }: ScheduleErrorPageProps) {
  useEffect(() => {
    console.error("[admin-schedule] route error", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Не удалось открыть расписание</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Мы не смогли загрузить данные расписания. Проверьте подключение к базе и
            применённые миграции, затем попробуйте снова.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reset}>
              Повторить
            </Button>
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href="/admin/schedule/settings" />}
            >
              Настройки расписания
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
