import { SignJWT, jwtVerify } from "jose";
import { hash, verify } from "@node-rs/argon2";
import { cookies } from "next/headers";
import { connectDB } from "./mongodb";
import { UserModel } from "./models/user";
import { RefreshTokenModel } from "./models/refresh-token";
import crypto from "crypto";

function getAccessSecret() {
  return new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
}

function getRefreshSecret() {
  return new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

const ISSUER = "k8s-dashboard";
const AUDIENCE = "k8s-dashboard";

// --- Password hashing (Argon2id, OWASP recommended params) ---

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}

// Constant-time dummy hash to prevent timing attacks on invalid usernames
const DUMMY_HASH = "$argon2id$v=19$m=19456,t=2,p=1$dGhpc2lzYWR1bW15c2FsdA$dummyhashvalue";

export async function verifyPasswordSafe(user: { password_hash: string } | null, password: string): Promise<boolean> {
  if (!user) {
    // Hash dummy password to prevent timing attacks
    try { await verify(DUMMY_HASH, password); } catch { /* expected */ }
    return false;
  }
  return verifyPassword(user.password_hash, password);
}

// --- JWT tokens ---

export async function signAccessToken(userId: string, username: string): Promise<string> {
  return new SignJWT({ sub: userId, username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getAccessSecret());
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${REFRESH_TOKEN_EXPIRY_SECONDS}s`)
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getAccessSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload as { sub: string; username: string; iat: number; exp: number };
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, getRefreshSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload as { sub: string; iat: number; exp: number };
}

// --- Session ---

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return null;
    const payload = await verifyAccessToken(token);
    return payload;
  } catch {
    return null;
  }
}

// --- Cookie helpers ---

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();

  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}

// --- Refresh token storage ---

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function storeRefreshToken(userId: string, token: string, family: string) {
  await connectDB();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);
  await RefreshTokenModel.create({
    user_id: userId,
    token_hash: tokenHash,
    family,
    expires_at: expiresAt,
  });
}

export async function rotateRefreshToken(oldToken: string, newToken: string, userId: string) {
  await connectDB();
  const oldHash = hashToken(oldToken);

  const existing = await RefreshTokenModel.findOne({ token_hash: oldHash });
  if (!existing) return null;

  // Reuse detection: if token was already used, revoke entire family
  if (existing.used) {
    await RefreshTokenModel.deleteMany({ family: existing.family });
    return null;
  }

  // Mark old token as used
  existing.used = true;
  await existing.save();

  // Store new token in same family
  const newHash = hashToken(newToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);
  await RefreshTokenModel.create({
    user_id: userId,
    token_hash: newHash,
    family: existing.family,
    expires_at: expiresAt,
  });

  return existing.family;
}

export async function revokeTokenFamily(family: string) {
  await connectDB();
  await RefreshTokenModel.deleteMany({ family });
}

export async function revokeAllUserTokens(userId: string) {
  await connectDB();
  await RefreshTokenModel.deleteMany({ user_id: userId });
}

// --- User lookup ---

export async function findUserByUsername(username: string) {
  await connectDB();
  return UserModel.findOne({ username }).lean();
}

// --- Rate limiting (in-memory) ---

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }

  entry.count++;
  return true;
}

export function resetRateLimit(key: string): void {
  loginAttempts.delete(key);
}
