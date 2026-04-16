import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type InlineMessageProps = {
  tone?: "error" | "success" | "muted";
  className?: string;
  children: string;
} & Omit<ComponentProps<"p">, "children" | "className">;

const toneClassName: Record<NonNullable<InlineMessageProps["tone"]>, string> = {
  error: "text-destructive",
  success: "text-emerald-600 dark:text-emerald-400",
  muted: "text-muted-foreground",
};

export function InlineMessage({
  tone = "muted",
  className,
  children,
  ...props
}: InlineMessageProps) {
  return (
    <p className={cn("text-sm", toneClassName[tone], className)} {...props}>
      {children}
    </p>
  );
}
