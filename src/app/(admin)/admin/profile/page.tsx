import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/features/auth/get-user";
import { PushSubscribeToggle } from "@/components/pwa/push-subscribe";

export default async function AdminProfilePage() {
  const user = await requireUser("admin");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Профиль"
        description="Данные администратора"
      />

      <Card>
        <CardHeader>
          <CardTitle>Учетная запись</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">Имя</p>
            <p className="font-medium">{user.fullName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Уведомления</CardTitle>
          <CardDescription>Управление Push-уведомлениями</CardDescription>
        </CardHeader>
        <CardContent>
          <PushSubscribeToggle />
        </CardContent>
      </Card>
    </div>
  );
}
