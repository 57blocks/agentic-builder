import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(COOKIE_NAME)?.value ?? null;
  const payload = token ? await verifyToken(token) : null;

  // Already logged in → redirect away from /login
  if (pathname.startsWith("/login")) {
    if (payload) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Unauthenticated API calls → 401 JSON (don't redirect, it breaks fetch consumers)
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
  // Exclude: auth API routes, Next.js internals, static files
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico).*)"],
};
