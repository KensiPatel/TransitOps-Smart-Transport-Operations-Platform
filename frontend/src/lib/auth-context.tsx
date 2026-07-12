import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type UserRole = "fleet_manager" | "driver" | "safety_officer" | "financial_analyst";

export interface CurrentUser {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    role: UserRole;
}

interface AuthContextValue {
    user: CurrentUser | null;
    loading: boolean;
    loginWithGoogle: (credential: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    forgotPassword: (email: string) => Promise<string>; // returns OTP for popup display
    resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const API_URL = import.meta.env.VITE_API_URL;

async function parseJsonOrThrow(res: Response, fallbackMessage: string) {
    let data: any = null;
    try {
        data = await res.json();
    } catch {
        // ignore parse failure, use fallback
    }
    if (!res.ok) {
        throw new Error(data?.error ?? fallbackMessage);
    }
    return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    async function fetchMe() {
        try {
            const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchMe();
    }, []);

    async function loginWithGoogle(credential: string) {
        const res = await fetch(`${API_URL}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ credential }),
        });
        const data = await parseJsonOrThrow(res, "Google sign-in failed");
        setUser(data.user);
    }

    async function signup(name: string, email: string, password: string) {
        const res = await fetch(`${API_URL}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name, email, password }),
        });
        const data = await parseJsonOrThrow(res, "Signup failed");
        setUser(data.user);
    }

    async function login(email: string, password: string) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password }),
        });
        const data = await parseJsonOrThrow(res, "Login failed");
        setUser(data.user);
    }

    async function forgotPassword(email: string): Promise<string> {
        const res = await fetch(`${API_URL}/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email }),
        });
        const data = await parseJsonOrThrow(res, "Could not generate OTP");
        return data.otp as string;
    }

    async function resetPassword(email: string, otp: string, newPassword: string) {
        const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, otp, newPassword }),
        });
        await parseJsonOrThrow(res, "Password reset failed");
    }

    async function logout() {
        await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{ user, loading, loginWithGoogle, signup, login, forgotPassword, resetPassword, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}