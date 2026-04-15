import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="mb-2 block" />
        <CardTitle>Восстановление пароля</CardTitle>
        <CardDescription>
          Укажите email, и мы отправим ссылку для создания нового пароля.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotPasswordForm />
        <p className="text-muted-foreground text-center text-sm">
          Вспомнили пароль?{" "}
          <Link href="/login" className="text-primary underline">
            Вернуться ко входу
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
