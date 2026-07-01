"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/workflows", label: "Workflows", icon: GitBranch },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen glass z-30 flex flex-col transition-all duration-200 border-r border-zinc-800/40",
        isSidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn(
        "flex items-center h-14 border-b border-zinc-800/40",
        isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-4"
      )}>
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 shrink-0 shadow-sm shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
            <Zap className="h-4 w-4 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <span className="font-semibold text-sm text-zinc-100 whitespace-nowrap">
              AI Workflow
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 py-3 space-y-0.5 overflow-hidden overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative group",
                isActive
                  ? "text-white bg-brand-500/10"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-full shadow-sm shadow-brand-500/50" />
              )}
              <item.icon className={cn(
                "h-4 w-4 shrink-0 transition-all duration-150",
                isSidebarCollapsed ? "mx-auto" : "group-hover:scale-110",
                isActive && "text-brand-400"
              )} />
              {!isSidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {/* Tooltip when collapsed */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 rounded-md bg-zinc-900 text-xs text-zinc-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap shadow-xl border border-zinc-800/50 pointer-events-none z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="py-2 border-t border-zinc-800/40">
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex items-center justify-center w-full p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition-all duration-150 cursor-pointer group",
            isSidebarCollapsed && "mx-auto max-w-fit px-3"
          )}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          )}
        </button>
      </div>
    </aside>
  );
}
