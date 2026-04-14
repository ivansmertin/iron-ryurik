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
import { Label } from "@/components/ui/label";
import { signUp } from "@/features/auth/actions";

const SPORT_OPTIONS = [
  { value: "", label: "Не выбран" },
  { value: "running", label: "Бег" },
  { value: "trail", label: "Трейл" },
  { value: "triathlon", label: "Триатлон" },
  { value: "skiing", label: "Лыжи" },
  { value: "other", label: "Другое" },
] as const;

export default function RegisterPage() {
  const [state, action, pending] = useActionState(signUp, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="mb-2 block" />
        <CardTitle>Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Имя и фамилия</Label>
            <Input id="fullName" name="fullName" required minLength={2} />
          </div>
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
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">Повторите пароль</Label>
            <Input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sport">Вид спорта</Label>
            <select
              id="sport"
              name="sport"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {SPORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="acceptRules"
              name="acceptRules"
              required
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="acceptRules" className="text-sm font-normal">
              Согласен с правилами зала
            </Label>
          </div>
          {state?.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Регистрация..." : "Зарегистрироваться"}
          </Button>
        </form>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-primary underline">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
