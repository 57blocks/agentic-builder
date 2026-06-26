/**
 * CANONICAL DB-MOCK PATTERN — copy this when writing backend tests.
 *
 * Backend unit tests must NEVER reach the real Postgres database. The TDD gate
 * enforces this by stripping `DATABASE_URL`, and the test writer/reviewer reject
 * any backend test that imports `../db` without mocking it.
 *
 * The pattern, demonstrated below:
 *   1. `vi.mock("../db", ...)` BEFORE other imports — replace the real Sequelize
 *      connection with a fresh in-memory SQLite one. `sqlite::memory:` needs the
 *      `sqlite3` devDependency (already in package.json).
 *   2. Define / import the model(s) under test against that mocked `sequelize`.
 *   3. `await sequelize.sync({ force: true })` (or `syncModels()`) in `beforeAll`
 *      so the schema exists before any query — there are no migrations.
 *   4. Write REAL assertions about persisted/queried data.
 *
 * SQLite is not 100% Postgres-compatible (no JSONB/ARRAY/`gen_random_uuid()`,
 * no TimescaleDB). For columns that rely on those, assert behaviour that works
 * on both, or cover the Postgres-specific path with a heavier integration test.
 *
 * Scaffold-owned: do NOT delete. Tooling cites this file as the canonical mock
 * example.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { DataTypes, Model, Sequelize } from "sequelize";

// (1) Replace ../db with an in-memory SQLite connection. The factory runs in
// isolation, so the Sequelize instance is constructed inside the mock. Object
// form (not a `sqlite::memory:` URL) avoids Node's DEP0170 deprecation warning.
vi.mock("../db", () => {
  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
  });
  return { sequelize, isInMemorySqlite: true };
});

// Import AFTER the mock is registered so this resolves to the mocked module.
import { sequelize } from "../db";

// (2) A tiny model defined against the mocked connection — stands in for the
// real models a feature test would import from ./<Model>.
class Widget extends Model {
  declare id: number;
  declare name: string;
}

Widget.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: "Widget", tableName: "widgets" },
);

describe("canonical db-mock pattern", () => {
  beforeAll(async () => {
    // (3) Create the schema from the model definitions before any query.
    await sequelize.sync({ force: true });
  });

  it("uses the in-memory SQLite fallback, not the real database", () => {
    // (4a) Prove the mock is active — real Postgres would report "postgres".
    expect(sequelize.getDialect()).toBe("sqlite");
  });

  it("persists and reads back a row", async () => {
    // (4b) A real round-trip assertion against the synced schema.
    const created = await Widget.create({ name: "alpha" });
    expect(created.id).toBeGreaterThan(0);

    const found = await Widget.findByPk(created.id);
    expect(found?.name).toBe("alpha");
  });
});
