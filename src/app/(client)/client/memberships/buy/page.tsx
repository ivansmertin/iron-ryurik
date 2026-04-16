import Link from "next/link";
import { requireUser } from "@/features/auth/get-user";
import { getActiveMembershipPlans } from "@/features/memberships/queries";
import { getClientDashboardData } from "@/features/bookings/queries";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PurchaseMembershipButton } from "@/features/memberships/components/purchase-membership-button";

export default async function ClientBuyMembershipPage() {
  const user = await requireUser("client");
  
  // We can fetch existing membership to warn them or disable purchase if they already have one,
  // but for simplicity, we allow standard purchase flow or just show a warning.
  const now = new Date();
  const dashboardData = await getClientDashboardData(user.id, now).catch(() => null);
  
  const hasActiveMembership = !!dashboardData?.activeMembership;

  const plans = await getActiveMembershipPlans();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Оформить абонемент"
        description="Выберите абонемент и отправьте заявку. Мы создадим неоплаченный абонемент, а оплату подтвердит администратор или зал."
      />

      {hasActiveMembership && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-500">Внимание</CardTitle>
            <CardDescription className="text-amber-700/80 dark:text-amber-500/80">
              У вас уже есть активный абонемент. Новый абонемент начнет действовать с сегодняшнего дня.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.length === 0 ? (
          <div className="col-span-full">
            <p className="text-muted-foreground text-sm">
              В данный момент нет доступных абонементов для оформления заявки.
            </p>
          </div>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  Действует {plan.durationDays} дней
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end space-y-4">
                <div>
                  <p className="font-medium text-lg">
                    {plan.visits} занятий
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {plan.price.toString()} ₽
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Оплата подтверждается администратором или в зале.
                  </p>
                </div>
                <PurchaseMembershipButton
                  planId={plan.id}
                  price={plan.price.toString()}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div>
        <Button variant="outline" nativeButton={false} render={<Link href="/client" />}>
          Назад в кабинет
        </Button>
      </div>
    </div>
  );
}
