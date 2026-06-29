/**
 * WASM SQLite driver shim — a `node-sqlite3` (node-sqlite3 callback API) facade
 * over `node-sqlite3-wasm` (synchronous WASM SQLite).
 *
 * WHY: backend unit tests run against an in-memory SQLite via Sequelize. The
 * native `sqlite3` package needs a per-machine node-gyp/prebuild step that pnpm
 * v10 blocks by default — fragile and not portable across machines. This shim
 * lets Sequelize's `sqlite` dialect talk to a pure-WASM engine instead: zero
 * native build, zero compiler, identical bytecode on every OS/arch, offline-OK.
 *
 * USAGE: pass `dialectModule` when constructing the test Sequelize:
 *   import { sqlite3Wasm } from "@/test-support/sqlite3-wasm";
 *   new Sequelize({ dialect: "sqlite", storage: ":memory:", dialectModule: sqlite3Wasm });
 *
 * SCOPE: only the surface Sequelize v6's sqlite dialect actually calls —
 * `Database(storage, mode, cb)`, `serialize`, `run/get/all/exec(sql, params?, cb)`,
 * `prepare`, `close(cb)`, plus the `OPEN_*` constants and `verbose()`. The dialect
 * invokes `conn[method](sql, params, cb)` and reads `this.lastID` / `this.changes`
 * off the callback receiver, so each callback is invoked with a metadata `this`.
 */

import { Database as WasmDatabase } from "node-sqlite3-wasm";

// node-sqlite3 open-mode bit flags (values mirror the native lib; the WASM
// engine ignores them — in-memory connections are always read/write).
const OPEN_READONLY = 0x01;
const OPEN_READWRITE = 0x02;
const OPEN_CREATE = 0x04;

type Cb = ((this: RunMeta, err: Error | null, rows?: unknown) => void) | undefined;
type Params = unknown;

interface RunMeta {
  lastID: number;
  changes: number;
}

/** Split the overloaded `(sql, params?, cb?)` / `(sql, cb?)` argument shapes. */
function splitArgs(params: Params, cb: Cb): { values: unknown; done: Cb } {
  if (typeof params === "function") return { values: undefined, done: params as Cb };
  return { values: normalizeValues(params), done: cb };
}

/** node-sqlite3-wasm accepts an array (positional `?`) or an object (named).
 *  Sequelize passes `[]`/array or a plain object; pass through, dropping the
 *  empty-array case to `undefined` so a parameter-less PRAGMA is happy. */
function normalizeValues(params: Params): unknown {
  if (params == null) return undefined;
  if (Array.isArray(params)) return params.length ? params : undefined;
  return params;
}

function asMeta(r: { changes: number; lastInsertRowid: number | bigint } | null): RunMeta {
  if (!r) return { lastID: 0, changes: 0 };
  return { lastID: Number(r.lastInsertRowid), changes: r.changes };
}

/**
 * Sequelize's sqlite `formatError` classifies failures by `err.code`
 * (SQLITE_CONSTRAINT_UNIQUE, …). node-sqlite3-wasm throws with the right
 * message but no `code`, so map message → code here or constraint violations
 * surface as generic errors instead of UniqueConstraintError/ForeignKeyError.
 */
function normalizeError(err: unknown): Error {
  const e = err instanceof Error ? err : new Error(String(err));
  const tagged = e as Error & { code?: string };
  if (!tagged.code && /constraint failed/i.test(e.message)) {
    if (/UNIQUE constraint failed/i.test(e.message)) tagged.code = "SQLITE_CONSTRAINT_UNIQUE";
    else if (/FOREIGN KEY constraint failed/i.test(e.message)) tagged.code = "SQLITE_CONSTRAINT_FOREIGNKEY";
    else if (/PRIMARY KEY constraint failed/i.test(e.message)) tagged.code = "SQLITE_CONSTRAINT_PRIMARYKEY";
    else if (/NOT NULL constraint failed/i.test(e.message)) tagged.code = "SQLITE_CONSTRAINT_NOTNULL";
    else if (/CHECK constraint failed/i.test(e.message)) tagged.code = "SQLITE_CONSTRAINT_CHECK";
    else tagged.code = "SQLITE_CONSTRAINT";
  }
  return e;
}

class Statement {
  constructor(private readonly db: WasmDatabase, private readonly sql: string) {}

  run(params?: Params, cb?: Cb): this {
    const { values, done } = splitArgs(params, cb);
    try {
      const meta = asMeta(this.db.run(this.sql, values as never));
      if (done) done.call(meta, null);
    } catch (err) {
      if (done) done.call({ lastID: 0, changes: 0 }, normalizeError(err));
      else throw normalizeError(err);
    }
    return this;
  }

  all(params?: Params, cb?: Cb): this {
    const { values, done } = splitArgs(params, cb);
    try {
      const rows = this.db.all(this.sql, values as never);
      if (done) done.call({ lastID: 0, changes: 0 }, null, rows);
    } catch (err) {
      if (done) done.call({ lastID: 0, changes: 0 }, normalizeError(err), []);
      else throw normalizeError(err);
    }
    return this;
  }

  get(params?: Params, cb?: Cb): this {
    const { values, done } = splitArgs(params, cb);
    try {
      const row = this.db.get(this.sql, values as never);
      if (done) done.call({ lastID: 0, changes: 0 }, null, row ?? undefined);
    } catch (err) {
      if (done) done.call({ lastID: 0, changes: 0 }, normalizeError(err));
      else throw normalizeError(err);
    }
    return this;
  }

  finalize(cb?: () => void): void {
    if (cb) cb();
  }
}

class Database {
  private readonly db: WasmDatabase;
  /** Mirrors node-sqlite3's `db.filename`. Sequelize's sqlite connection
   *  manager skips closing a connection whose `filename === ":memory:"` on
   *  release — without this property the in-memory DB gets closed after the
   *  first pooled release (e.g. a transaction) and every later query throws
   *  "Database already closed". */
  readonly filename: string;

  constructor(filename?: string, mode?: number | (() => void), cb?: (err: Error | null) => void) {
    const open = typeof mode === "function" ? (mode as (err: Error | null) => void) : cb;
    this.filename = filename === undefined || filename === "" ? ":memory:" : filename;
    try {
      this.db = new WasmDatabase(this.filename);
      if (open) setImmediate(() => open.call(this, null));
    } catch (err) {
      if (open) setImmediate(() => open.call(this, normalizeError(err)));
      else throw normalizeError(err);
      // Constructed-but-unusable; never reached when open handles the error.
      this.db = undefined as unknown as WasmDatabase;
    }
  }

  /** WASM SQLite is synchronous, so there is nothing to serialize — just run. */
  serialize(fn?: () => void): this {
    if (fn) fn();
    return this;
  }

  run(sql: string, params?: Params, cb?: Cb): this {
    const { values, done } = splitArgs(params, cb);
    try {
      const meta = asMeta(this.db.run(sql, values as never));
      if (done) done.call(meta, null);
    } catch (err) {
      if (done) done.call({ lastID: 0, changes: 0 }, normalizeError(err));
      else throw normalizeError(err);
    }
    return this;
  }

  all(sql: string, params?: Params, cb?: Cb): this {
    const { values, done } = splitArgs(params, cb);
    try {
      const rows = this.db.all(sql, values as never);
      if (done) done.call({ lastID: 0, changes: 0 }, null, rows);
    } catch (err) {
      if (done) done.call({ lastID: 0, changes: 0 }, normalizeError(err), []);
      else throw normalizeError(err);
    }
    return this;
  }

  get(sql: string, params?: Params, cb?: Cb): this {
    const { values, done } = splitArgs(params, cb);
    try {
      const row = this.db.get(sql, values as never);
      if (done) done.call({ lastID: 0, changes: 0 }, null, row ?? undefined);
    } catch (err) {
      if (done) done.call({ lastID: 0, changes: 0 }, normalizeError(err));
      else throw normalizeError(err);
    }
    return this;
  }

  exec(sql: string, cb?: (err: Error | null) => void): this {
    try {
      this.db.exec(sql);
      if (cb) cb.call(this, null);
    } catch (err) {
      if (cb) cb.call(this, normalizeError(err));
      else throw normalizeError(err);
    }
    return this;
  }

  prepare(sql: string, params?: Params, cb?: Cb): Statement {
    const stmt = new Statement(this.db, sql);
    // node-sqlite3 allows prepare(sql, params, cb) to also bind+run; Sequelize's
    // sqlite dialect does not use that form, so we only surface the handle.
    if (typeof params === "function") (params as () => void)();
    else if (cb) cb.call({ lastID: 0, changes: 0 }, null);
    return stmt;
  }

  close(cb?: (err: Error | null) => void): void {
    try {
      this.db.close();
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(normalizeError(err));
      else throw normalizeError(err);
    }
  }

  /** node-sqlite3 no-ops we must tolerate. */
  configure(): this {
    return this;
  }
  on(): this {
    return this;
  }
}

export const sqlite3Wasm = {
  Database,
  Statement,
  OPEN_READONLY,
  OPEN_READWRITE,
  OPEN_CREATE,
  /** node-sqlite3's `.verbose()` returns the module; mirror that. */
  verbose(): typeof sqlite3Wasm {
    return sqlite3Wasm;
  },
};

// Two consumption shapes:
//   1. as Sequelize `dialectModule` →  import { sqlite3Wasm }  (the object above)
//   2. as a `require("sqlite3")` replacement (vitest alias) → top-level
//      Database / OPEN_* / verbose, matching node-sqlite3's module surface.
export { Database, Statement, OPEN_READONLY, OPEN_READWRITE, OPEN_CREATE };
export function verbose(): typeof sqlite3Wasm {
  return sqlite3Wasm;
}

export default sqlite3Wasm;
