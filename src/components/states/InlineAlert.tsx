import * as React from "react";
import { type LucideIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATE_VARIANT_STYLES, type StateVariant } from "./StateBanner";

export interface InlineAlertProps {
  variant?: StateVariant;
  /** Lucide icon. Ignored when variant="loading" (uses a spinner). */
  icon?: LucideIcon;
  /** Short message. Use `title` + `children` for a richer block. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Lightweight inline alert for embedding inside cards, forms, and dialogs.
 * Smaller and quieter than {@link StateBanner}; share the same variant tokens.
 */
export function InlineAlert({
  variant = "info",
  icon: Icon,
  title,
  children,
  className,
}: InlineAlertProps) {
  const styles = STATE_VARIANT_STYLES[variant];
  const isLoading = variant === "loading";

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
        styles.surface,
        className
      )}
    >
      <span className={cn("mt-0.5 shrink-0", styles.accent)}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : Icon ? (
          <Icon className="h-4 w-4" strokeWidth={2} />
        ) : (
          <span className={cn("mt-1 block h-2 w-2 rounded-full", styles.dot)} />
        )}
      </span>
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        {title && (
          <p className="font-semibold text-foreground">{title}</p>
        )}
        {children && (
          <div className={cn("text-muted-foreground", title && "mt-0.5")}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
