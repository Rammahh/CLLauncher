import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Package2,
  Library,
  Server,
  Newspaper,
  Download,
  Settings2,
  User2,
  FileText,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react";
import { cn, getAccountAvatarUrl } from "@/lib/utils";
import { branding } from "@/config/branding";
import { useAccountStore } from "@/store/accountStore";
import { useApiStatusStore } from "@/store/apiStatusStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavEntry {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

const sections: { title: string; items: NavEntry[] }[] = [
  {
    title: "Play",
    items: [
      { to: "/", icon: Home, label: "Home", end: true },
      { to: "/modpacks", icon: Package2, label: "Modpacks" },
      { to: "/installed", icon: Library, label: "My Library" },
      { to: "/servers", icon: Server, label: "Servers" },
      { to: "/news", icon: Newspaper, label: "News" },
      { to: "/downloads", icon: Download, label: "Downloads" },
    ],
  },
  {
    title: "Launcher",
    items: [
      { to: "/accounts", icon: User2, label: "Account" },
      { to: "/settings", icon: Settings2, label: "Settings" },
      { to: "/logs", icon: FileText, label: "Support & Logs" },
    ],
  },
];

function NavItem({ entry, expanded }: { entry: NavEntry; expanded: boolean }) {
  const { to, icon: Icon, label, end } = entry;

  const link = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center h-9 rounded-xl transition-all duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-launcher-green/60",
          expanded ? "gap-3 px-3" : "justify-center",
          isActive
            ? "bg-accent-soft text-launcher-green"
            : "text-muted-foreground hover:text-foreground hover:bg-launcher-bg-hover"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Animated active rail */}
          <span
            className={cn(
              "absolute left-0 w-[3px] rounded-r-full bg-launcher-green transition-all duration-200",
              isActive ? "top-1.5 bottom-1.5 opacity-100 shadow-glow-sm" : "top-1/2 bottom-1/2 opacity-0"
            )}
          />
          <Icon
            className="w-[18px] h-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105"
            strokeWidth={isActive ? 2.3 : 1.9}
          />
          {expanded && (
            <span className="text-[13px] font-medium leading-none whitespace-nowrap">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  if (expanded) return link;
  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const selectedAccount = useAccountStore((s) => s.selectedAccount);
  const isOnline = useApiStatusStore((s) => s.isOnline);
  const navigate = useNavigate();

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 border-r border-launcher-border bg-launcher-bg-secondary/60 backdrop-blur-xl transition-[width] duration-200 ease-out",
        expanded ? "w-[232px]" : "w-[72px]"
      )}
    >
      {/* Brand header */}
      <div
        className={cn(
          "flex items-center h-[52px] shrink-0 border-b border-launcher-border",
          expanded ? "px-3 gap-2.5" : "justify-center px-2"
        )}
      >
        <div className="relative w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shrink-0 shadow-glow-sm">
          <span className="text-[13px] font-extrabold text-[#08210f] tracking-tight">
            {branding.monogram}
          </span>
        </div>
        {expanded && (
          <div className="flex flex-col min-w-0 leading-none">
            <span className="text-[13.5px] font-bold text-foreground truncate">
              {branding.name}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 truncate">
              {branding.network}
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col flex-1 gap-1 px-3 py-3 overflow-y-auto overflow-x-hidden">
        {sections.map((section, idx) => (
          <div key={section.title} className={cn("flex flex-col gap-1", idx > 0 && "mt-5")}>
            {expanded ? (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/45 select-none">
                {section.title}
              </p>
            ) : (
              idx > 0 && <div className="mx-2 mb-2 border-t border-launcher-border" />
            )}
            {section.items.map((entry) => (
              <NavItem key={entry.to} entry={entry} expanded={expanded} />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer: account preview + status + collapse */}
      <div className="shrink-0 border-t border-launcher-border p-3 flex flex-col gap-2">
        {selectedAccount && (
          <button
            onClick={() => navigate("/accounts")}
            className={cn(
              "flex items-center rounded-xl border border-launcher-border bg-launcher-bg-card hover:bg-launcher-bg-hover hover:border-launcher-border/80 transition-colors",
              expanded ? "gap-2.5 p-2" : "justify-center p-1.5"
            )}
          >
            <span className="relative shrink-0">
              <img
                src={getAccountAvatarUrl(selectedAccount, 64)}
                alt={selectedAccount.username}
                className="w-8 h-8 rounded-lg block bg-launcher-bg-active"
                style={{ imageRendering: "pixelated" }}
                onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
              />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-launcher-bg-card",
                  isOnline ? "bg-launcher-green" : "bg-yellow-500"
                )}
              />
            </span>
            {expanded && (
              <span className="flex flex-col min-w-0 leading-tight text-left">
                <span className="text-[13px] font-semibold text-foreground truncate">
                  {selectedAccount.username}
                </span>
                <span className="text-[10.5px] text-muted-foreground">
                  {selectedAccount.accountType === "microsoft"
                    ? "Microsoft account"
                    : "Offline account"}
                </span>
              </span>
            )}
          </button>
        )}

        <div className={cn("flex items-center", expanded ? "justify-between" : "flex-col gap-2")}>
          <div
            className={cn("flex items-center gap-2", !expanded && "justify-center")}
            title={isOnline ? "Connected to CraftersLand" : "Offline mode"}
          >
            <span className="relative flex w-1.5 h-1.5">
              <span
                className={cn(
                  "absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping",
                  isOnline ? "bg-launcher-green" : "bg-yellow-500"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex w-1.5 h-1.5 rounded-full",
                  isOnline ? "bg-launcher-green" : "bg-yellow-500"
                )}
              />
            </span>
            {expanded && (
              <span
                className={cn(
                  "text-[10.5px] font-medium",
                  isOnline ? "text-muted-foreground" : "text-yellow-500/90"
                )}
              >
                {isOnline ? "Connected" : "Offline mode"}
              </span>
            )}
          </div>

          <Tooltip delayDuration={250}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-launcher-bg-hover transition-colors"
                aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              >
                {expanded ? (
                  <ChevronsLeft className="w-4 h-4" />
                ) : (
                  <ChevronsRight className="w-4 h-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {expanded ? "Collapse" : "Expand"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
