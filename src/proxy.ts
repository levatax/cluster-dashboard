import { NextRequest, NextResponse } from "next/server";
import { verifyAccessTokenEdge } from "@/lib/auth-edge";

const PUBLIC_PATHS = ["/login", "/api/auth/refresh", "/api/auth/refresh-redirect"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!accessToken) {
    // No access token — try refresh if refresh token exists
    if (refreshToken && !pathname.startsWith("/api/")) {
      const refreshUrl = new URL("/api/auth/refresh-redirect", request.url);
      refreshUrl.searchParams.set("returnTo", pathname + request.nextUrl.search);
      return NextResponse.redirect(refreshUrl);
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await verifyAccessTokenEdge(accessToken);
    return NextResponse.next();
  } catch {
    // Access token expired or invalid — try refresh if refresh token exists
    if (refreshToken && !pathname.startsWith("/api/")) {
      const refreshUrl = new URL("/api/auth/refresh-redirect", request.url);
      refreshUrl.searchParams.set("returnTo", pathname + request.nextUrl.search);
      return NextResponse.redirect(refreshUrl);
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
