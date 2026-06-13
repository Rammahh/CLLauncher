import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string;
    /** When true, shows an animated indeterminate sweep instead of a value. */
    indeterminate?: boolean;
  }
>(({ className, value, indicatorClassName, indeterminate = false, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    value={indeterminate ? undefined : value}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-launcher-bg-active",
      className
    )}
    {...props}
  >
    {indeterminate ? (
      <ProgressPrimitive.Indicator
        className={cn(
          "absolute inset-y-0 left-0 w-1/3 rounded-full bg-accent-gradient shadow-glow-sm animate-indeterminate",
          indicatorClassName
        )}
      />
    ) : (
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full bg-accent-gradient transition-transform duration-300 ease-out",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    )}
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
