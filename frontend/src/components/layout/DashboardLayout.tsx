"use client";

import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed } = useStore();

  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-200 min-h-screen flex flex-col",
          isSidebarCollapsed ? "ml-16" : "ml-60"
        )}
      >
        <Navbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
