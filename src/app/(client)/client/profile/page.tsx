import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/features/auth/get-user";
import { ClientProfileForm } from "@/features/clients/components/client-profile-form";
import { formatMoscowDate, formatSport } from "@/lib/formatters";
import { PushSubscribeToggle } from "@/components/pwa/push-subscribe";

export default async function ClientProfilePage() {
  const user = await requireUser("client");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Профиль"
        description="Здесь можно обновить имя, телефон и предпочитаемый спорт."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Текущие данные</CardDescription>
            <CardTitle>{user.fullName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Email:</span> {user.email}
            </p>
            <p>
              <span className="text-muted-foreground">Телефон:</span>{" "}
              {user.phone || "Не указан"}
            </p>
            <p>
              <span className="text-muted-foreground">Спорт:</span>{" "}
              {formatSport(user.sport)}
            </p>
            <p>
              <span className="text-muted-foreground">Дата регистрации:</span>{" "}
              {formatMoscowDate(user.createdAt)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Редактирование</CardDescription>
            <CardTitle>Обновить профиль</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientProfileForm
              email={user.email}
              defaultValues={{
                fullName: user.fullName,
                phone: user.phone ?? "",
                sport: user.sport ?? "",
              }}
            />
          </CardContent>
        </Card>
      </div>

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
