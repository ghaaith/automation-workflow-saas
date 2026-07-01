"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/lib/store";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthLoading } = useAuth();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration tracking
    setMounted(true);
    const token = typeof window !== "undefined" && localStorage.getItem("access_token");
    if (token) {
      useStore.getState().setAuthenticated(true);
    }
  }, []);

  if (!mounted || isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center gradient-mesh">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          <span className="text-xs text-zinc-600 animate-breathe">Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
