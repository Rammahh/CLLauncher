import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full resize-none rounded-md border border-launcher-border bg-launcher-bg-card px-3 py-2 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-launcher-green/60 focus:shadow-glow-sm focus:outline-none focus:ring-1 focus:ring-launcher-green/30 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
