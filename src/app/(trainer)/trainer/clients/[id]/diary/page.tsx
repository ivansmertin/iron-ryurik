import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { PageHeader } from "@/components/admin/page-header";
import { TabLinks } from "@/components/admin/tab-links";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/features/auth/get-user";
import { WorkoutLogList } from "@/features/workouts/components/workout-log-list";
import {
  diaryTabs,
  type DiaryTab,
  listTrainerClientWorkoutLogs,
} from "@/features/workouts/queries";
import { getSearchParamValue } from "@/lib/search-params";

type TrainerClientDiaryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getTabFromSearchParam(value: string): DiaryTab {
  if (diaryTabs.includes(value as DiaryTab)) {
    return value as DiaryTab;
  }

  return "week";
}

function getTabHref(clientId: string, tab: DiaryTab) {
  const basePath = `/trainer/clients/${clientId}/diary`;
  return tab === "week" ? basePath : `${basePath}?tab=${tab}`;
}

export default async function TrainerClientDiaryPage({
  params,
  searchParams,
}: TrainerClientDiaryPageProps) {
  const trainer = await requireUser("trainer");
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const tab = getTabFromSearchParam(getSearchParamValue(resolvedSearchParams.tab));
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);

  const logs = await listTrainerClientWorkoutLogs(trainer.id, id, tab);
  if (!logs) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title="Дневник клиента"
        description="Тренировки клиента в выбранном периоде."
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/trainer/clients/${id}`} />}
            >
              Карточка клиента
            </Button>
            <Button
              nativeButton={false}
              render={<Link href={`/trainer/clients/${id}/diary/new`} />}
            >
              Добавить запись
            </Button>
          </>
        }
      />

      <TabLinks
        items={diaryTabs.map((item) => ({
          href: getTabHref(id, item),
          label: item === "week" ? "Неделя" : item === "month" ? "Месяц" : "Все",
          isActive: tab === item,
        }))}
      />

      <WorkoutLogList
        items={logs}
        basePath={`/trainer/clients/${id}/diary`}
        emptyTitle="Тренировок пока нет"
        emptyDescription="Добавьте запись за клиента или попросите клиента заполнить дневник."
      />
    </div>
  );
}
