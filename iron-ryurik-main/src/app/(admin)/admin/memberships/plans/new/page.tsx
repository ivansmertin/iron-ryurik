import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MembershipPlanForm } from "@/features/memberships/components/membership-plan-form";

export default function NewMembershipPlanPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Новый план абонемента"
        description="Задайте количество занятий, срок и цену."
      />

      <Card>
        <CardHeader>
          <CardTitle>Параметры плана</CardTitle>
        </CardHeader>
        <CardContent>
          <MembershipPlanForm
            mode="create"
            defaultValues={{
              name: "",
              visits: 8,
              durationDays: 30,
              price: 0,
              isActive: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
