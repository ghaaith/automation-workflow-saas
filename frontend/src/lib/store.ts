import { create } from "zustand";
import type { User, Organization } from "@/types";

interface AppState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isSidebarCollapsed: boolean;
  theme: "dark" | "light";
  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  setAuthenticated: (val: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (val: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
}

function getInitialAuth(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("access_token");
}

export const useStore = create<AppState>((set) => ({
  user: null,
  organization: null,
  isAuthenticated: getInitialAuth(),
  isSidebarCollapsed: false,
  theme: "dark",
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setOrganization: (organization) => set({ organization }),
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  toggleSidebar: () =>
    set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setSidebarCollapsed: (val) => set({ isSidebarCollapsed: val }),
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  },
}));
