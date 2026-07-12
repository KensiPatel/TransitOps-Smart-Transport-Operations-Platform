import { Elysia, t } from "elysia";
import {
    verifyGoogleToken,
    upsertUserFromGoogle,
    createSessionToken,
    verifySessionToken,
    getUserById,
    getUserByEmail,
    createUserWithPassword,
    verifyPassword,
    hashPassword,
    generateOtp,
    verifyOtp,
    updateUserPassword,
} from "./auth.service";

const isProd = process.env.COOKIE_SECURE === "true";

function setSessionCookie(cookie: any, token: string) {
    cookie.session!.set({
        value: token,
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
    });
}

function publicUser(user: {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    role: string;
}) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role,
    };
}

export const authRoutes = new Elysia({ prefix: "/auth" })
    // ---------------- GOOGLE ----------------
    .post(
        "/google",
        async ({ body, cookie, set }) => {
            try {
                const googlePayload = await verifyGoogleToken(body.credential);
                const user = upsertUserFromGoogle(googlePayload);
                const sessionToken = await createSessionToken(user);
                setSessionCookie(cookie, sessionToken);
                return { user: publicUser(user) };
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

    // ---------------- SIGNUP ----------------
    .post(
        "/signup",
        async ({ body, cookie, set }) => {
            try {
                const user = await createUserWithPassword(
                    body.name,
                    body.email,
                    body.password
                );
                const sessionToken = await createSessionToken(user);
                setSessionCookie(cookie, sessionToken);
                return { user: publicUser(user) };
            } catch (err: any) {
                set.status = 400;
                return { error: err.message ?? "Signup failed" };
            }
        },
        {
            body: t.Object({
                name: t.String({ minLength: 1 }),
                email: t.String({ format: "email" }),
                password: t.String({ minLength: 8 }),
            }),
        }
    )

    // ---------------- LOGIN ----------------
    .post(
        "/login",
        async ({ body, cookie, set }) => {
            const user = getUserByEmail(body.email);
            if (!user || !user.password_hash) {
                set.status = 401;
                return { error: "Invalid email or password" };
            }

            const valid = await verifyPassword(body.password, user.password_hash);
            if (!valid) {
                set.status = 401;
                return { error: "Invalid email or password" };
            }

            const sessionToken = await createSessionToken(user);
            setSessionCookie(cookie, sessionToken);
            return { user: publicUser(user) };
        },
        {
            body: t.Object({
                email: t.String({ format: "email" }),
                password: t.String(),
            }),
        }
    )

    // ---------------- FORGOT PASSWORD (returns OTP directly, no email service) ----------------
    .post(
        "/forgot-password",
        async ({ body, set }) => {
            const user = getUserByEmail(body.email);
            if (!user) {
                set.status = 404;
                return { error: "No account with that email" };
            }
            const otp = generateOtp(body.email);
            return { message: "OTP generated", otp };
        },
        {
            body: t.Object({
                email: t.String({ format: "email" }),
            }),
        }
    )

    // ---------------- RESET PASSWORD ----------------
    .post(
        "/reset-password",
        async ({ body, set }) => {
            const isValid = verifyOtp(body.email, body.otp);
            if (!isValid) {
                set.status = 400;
                return { error: "Invalid or expired OTP" };
            }
            const newHash = await hashPassword(body.newPassword);
            updateUserPassword(body.email, newHash);
            return { message: "Password reset successful" };
        },
        {
            body: t.Object({
                email: t.String({ format: "email" }),
                otp: t.String({ minLength: 6, maxLength: 6 }),
                newPassword: t.String({ minLength: 8 }),
            }),
        }
    )

    // ---------------- LOGOUT ----------------
    .post("/logout", ({ cookie, set }) => {
        cookie.session!.remove();
        set.status = 200;
        return { message: "Logged out" };
    })

    // ---------------- CURRENT USER ----------------
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
            return { user: publicUser(user) };
        } catch {
            set.status = 401;
            return { error: "Invalid or expired session" };
        }
    });