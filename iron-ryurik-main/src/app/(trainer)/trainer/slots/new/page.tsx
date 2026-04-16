import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrainerSlotForm } from "@/features/trainer/components/trainer-slot-form";
import { getMoscowDateInputValue } from "@/lib/datetime";

export default function NewTrainerSlotPage() {
  const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Новый слот"
        description="Создайте личный слот тренера."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/trainer/slots" />}>
            К слотам
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Параметры слота</CardTitle>
        </CardHeader>
        <CardContent>
          <TrainerSlotForm
            mode="create"
            defaultValues={{
              title: "",
              description: "",
              date: getMoscowDateInputValue(tomorrow),
              startTime: "09:00",
              durationMinutes: 60,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
