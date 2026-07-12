import { create } from "zustand";
import { authApi } from "@/api/auth.api";
import { ApiError } from "@/api/client";
import type { PublicUser, UserRole } from "@/types";

const ROLE_HOME: Record<UserRole, string> = {
  fleet_manager: "/dashboard",
  driver: "/trips",
  dispatcher: "/vehicles",
  safety_officer: "/dashboard",
  financial_analyst: "/dashboard",
};

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  roleHomePage: string;
  login: (email: string, password: string) => Promise<PublicUser>;
  signup: (name: string, email: string, password: string, role?: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  roleHomePage: ROLE_HOME.driver,

  login: async (email, password) => {
    const u = await authApi.login(email, password);
    set({ user: u, roleHomePage: ROLE_HOME[u.role] });
    return u;
  },

  signup: async (name, email, password, role) => {
    const u = await authApi.signup(name, email, password, role);
    set({ user: u, roleHomePage: ROLE_HOME[u.role] });
    return u;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, roleHomePage: ROLE_HOME.driver });
    }
  },

  checkSession: async () => {
    try {
      const me = await authApi.me();
      set({ user: me, roleHomePage: ROLE_HOME[me.role], loading: false });
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) {
        console.error("Session check failed:", err);
      }
      set({ user: null, roleHomePage: ROLE_HOME.driver, loading: false });
    }
  },
}));
