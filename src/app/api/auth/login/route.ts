import { NextRequest, NextResponse } from "next/server";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { isAllowedEmail } from "@/lib/auth-google";
import { upsertUser } from "@/lib/db/users.repo";

const MOCK_USERS: Record<string, string> = {
  "admin@57blocks.com": "agentic2024",
  "demo@57blocks.com": "demo1234",
};

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isAllowedEmail(normalizedEmail)) {
      return NextResponse.json(
        { message: "Only @57blocks.com accounts are allowed." },
        { status: 403 },
      );
    }

    const expected = MOCK_USERS[normalizedEmail];
    if (!expected || expected !== password) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    await upsertUser({
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0],
      picture: null,
      google_id: null,
    });

    const token = await signToken(normalizedEmail);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return res;
  } catch {
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}
