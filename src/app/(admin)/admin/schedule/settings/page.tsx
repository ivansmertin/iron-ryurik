import Link from "next/link";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GymScheduleSettingsForm } from "@/features/gym-schedule/components/gym-schedule-settings-form";
import { getGymScheduleSettings } from "@/features/gym-schedule/service";
import { getSearchParamValue } from "@/lib/search-params";

type ScheduleSettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ScheduleSettingsPage({
  searchParams,
}: ScheduleSettingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);
  const { settings, workingHours } = await getGymScheduleSettings();

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title="Рабочее время зала"
        description="Настройки, по которым автоматически создаются свободные тренировки."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/schedule" />}>
            К расписанию
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Недельный шаблон</CardTitle>
        </CardHeader>
        <CardContent>
          <GymScheduleSettingsForm
            freeSlotCapacity={settings.freeSlotCapacity}
            workingHours={workingHours}
          />
        </CardContent>
      </Card>
    </div>
  );
}
