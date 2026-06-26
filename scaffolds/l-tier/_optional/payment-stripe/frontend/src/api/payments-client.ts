/**
 * Typed Stripe payments API client — provided by the `payment-stripe` overlay.
 *
 * Endpoints (backend `payments.routes.ts`):
 *   POST /payments/checkout-session         → { url, sessionId }
 *   GET  /payments/checkout-session/:id      → PaymentStatus
 *
 * ── Path contract ───────────────────────────────────────────────────────
 * `apiClient` prepends the FULL API mount prefix (API_BASE, default
 * `/api/v1`). Callers here pass ONLY the business path — never `/api` or
 * `/v1`. `PAYMENTS_BASE = "/payments"` + base `/api/v1` → the backend route
 * `/api/v1/payments/...`.
 */

import { apiClient } from "./client";

const PAYMENTS_BASE = "/payments";

export type PaymentMode = "payment" | "subscription";

export type PaymentStatusValue =
  | "pending"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded";

export interface CheckoutLineItem {
  /** Stripe Price id, e.g. "price_123". */
  price: string;
  quantity?: number;
}

export interface CreateCheckoutParams {
  mode?: PaymentMode;
  /** Either provide a list of line items… */
  lineItems?: CheckoutLineItem[];
  /** …or the single-item shorthand. */
  priceId?: string;
  quantity?: number;
  /** Optional DB user id to associate with the payment. */
  userId?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  /** Stripe Hosted Checkout URL — redirect the browser here. */
  url: string | null;
  sessionId: string;
}

export interface PaymentStatus {
  sessionId: string;
  status: PaymentStatusValue;
  mode: PaymentMode;
  amountTotal: number | null;
  currency: string | null;
}

export function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<CheckoutSessionResult> {
  return apiClient.post<CheckoutSessionResult, CreateCheckoutParams>(
    `${PAYMENTS_BASE}/checkout-session`,
    params,
  );
}

export function getCheckoutSession(sessionId: string): Promise<PaymentStatus> {
  return apiClient.get<PaymentStatus>(
    `${PAYMENTS_BASE}/checkout-session/${encodeURIComponent(sessionId)}`,
  );
}
