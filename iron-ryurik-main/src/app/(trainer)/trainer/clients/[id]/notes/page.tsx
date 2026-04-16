import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/features/auth/get-user";
import { TrainerClientNotesForm } from "@/features/trainer/components/trainer-client-notes-form";
import { getTrainerClientById } from "@/features/trainer/queries";
import { formatMoscowDate, formatSport } from "@/lib/formatters";
import { getSearchParamValue } from "@/lib/search-params";

type TrainerClientNotesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TrainerClientNotesPage({
  params,
  searchParams,
}: TrainerClientNotesPageProps) {
  const user = await requireUser("trainer");
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);

  const client = await getTrainerClientById(user.id, id);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title={`Заметки: ${client.fullName}`}
        description="Просмотр и редактирование заметок по клиенту."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/trainer/clients/${client.id}`} />}
          >
            К карточке
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardDescription>Клиент</CardDescription>
            <CardTitle>{client.fullName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Email:</span> {client.email}
            </p>
            <p>
              <span className="text-muted-foreground">Телефон:</span>{" "}
              {client.phone || "Не указан"}
            </p>
            <p>
              <span className="text-muted-foreground">Спорт:</span> {formatSport(client.sport)}
            </p>
            <p>
              <span className="text-muted-foreground">Дата регистрации:</span>{" "}
              {formatMoscowDate(client.createdAt)}
            </p>
            <div className="space-y-2 pt-2">
              <p className="text-muted-foreground text-sm">Текущая заметка</p>
              <div className="whitespace-pre-wrap rounded-xl border bg-muted/20 p-4">
                {client.notes?.trim() ? client.notes : "Пока нет заметки."}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Редактирование</CardDescription>
            <CardTitle>Заметка тренера</CardTitle>
          </CardHeader>
          <CardContent>
            <TrainerClientNotesForm clientId={client.id} defaultValue={client.notes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
