import React from "react";

/**
 * Default landing page mounted at the root route `/`.
 *
 * Guarantees a freshly-scaffolded app renders REAL content at `/` instead of
 * falling through to the `*` catch-all (NotFound) — this is the "Root route
 * MUST resolve" HARD RULE baked into the scaffold so coding agents don't have
 * to be reminded of it. REPLACE this with the project's actual home /
 * dashboard page, keeping the root route resolving to a real view.
 */
export const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold text-text-primary">Welcome</h1>
        <p className="mt-3 text-text-secondary">
          Your app is running. Replace this page with your real home view.
        </p>
      </div>
    </div>
  );
};
