/**
 * Tests for Sequelize migration quality lint.
 *
 * Covers the 6 rule ids individually + the FK-order cross-file analysis +
 * the comment / IF-NOT-EXISTS exemption logic. Mirrors the
 * `migration-coverage.test.ts` style.
 */

import { describe, expect, it } from "vitest";
import { checkMigrationQuality } from "../migration-quality";

const wrap = (content: string) => ({
  path: "backend/src/database/migrations/100-x.ts",
  content,
});

describe("checkMigrationQuality — single-file rules", () => {
  it("flags bare queryInterface.createTable as non-idempotent", () => {
    const r = checkMigrationQuality({
      files: [
        wrap(`
          export async function up({ context: queryInterface }) {
            await queryInterface.createTable("users", {
              id: { type: DataTypes.UUID, primaryKey: true },
            });
          }
        `),
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]?.rule).toBe("non-idempotent-create-table");
    expect(r.findings[0]?.line).toBeGreaterThan(0);
  });

  it("flags bare queryInterface.addColumn / addIndex / addConstraint / bulkInsert", () => {
    const r = checkMigrationQuality({
      files: [
        wrap(`
          await queryInterface.addColumn("users", "role", { type: DataTypes.STRING });
          await queryInterface.addIndex("users", ["email"], { unique: true });
          await queryInterface.addConstraint("users", { fields: ["email"], type: "unique" });
          await queryInterface.bulkInsert("roles", [{ id: "admin" }, { id: "viewer" }]);
        `),
      ],
    });
    const rules = r.findings.map((f) => f.rule).sort();
    expect(rules).toEqual([
      "bulk-insert-without-on-conflict",
      "non-idempotent-add-column",
      "non-idempotent-add-constraint",
      "non-idempotent-add-index",
    ]);
  });

  it("accepts queryInterface.sequelize.query with CREATE TABLE IF NOT EXISTS", () => {
    const r = checkMigrationQuality({
      files: [
        wrap(`
          const q = queryInterface.sequelize;
          await q.query(\`
            CREATE TABLE IF NOT EXISTS users (
              id UUID PRIMARY KEY
            )
          \`);
        `),
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.findings).toEqual([]);
  });

  it("accepts INSERT … ON CONFLICT DO NOTHING (no bulkInsert flag)", () => {
    const r = checkMigrationQuality({
      files: [
        wrap(`
          await queryInterface.sequelize.query(\`
            INSERT INTO roles (id) VALUES ('admin')
            ON CONFLICT (id) DO NOTHING
          \`);
        `),
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("does NOT flag matches inside line comments", () => {
    const r = checkMigrationQuality({
      files: [
        wrap(`
          // Historically we used queryInterface.createTable("users", ...)
          // — see git blame for the migration that replaced it.
          await queryInterface.sequelize.query(\`CREATE TABLE IF NOT EXISTS users (id UUID)\`);
        `),
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("does NOT flag matches inside block comments", () => {
    const r = checkMigrationQuality({
      files: [
        wrap(`
          /*
           * Previously: await queryInterface.createTable("users", ...)
           */
          await queryInterface.sequelize.query(\`CREATE TABLE IF NOT EXISTS users (id UUID)\`);
        `),
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("flags CREATE and DROP both inside the up() body", () => {
    const r = checkMigrationQuality({
      files: [
        {
          path: "backend/src/database/migrations/050-mixed.ts",
          content: `
            export async function up({ context: queryInterface }) {
              await queryInterface.sequelize.query(\`CREATE TABLE IF NOT EXISTS users (id UUID)\`);
              await queryInterface.sequelize.query(\`DROP COLUMN legacy_name\`);
            }
            export async function down({ context: queryInterface }) {
              await queryInterface.sequelize.query(\`DROP TABLE IF EXISTS users\`);
            }
          `,
        },
      ],
    });
    expect(r.findings.some((f) => f.rule === "drop-in-create-migration")).toBe(
      true,
    );
  });

  it("does NOT flag the canonical up()=CREATE + down()=DROP shape", () => {
    const r = checkMigrationQuality({
      files: [
        {
          path: "backend/src/database/migrations/051-canonical.ts",
          content: `
            export async function up({ context: queryInterface }) {
              await queryInterface.sequelize.query(\`CREATE TABLE IF NOT EXISTS users (id UUID)\`);
            }
            export async function down({ context: queryInterface }) {
              await queryInterface.sequelize.query(\`DROP TABLE IF EXISTS users\`);
            }
          `,
        },
      ],
    });
    expect(
      r.findings.filter((f) => f.rule === "drop-in-create-migration"),
    ).toHaveLength(0);
  });
});

describe("checkMigrationQuality — FK ordering", () => {
  it("flags a migration that REFERENCES a table created in a later migration", () => {
    const r = checkMigrationQuality({
      files: [
        {
          path: "backend/src/database/migrations/014-create-payments.ts",
          content: `
            await queryInterface.sequelize.query(\`
              CREATE TABLE IF NOT EXISTS payments (
                id UUID PRIMARY KEY,
                approval_id UUID REFERENCES approvals(id)
              )
            \`);
          `,
        },
        {
          path: "backend/src/database/migrations/015-create-approvals.ts",
          content: `
            await queryInterface.sequelize.query(\`CREATE TABLE IF NOT EXISTS approvals (id UUID PRIMARY KEY)\`);
          `,
        },
      ],
    });
    const fkFinding = r.findings.find(
      (f) => f.rule === "fk-references-future-migration",
    );
    expect(fkFinding).toBeDefined();
    expect(fkFinding?.filePath).toContain("014-create-payments.ts");
    expect(fkFinding?.message).toMatch(/prefix 15 > this file's prefix 14/);
  });

  it("does NOT flag a self-referencing FK in the same migration", () => {
    const r = checkMigrationQuality({
      files: [
        wrap(`
          await queryInterface.sequelize.query(\`
            CREATE TABLE IF NOT EXISTS folders (
              id UUID PRIMARY KEY,
              parent_id UUID REFERENCES folders(id)
            )
          \`);
        `),
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("flags REFERENCES to a table that no migration creates (typo case)", () => {
    const r = checkMigrationQuality({
      files: [
        wrap(`
          await queryInterface.sequelize.query(\`
            CREATE TABLE IF NOT EXISTS comments (
              id UUID PRIMARY KEY,
              author_id UUID REFERENCES uesrs(id)
            )
          \`);
        `),
      ],
    });
    const fk = r.findings.find(
      (f) => f.rule === "fk-references-future-migration",
    );
    expect(fk?.message).toMatch(/no migration creates it/);
  });

  it("accepts FK to a table created by an EARLIER migration", () => {
    const r = checkMigrationQuality({
      files: [
        {
          path: "backend/src/database/migrations/010-create-users.ts",
          content: `
            await queryInterface.sequelize.query(\`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY)\`);
          `,
        },
        {
          path: "backend/src/database/migrations/020-create-posts.ts",
          content: `
            await queryInterface.sequelize.query(\`
              CREATE TABLE IF NOT EXISTS posts (
                id UUID PRIMARY KEY,
                author_id UUID REFERENCES users(id)
              )
            \`);
          `,
        },
      ],
    });
    expect(r.ok).toBe(true);
  });
});

describe("checkMigrationQuality — output shape", () => {
  it("reports filesScanned even when no findings", () => {
    const r = checkMigrationQuality({ files: [wrap("// empty")] });
    expect(r.filesScanned).toBe(1);
    expect(r.ok).toBe(true);
  });

  it("dedupes findings on (filePath, rule, line)", () => {
    const r = checkMigrationQuality({
      files: [
        wrap(`
          await queryInterface.addColumn("users", "a", {});
          await queryInterface.addColumn("users", "b", {});
        `),
      ],
    });
    // Two distinct lines → two findings, NOT collapsed.
    expect(
      r.findings.filter((f) => f.rule === "non-idempotent-add-column"),
    ).toHaveLength(2);
  });
});
