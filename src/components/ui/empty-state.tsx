import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-16 animate-fade-up",
        className
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-2xl bg-launcher-green/10 blur-2xl" />
        <div className="relative w-16 h-16 rounded-2xl surface-card flex items-center justify-center">
          <Icon className="w-7 h-7 text-launcher-green" strokeWidth={1.8} />
        </div>
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
