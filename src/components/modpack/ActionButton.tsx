import { Loader2, Download, RefreshCw, Play, Wrench, AlertCircle, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InstanceStatus } from "@/types";

interface ActionButtonProps {
  instanceId?: string;
  status: InstanceStatus | "not-installed" | "update-available" | "running";
  isApiOnline: boolean;
  onInstall?: () => void;
  onUpdate?: () => void;
  onPlay?: () => void;
  onRepair?: () => void;
  onStop?: () => void;
  className?: string;
  size?: "default" | "sm" | "lg" | "xl";
}

export function ActionButton({
  status,
  isApiOnline,
  onInstall,
  onUpdate,
  onPlay,
  onRepair,
  onStop,
  className,
  size = "default",
}: ActionButtonProps) {
  switch (status) {
    case "not-installed":
      return (
        <Button
          variant="install"
          size={size}
          onClick={onInstall}
          disabled={!isApiOnline}
          className={cn("gap-2", className)}
        >
          <Download className="w-4 h-4" />
          Install
        </Button>
      );

    case "installing":
      return (
        <Button
          variant="install"
          size={size}
          disabled
          className={cn("gap-2 cursor-wait", className)}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Installing...
        </Button>
      );

    case "update-available":
      return (
        <div className={cn("flex gap-2", className)}>
          <Button variant="update" size={size} onClick={onUpdate} disabled={!isApiOnline}>
            <RefreshCw className="w-4 h-4" />
            Update
          </Button>
          <Button variant="secondary" size={size} onClick={onPlay}>
            <Play className="w-4 h-4" />
            Play
          </Button>
        </div>
      );

    case "updating":
      return (
        <Button
          variant="update"
          size={size}
          disabled
          className={cn("gap-2 cursor-wait", className)}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Updating...
        </Button>
      );

    case "idle":
      return (
        <Button
          variant="install"
          size={size}
          onClick={onPlay}
          className={cn("gap-2", className)}
        >
          <Play className="w-4 h-4" />
          Play
        </Button>
      );

    case "launching":
      return (
        <Button
          variant="install"
          size={size}
          disabled
          className={cn("gap-2 cursor-wait", className)}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Launching...
        </Button>
      );

    case "running":
      return (
        <div className={cn("flex gap-2", className)}>
          <Button
            variant="secondary"
            size={size}
            disabled
            className="gap-2 text-launcher-green border-launcher-green/30"
          >
            <div className="w-2 h-2 rounded-full bg-launcher-green animate-pulse-slow" />
            Running
          </Button>
          {onStop && (
            <Button variant="danger" size="icon-sm" onClick={onStop} title="Stop">
              <StopCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      );

    case "repairing":
      return (
        <Button
          variant="repair"
          size={size}
          disabled
          className={cn("gap-2 cursor-wait", className)}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Repairing...
        </Button>
      );

    case "error":
      return (
        <div className={cn("flex gap-2", className)}>
          <Button variant="danger" size={size} onClick={onRepair}>
            <Wrench className="w-4 h-4" />
            Repair
          </Button>
          <Button variant="secondary" size={size} onClick={onInstall} disabled={!isApiOnline}>
            <Download className="w-4 h-4" />
            Reinstall
          </Button>
        </div>
      );

    default:
      return (
        <Button
          variant="secondary"
          size={size}
          disabled
          className={className}
        >
          <AlertCircle className="w-4 h-4" />
          Unknown
        </Button>
      );
  }
}
