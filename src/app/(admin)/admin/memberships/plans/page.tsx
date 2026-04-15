import Link from "next/link";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { BooleanBadge } from "@/components/admin/status-badges";
import { PageHeader } from "@/components/admin/page-header";
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
import { formatMoney } from "@/lib/formatters";
import { getSearchParamValue } from "@/lib/search-params";
import { DeleteMembershipPlanButton } from "@/features/memberships/components/delete-membership-plan-button";
import { listMembershipPlans } from "@/features/memberships/queries";

type MembershipPlansPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MembershipPlansPage({
  searchParams,
}: MembershipPlansPageProps) {
  const resolvedSearchParams = await searchParams;
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);
  const plans = await listMembershipPlans();

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title="Планы абонементов"
        description="Создавайте, редактируйте и отключайте планы."
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/admin/memberships/plans/new" />}
          >
            Создать план
          </Button>
        }
      />

      <Card className="border-border/70 shadow-sm">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Занятия</TableHead>
                <TableHead>Срок</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length ? (
                plans.map((plan) => (
                  <TableRow key={plan.id} className={!plan.isActive ? "opacity-60" : undefined}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{plan.visits}</TableCell>
                    <TableCell>{plan.durationDays} дн.</TableCell>
                    <TableCell>{formatMoney(plan.price.toString())}</TableCell>
                    <TableCell>
                      <BooleanBadge
                        value={plan.isActive}
                        trueLabel="Активен"
                        falseLabel="Неактивен"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/admin/memberships/plans/${plan.id}`} />}
                        >
                          Редактировать
                        </Button>
                        {plan._count.memberships === 0 ? (
                          <DeleteMembershipPlanButton planId={plan.id} />
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            Есть выдачи
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    Пока нет ни одного плана абонемента.
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
