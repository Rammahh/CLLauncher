import { type LucideIcon, Package2, Download, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent: "green" | "blue" | "orange" | "red" | "muted";
  pulse?: boolean;
}

const accentMap: Record<StatProps["accent"], string> = {
  green: "text-launcher-green bg-launcher-green/10",
  blue: "text-launcher-blue bg-launcher-blue/10",
  orange: "text-launcher-orange bg-launcher-orange/10",
  red: "text-launcher-red bg-launcher-red/10",
  muted: "text-muted-foreground bg-launcher-bg-active",
};

function StatCard({ icon: Icon, label, value, accent, pulse }: StatProps) {
  return (
    <div className="surface-card rounded-xl p-4 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:border-launcher-green/30">
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          accentMap[accent],
          pulse && "animate-pulse-slow"
        )}
      >
        <Icon className="w-5 h-5" strokeWidth={1.9} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground leading-none tabular-nums">
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

export function QuickStats({
  installedCount,
  activeDownloads,
  online,
}: {
  installedCount: number;
  activeDownloads: number;
  online: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 animate-fade-up">
      <StatCard
        icon={Package2}
        label={installedCount === 1 ? "Installed pack" : "Installed packs"}
        value={installedCount}
        accent="green"
      />
      <StatCard
        icon={Download}
        label={activeDownloads === 1 ? "Active download" : "Active downloads"}
        value={activeDownloads}
        accent={activeDownloads > 0 ? "blue" : "muted"}
        pulse={activeDownloads > 0}
      />
      <StatCard
        icon={online ? Wifi : WifiOff}
        label={online ? "API online" : "API offline"}
        value={online ? "Online" : "Offline"}
        accent={online ? "green" : "red"}
      />
    </div>
  );
}
