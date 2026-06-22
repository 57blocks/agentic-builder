import { NextRequest, NextResponse } from "next/server";
import { verifyToken, signToken, COOKIE_NAME } from "@/lib/auth";

/** Routes that are always public (never redirected to /login) */
const PUBLIC_PATHS = ["/login", "/api/auth"];

/**
 * Dev-only login bypass. NEVER active in production (NODE_ENV guard) and only
 * when explicitly opted in via DEV_AUTH_BYPASS=1. Lets a developer reach the
 * whole app without Google OAuth or a configured DB by auto-issuing a dev
 * session. Do NOT set this env var in any deployed environment.
 */
const DEV_AUTH_BYPASS =
  process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "1";

const DEV_BYPASS_EMAIL = "dev@57blocks.com";

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(COOKIE_NAME)?.value ?? null;
  const payload = token ? await verifyToken(token) : null;

  // Dev-only auto-login: issue a session cookie and let the request through.
  // EXCEPT when the user explicitly navigates to /login — otherwise logout
  // (which clears the cookie then routes to /login) would immediately be
  // re-authenticated and bounced back to "/", making logout impossible.
  if (!payload && DEV_AUTH_BYPASS && !pathname.startsWith("/login")) {
    const res = NextResponse.next();
    const devToken = await signToken(DEV_BYPASS_EMAIL);
    res.cookies.set(COOKIE_NAME, devToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return res;
  }

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
