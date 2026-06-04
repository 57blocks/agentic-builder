import { NextResponse } from "next/server";
import {
  generatePkce,
  generateState,
  buildStateCookieValue,
  OAUTH_STATE_COOKIE,
} from "@/lib/auth-google";

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ??
  "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  "http://localhost:3000/api/auth/callback/google";

export async function GET() {
  const { code_verifier, code_challenge } = await generatePkce();
  const state = generateState();

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    code_challenge,
    code_challenge_method: "S256",
    state,
    access_type: "offline",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(OAUTH_STATE_COOKIE, buildStateCookieValue(state, code_verifier), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return res;
}
