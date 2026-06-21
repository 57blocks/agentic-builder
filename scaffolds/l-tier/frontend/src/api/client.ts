/**
 * Canonical HTTP client. Every feature module's `api/*.ts` MUST import from
 * here — view code is forbidden from importing `apiClient` directly (see
 * the `no-direct-apiclient` self-heal lint).
 *
 * Two contracts live in this file. Both have to stay in lock-step with
 * the backend, or auth breaks and screens render blank.
 *
 * ── Envelope contract (must match backend/src/middlewares/) ─────────
 *
 *   success → 2xx → { ok: true, data: <T> }       (responseEnvelope.ts)
 *   error   → 4xx/5xx → { ok: false, error: {     (errorHandler.ts)
 *                          code: string,
 *                          message: string,
 *                          details?: unknown } }
 *
 * `apiClient.get<User>("/users/me")` returns the inner `User`, NOT the
 * envelope — auto-unwrap is the default. The full envelope is reachable
 * via `apiClient.raw.get<...>()` for diagnostics, streaming, or callers
 * that need `ok`/`error` directly. Error envelopes are translated into
 * thrown `ApiError` instances carrying `status` + `code`.
 *
 * ── Path contract (ONE rule, no mental math) ───────────────────────
 *
 *   API_BASE = "/api/v1"  (default — the FULL API mount prefix, baked in
 *   here ONCE). Override in production via VITE_API_BASE_URL.
 *
 *   Callers pass ONLY the business path — NEVER include `/api` or `/v1`.
 *   To get a caller path from an API_CONTRACTS.json endpoint, strip the
 *   `/api/v1` prefix: contract `/api/v1/users/me` → call `"/users/me"`.
 *
 *   ✅ `apiClient.get("/users/me")`  → final URL `/api/v1/users/me`
 *   ❌ `apiClient.get("/api/v1/users/me")`  → `/api/v1/api/v1/users/me` (404)
 *   ❌ `apiClient.get("/v1/users/me")`      → `/api/v1/v1/users/me` (404)
 *
 * ── Token contract ─────────────────────────────────────────────────
 *
 *   Token is read from localStorage[TOKEN_STORAGE_KEY] and attached
 *   as `Authorization: Bearer <token>` when `opts.auth !== false`.
 *   The auth-store (zustand) writes / clears the key on login / logout
 *   and intentionally does NOT persist it inside its own envelope to
 *   avoid drift between two storage locations (see auth-store.ts).
 */

/**
 * Canonical localStorage key for the bearer token. Imported by
 * `_optional/auth-*` store modules so both writer and reader stay in
 * sync. NEVER hard-code the string "token" anywhere else — that was the
 * F-07 outage class (zustand persisted to "auth-store" envelope while
 * the client read literal "token").
 */
export const TOKEN_STORAGE_KEY = "auth.token";

export interface ApiConfig {
  baseURL: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export type ApiQueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions {
  /** Attach Authorization: Bearer <token> from localStorage. Default true. */
  auth?: boolean;
  /** Extra request headers merged on top of the default JSON headers. */
  headers?: Record<string, string>;
  /** Appended to the URL as a query string. `null`/`undefined` values are dropped. */
  query?: Record<string, ApiQueryValue> | URLSearchParams;
  /** Forwarded to the underlying fetch signal for cancellation. */
  signal?: AbortSignal;
  /**
   * When true (default), auto-unwrap `{ ok: true, data }` envelopes and
   * return `data` directly. Set to false (or use `apiClient.raw.*`) to
   * receive the full envelope.
   */
  unwrap?: boolean;
}

/**
 * Thrown when the server returns a 4xx/5xx response. Always carries the
 * HTTP status; `code` is set when the response body matches the canonical
 * `{ ok:false, error: { code, message } }` shape.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function serialiseQuery(query: ApiRequestOptions["query"]): string {
  if (!query) return "";
  if (query instanceof URLSearchParams) {
    const s = query.toString();
    return s ? `?${s}` : "";
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    params.append(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

function isErrorEnvelope(
  data: unknown,
): data is {
  ok: false;
  error: { code?: string; message?: string; details?: unknown };
} {
  if (!data || typeof data !== "object") return false;
  const o = data as { ok?: unknown; error?: unknown };
  return o.ok === false && !!o.error && typeof o.error === "object";
}

function isSuccessEnvelope(data: unknown): data is { ok: true; data: unknown } {
  if (!data || typeof data !== "object") return false;
  const o = data as { ok?: unknown; data?: unknown };
  return o.ok === true && "data" in o;
}

async function request<T>(
  path: string,
  init: RequestInit,
  opts: ApiRequestOptions = {},
): Promise<T> {
  const auth = opts.auth ?? true;
  const unwrap = opts.unwrap ?? true;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers ?? {}),
  };

  if (auth) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path}${serialiseQuery(opts.query)}`;
  const res = await fetch(url, { ...init, headers, signal: opts.signal });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText || "Request failed"}`;
    let code: string | undefined;
    let details: unknown;
    try {
      const data = await res.json();
      if (isErrorEnvelope(data)) {
        message = data.error.message ?? message;
        code = data.error.code;
        details = data.error.details;
      } else if (data && typeof data === "object" && "message" in data) {
        message = String((data as { message: unknown }).message);
      }
    } catch (err) {
      // Body was not JSON; keep default status-line message.
      throw new ApiError(message, res.status, undefined, undefined);
    }
    throw new ApiError(message, res.status, code, details);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const body = await res.json();

  if (unwrap && isSuccessEnvelope(body)) {
    return body.data as T;
  }
  return body as T;
}

/**
 * Default client — auto-unwraps success envelopes, throws ApiError on
 * non-2xx. Use `apiClient.raw.*` to skip unwrap and get the full envelope.
 */
export const apiClient = {
  get<T>(path: string, opts?: ApiRequestOptions): Promise<T> {
    return request<T>(path, { method: "GET" }, opts);
  },
  post<T, B = unknown>(
    path: string,
    body?: B,
    opts?: ApiRequestOptions,
  ): Promise<T> {
    return request<T>(
      path,
      { method: "POST", body: JSON.stringify(body ?? {}) },
      opts,
    );
  },
  put<T, B = unknown>(
    path: string,
    body?: B,
    opts?: ApiRequestOptions,
  ): Promise<T> {
    return request<T>(
      path,
      { method: "PUT", body: JSON.stringify(body ?? {}) },
      opts,
    );
  },
  patch<T, B = unknown>(
    path: string,
    body?: B,
    opts?: ApiRequestOptions,
  ): Promise<T> {
    return request<T>(
      path,
      { method: "PATCH", body: JSON.stringify(body ?? {}) },
      opts,
    );
  },
  delete<T>(path: string, opts?: ApiRequestOptions): Promise<T> {
    return request<T>(path, { method: "DELETE" }, opts);
  },

  /**
   * Escape hatch — bypasses envelope auto-unwrap and returns whatever the
   * server sent verbatim. Use when you need the full `{ ok, data }` /
   * `{ ok, error }` shape (e.g. surfacing `error.code` for analytics) or
   * when the endpoint genuinely returns a non-enveloped payload.
   */
  raw: {
    get<T>(path: string, opts?: ApiRequestOptions): Promise<T> {
      return request<T>(path, { method: "GET" }, { ...opts, unwrap: false });
    },
    post<T, B = unknown>(
      path: string,
      body?: B,
      opts?: ApiRequestOptions,
    ): Promise<T> {
      return request<T>(
        path,
        { method: "POST", body: JSON.stringify(body ?? {}) },
        { ...opts, unwrap: false },
      );
    },
    put<T, B = unknown>(
      path: string,
      body?: B,
      opts?: ApiRequestOptions,
    ): Promise<T> {
      return request<T>(
        path,
        { method: "PUT", body: JSON.stringify(body ?? {}) },
        { ...opts, unwrap: false },
      );
    },
    patch<T, B = unknown>(
      path: string,
      body?: B,
      opts?: ApiRequestOptions,
    ): Promise<T> {
      return request<T>(
        path,
        { method: "PATCH", body: JSON.stringify(body ?? {}) },
        { ...opts, unwrap: false },
      );
    },
    delete<T>(path: string, opts?: ApiRequestOptions): Promise<T> {
      return request<T>(path, { method: "DELETE" }, { ...opts, unwrap: false });
    },
  },
};
