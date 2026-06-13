import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-launcher-green text-white shadow-sm hover:bg-launcher-green-dark hover:shadow-glow",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-glow-sm",
        outline:
          "border border-launcher-border bg-transparent hover:border-launcher-border hover:bg-launcher-bg-hover hover:text-foreground",
        secondary:
          "border border-launcher-border bg-launcher-bg-card text-foreground shadow-sm hover:bg-launcher-bg-hover",
        ghost:
          "hover:bg-launcher-bg-hover hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        install:
          "bg-launcher-green text-white font-semibold shadow-md hover:bg-launcher-green-dark hover:shadow-glow",
        update:
          "bg-launcher-blue text-white font-semibold shadow-md hover:bg-launcher-blue-dark hover:shadow-glow-sm",
        repair:
          "bg-launcher-orange text-white font-semibold shadow-md hover:bg-amber-600",
        danger:
          "bg-launcher-red text-white font-semibold shadow-md hover:bg-red-700 hover:shadow-glow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        xl: "h-12 rounded-lg px-10 text-base font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
