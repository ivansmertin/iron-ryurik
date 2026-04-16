import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="mb-2 block" />
        <CardTitle>Новый пароль</CardTitle>
        <CardDescription>
          Задайте новый пароль для входа в аккаунт.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResetPasswordForm />
        <p className="text-muted-foreground text-center text-sm">
          Нужна новая ссылка?{" "}
          <Link href="/forgot-password" className="text-primary underline">
            Запросить письмо ещё раз
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
