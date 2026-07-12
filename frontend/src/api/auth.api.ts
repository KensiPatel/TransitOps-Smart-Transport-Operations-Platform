import { http } from "./client";
import type { PublicUser } from "@/types";

interface UserResponse {
  user: PublicUser;
}

export const authApi = {
  me: () => http.get<UserResponse>("/auth/me").then((r) => r.user),

  login: (email: string, password: string) =>
    http.post<UserResponse>("/auth/login", { email, password }).then((r) => r.user),

  // Backend restricts self-signup to driver/dispatcher; other roles are admin-assigned.
  signup: (name: string, email: string, password: string, role?: string) =>
    http
      .post<UserResponse>("/auth/signup", { name, email, password, role })
      .then((r) => r.user),

  loginWithGoogle: (credential: string) =>
    http
      .post<UserResponse>("/auth/google", { credential })
      .then((r) => r.user),

  logout: () => http.post<{ message: string }>("/auth/logout"),

  forgotPassword: (email: string) =>
    http.post<{ message: string; otp: string }>("/auth/forgot-password", {
      email,
    }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    http.post<{ message: string }>("/auth/reset-password", {
      email,
      otp,
      newPassword,
    }),
};
