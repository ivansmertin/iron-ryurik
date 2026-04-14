import { requireUser } from "@/features/auth/get-user";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function TrainerDashboard() {
  const user = await requireUser("trainer");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Дашборд тренера</CardTitle>
        <CardDescription>
          Привет, {user.fullName}! Здесь будет панель тренера.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
