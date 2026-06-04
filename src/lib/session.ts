import { type NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getUserIdByEmail } from "@/lib/db/users.repo";

/** Returns the email of the currently authenticated user, or null if no valid token. */
export async function getCurrentUserEmail(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.sub ?? null;
}

/** Resolves the DB user.id for the currently authenticated user, or null. */
export async function resolveUserId(req: NextRequest): Promise<string | null> {
  const email = await getCurrentUserEmail(req);
  if (!email) return null;
  return getUserIdByEmail(email);
}
