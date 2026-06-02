# `payment-stripe` — Stripe payments (Hosted Checkout + webhooks)

This optional feature wires up a generic Stripe payment capability: the backend
creates a **Stripe Hosted Checkout Session** and the frontend redirects to it.
It supports both one-time payments (`mode=payment`) and subscriptions
(`mode=subscription`). No client-side Stripe.js SDK is required — the browser
just follows the session `url`.

## Triggers

The codegen pipeline copies this feature into the generated project when ANY
of these env vars appears in `.blueprint/resource-requirements.json`:

- `STRIPE_SECRET_KEY` (server)
- `STRIPE_WEBHOOK_SECRET` (server)
- `VITE_STRIPE_PUBLISHABLE_KEY` (frontend bundle — optional for Hosted Checkout)

## Files copied (when applied)

### Backend

| Path | Purpose |
|------|---------|
| `backend/src/config/stripe-env.ts`                              | Reads `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` / `STRIPE_API_VERSION`. `assertStripeEnv()` dev-warns / prod-exits. NEVER hardcoded. |
| `backend/src/stripe/client.ts`                                  | Lazy-init singleton `Stripe` client (`getStripe()`). |
| `backend/src/models/Payment.ts`                                 | `Payment` model. Money stored as INTEGER (smallest currency unit). `userId` is nullable. |
| `backend/src/models/PaymentEvent.ts`                            | `PaymentEvent` model. `stripeEventId` UNIQUE = webhook idempotency key. |
| `backend/src/api/modules/payments/payments.controller.ts`       | `createCheckoutSession` / `getCheckoutSession` / `handleStripeWebhook`. |
| `backend/src/api/modules/payments/payments.routes.ts`           | `registerPaymentRoutes(apiRouter)` — relative paths only. |
| `backend/src/workers/paymentReconcileWorker.ts`                 | OPTIONAL reference worker for heavy post-payment fulfilment. Not registered by default. |

### Frontend

| Path | Purpose |
|------|---------|
| `frontend/src/api/payments-client.ts` | Typed wrapper over `apiClient` — `createCheckoutSession` / `getCheckoutSession`. |
| `frontend/src/hooks/usePayments.ts`   | `usePayments()` hook (exports `UsePaymentsReturn`) — `startCheckout()` redirects to Stripe. |

## Deps appended (via manifest)

- `backend`: `stripe` `^17.0.0`
- `frontend`: none (Hosted Checkout needs no client SDK).

## Hard rules for workers (READ THIS FIRST)

1. **Verify webhooks with `ctx.request.rawBody`, never `ctx.request.body`.**
   Stripe's signature is computed over the exact raw bytes. The base
   `koa-bodyparser` already exposes `ctx.request.rawBody` (see
   `backend/src/types/koa.d.ts`), so the global body parser is fine — do NOT
   add a route-level raw parser and do NOT overwrite `app.ts`.

2. **The webhook handler MUST set `ctx.state.skipEnvelope = true`** and return
   a bare `200` (ack) or `400` (bad signature). Stripe only inspects the HTTP
   status code — wrapping the body in `{ ok, data }` is harmless but the
   status code is what matters; never `throw` for a handled-but-irrelevant
   event (that yields a 500 and Stripe will retry forever).

3. **Idempotency via `PaymentEvent.stripeEventId` UNIQUE.** Stripe re-delivers
   events. The handler inserts the event row FIRST; a unique-violation means
   "already processed → ack and return". Do not move side effects before this
   insert.

4. **Money is an INTEGER in the smallest currency unit (cents).** Mirror
   Stripe's `amount_total` verbatim. Never use a float column or divide by 100
   before persisting.

5. **`Payment.userId` is nullable and has no Sequelize association.** This
   keeps the overlay usable with zero auth scaffolds. When an auth scaffold IS
   present, resolve `ctx.state.user.id` to a DB user row first, then store that
   row's `id` (for OAuth providers `ctx.state.user.id` is the external id, NOT
   a DB primary key).

6. **Keep the webhook fast; push heavy work to the queue.** The handler should
   only update `Payment.status` and ack. Fulfilment / receipts / ledger writes
   belong in `paymentReconcileWorker.ts` (enqueue from the handler).

## What the worker still has to wire up

Because this overlay does NOT overwrite shared files (`app.ts`,
`api/modules/index.ts`, `models/index.ts`, `workers/index.ts`) — they may also
be owned by an auth overlay — the worker must add a few lines after the files
land:

1. **Register the routes** in `backend/src/api/modules/index.ts`, inside
   `createApiRouter()`:
   ```ts
   import { registerPaymentRoutes } from "./payments/payments.routes";
   // …
   registerPaymentRoutes(apiRouter);
   ```

2. **Export the models** from `backend/src/models/index.ts` so `syncModels()`
   creates the tables:
   ```ts
   export { Payment } from "./Payment";
   export { PaymentEvent } from "./PaymentEvent";
   ```
   (On the bare base scaffold `models/index.ts` only defines `syncModels()`;
   add these re-exports OR import the model files there so they are loaded
   before `sequelize.sync()` runs.)

3. **Fill `backend/.env`:**
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_SUCCESS_URL=http://localhost:5173/checkout/success?session_id={CHECKOUT_SESSION_ID}
   STRIPE_CANCEL_URL=http://localhost:5173/checkout/cancel
   ```

4. **(Optional) activate the reconcile worker** — register it in
   `startAllWorkers()` and enqueue from the webhook handler. See the file
   header for the two-line change.

5. **Mind the API prefix.** Routes register on relative paths, so the final
   URL is `/api/payments/...` on the base scaffold and `/api/v1/payments/...`
   once an auth overlay mounts the router at `/api/v1`. If you use the
   versioned prefix, update `PAYMENTS_BASE` in
   `frontend/src/api/payments-client.ts` to `"/v1/payments"`.

## Local testing

```bash
# Forward Stripe events to the local webhook and print the signing secret:
stripe listen --forward-to localhost:4000/api/payments/webhook
# (use /api/v1/payments/webhook when an auth overlay is applied)

# In another shell, simulate a completed checkout:
stripe trigger checkout.session.completed
```

Assert: signature verifies, `PaymentEvent` is inserted once (re-trigger does
not duplicate side effects), and the matching `Payment.status` flips to `paid`.

## When NOT applied

The base scaffold ships no payment code. Projects that don't declare any
Stripe env key never receive these files, keeping the base `.env` free of
payment secrets.
