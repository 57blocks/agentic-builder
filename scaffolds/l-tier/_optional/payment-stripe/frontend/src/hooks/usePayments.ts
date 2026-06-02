/**
 * usePayments — initiates a Stripe Hosted Checkout and redirects the browser.
 *
 * Provided by the `payment-stripe` overlay. Follows the L-tier hook hard rule
 * (README §4.4): exports an explicit `UsePaymentsReturn` interface so views
 * never guess the shape.
 *
 *   const { startCheckout, loading, error } = usePayments();
 *   await startCheckout({ priceId: "price_123", mode: "payment" });
 *
 * `startCheckout` calls the backend, then performs a full-page redirect to
 * the Stripe-hosted URL. It does NOT resolve normally on success because the
 * browser navigates away; it only returns/throws when the request fails
 * before redirect.
 */

import { useCallback, useState } from "react";
import {
  createCheckoutSession,
  type CreateCheckoutParams,
} from "../api/payments-client";

export interface UsePaymentsReturn {
  /** Create a checkout session and redirect to Stripe. */
  startCheckout: (params: CreateCheckoutParams) => Promise<void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function usePayments(): UsePaymentsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const startCheckout = useCallback(
    async (params: CreateCheckoutParams): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const { url } = await createCheckoutSession(params);
        if (!url) {
          throw new Error("Stripe did not return a checkout URL.");
        }
        // Full-page redirect to the Stripe-hosted payment page.
        window.location.assign(url);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start checkout.";
        setError(message);
        setLoading(false);
        throw err;
      }
    },
    [],
  );

  return { startCheckout, loading, error, clearError };
}
