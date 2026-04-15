import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteMembershipPlanButton } from "@/features/memberships/components/delete-membership-plan-button";
import { MembershipPlanForm } from "@/features/memberships/components/membership-plan-form";
import { getMembershipPlanById } from "@/features/memberships/queries";

type MembershipPlanDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MembershipPlanDetailsPage({
  params,
}: MembershipPlanDetailsPageProps) {
  const { id } = await params;
  const plan = await getMembershipPlanById(id);

  if (!plan) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={plan.name}
        description="Измените настройки плана или отключите его."
        actions={
          plan._count.memberships === 0 ? (
            <DeleteMembershipPlanButton planId={plan.id} />
          ) : (
            <Button variant="outline" disabled>
              Удаление недоступно
            </Button>
          )
        }
      />

      {plan._count.memberships > 0 ? (
        <p className="text-muted-foreground text-sm">
          Этот план уже выдан клиентам, поэтому его можно только деактивировать.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Редактирование плана</CardTitle>
        </CardHeader>
        <CardContent>
          <MembershipPlanForm
            mode="edit"
            planId={plan.id}
            defaultValues={{
              name: plan.name,
              visits: plan.visits,
              durationDays: plan.durationDays,
              price: Number(plan.price),
              isActive: plan.isActive,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
