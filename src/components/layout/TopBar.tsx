import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Search, Bell, Minus, Square, Copy, X } from "lucide-react";
import { cn, getAccountAvatarUrl } from "@/lib/utils";
import { useAccountStore } from "@/store/accountStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const appWindow = getCurrentWindow();

export function TopBar() {
  const navigate = useNavigate();
  const selectedAccount = useAccountStore((s) => s.selectedAccount);
  const [isMaximized, setIsMaximized] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    appWindow.isMaximized().then(setIsMaximized).catch(() => {});
    appWindow
      .onResized(() => appWindow.isMaximized().then(setIsMaximized).catch(() => {}))
      .then((fn) => (unlisten = fn))
      .catch(() => {});
    return () => unlisten?.();
  }, []);

  const submitSearch = () => {
    const q = query.trim();
    navigate(q ? `/modpacks?q=${encodeURIComponent(q)}` : "/modpacks");
  };

  return (
    <header
      data-tauri-drag-region
      className="app-drag flex items-center gap-3 h-[52px] px-3 shrink-0 border-b border-launcher-border bg-launcher-bg-secondary/80 backdrop-blur-xl"
    >
      {/* Search */}
      <div className="app-no-drag flex-1 max-w-xl">
        <div
          className={cn(
            "group relative flex items-center h-9 rounded-xl border bg-launcher-bg-primary/70 transition-all duration-200",
            focused
              ? "border-launcher-green/50 accent-ring"
              : "border-launcher-border hover:border-launcher-border/80"
          )}
        >
          <Search
            className={cn(
              "ml-3 w-4 h-4 shrink-0 transition-colors",
              focused ? "text-launcher-green" : "text-muted-foreground"
            )}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            placeholder="Search modpacks, servers, news…"
            className="flex-1 bg-transparent px-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none"
          />
          <kbd className="mr-2.5 hidden md:inline-flex items-center gap-0.5 rounded-md border border-launcher-border bg-launcher-bg-active px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Enter
          </kbd>
        </div>
      </div>

      <div className="flex-1" />

      {/* Right cluster */}
      <div className="app-no-drag flex items-center gap-1.5">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-launcher-bg-hover transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-launcher-green ring-2 ring-launcher-bg-secondary" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Notifications</TooltipContent>
        </Tooltip>

        {/* Account chip */}
        <button
          onClick={() => navigate("/accounts")}
          className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-xl border border-launcher-border bg-launcher-bg-card hover:bg-launcher-bg-hover hover:border-launcher-border/80 transition-colors"
        >
          <span className="w-7 h-7 rounded-lg overflow-hidden bg-launcher-bg-active border border-launcher-border flex items-center justify-center shrink-0">
            {selectedAccount ? (
              <img
                src={getAccountAvatarUrl(selectedAccount, 48)}
                alt={selectedAccount.username}
                className="w-full h-full object-cover"
                style={{ imageRendering: "pixelated" }}
                onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
              />
            ) : (
              <span className="text-[10px] font-bold text-muted-foreground">?</span>
            )}
          </span>
          <span className="hidden sm:flex flex-col items-start leading-none">
            <span className="text-[12.5px] font-semibold text-foreground max-w-[120px] truncate">
              {selectedAccount?.username ?? "No account"}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {selectedAccount
                ? selectedAccount.accountType === "microsoft"
                  ? "Microsoft"
                  : "Offline"
                : "Sign in"}
            </span>
          </span>
        </button>

        {/* Divider */}
        <span className="mx-1 w-px h-5 bg-launcher-border" />

        {/* Window controls */}
        <div className="flex items-center">
          <button
            onClick={() => appWindow.minimize()}
            className="w-10 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-launcher-bg-hover transition-colors"
            aria-label="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => appWindow.toggleMaximize()}
            className="w-10 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-launcher-bg-hover transition-colors"
            aria-label={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <Copy className="w-3 h-3 -scale-x-100" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={() => appWindow.close()}
            className="w-10 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/90 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
