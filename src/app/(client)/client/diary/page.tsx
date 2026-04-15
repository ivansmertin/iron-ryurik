import Link from "next/link";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { PageHeader } from "@/components/admin/page-header";
import { TabLinks } from "@/components/admin/tab-links";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/features/auth/get-user";
import { WorkoutLogList } from "@/features/workouts/components/workout-log-list";
import { diaryTabs, type DiaryTab, listClientWorkoutLogs } from "@/features/workouts/queries";
import { getSearchParamValue } from "@/lib/search-params";

type ClientDiaryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getTabFromSearchParam(value: string): DiaryTab {
  if (diaryTabs.includes(value as DiaryTab)) {
    return value as DiaryTab;
  }

  return "week";
}

function getTabHref(tab: DiaryTab) {
  return tab === "week" ? "/client/diary" : `/client/diary?tab=${tab}`;
}

export default async function ClientDiaryPage({ searchParams }: ClientDiaryPageProps) {
  const user = await requireUser("client");
  const resolvedSearchParams = await searchParams;
  const tab = getTabFromSearchParam(getSearchParamValue(resolvedSearchParams.tab));
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);

  const logs = await listClientWorkoutLogs(user.id, tab);

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title="Дневник тренировок"
        description="Фиксируйте тренировки, нагрузку и прогресс по неделям."
        actions={
          <Button nativeButton={false} render={<Link href="/client/diary/new" />}>
            Добавить тренировку
          </Button>
        }
      />

      <TabLinks
        items={diaryTabs.map((item) => ({
          href: getTabHref(item),
          label: item === "week" ? "Неделя" : item === "month" ? "Месяц" : "Все",
          isActive: tab === item,
        }))}
      />

      <WorkoutLogList
        items={logs}
        basePath="/client/diary"
        emptyTitle="Пока нет тренировок"
        emptyDescription="Добавьте первую запись, чтобы начать вести дневник."
      />
    </div>
  );
}
