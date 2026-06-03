/**
 * Stripe payments controller — Hosted Checkout flow.
 *
 * Endpoints (registered in payments.routes.ts, mounted under the root
 * apiRouter prefix — `/api` on the base scaffold, `/api/v1` once an auth
 * overlay is applied):
 *
 *   POST /payments/checkout-session         → createCheckoutSession
 *   GET  /payments/checkout-session/:id     → getCheckoutSession
 *   POST /payments/webhook                  → handleStripeWebhook
 *
 * Design notes:
 *   - Hosted Checkout: we ask Stripe to host the payment page and return its
 *     `url`; the frontend just redirects. No client-side Stripe.js SDK.
 *   - Persistence: every session is mirrored into the `Payment` table so the
 *     success page can poll status without re-hitting Stripe, and so webhooks
 *     have a row to mutate.
 *   - The webhook is the SOURCE OF TRUTH for final status — never mark a
 *     payment `paid` from the browser redirect alone (the user can fake it).
 */

import type Stripe from "stripe";
import type { AppContext } from "../../../types/koa";
import { Errors } from "../../../middlewares/errorHandler";
import { childLogger } from "../../../config/logger";
import { getStripe } from "../../../stripe/client";
import {
  STRIPE_SUCCESS_URL,
  STRIPE_CANCEL_URL,
  STRIPE_WEBHOOK_SECRET,
} from "../../../config/stripe-env";
import { Payment, type PaymentMode } from "../../../models/Payment";
import { PaymentEvent } from "../../../models/PaymentEvent";

interface CheckoutLineItem {
  price?: string;
  quantity?: number;
}

interface CreateCheckoutBody {
  mode?: PaymentMode;
  /** Pre-built Stripe line items: `[{ price: "price_123", quantity: 1 }]`. */
  lineItems?: CheckoutLineItem[];
  /** Convenience shorthand for a single line item. */
  priceId?: string;
  quantity?: number;
  /** Optional DB user id to associate (resolve from ctx.state.user first). */
  userId?: string;
  /** Arbitrary metadata forwarded to Stripe AND persisted on the Payment. */
  metadata?: Record<string, string>;
}

function normaliseLineItems(
  body: CreateCheckoutBody,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  if (Array.isArray(body.lineItems) && body.lineItems.length > 0) {
    return body.lineItems
      .filter((li): li is CheckoutLineItem => Boolean(li && li.price))
      .map((li) => ({ price: String(li.price), quantity: li.quantity ?? 1 }));
  }
  if (body.priceId) {
    return [{ price: body.priceId, quantity: body.quantity ?? 1 }];
  }
  return [];
}

export async function createCheckoutSession(ctx: AppContext): Promise<void> {
  const body = (ctx.request.body ?? {}) as CreateCheckoutBody;
  const mode: PaymentMode = body.mode === "subscription" ? "subscription" : "payment";
  const lineItems = normaliseLineItems(body);

  if (lineItems.length === 0) {
    throw Errors.BadRequest(
      "At least one line item is required (provide `priceId` or a non-empty `lineItems` array).",
    );
  }

  const log = childLogger({ feature: "payments", mode });

  const session = await getStripe().checkout.sessions.create({
    mode,
    line_items: lineItems,
    success_url: STRIPE_SUCCESS_URL,
    cancel_url: STRIPE_CANCEL_URL,
    metadata: body.metadata ?? {},
  });

  await Payment.create({
    userId: body.userId ?? null,
    stripeSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripeCustomerId:
      typeof session.customer === "string" ? session.customer : null,
    mode,
    status: "pending",
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
    metadata: body.metadata ?? {},
  });

  log.info({ stripeSessionId: session.id }, "checkout session created");

  // `url` is null only for non-redirect session types we don't use here.
  ctx.body = { url: session.url, sessionId: session.id };
}

export async function getCheckoutSession(ctx: AppContext): Promise<void> {
  const sessionId = String(ctx.params.sessionId ?? "").trim();
  if (!sessionId) throw Errors.BadRequest("sessionId is required");

  const payment = await Payment.findOne({
    where: { stripeSessionId: sessionId },
  });
  if (!payment) throw Errors.NotFound("Payment not found for this session");

  ctx.body = {
    sessionId: payment.stripeSessionId,
    status: payment.status,
    mode: payment.mode,
    amountTotal: payment.amountTotal,
    currency: payment.currency,
  };
}

/**
 * Maps a Stripe event type to the new Payment.status. Returns undefined for
 * events we observe but don't act on.
 */
function statusForEvent(type: string): Payment["status"] | undefined {
  switch (type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "payment_intent.succeeded":
      return "paid";
    case "checkout.session.async_payment_failed":
    case "payment_intent.payment_failed":
      return "failed";
    case "checkout.session.expired":
      return "canceled";
    case "charge.refunded":
      return "refunded";
    default:
      return undefined;
  }
}

/** Best-effort extraction of the checkout session id from an event object. */
function sessionIdFromEvent(event: Stripe.Event): string | null {
  const obj = event.data.object as Record<string, unknown>;
  if (typeof obj.id === "string" && event.type.startsWith("checkout.session.")) {
    return obj.id;
  }
  // For payment_intent.* / charge.* events the session id is not on the
  // object; fall back to the payment_intent id which we also store.
  return null;
}

export async function handleStripeWebhook(ctx: AppContext): Promise<void> {
  // Stripe only inspects the HTTP status code — never wrap this response in
  // the { ok, data } envelope.
  ctx.state.skipEnvelope = true;

  const signature = ctx.request.headers["stripe-signature"];
  const rawBody = ctx.request.rawBody;

  if (!signature || typeof signature !== "string" || !rawBody) {
    ctx.status = 400;
    ctx.body = "Missing signature or raw body";
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    ctx.state.log?.warn({ err }, "stripe webhook signature verification failed");
    ctx.status = 400;
    ctx.body = `Webhook signature verification failed: ${message}`;
    return;
  }

  const log = childLogger({ feature: "payments-webhook", stripeEventId: event.id, type: event.type });

  // Idempotency: insert the event row first. Stripe retries delivery, so a
  // duplicate event id means we already handled it — ack and return.
  try {
    await PaymentEvent.create({
      stripeEventId: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });
  } catch (err) {
    // Unique-violation on stripe_event_id → already processed.
    log.info("duplicate webhook event ignored");
    ctx.status = 200;
    ctx.body = { received: true, duplicate: true };
    return;
  }

  const nextStatus = statusForEvent(event.type);
  if (nextStatus) {
    const obj = event.data.object as Record<string, unknown>;
    const sessionId = sessionIdFromEvent(event);
    const paymentIntentId =
      typeof obj.payment_intent === "string"
        ? obj.payment_intent
        : event.type.startsWith("payment_intent.") && typeof obj.id === "string"
          ? obj.id
          : null;

    const where = sessionId
      ? { stripeSessionId: sessionId }
      : paymentIntentId
        ? { stripePaymentIntentId: paymentIntentId }
        : null;

    if (where) {
      const payment = await Payment.findOne({ where });
      if (payment) {
        payment.status = nextStatus;
        if (paymentIntentId && !payment.stripePaymentIntentId) {
          payment.stripePaymentIntentId = paymentIntentId;
        }
        await payment.save();
        log.info({ paymentId: payment.id, status: nextStatus }, "payment status updated");
      } else {
        // No matching Payment row is a valid state (e.g. a session created
        // out-of-band). Do NOT throw — ack so Stripe stops retrying.
        log.info("no matching payment row for event");
      }
    }
  }

  ctx.status = 200;
  ctx.body = { received: true };
}
