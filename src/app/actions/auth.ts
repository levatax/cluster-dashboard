"use server";

import { redirect } from "next/navigation";
import crypto from "crypto";
import {
  findUserByUsername,
  verifyPasswordSafe,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  storeRefreshToken,
  revokeAllUserTokens,
  checkRateLimit,
  resetRateLimit,
  getSession,
} from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { success: false, error: "Username and password are required" };
  }

  // Rate limiting
  if (!checkRateLimit(username)) {
    return { success: false, error: "Too many login attempts. Please try again later." };
  }

  const user = await findUserByUsername(username);
  const valid = await verifyPasswordSafe(
    user ? { password_hash: user.password_hash } : null,
    password
  );

  if (!valid || !user) {
    return { success: false, error: "Invalid username or password" };
  }

  // Reset rate limit on successful login
  resetRateLimit(username);

  const userId = user._id.toString();
  const accessToken = await signAccessToken(userId, user.username);
  const refreshToken = await signRefreshToken(userId);

  // Create a new token family
  const family = crypto.randomUUID();
  await storeRefreshToken(userId, refreshToken, family);
  await setAuthCookies(accessToken, refreshToken);

  return { success: true };
}

export async function logoutAction() {
  const session = await getSession();

  if (session?.sub) {
    await revokeAllUserTokens(session.sub);
  }

  await clearAuthCookies();
  redirect("/login");
}
