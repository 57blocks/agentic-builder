import "dotenv/config";

// Stripe server-side configuration.
//
// IMPORTANT: never hardcode `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` in
// source control — both are server-only secrets. The publishable key
// (`VITE_STRIPE_PUBLISHABLE_KEY`) is the only value safe to ship in the
// frontend bundle, and the Hosted Checkout flow does not even require it.
//
// `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` are the absolute URLs Stripe
// redirects the browser to after the Hosted Checkout page resolves. They
// must point at the FRONTEND origin (e.g. http://localhost:5173/checkout/success).
// `{CHECKOUT_SESSION_ID}` is a Stripe template token that gets substituted
// with the real session id, so the success page can poll payment status.

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Pin the API version so Stripe never silently changes the event/object shape
// under us. Bump deliberately after reading the Stripe changelog.
export const STRIPE_API_VERSION = process.env.STRIPE_API_VERSION || "2024-06-20";

export const STRIPE_SUCCESS_URL =
  process.env.STRIPE_SUCCESS_URL ||
  "http://localhost:5173/checkout/success?session_id={CHECKOUT_SESSION_ID}";
export const STRIPE_CANCEL_URL =
  process.env.STRIPE_CANCEL_URL || "http://localhost:5173/checkout/cancel";

/**
 * Boot-time / first-use audit for the Stripe credentials. Mirrors the
 * dev-warn / prod-throw policy of the base `config/env.ts#assertRequiredEnv`,
 * but stays self-contained so the base scaffold never imports this optional
 * module. Call from a payments handler (lazy) or from the worker bootstrap.
 */
export function assertStripeEnv(): void {
  const problems: string[] = [];
  if (!STRIPE_SECRET_KEY) {
    problems.push("STRIPE_SECRET_KEY is required (Stripe server secret key).");
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    problems.push(
      "STRIPE_WEBHOOK_SECRET is required to verify webhook signatures. " +
        "Get it from `stripe listen` (dev) or the Dashboard webhook endpoint (prod).",
    );
  }

  if (problems.length === 0) return;

  const message = problems.map((p) => `  • ${p}`).join("\n");
  if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.error(`[stripe-env] Fatal misconfiguration:\n${message}`);
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[stripe-env] Missing Stripe config:\n${message}`);
  }
}
