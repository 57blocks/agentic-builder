import Stripe from "stripe";
import { STRIPE_SECRET_KEY, STRIPE_API_VERSION } from "../config/stripe-env";

/**
 * Lazy-initialised singleton Stripe client.
 *
 * Mirrors the `privy/client.ts` pattern: the module can be imported without
 * side effects (no network, no key validation) and the real client is only
 * constructed on first use. This keeps `tsx watch` / test imports cheap and
 * means a project that copied the overlay but hasn't filled `.env` yet still
 * boots — the error surfaces at the first payments request instead of at
 * module load.
 */
let _client: Stripe | null = null;

export function getStripe(): Stripe {
  if (_client) return _client;
  if (!STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is required. Set it in your environment before calling any payments endpoint.",
    );
  }
  _client = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
  });
  return _client;
}
