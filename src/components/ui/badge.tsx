import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-launcher-bg-active text-muted-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-launcher-border text-foreground",
        green:
          "border border-launcher-green/20 bg-launcher-green/15 text-launcher-green",
        blue: "border border-launcher-blue/20 bg-launcher-blue/15 text-launcher-blue",
        orange:
          "border border-launcher-orange/20 bg-launcher-orange/15 text-launcher-orange",
        purple:
          "border border-launcher-purple/20 bg-launcher-purple/15 text-launcher-purple",
        installed:
          "border border-launcher-green/20 bg-launcher-green/15 text-launcher-green font-bold",
        update:
          "border border-launcher-blue/20 bg-launcher-blue/15 text-launcher-blue font-bold",
        offline:
          "border border-yellow-500/20 bg-yellow-500/15 text-yellow-400",
        loader:
          "border-launcher-border/60 bg-launcher-bg-active text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
