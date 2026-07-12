import { Elysia } from "elysia";
import { verifySessionToken, getUserById } from "../modules/auth/auth.service";
import type { UserRole } from "../modules/auth/auth.types";

/**
 * requireAuth
 *
 * Attaches `user` to the request context if a valid session cookie is present;
 * otherwise 401s. This mirrors the inline session check in auth.routes.ts
 * (/me), but as a reusable scoped guard so any module can require a logged-in
 * user without duplicating the cookie/verify/lookup dance.
 *
 * Usage:
 *   new Elysia({ prefix: "/dashboard" })
 *     .use(requireAuth)
 *     .get("/", ({ user }) => { ...user is available and typed... })
 */
export const requireAuth = new Elysia({ name: "requireAuth" }).derive(
    { as: "scoped" },
    async ({ cookie, set }) => {
        const token = cookie.session?.value as string | undefined;
        if (!token) {
            set.status = 401;
            throw new Error("Not authenticated");
        }

        try {
            const session = await verifySessionToken(token);
            const user = getUserById(session.sub);
            if (!user) {
                set.status = 401;
                throw new Error("User not found");
            }

            return { user };
        } catch {
            set.status = 401;
            throw new Error("Invalid or expired session");
        }
    }
);

/** Use after requireAuth: restricts a route to specific roles. */
export function requireRole(...roles: UserRole[]) {
    return new Elysia().derive({ as: "scoped" }, ({ user, set }: any) => {
        if (!roles.includes(user.role)) {
            set.status = 403;
            throw new Error("Forbidden: insufficient role");
        }

        return {};
    });
}