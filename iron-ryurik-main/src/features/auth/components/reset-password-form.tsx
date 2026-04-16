"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod/v4";
import { toast } from "sonner";
import { FieldError } from "@/components/admin/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineMessage } from "@/components/ui/inline-message";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/schemas";
import { updatePasswordWithClient } from "@/features/auth/password";

type ResetPasswordFormValues = z.input<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      passwordConfirm: "",
    },
  });

  const fieldError = <FieldName extends keyof ResetPasswordInput>(fieldName: FieldName) =>
    form.formState.errors[fieldName]?.message?.toString();

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const client = createClient();
        setSubmitting(true);
        setStatusMessage(null);

        try {
          const result = await updatePasswordWithClient(client, values.password);

          if (!result.ok) {
            setStatusMessage(result.error);
            toast.error(result.error);
            return;
          }

          await client.auth.signOut().catch(() => undefined);
          toast.success("Пароль изменён. Войдите снова.");
          router.replace("/login");
        } finally {
          setSubmitting(false);
        }
      })}
    >
      <div className="space-y-2">
        <Label htmlFor="password">Новый пароль</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(fieldError("password"))}
          {...form.register("password")}
        />
        <FieldError message={fieldError("password")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="passwordConfirm">Повторите пароль</Label>
        <Input
          id="passwordConfirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(fieldError("passwordConfirm"))}
          {...form.register("passwordConfirm")}
        />
        <FieldError message={fieldError("passwordConfirm")} />
      </div>

      {statusMessage ? (
        <InlineMessage tone="error" role="alert">
          {statusMessage}
        </InlineMessage>
      ) : null}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Сохраняем..." : "Сменить пароль"}
      </Button>
    </form>
  );
}
