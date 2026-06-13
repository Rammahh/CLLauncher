import { useState } from "react";
import { Check, Trash2, Copy, ShieldCheck, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getAccountAvatarUrl } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import type { Account } from "@/types";

export interface AccountCardProps {
  account: Account;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export function AccountCard({
  account,
  isSelected,
  onSelect,
  onRemove,
}: AccountCardProps) {
  const isMicrosoft = account.accountType === "microsoft";
  const [avatarFailed, setAvatarFailed] = useState(false);

  const copyUuid = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(account.uuid);
    toast({ title: "UUID copied", variant: "success" });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative flex items-center gap-4 rounded-2xl border p-4 text-left",
        "transition-all duration-200 ease-out cursor-pointer outline-none",
        "hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-launcher-green/50",
        isSelected
          ? "surface-card border-launcher-green/40 accent-ring"
          : "surface-card hover:border-launcher-border hover:shadow-elevated"
      )}
    >
      {/* Avatar with status ring */}
      <div className="relative shrink-0">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border bg-launcher-bg-active",
            isSelected ? "border-launcher-green/40" : "border-launcher-border"
          )}
        >
          {!avatarFailed ? (
            <img
              src={getAccountAvatarUrl(account, 112)}
              alt={account.username}
              className="h-full w-full object-cover"
              style={{ imageRendering: "pixelated" }}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <UserCircle2 className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        {isSelected && (
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-launcher-green text-launcher-bg-primary shadow-glow-sm">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-foreground">
            {account.username}
          </span>
          <AccountMethodBadge isMicrosoft={isMicrosoft} />
          {isSelected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-launcher-green/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-launcher-green">
              Active
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <code className="truncate font-mono text-xs text-muted-foreground">
            {account.uuid}
          </code>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={copyUuid}
                aria-label="Copy UUID"
                className="shrink-0 rounded p-0.5 text-muted-foreground/70 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Copy UUID</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {!isSelected && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Select
          </Button>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${account.username}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-muted-foreground hover:bg-launcher-red/10 hover:text-launcher-red"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove account</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function AccountMethodBadge({ isMicrosoft }: { isMicrosoft: boolean }) {
  if (isMicrosoft) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-launcher-blue/15 px-2 py-0.5 text-[10px] font-semibold text-launcher-blue">
        <ShieldCheck className="h-3 w-3" />
        Microsoft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-launcher-orange/15 px-2 py-0.5 text-[10px] font-semibold text-launcher-orange">
      <UserCircle2 className="h-3 w-3" />
      Offline mode
    </span>
  );
}
