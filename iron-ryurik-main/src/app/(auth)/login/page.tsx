"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineMessage } from "@/components/ui/inline-message";
import { Label } from "@/components/ui/label";
import { signIn } from "@/features/auth/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Card className="w-full max-w-sm border-border/70 shadow-sm">
      <CardHeader className="text-center">
        <Logo className="mb-2 block" />
        <CardTitle>Вход</CardTitle>
        <CardDescription>Введите данные для входа</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {state?.error ? (
            <InlineMessage tone="error" role="alert">
              {state.error}
            </InlineMessage>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Входим..." : "Войти"}
          </Button>
        </form>
        <p className="text-muted-foreground mt-5 text-center text-sm">
          <Link href="/forgot-password" className="text-primary underline">
            Забыли пароль?
          </Link>
        </p>
        <p className="text-muted-foreground mt-3 text-center text-sm">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-primary underline">
            Зарегистрироваться
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
