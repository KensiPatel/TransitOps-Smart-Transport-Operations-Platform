import { Elysia, t } from "elysia";
import {
    verifyGoogleToken,
    upsertUserFromGoogle,
    createSessionToken,
    verifySessionToken,
    getUserById,
} from "./auth.service";

const isProd = process.env.COOKIE_SECURE === "true";

export const authRoutes = new Elysia({ prefix: "/auth" })
    .post(
        "/google",
        async ({ body, cookie, set }) => {
            try {
                const googlePayload = await verifyGoogleToken(body.credential);
                const user = upsertUserFromGoogle(googlePayload);
                const sessionToken = await createSessionToken(user);

                cookie.session!.set({
                    value: sessionToken,
                    httpOnly: true,
                    secure: isProd,
                    sameSite: "lax",
                    maxAge: 7 * 24 * 60 * 60,
                    path: "/",
                });

                return {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        avatar_url: user.avatar_url,
                        role: user.role,
                    },
                };
            } catch (err) {
                set.status = 401;
                return { error: "Invalid Google credential" };
            }
        },
        {
            body: t.Object({
                credential: t.String(),
            }),
        }
    )
    .post("/logout", ({ cookie, set }) => {
        cookie.session!.remove();
        set.status = 200;
        return { message: "Logged out" };
    })
    .get("/me", async ({ cookie, set }) => {
        const token = cookie.session?.value as string | undefined;
        if (!token) {
            set.status = 401;
            return { error: "Not authenticated" };
        }
        try {
            const session = await verifySessionToken(token);
            const user = getUserById(session.sub);
            if (!user) {
                set.status = 401;
                return { error: "User not found" };
            }
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    avatar_url: user.avatar_url,
                    role: user.role,
                },
            };
        } catch {
            set.status = 401;
            return { error: "Invalid or expired session" };
        }
    });