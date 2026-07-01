"use client";

import { Bell, LogOut, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Navbar() {
  const { user, logout } = useAuth();
  const { organization } = useStore();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-14 border-b border-zinc-800/40 glass-strong flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors duration-150 pointer-events-none",
            searchFocused ? "text-zinc-400" : "text-zinc-600"
          )} />
          <input
            type="text"
            placeholder="Search workflows, documents..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-9 rounded-lg bg-zinc-800/30 border border-zinc-800/50 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-brand-500/30 focus:ring-1 focus:ring-brand-500/10 transition-all duration-150"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {organization && (
          <span className="text-sm text-zinc-500 mr-1 hidden sm:block">
            {organization.name}
          </span>
        )}

        <button className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all duration-150 cursor-pointer group">
          <Bell className="h-4 w-4 group-hover:scale-110 transition-transform duration-150" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-zinc-950 animate-pulse-glow" />
        </button>

        {user && (
          <button
            onClick={logout}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all duration-150 text-sm cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white font-medium text-xs group-hover:scale-105 transition-transform duration-150">
              {user.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="hidden sm:block text-zinc-300">{user.full_name}</span>
            <LogOut className="h-3.5 w-3.5 ml-1 text-zinc-500 group-hover:text-zinc-400 transition-colors duration-150" />
          </button>
        )}
      </div>
    </header>
  );
}
