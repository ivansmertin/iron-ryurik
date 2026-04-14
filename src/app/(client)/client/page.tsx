import { requireUser } from "@/features/auth/get-user";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ClientDashboard() {
  const user = await requireUser("client");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Дашборд клиента</CardTitle>
        <CardDescription>
          Привет, {user.fullName}! Добро пожаловать в Железный Рюрик.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
