import { NextRequest, NextResponse } from "next/server";
import {
  parseStateCookie,
  decodeIdToken,
  isAllowedEmail,
  OAUTH_STATE_COOKIE,
} from "@/lib/auth-google";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { upsertUser } from "@/lib/db/users.repo";

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ??
  "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  "http://localhost:3000/api/auth/callback/google";

function errorRedirect(req: NextRequest, error: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  const res = NextResponse.redirect(url);
  // Clear stale state cookie
  res.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  if (!code || !stateParam) {
    return errorRedirect(req, "oauth");
  }

  // Verify CSRF state
  const stateCookieRaw = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!stateCookieRaw) {
    return errorRedirect(req, "state");
  }
  const parsed = parseStateCookie(stateCookieRaw);
  if (!parsed || parsed.state !== stateParam) {
    return errorRedirect(req, "state");
  }

  // Exchange authorization code for tokens
  let idToken: string;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
        code_verifier: parsed.code_verifier,
      }),
    });
    if (!tokenRes.ok) {
      return errorRedirect(req, "oauth");
    }
    const tokenData = (await tokenRes.json()) as { id_token?: string };
    if (!tokenData.id_token) {
      return errorRedirect(req, "oauth");
    }
    idToken = tokenData.id_token;
  } catch {
    return errorRedirect(req, "oauth");
  }

  // Decode id_token payload
  const googlePayload = decodeIdToken(idToken);
  if (!googlePayload) {
    return errorRedirect(req, "oauth");
  }

  // Domain check — must be @57blocks.com
  if (!isAllowedEmail(googlePayload.email)) {
    return errorRedirect(req, "domain");
  }

  // Persist user
  await upsertUser({
    email: googlePayload.email,
    name: googlePayload.name ?? null,
    picture: googlePayload.picture ?? null,
    google_id: googlePayload.sub,
  });

  // Mint auth token
  const authToken = await signToken(googlePayload.email);

  const res = NextResponse.redirect(new URL("/", req.url));

  // Clear OAuth state cookie
  res.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Set session cookie
  res.cookies.set(COOKIE_NAME, authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return res;
}
