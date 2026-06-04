export const ALLOWED_DOMAIN = "@57blocks.com";
export const OAUTH_STATE_COOKIE = "oauth_state";

export function isAllowedEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return lower.endsWith(ALLOWED_DOMAIN) && lower.indexOf("@") > 0;
}

export async function generatePkce(): Promise<{
  code_verifier: string;
  code_challenge: string;
}> {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const code_verifier = Buffer.from(verifierBytes).toString("base64url");

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code_verifier),
  );
  const code_challenge = Buffer.from(digest).toString("base64url");

  return { code_verifier, code_challenge };
}

export function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Buffer.from(bytes).toString("hex");
}

/** Builds the oauth_state cookie value. Invariant: state and code_verifier must not contain ':' (generateState returns hex, generatePkce returns base64url — both are colon-free). */
export function buildStateCookieValue(state: string, code_verifier: string): string {
  return `${state}:${code_verifier}`;
}

export function parseStateCookie(
  value: string,
): { state: string; code_verifier: string } | null {
  if (!value) return null;
  const colonIdx = value.indexOf(":");
  if (colonIdx === -1) return null;
  const state = value.slice(0, colonIdx);
  const code_verifier = value.slice(colonIdx + 1);
  if (!state || !code_verifier) return null;
  return { state, code_verifier };
}

export interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

/** Decodes the payload segment of a Google id_token. Does NOT verify the RS256 signature or expiry — callers must obtain the token from a trusted source (e.g. Google's token endpoint over HTTPS). */
export function decodeIdToken(idToken: string): GoogleIdTokenPayload | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    ) as Partial<GoogleIdTokenPayload>;
    if (!payload.email || !payload.sub) return null;
    if (payload.email_verified === false) return null;
    return payload as GoogleIdTokenPayload;
  } catch {
    return null;
  }
}
