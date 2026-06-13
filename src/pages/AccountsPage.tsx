import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, LogIn, Users, Check } from "lucide-react";
import { useAccountStore } from "@/store/accountStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { AccountCard } from "@/components/account/AccountCard";
import { AddAccountDialog } from "@/components/account/AddAccountDialog";
import { InlineAlert } from "@/components/states";

export function AccountsPage() {
  const { accounts, selectedAccountId, removeAccount, selectAccount } =
    useAccountStore();
  const [showAdd, setShowAdd] = useState(false);

  // ── Preserved remove wiring ───────────────────────────────────────────────
  const handleRemove = (id: string) => {
    removeAccount(id);
    invoke("delete_account", { accountId: id }).catch(() => {});
    toast({ title: "Account removed" });
  };

  const hasAccounts = accounts.length > 0;
  const microsoftCount = accounts.filter(
    (a) => a.accountType === "microsoft"
  ).length;
  const offlineCount = accounts.length - microsoftCount;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-launcher-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-launcher-green">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Accounts</h1>
              <p className="text-xs text-muted-foreground">
                {hasAccounts
                  ? `${accounts.length} account${accounts.length > 1 ? "s" : ""}` +
                    ` · ${microsoftCount} Microsoft · ${offlineCount} offline`
                  : "Sign in to start playing"}
              </p>
            </div>
          </div>
          <Button variant="install" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            Add account
          </Button>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1">
          <div className="mx-auto w-full max-w-3xl p-6">
            {hasAccounts ? (
              <div className="space-y-4">
                <InlineAlert variant="info" icon={Check}>
                  The active account is used when launching modpacks and joining
                  servers. Select another card to switch.
                </InlineAlert>
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      isSelected={account.id === selectedAccountId}
                      onSelect={() => selectAccount(account.id)}
                      onRemove={() => handleRemove(account.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={LogIn}
                title="You're not signed in"
                description="Add a Microsoft account to play on online and premium servers, or an offline account for offline-mode worlds."
                action={
                  <Button variant="install" onClick={() => setShowAdd(true)}>
                    <Plus className="h-4 w-4" />
                    Add your first account
                  </Button>
                }
              />
            )}
          </div>
        </ScrollArea>

        <AddAccountDialog open={showAdd} onOpenChange={setShowAdd} />
      </div>
    </TooltipProvider>
  );
}
