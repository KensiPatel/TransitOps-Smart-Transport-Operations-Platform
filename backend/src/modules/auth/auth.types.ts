export interface GoogleTokenPayload {
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    picture?: string;
    aud: string;
    iss: string;
    exp: number;
}

export type UserRole =
    | "fleet_manager"
    | "driver"
    | "safety_officer"
    | "financial_analyst";

export interface AppUser {
    id: string;
    google_id: string | null;
    email: string;
    name: string;
    avatar_url: string | null;
    password_hash: string | null;
    role: UserRole;
    created_at: string;
}

export interface SessionPayload {
    sub: string;
    email: string;
    role: UserRole;
}

export interface GoogleAuthBody {
    credential: string;
}

export interface SignupBody {
    name: string;
    email: string;
    password: string;
}

export interface LoginBody {
    email: string;
    password: string;
}

export interface ForgotPasswordBody {
    email: string;
}

export interface ResetPasswordBody {
    email: string;
    otp: string;
    newPassword: string;
}