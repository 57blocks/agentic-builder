/**
 * Next.js Instrumentation Hook
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Runs once when the Next.js server starts (both dev and production).
 * Used here to automatically run database migrations so new machines
 * don't need to manually execute `pnpm db:migrate`.
 */

export async function register() {
  // Only run in the Node.js runtime (not in Edge runtime / client)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await configureHttpProxy();

    try {
      const { runMigrations } = await import("./lib/db/migrate");
      await runMigrations();
    } catch (err) {
      // Log the error but don't crash the server — the app may still be
      // usable if the DB is temporarily unavailable.
      console.error(
        "[instrumentation] DB migration failed — ensure PostgreSQL is running " +
          "and DATABASE_URL is configured in .env.local\n",
        err,
      );
    }
  }
}

/**
 * Route Node's global `fetch` (undici) through an HTTP proxy when one is
 * configured via env. Node's built-in fetch does NOT honour `http_proxy` /
 * `https_proxy` env vars (unlike curl) nor the macOS system proxy — it only
 * uses the dispatcher we set here. Without this, all server-side LLM calls
 * (OpenRouter etc.) go out directly and bypass a local proxy.
 *
 * `EnvHttpProxyAgent` reads `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` (and the
 * lowercase variants) itself, so it also respects the `no_proxy` bypass list.
 * Note: only HTTP(S) proxy URLs are supported — a `socks5h://` ALL_PROXY is
 * ignored by undici, so set HTTP(S)_PROXY to the proxy's http port.
 */
async function configureHttpProxy(): Promise<void> {
  const proxy =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  if (!proxy) return;

  try {
    const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
    setGlobalDispatcher(new EnvHttpProxyAgent());
    console.log(`[instrumentation] HTTP proxy enabled for fetch → ${proxy}`);
  } catch (err) {
    console.error(
      "[instrumentation] Failed to configure HTTP proxy for fetch — " +
        "server-side requests will go out directly.\n",
      err,
    );
  }
}
