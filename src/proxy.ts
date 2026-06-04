import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

/** Routes that are always public (never redirected to /login) */
const PUBLIC_PATHS = ["/login", "/api/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(COOKIE_NAME)?.value ?? null;
  const payload = token ? await verifyToken(token) : null;

  // Already authenticated → redirect away from /login
  if (pathname.startsWith("/login")) {
    if (payload) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Always allow other public paths (e.g. /api/auth/*)
  if (isPublicPath(pathname)) return NextResponse.next();

  // Unauthenticated API calls → 401 JSON
  if (!payload && pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Unauthenticated page requests → redirect to /login
  if (!payload) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico).*)"],
};
