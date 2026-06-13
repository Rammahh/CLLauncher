import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { LaunchLogDialog } from "@/components/launch/LaunchLogDialog";

export function Layout() {
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-launcher-bg-primary text-foreground">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden flex flex-col">
            {/* Keyed wrapper gives each route a subtle enter animation */}
            <div key={location.pathname} className="flex-1 overflow-hidden flex flex-col animate-fade-up">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <LaunchLogDialog />
      <Toaster />
    </TooltipProvider>
  );
}
