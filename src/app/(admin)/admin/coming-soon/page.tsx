import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminComingSoonPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Скоро"
        description="Этот раздел появится позже."
      />

      <Card>
        <CardHeader>
          <CardTitle>Раздел в работе</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Пока здесь только заглушка. Вернёмся к этому экрану в следующих спринтах.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
