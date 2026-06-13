import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-launcher-border bg-launcher-bg-card px-3 py-2 text-sm text-foreground transition-all duration-200 hover:border-launcher-border placeholder:text-muted-foreground/50 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus:border-launcher-green/60 focus:shadow-glow-sm focus:outline-none focus:ring-1 focus:ring-launcher-green/30 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
