import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-background/70 ring-offset-background min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground/90 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
