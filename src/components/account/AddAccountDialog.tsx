import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/states";
import { cn, generateId } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { useAccountStore } from "@/store/accountStore";
import type { MicrosoftAccount, OfflineAccount } from "@/types";

type AddMode = "select" | "microsoft" | "offline";

export interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAccountDialog({ open, onOpenChange }: AddAccountDialogProps) {
  const addAccount = useAccountStore((s) => s.addAccount);
  const [mode, setMode] = useState<AddMode>("select");
  const [offlineUsername, setOfflineUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setMode("select");
    setOfflineUsername("");
    setLoading(false);
  };

  const close = () => {
    onOpenChange(false);
    reset();
  };

  // ── Preserved offline add wiring ──────────────────────────────────────────
  const handleAddOffline = () => {
    const username = offlineUsername.trim();
    if (!username) return;
    const id = generateId();
    const account: OfflineAccount = {
      id,
      username,
      uuid: crypto.randomUUID().replace(/-/g, ""),
      accountType: "offline",
      addedAt: new Date().toISOString(),
    };
    addAccount(account);
    toast({ title: "Offline account added", variant: "success" });
    close();
  };

  // ── Preserved Microsoft browser auth wiring ───────────────────────────────
  const handleStartMicrosoft = async () => {
    setMode("microsoft");
    setLoading(true);
    try {
      const result = await invoke<{
        username: string;
        uuid: string;
        access_token: string;
        refresh_token: string;
        expires_at: number;
      }>("start_microsoft_auth_browser");

      const id = generateId();
      const account: MicrosoftAccount = {
        id,
        username: result.username,
        uuid: result.uuid,
        accountType: "microsoft",
        addedAt: new Date().toISOString(),
        expiresAt: result.expires_at,
      };
      addAccount(account);
      await invoke("save_account", {
        accountId: id,
        account: {
          ...account,
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        },
      }).catch(() => {});
      toast({ title: `Logged in as ${result.username}`, variant: "success" });
      close();
    } catch (e) {
      const msg =
        typeof e === "string" ? e : (e as any)?.message ?? JSON.stringify(e);
      toast({
        title: "Microsoft auth failed",
        description: msg,
        variant: "error",
      });
      // Stay on the microsoft screen so the user can retry.
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode !== "select" && !loading && (
              <button
                type="button"
                onClick={() => setMode("select")}
                aria-label="Back"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-launcher-bg-hover hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {mode === "offline" ? "Add offline account" : "Add account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "select"
              ? "Choose how you want to sign in."
              : mode === "microsoft"
                ? "Sign in with your Microsoft account."
                : "Play on offline-mode servers with a custom name."}
          </DialogDescription>
        </DialogHeader>

        {mode === "select" && (
          <div className="space-y-2.5">
            {/* Microsoft — premium, primary path */}
            <button
              type="button"
              onClick={handleStartMicrosoft}
              className={cn(
                "group flex w-full items-center gap-3.5 rounded-xl border border-launcher-blue/30 bg-launcher-blue/[0.06] p-3.5 text-left",
                "transition-all duration-200 hover:-translate-y-0.5 hover:border-launcher-blue/50 hover:shadow-elevated"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-launcher-blue/15 text-launcher-blue">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">
                    Microsoft account
                  </p>
                  <span className="rounded-full bg-launcher-blue/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-launcher-blue">
                    Recommended
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sign in with Xbox Live. Required for premium and online
                  servers.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Offline — clearly marked */}
            <button
              type="button"
              onClick={() => setMode("offline")}
              className={cn(
                "group flex w-full items-center gap-3.5 rounded-xl border border-launcher-border bg-launcher-bg-card p-3.5 text-left",
                "transition-all duration-200 hover:-translate-y-0.5 hover:border-launcher-orange/40 hover:shadow-elevated"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-launcher-orange/15 text-launcher-orange">
                <UserCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">
                  Offline account
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  No Microsoft login. Works only on offline-mode servers.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}

        {mode === "microsoft" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-launcher-blue/25 bg-launcher-blue/[0.06] px-4 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-launcher-blue/15 text-launcher-blue">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <ShieldCheck className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {loading
                    ? "Waiting for browser sign-in…"
                    : "Sign in with Microsoft"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  A browser window will open. Complete the sign-in there, then
                  return to the launcher.
                </p>
              </div>
            </div>
            {!loading && (
              <DialogFooter>
                <Button variant="secondary" onClick={() => setMode("select")}>
                  Back
                </Button>
                <Button variant="update" onClick={handleStartMicrosoft}>
                  <ShieldCheck className="h-4 w-4" />
                  Open sign-in
                </Button>
              </DialogFooter>
            )}
          </div>
        )}

        {mode === "offline" && (
          <div className="space-y-4">
            <InlineAlert variant="warning" icon={UserCircle2}>
              Offline accounts only work on servers that allow offline-mode
              connections. They cannot join premium or online-only servers.
            </InlineAlert>
            <div className="space-y-2">
              <Label htmlFor="offline-username">Username</Label>
              <Input
                id="offline-username"
                placeholder="Enter a username"
                value={offlineUsername}
                autoFocus
                maxLength={16}
                onChange={(e) => setOfflineUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddOffline()}
              />
              <p className="text-[11px] text-muted-foreground">
                3–16 characters. Letters, numbers and underscores work best.
              </p>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setMode("select")}>
                Back
              </Button>
              <Button
                variant="install"
                onClick={handleAddOffline}
                disabled={!offlineUsername.trim()}
              >
                Add account
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
