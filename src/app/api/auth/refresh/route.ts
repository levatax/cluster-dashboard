import { NextRequest, NextResponse } from "next/server";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  rotateRefreshToken,
} from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/user";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refresh_token")?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    // Verify JWT signature and expiry
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    // Look up user
    await connectDB();
    const user = await UserModel.findById(payload.sub).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userId = user._id.toString();

    // Issue new token pair
    const newAccessToken = await signAccessToken(userId, user.username);
    const newRefreshToken = await signRefreshToken(userId);

    // Rotate: mark old as used, store new in same family
    const family = await rotateRefreshToken(refreshToken, newRefreshToken, userId);
    if (!family) {
      // Reuse detected or token not found — reject
      return NextResponse.json({ error: "Token reuse detected" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    });

    response.cookies.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
  }
}
