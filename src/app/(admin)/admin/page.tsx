import { requireUser } from "@/features/auth/get-user";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminDashboard() {
  const user = await requireUser("admin");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Дашборд администратора</CardTitle>
        <CardDescription>
          Привет, {user.fullName}! Здесь будет панель администратора.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
