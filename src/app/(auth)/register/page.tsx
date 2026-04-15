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
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
    <Card className="w-full max-w-sm border-border/70 shadow-sm">
      <CardHeader className="text-center">
        <Logo className="mb-2 block" />
        <CardTitle>Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
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
            <Select id="sport" name="sport">
              {SPORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
            <Checkbox
              id="acceptRules"
              name="acceptRules"
              required
            />
            <Label htmlFor="acceptRules" className="text-sm font-normal">
              Согласен с правилами зала
            </Label>
          </div>
          {state?.error ? (
            <InlineMessage tone="error" role="alert">
              {state.error}
            </InlineMessage>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Регистрация..." : "Зарегистрироваться"}
          </Button>
        </form>
        <p className="text-muted-foreground mt-5 text-center text-sm">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-primary underline">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
