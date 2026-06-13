import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-launcher-bg-active",
        "after:absolute after:inset-0 after:bg-shimmer after:bg-[length:400%_100%] after:animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
