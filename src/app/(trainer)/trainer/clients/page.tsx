import Link from "next/link";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { PageHeader } from "@/components/admin/page-header";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/features/auth/get-user";
import { ClientSearchForm } from "@/features/clients/components/client-search-form";
import { listTrainerClients } from "@/features/trainer/queries";
import { formatMoscowDate, formatSport } from "@/lib/formatters";
import { getSearchParamValue, parsePositivePage } from "@/lib/search-params";

const PAGE_SIZE = 20;

type TrainerClientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TrainerClientsPage({
  searchParams,
}: TrainerClientsPageProps) {
  const user = await requireUser("trainer");
  const resolvedSearchParams = await searchParams;
  const query = getSearchParamValue(resolvedSearchParams.q);
  const page = parsePositivePage(resolvedSearchParams.page);
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);

  const clients = await listTrainerClients({
    trainerId: user.id,
    page,
    pageSize: PAGE_SIZE,
    query,
  });

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title="Мои клиенты"
        description="Клиенты, закреплённые за вами через программы."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/trainer" />}>
            На главную
          </Button>
        }
      />

      <ClientSearchForm initialQuery={query} />

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {clients.items.length ? (
          clients.items.map((client) => {
            const program = client.programs[0];
            return (
              <Link key={client.id} href={`/trainer/clients/${client.id}`}>
                <Card className="border-border/70 shadow-sm transition-colors hover:bg-accent/40">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{client.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatSport(client.sport)}
                        </p>
                      </div>
                    </div>
                    {program ? (
                      <div className="text-sm">
                        <span className="font-medium">{program.name}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          {formatMoscowDate(program.startsAt)}
                          {program.endsAt ? ` — ${formatMoscowDate(program.endsAt)}` : ""}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Нет программы</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <Card className="border-border/70 shadow-sm">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {query
                ? "Клиенты по этому запросу не найдены."
                : "Пока нет клиентов, закреплённых за вами."}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden border-border/70 shadow-sm md:block">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Спорт</TableHead>
                <TableHead>Программа</TableHead>
                <TableHead>Дата регистрации</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.items.length ? (
                clients.items.map((client) => {
                  const program = client.programs[0];

                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.fullName}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{formatSport(client.sport)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{program?.name ?? "—"}</p>
                          {program ? (
                            <p className="text-muted-foreground text-xs">
                              {formatMoscowDate(program.startsAt)}
                              {program.endsAt
                                ? ` — ${formatMoscowDate(program.endsAt)}`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatMoscowDate(client.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={<Link href={`/trainer/clients/${client.id}`} />}
                          >
                            Карточка
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    {query
                      ? "Клиенты по этому запросу не найдены."
                      : "Пока нет клиентов, закреплённых за вами."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls
        page={page}
        totalPages={clients.totalPages}
        pathname="/trainer/clients"
        searchParams={{
          q: query || undefined,
        }}
      />
    </div>
  );
}
