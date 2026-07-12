import { jwtVerify, SignJWT, createRemoteJWKSet } from "jose";
import { db } from "../../db/client";
import type { AppUser, GoogleTokenPayload, SessionPayload, UserRole } from "./auth.types";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const GOOGLE_JWKS = createRemoteJWKSet(
    new URL("https://www.googleapis.com/oauth2/v3/certs")
);

if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID env var is required");
}
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET env var is required");
}

/**
 * Verifies a Google-issued ID token (the `credential` from Google Identity
 * Services) against Google's public keys. Throws if invalid/expired/wrong audience.
 */
export async function verifyGoogleToken(
    credential: string
): Promise<GoogleTokenPayload> {
    const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: GOOGLE_CLIENT_ID,
    });

    if (!payload.email || !payload.sub) {
        throw new Error("Google token missing required claims");
    }
    if (payload.email_verified !== true) {
        throw new Error("Google email not verified");
    }

    return payload as unknown as GoogleTokenPayload;
}

/**
 * Finds an existing user by google_id, or creates one on first login.
 * Defaults new users to the 'driver' role — promote via DB/admin as needed.
 */
export function upsertUserFromGoogle(payload: GoogleTokenPayload): AppUser {
    const existing = db
        .query("SELECT * FROM users WHERE google_id = ?")
        .get(payload.sub) as AppUser | undefined;

    if (existing) {
        db.query(
            "UPDATE users SET name = ?, avatar_url = ?, email = ? WHERE google_id = ?"
        ).run(payload.name, payload.picture ?? null, payload.email, payload.sub);

        return {
            ...existing,
            name: payload.name,
            avatar_url: payload.picture ?? null,
            email: payload.email,
        };
    }

    const id = crypto.randomUUID();
    db.query(
        `INSERT INTO users (id, google_id, email, name, avatar_url, role)
     VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, payload.sub, payload.email, payload.name, payload.picture ?? null, "driver");

    return db.query("SELECT * FROM users WHERE id = ?").get(id) as AppUser;
}

/** Issues our own signed session JWT (separate from Google's token). */
export async function createSessionToken(user: AppUser): Promise<string> {
    const payload: SessionPayload = {
        sub: user.id,
        email: user.email,
        role: user.role as UserRole,
    };

    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(JWT_SECRET);
}

export async function verifySessionToken(
    token: string
): Promise<SessionPayload> {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
}

export function getUserById(id: string): AppUser | undefined {
    return db.query("SELECT * FROM users WHERE id = ?").get(id) as
        | AppUser
        | undefined;
}