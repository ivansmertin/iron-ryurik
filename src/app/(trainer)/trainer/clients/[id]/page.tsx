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
import { getTrainerClientById } from "@/features/trainer/queries";
import { formatMoscowDate, formatSport } from "@/lib/formatters";
import { getSearchParamValue } from "@/lib/search-params";

type TrainerClientDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TrainerClientDetailsPage({
  params,
  searchParams,
}: TrainerClientDetailsPageProps) {
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
        title={client.fullName}
        description={client.email}
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/trainer/clients" />}
            >
              К списку
            </Button>
            <Button
              nativeButton={false}
              render={<Link href={`/trainer/clients/${client.id}/notes`} />}
            >
              Заметки
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/trainer/clients/${client.id}/diary`} />}
            >
              Дневник
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Профиль клиента</CardDescription>
            <CardTitle>{client.fullName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-sm">Email</dt>
                <dd className="mt-1 text-sm font-medium">{client.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Телефон</dt>
                <dd className="mt-1 text-sm font-medium">{client.phone || "Не указан"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Спорт</dt>
                <dd className="mt-1 text-sm font-medium">{formatSport(client.sport)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Дата регистрации</dt>
                <dd className="mt-1 text-sm font-medium">
                  {formatMoscowDate(client.createdAt)}
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">Текущая заметка</p>
              <div className="whitespace-pre-wrap rounded-xl border bg-muted/20 p-4 text-sm">
                {client.notes?.trim() ? client.notes : "Пока нет заметки."}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardDescription>Связанные программы</CardDescription>
              <CardTitle>История работы</CardTitle>
            </div>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/trainer/clients/${client.id}/notes`} />}
            >
              Редактировать заметку
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.programs.length ? (
              client.programs.map((program) => (
                <div key={program.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{program.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {formatMoscowDate(program.startsAt)}
                        {program.endsAt ? ` — ${formatMoscowDate(program.endsAt)}` : ""}
                      </p>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {program.template ? program.template.name : "Без шаблона"}
                    </p>
                  </div>
                  {program.notes ? (
                    <p className="text-muted-foreground mt-3 whitespace-pre-wrap text-sm">
                      {program.notes}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                Для этого клиента пока нет программ.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
