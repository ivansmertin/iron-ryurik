import * as React from "react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        data-slot="checkbox"
        className={cn(
          "accent-foreground h-4 w-4 rounded border border-input bg-background transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
)

Checkbox.displayName = "Checkbox"

export { Checkbox };
