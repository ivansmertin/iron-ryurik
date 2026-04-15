import { notFound } from "next/navigation";
import { AdminToastListener } from "@/components/admin/toast-listener";
import {
  BookingStatusBadge,
  MembershipStatusBadge,
} from "@/components/admin/status-badges";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMoscowDateInputValue } from "@/lib/datetime";
import {
  formatMoney,
  formatMoscowDate,
  formatMoscowDateTime,
  formatSport,
} from "@/lib/formatters";
import { getSearchParamValue } from "@/lib/search-params";
import { ClientNotesForm } from "@/features/clients/components/client-notes-form";
import {
  getClientBookingHistory,
  getClientMemberships,
  getClientProfile,
} from "@/features/clients/queries";
import { IssueMembershipDialog } from "@/features/memberships/components/issue-membership-dialog";
import { getActiveMembershipPlans } from "@/features/memberships/queries";

type ClientDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function isMembershipCurrent(status: string, endsAt: Date) {
  return status === "active" && endsAt >= new Date();
}

export default async function ClientDetailsPage({
  params,
  searchParams,
}: ClientDetailsPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);

  const client = await getClientProfile(id);

  if (!client) {
    notFound();
  }

  const [memberships, bookingHistory, activePlans] = await Promise.all([
    getClientMemberships(id),
    getClientBookingHistory(id),
    getActiveMembershipPlans(),
  ] as const);

  const sortedMemberships = [...memberships].sort((left, right) => {
    const leftIsCurrent = isMembershipCurrent(left.status, left.endsAt);
    const rightIsCurrent = isMembershipCurrent(right.status, right.endsAt);

    if (leftIsCurrent !== rightIsCurrent) {
      return Number(rightIsCurrent) - Number(leftIsCurrent);
    }

    return right.startsAt.getTime() - left.startsAt.getTime();
  });

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title={client.fullName}
        description={client.email}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>Основная информация о клиенте.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-sm">ФИО</dt>
                <dd className="mt-1 text-sm font-medium">{client.fullName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Email</dt>
                <dd className="mt-1 text-sm font-medium">{client.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Телефон</dt>
                <dd className="mt-1 text-sm font-medium">{client.phone || "—"}</dd>
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

            <ClientNotesForm clientId={client.id} defaultValue={client.notes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Абонементы</CardTitle>
              <CardDescription>История и текущие выдачи клиента.</CardDescription>
            </div>
            <IssueMembershipDialog
              clientId={client.id}
              plans={activePlans.map((plan) => ({
                ...plan,
                price: plan.price.toString(),
              }))}
              defaultStartDate={getMoscowDateInputValue(new Date())}
            />
          </CardHeader>
          <CardContent>
            {sortedMemberships.length ? (
              <div className="space-y-3">
                {sortedMemberships.map((membership) => (
                  <div key={membership.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{membership.plan.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {membership.visitsRemaining}/{membership.visitsTotal} занятий
                        </p>
                      </div>
                      <MembershipStatusBadge status={membership.status} />
                    </div>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <p>
                        Срок: {formatMoscowDate(membership.startsAt)} —{" "}
                        {formatMoscowDate(membership.endsAt)}
                      </p>
                      <p>Дата оплаты: {formatMoscowDate(membership.paidAt)}</p>
                      <p>Сумма: {formatMoney(membership.paidAmount?.toString())}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                У клиента пока нет выданных абонементов.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>История бронирований</CardTitle>
          <CardDescription>Последние 50 записей клиента.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата и время</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingHistory.length ? (
                bookingHistory.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{formatMoscowDateTime(booking.session.startsAt)}</TableCell>
                    <TableCell className="font-medium">
                      {booking.session.title || "Без названия"}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                    История бронирований пока пустая.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
