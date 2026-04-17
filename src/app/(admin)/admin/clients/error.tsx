"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClientsErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ClientsErrorPage({ error, reset }: ClientsErrorPageProps) {
  useEffect(() => {
    console.error("[admin-clients] route error", error);
  }, [error]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Не удалось загрузить список клиентов</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Попробуйте обновить данные. Если ошибка повторяется, проверьте состояние
          подключения к базе данных.
        </p>
        <Button type="button" onClick={reset}>
          Повторить
        </Button>
      </CardContent>
    </Card>
  );
}
