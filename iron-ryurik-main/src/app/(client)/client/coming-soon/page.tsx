import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientComingSoonPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Скоро"
        description="Этот раздел появится позже."
      />
      <Card>
        <CardHeader>
          <CardTitle>Скоро здесь будет новый раздел</CardTitle>
          <CardDescription>Мы ещё работаем над этой частью интерфейса.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Сейчас этот экран служит заглушкой, чтобы навигация не вела в 404.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
