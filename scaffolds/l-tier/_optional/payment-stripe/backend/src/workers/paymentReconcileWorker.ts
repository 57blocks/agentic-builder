/**
 * OPTIONAL reference worker — payment post-processing.
 *
 * Demonstrates how to move HEAVY post-payment business logic (fulfilment,
 * granting entitlements, sending receipts, reconciling against an external
 * ledger) OFF the synchronous webhook path. Per the L-tier README §7.3, the
 * HTTP webhook handler must stay fast and idempotent — it should only update
 * `Payment.status` and ack Stripe. Anything slow belongs in a queue job.
 *
 * THIS WORKER IS NOT REGISTERED BY DEFAULT. To activate it:
 *   1. In `src/workers/index.ts#startAllWorkers()` call
 *      `registerPaymentReconcileWorker()`.
 *   2. In `payments.controller.ts#handleStripeWebhook`, after persisting the
 *      status, enqueue: `await enqueueJob(PAYMENT_RECONCILE_QUEUE, { paymentId })`.
 *
 * Leaving it unregistered keeps the base flow (synchronous status update) as
 * the zero-infra default.
 */

import { registerWorker } from "../queue";
import { childLogger } from "../config/logger";
import { Payment } from "../models/Payment";

export interface PaymentReconcileJobData {
  paymentId: string;
}

export interface PaymentReconcileJobResult {
  paymentId: string;
  status: string | null;
}

const QUEUE_NAME = "payment-reconcile";

export function registerPaymentReconcileWorker(): void {
  registerWorker<PaymentReconcileJobData, PaymentReconcileJobResult>(
    QUEUE_NAME,
    async (job) => {
      const { paymentId } = job.data;
      const log = childLogger({ queueName: QUEUE_NAME, jobId: job.id, paymentId });

      const payment = await Payment.findByPk(paymentId);
      if (!payment) {
        // Missing row is a normal, non-fatal state — return instead of throw.
        log.info("payment row not found; nothing to reconcile");
        return { paymentId, status: null };
      }

      // TODO(worker): implement real fulfilment here — e.g. grant access,
      // create a license, send a receipt email, write to an external ledger.
      // Keep it idempotent: this job may run more than once for the same id.
      log.info({ status: payment.status }, "payment reconciled");

      return { paymentId, status: payment.status };
    },
  );
}

export { QUEUE_NAME as PAYMENT_RECONCILE_QUEUE };
