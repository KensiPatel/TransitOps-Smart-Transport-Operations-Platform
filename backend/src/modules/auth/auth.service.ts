import { jwtVerify, SignJWT, createRemoteJWKSet } from "jose";
import { db } from "../../db/client";
import type {
    AppUser,
    GoogleTokenPayload,
    SessionPayload,
    UserRole,
} from "./auth.types";

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

// ============================================================
// GOOGLE AUTH
// ============================================================

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

// ============================================================
// SESSION (shared by Google + password auth)
// ============================================================

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

export function getUserByEmail(email: string): AppUser | undefined {
    return db.query("SELECT * FROM users WHERE email = ?").get(email) as
        | AppUser
        | undefined;
}

// ============================================================
// PASSWORD AUTH
// ============================================================

export async function hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
}

export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    return Bun.password.verify(password, hash);
}

export async function createUserWithPassword(
    name: string,
    email: string,
    password: string
): Promise<AppUser> {
    const existing = getUserByEmail(email);
    if (existing) {
        throw new Error("Email already registered");
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    db.query(
        `INSERT INTO users (id, google_id, email, name, password_hash, role)
     VALUES (?, NULL, ?, ?, ?, ?)`
    ).run(id, email, name, passwordHash, "driver");

    return db.query("SELECT * FROM users WHERE id = ?").get(id) as AppUser;
}

export function updateUserPassword(email: string, newPasswordHash: string) {
    db.query("UPDATE users SET password_hash = ? WHERE email = ?").run(
        newPasswordHash,
        email
    );
}

// ============================================================
// OTP (in-memory, hackathon-scale — resets on server restart)
// ============================================================

const otpStore = new Map<string, { otp: string; expiresAt: number }>();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function generateOtp(email: string): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS });
    return otp;
}

export function verifyOtp(email: string, otp: string): boolean {
    const record = otpStore.get(email);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return false;
    }
    const valid = record.otp === otp;
    if (valid) otpStore.delete(email);
    return valid;
}