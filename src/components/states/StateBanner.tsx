import * as React from "react";
import { type LucideIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StateVariant =
  | "info"
  | "warning"
  | "error"
  | "success"
  | "loading";

/** Visual tokens for each variant. Consumed by both the banner and the
 *  ready-made state configs so colors stay consistent everywhere. */
export const STATE_VARIANT_STYLES: Record<
  StateVariant,
  {
    /** Accent text/icon color class. */
    accent: string;
    /** Soft tinted icon chip background. */
    chip: string;
    /** Subtle surface tint + border for the banner shell. */
    surface: string;
    /** Tiny status-dot color class. */
    dot: string;
  }
> = {
  info: {
    accent: "text-launcher-blue",
    chip: "bg-launcher-blue/15 text-launcher-blue",
    surface: "border-launcher-blue/25 bg-launcher-blue/[0.06]",
    dot: "bg-launcher-blue",
  },
  warning: {
    accent: "text-launcher-orange",
    chip: "bg-launcher-orange/15 text-launcher-orange",
    surface: "border-launcher-orange/25 bg-launcher-orange/[0.06]",
    dot: "bg-launcher-orange",
  },
  error: {
    accent: "text-launcher-red",
    chip: "bg-launcher-red/15 text-launcher-red",
    surface: "border-launcher-red/25 bg-launcher-red/[0.06]",
    dot: "bg-launcher-red",
  },
  success: {
    accent: "text-launcher-green",
    chip: "bg-launcher-green/15 text-launcher-green",
    surface: "border-launcher-green/25 bg-launcher-green/[0.06]",
    dot: "bg-launcher-green",
  },
  loading: {
    accent: "text-launcher-blue",
    chip: "bg-launcher-blue/15 text-launcher-blue",
    surface: "border-launcher-border bg-launcher-bg-card",
    dot: "bg-launcher-blue",
  },
};

export interface StateBannerProps {
  variant?: StateVariant;
  /** Lucide icon. Ignored when variant="loading" (uses a spinner). */
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Optional trailing action (button, link, etc.). */
  action?: React.ReactNode;
  /** Render compactly for tight contexts (no description block padding). */
  compact?: boolean;
  className?: string;
}

/**
 * Reusable presentational status banner. Horizontal layout with a tinted
 * icon chip, title/description, and an optional trailing action. Purely
 * presentational — wire data/handlers from the call site.
 */
export function StateBanner({
  variant = "info",
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: StateBannerProps) {
  const styles = STATE_VARIANT_STYLES[variant];
  const isLoading = variant === "loading";

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3.5 rounded-xl border px-4 shadow-card animate-fade-up",
        compact ? "py-2.5" : "py-3.5",
        styles.surface,
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          compact ? "h-8 w-8" : "h-9 w-9",
          styles.chip
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : Icon ? (
          <Icon className="h-4 w-4" strokeWidth={2} />
        ) : (
          <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-semibold text-foreground")}>
          {title}
        </p>
        {description && !compact && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
