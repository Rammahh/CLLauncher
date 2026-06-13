import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Account } from "@/types";

interface AccountState {
  accounts: Account[];
  selectedAccountId: string | null;
  selectedAccount: Account | null;
  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
  selectAccount: (id: string) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  clearAccounts: () => void;
}

function findSelected(accounts: Account[], id: string | null): Account | null {
  return accounts.find((a) => a.id === id) ?? null;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      accounts: [],
      selectedAccountId: null,
      selectedAccount: null,

      addAccount: (account) =>
        set((state) => {
          const existing = state.accounts.findIndex((a) => a.id === account.id);
          const accounts =
            existing >= 0
              ? state.accounts.map((a) => (a.id === account.id ? account : a))
              : [...state.accounts, account];
          const selectedAccountId = state.selectedAccountId ?? account.id;
          return { accounts, selectedAccountId, selectedAccount: findSelected(accounts, selectedAccountId) };
        }),

      removeAccount: (id) =>
        set((state) => {
          const accounts = state.accounts.filter((a) => a.id !== id);
          const selectedAccountId =
            state.selectedAccountId === id
              ? (accounts[0]?.id ?? null)
              : state.selectedAccountId;
          return { accounts, selectedAccountId, selectedAccount: findSelected(accounts, selectedAccountId) };
        }),

      selectAccount: (id) =>
        set((state) => ({
          selectedAccountId: id,
          selectedAccount: findSelected(state.accounts, id),
        })),

      updateAccount: (id, updates) =>
        set((state) => {
          const accounts = state.accounts.map((a) =>
            a.id === id ? ({ ...a, ...updates } as Account) : a
          );
          return { accounts, selectedAccount: findSelected(accounts, state.selectedAccountId) };
        }),

      clearAccounts: () =>
        set({ accounts: [], selectedAccountId: null, selectedAccount: null }),
    }),
    {
      name: "cl-launcher-accounts",
      version: 1,
      partialize: (state) => ({
        accounts: state.accounts,
        selectedAccountId: state.selectedAccountId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.selectedAccount = findSelected(state.accounts, state.selectedAccountId);
        }
      },
    }
  )
);
