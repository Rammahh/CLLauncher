import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

/**
 * SettingsSection — a grouped premium card with an icon, title, optional
 * description, and a body of setting rows. Used to organize each settings
 * panel into clearly separated groups (Linear / Vercel style).
 */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("surface-card rounded-2xl overflow-hidden animate-fade-up", className)}>
      <div className="flex items-start gap-3 px-5 pt-5 pb-4">
        {Icon && (
          <div className="mt-0.5 shrink-0 w-9 h-9 rounded-xl bg-accent-soft flex items-center justify-center">
            <Icon className="w-[18px] h-[18px] text-launcher-green" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground leading-tight">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className={cn("px-5 pb-2", contentClassName)}>{children}</div>
    </section>
  );
}

/**
 * SettingRow — a single labeled control aligned right, with optional helper
 * text. Rows divide themselves with a subtle border for clear separation.
 */
export function SettingRow({
  label,
  description,
  htmlFor,
  children,
  className,
  align = "center",
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children?: React.ReactNode;
  className?: string;
  align?: "center" | "start";
}) {
  return (
    <div
      className={cn(
        "flex gap-4 py-3.5 border-t border-launcher-border/60 first:border-t-0",
        align === "center" ? "items-center" : "items-start",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground cursor-default"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {children != null && <div className="shrink-0">{children}</div>}
    </div>
  );
}

/**
 * SwitchRow — convenience wrapper for a boolean SettingRow.
 */
export function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <SettingRow label={label} description={description}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </SettingRow>
  );
}

/**
 * SliderRow — a labeled slider with a value badge on the right. Renders the
 * slider full-width beneath the label for comfortable dragging.
 */
export function SliderRow({
  label,
  description,
  value,
  display,
  min,
  max,
  step,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onValueChange: (v: number) => void;
}) {
  return (
    <div className="py-3.5 border-t border-launcher-border/60 first:border-t-0">
      <div className="flex items-center justify-between gap-4 mb-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <span className="shrink-0 tabular-nums text-xs font-medium text-launcher-green px-2.5 py-1 rounded-md bg-accent-soft">
          {display}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
      />
    </div>
  );
}
