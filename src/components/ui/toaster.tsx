import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { create } from "zustand";

type ToastVariant = "default" | "success" | "error" | "info";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration ?? 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function toast(opts: Omit<Toast, "id">) {
  useToastStore.getState().addToast(opts);
}

const variantStyles: Record<ToastVariant, string> = {
  default: "border-launcher-border bg-launcher-bg-card/95",
  success:
    "border-launcher-green/40 bg-launcher-bg-card/95 shadow-glow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-launcher-green",
  error:
    "border-launcher-red/40 bg-launcher-bg-card/95 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-launcher-red",
  info:
    "border-launcher-blue/40 bg-launcher-bg-card/95 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-launcher-blue",
};

const VariantIcon: Record<ToastVariant, React.FC<{ className?: string }>> = {
  default: () => null,
  success: ({ className }) => <CheckCircle className={cn("text-launcher-green", className)} />,
  error: ({ className }) => <AlertCircle className={cn("text-launcher-red", className)} />,
  info: ({ className }) => <Info className={cn("text-launcher-blue", className)} />,
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => {
        const Icon = VariantIcon[t.variant ?? "default"];
        return (
          <ToastPrimitive.Root
            key={t.id}
            className={cn(
              "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 pr-8 shadow-elevated backdrop-blur-sm transition-all",
              "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full data-[state=open]:fade-in-0",
              variantStyles[t.variant ?? "default"]
            )}
          >
            <Icon className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <ToastPrimitive.Title className="text-sm font-semibold text-foreground">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="text-sm text-muted-foreground">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              onClick={() => removeToast(t.id)}
              className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]" />
    </ToastPrimitive.Provider>
  );
}
