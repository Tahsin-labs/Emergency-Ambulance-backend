import { create } from "zustand";
import { User, Role } from "@/types";

interface AuthState {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: Role | null) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  setUser: (user) => set({ user, role: user?.role || null }),
  setRole: (role) => set({ role }),
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      set({ user: null, role: null });
      window.location.href = "/login";
    }
  },
  checkSession: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = await res.json();
        set({ user: json.data, role: json.data.role, isLoading: false });
      } else {
        set({ user: null, role: null, isLoading: false });
      }
    } catch {
      set({ user: null, role: null, isLoading: false });
    }
  },
}));
