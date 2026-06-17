---
id: payment-integration
agent: backend
version: v1
description: "Payment integration: PCI scope, tokenization, idempotency keys, webhook handling, reconciliation, disputes"
priority: 50
excludes: []
trigger:
  type: composite
  prefilter:
    type: regex
    match: both
    any_of:
      - payment integration
      - payment
      - integration
  confirm:
    type: llm
    match: both
    prompt: "Decide whether this project needs the \"payment-integration\" engineering skill. That skill applies when: Payment integration: PCI scope, tokenization, idempotency keys, webhook handling, reconciliation, disputes Answer YES only if the PRD/TRD clearly exhibits this need; quote the supporting line."
---

Language-agnostic reference for integrating with payment providers (Stripe, Braintree, Adyen, etc.) correctly, safely, and reliably.

---

## Decision Rules

### Never Touch Raw Card Data

- Do not accept, transmit, or store raw card numbers (PANs), CVVs, or full magnetic stripe data on your servers
- Use the provider's hosted UI components (Stripe Elements, Braintree Drop-in, Adyen Web Components) to collect card data directly in the client — the data goes to the provider, not your server
- Your server receives only a token or payment method ID representing the card
- This is the primary mechanism for reducing PCI DSS scope — if raw card data never touches your infrastructure, you qualify for the simplest compliance tier (SAQ A)
- Never log, store, or pass card numbers through your backend even "temporarily"

---

### Authorization vs. Capture

Most providers separate the charge into two steps:

- **Authorize (auth):** Verifies the card and reserves the funds. No money moves.
- **Capture:** Settles the authorized amount. Money moves.

Rules:
- Use auth + capture when the final amount is not known at authorization time (e.g., hotel holds, marketplaces)
- Capture within the provider's authorization window (typically 7 days for Stripe; varies by provider and card network) — uncaptured auths expire and the reservation is released
- Use a single-step charge (auth + immediate capture) for fixed-price purchases where you are ready to fulfill immediately
- Partial capture is supported by most providers — capture less than the authorized amount when the final amount differs

---

### Idempotency Keys on Every Mutating Call

Payment API calls must be idempotent. Network timeouts and retries are inevitable; a retry without an idempotency key creates a duplicate charge.

- Generate a unique idempotency key per logical payment operation before the first attempt
- Use the same key on all retries of the same operation
- Key must be derived from a stable identifier (order ID, payment attempt ID) — not a random UUID generated at call time
- Most providers accept an `Idempotency-Key` header:
  ```
  POST /v1/payment_intents
  Idempotency-Key: order_8821_attempt_1
  ```
- Store the key with the payment record so retries reuse it
- Keys are scoped per API key/account on the provider side; they are not globally unique across customers

---

### Webhook Handling

Payment outcomes are often asynchronous. The provider sends webhooks to notify you of events (payment succeeded, payment failed, dispute opened, refund processed).

**Verify every webhook signature before processing:**
- Providers sign webhook payloads with a secret (Stripe: `Stripe-Signature` header + HMAC-SHA256)
- Verify the signature using the provider's SDK or the documented algorithm before trusting the payload
- Reject any webhook that fails signature verification with a 400
- Never process a webhook based solely on the payload contents without verifying the signature — an attacker can send forged events

**Acknowledge before processing:**
- Return `200 OK` to the provider as quickly as possible — before doing any database writes or business logic
- Providers retry webhooks if they do not receive a 2xx within a timeout (Stripe retries for 3 days)
- Process the webhook asynchronously after acknowledging: put it on an internal queue, then return 200
- If processing fails after acknowledging, rely on the provider's retry or implement your own reprocessing from a stored webhook log

**Make webhook handlers idempotent:**
- Providers deliver webhooks at-least-once — the same event can arrive multiple times
- Use the event ID from the payload to deduplicate: check a processed-events store before acting
- Deduplication key: `provider_event_id` (e.g., Stripe's `evt_...` ID)

**Handle webhooks in the right order:**
- Events can arrive out of order (a `payment_intent.succeeded` before `payment_intent.created` is possible under retries)
- Check current state in your DB before applying an event; do not blindly apply transitions
- Use a state machine for payment status — only apply valid transitions

---

### Payment States

Model payment state explicitly. A minimal state machine:

```
PENDING → AUTHORIZED → CAPTURED (success)
PENDING → AUTHORIZED → CANCELLED
PENDING → FAILED
CAPTURED → REFUNDED (partial or full)
CAPTURED → DISPUTED
```

Rules:
- Store the provider's payment/charge/intent ID alongside your internal record
- Store the raw webhook event payload for auditability — you will need it for debugging and reconciliation
- Never derive payment status solely from your DB without reconciling against the provider — your DB can be wrong
- Record every state transition with a timestamp and the source (webhook event ID, API call)

---

### Reconciliation

Your internal records and the provider's ledger will diverge. Reconcile regularly.

- Run a daily reconciliation job: compare your captured payments against the provider's transaction list for the same period
- Flag discrepancies: charges in the provider but not your DB, charges in your DB marked captured but not in the provider
- Use the provider's reporting API or downloadable transaction CSV — do not rely solely on webhooks for reconciliation (webhooks can be missed or delayed)
- Reconciliation is the safety net; do not skip it because you think your webhook handling is reliable

---

### Refunds

- Initiate refunds via the provider API, not by directly crediting the customer's bank account
- Store the refund record with the provider's refund ID and the original charge ID
- Partial refunds are supported by most providers — track the refunded amount to prevent over-refunding
- A refund on a disputed charge may complicate the dispute — check provider rules before refunding a disputed payment
- Refund webhooks are asynchronous — a refund API call succeeds immediately but the funds may take days to appear; update status on the webhook event, not the API response alone

---

### Disputes and Chargebacks

_…(truncated for prompt budget — full reference lives in the Engineering source)_
