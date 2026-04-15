import Link from "next/link";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { BooleanBadge } from "@/components/admin/status-badges";
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
import { formatMoscowDate, formatSport } from "@/lib/formatters";
import { getSearchParamValue, parsePositivePage } from "@/lib/search-params";
import { ClientSearchForm } from "@/features/clients/components/client-search-form";
import { listClients } from "@/features/clients/queries";

const PAGE_SIZE = 20;

type ClientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = getSearchParamValue(resolvedSearchParams.q);
  const page = parsePositivePage(resolvedSearchParams.page);
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);
  const clients = await listClients({
    query,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title="Клиенты"
        description={`Всего клиентов: ${clients.total}`}
      />

      <ClientSearchForm initialQuery={query} />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Спорт</TableHead>
                <TableHead>Активный абонемент</TableHead>
                <TableHead>Дата регистрации</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.items.length ? (
                clients.items.map((client) => {
                  const activeMembership = client.memberships[0];

                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.fullName}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{formatSport(client.sport)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <BooleanBadge
                            value={Boolean(activeMembership)}
                            trueLabel="Есть"
                            falseLabel="Нет"
                          />
                          {activeMembership ? (
                            <span className="text-muted-foreground text-xs">
                              {activeMembership.plan.name}
                            </span>
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
                            render={<Link href={`/admin/clients/${client.id}`} />}
                          >
                            Открыть
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    Клиенты по этому запросу не найдены.
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
        pathname="/admin/clients"
        searchParams={{
          q: query || undefined,
        }}
      />
    </div>
  );
}
