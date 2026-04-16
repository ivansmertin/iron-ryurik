"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineMessage } from "@/components/ui/inline-message";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/features/auth/actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    undefined,
  );

  useEffect(() => {
    if (state?.ok === false) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state?.ok === true ? (
        <InlineMessage tone="success" role="status">
          {state.message}
        </InlineMessage>
      ) : null}
      {state?.ok === false ? (
        <InlineMessage tone="error" role="alert">
          {state.error}
        </InlineMessage>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Отправляем..." : "Отправить письмо"}
      </Button>
    </form>
  );
}
