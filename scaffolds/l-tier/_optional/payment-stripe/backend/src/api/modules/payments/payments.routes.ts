/**
 * Stripe payments routes — provided by the `payment-stripe` optional scaffold.
 *
 * Registered against the root apiRouter (prefix `/api` on the base scaffold,
 * `/api/v1` once an auth overlay is applied). Sub-router paths are RELATIVE —
 * the prefix is applied once at the root. Final resolved paths (base):
 *   POST /api/payments/checkout-session
 *   GET  /api/payments/checkout-session/:sessionId
 *   POST /api/payments/webhook
 *
 * Wiring (worker must do this — see this overlay's README):
 *   import { registerPaymentRoutes } from "./payments/payments.routes";
 *   registerPaymentRoutes(apiRouter);
 */

import Router from "@koa/router";
import {
  createCheckoutSession,
  getCheckoutSession,
  handleStripeWebhook,
} from "./payments.controller";
import { createRateLimit } from "../../../middlewares/rateLimit";

// Creating a Checkout Session hits Stripe's API — rate-limit it to blunt
// abuse / runaway client loops. The webhook is intentionally NOT limited:
// it is called by Stripe, not end users.
const checkoutLimiter = createRateLimit({ windowMs: 60_000, max: 20 });

export function registerPaymentRoutes(router: Router): void {
  router.post("/payments/checkout-session", checkoutLimiter, createCheckoutSession);
  router.get("/payments/checkout-session/:sessionId", getCheckoutSession);
  // Webhook: NO auth, NO rate limit, NO envelope (handler sets skipEnvelope).
  router.post("/payments/webhook", handleStripeWebhook);
}
