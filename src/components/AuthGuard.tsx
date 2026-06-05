"use client";

import { useEffect, useRef } from "react";

export function AuthGuard() {
  const redirectingRef = useRef(false);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const res = await originalFetch.apply(this, args);

      if (res.status === 401 && !redirectingRef.current) {
        const url =
          typeof args[0] === "string"
            ? args[0]
            : args[0] instanceof URL
              ? args[0].href
              : args[0] instanceof Request
                ? args[0].url
                : "";

        // Only handle internal API calls, never touch auth endpoints
        const isInternalApi =
          (url.startsWith("/api/") ||
            url.startsWith(window.location.origin + "/api/")) &&
          !url.includes("/api/auth/");

        if (isInternalApi && !window.location.pathname.startsWith("/login")) {
          // Verify the session is actually expired before redirecting.
          // A 401 from a proxy/upstream service should not kick the user out.
          try {
            const meRes = await originalFetch("/api/auth/me");
            if (meRes.status === 401) {
              redirectingRef.current = true;
              window.location.href = "/login";
            }
          } catch {
            // network error — don't redirect
          }
        }
      }

      return res;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
