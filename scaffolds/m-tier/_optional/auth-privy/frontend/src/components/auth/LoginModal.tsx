/**
 * LoginModal — Privy variant.
 *
 * Overwrites the base email+password modal. The flow:
 *   1. User clicks "Continue" → `usePrivy().login()` opens Privy's hosted
 *      auth modal (provider list controlled by `PrivyProvider` config).
 *   2. When Privy reports `authenticated`, we read the access token via
 *      `getAccessToken()` and forward it to the parent via
 *      `onLogin?.(privyToken)`.
 *   3. Parent typically does:
 *         await apiClient.post("/auth/verify", { token });
 *         useAuth().login(privyToken); // or returned internal JWT
 *      and then closes the modal.
 *
 * If you prefer to skip the explicit `/auth/verify` exchange, mount
 * `usePrivyAuthBridge()` somewhere in the tree — it auto-syncs the Privy
 * token into `AuthContext` and the backend `privyAuthMiddleware` will
 * verify it on every request.
 */

import React, { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from "@/components/ui";

export type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  /** Receive the Privy access token after successful OAuth. */
  onLogin?: (privyToken: string) => Promise<void> | void;
};

export const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  onLogin,
}) => {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When Privy reports authenticated while the modal is open, fetch the
  // access token and forward it to the parent. Then close the modal.
  useEffect(() => {
    if (!open || !authenticated) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Privy did not return an access token");
        if (onLogin) await onLogin(token);
        if (!cancelled) onClose();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Login failed");
          // Roll the Privy session back so the user can retry cleanly.
          try {
            await logout();
          } catch {
            /* ignore */
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, authenticated, getAccessToken, logout, onClose, onLogin]);

  function handleProviderClick() {
    setError(null);
    try {
      login();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start login");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>Pick a provider to continue</DialogDescription>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <p className="font-medium">Authentication failed</p>
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            disabled={!ready || loading}
            onClick={handleProviderClick}
          >
            {loading ? "Connecting…" : "Continue with OAuth"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Privy will let you pick from the configured providers (Google,
            Email, Twitter, …). Adjust <code>loginMethods</code> in{" "}
            <code>providers/PrivyProvider.tsx</code> to match your PRD.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Protected by Privy
        </p>
      </DialogContent>
    </Dialog>
  );
};
