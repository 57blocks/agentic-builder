/**
 * Unit tests for schema-drift.ts — verifies the text-based detector
 * correctly identifies model fields lacking migration columns, respects
 * the implicit Sequelize field skip list, honors the
 * `// schema-drift-ignore` pragma, and walks `field: "..."` remaps.
 */

import { describe, expect, it } from "vitest";
import {
  checkSchemaDrift,
  extractFieldRemaps,
  extractModelFields,
} from "../schema-drift";

const baseUserModel = `
import { CreationOptional, DataTypes, Model } from "sequelize";

export class User extends Model {
  declare id: CreationOptional<string>;
  declare email: string;
  declare googleId: string | null;
  declare displayName: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false },
    googleId: { type: DataTypes.STRING, allowNull: true, field: "google_id" },
    displayName: { type: DataTypes.STRING, allowNull: true, field: "display_name" },
  },
  { sequelize: undefined as never, modelName: "User", tableName: "users" }
);
`;

const migrationWithEmailAndDisplayOnly = `
import type { QueryInterface } from "sequelize";
export async function up(q: QueryInterface) {
  await q.sequelize.query(\`
    CREATE TABLE IF NOT EXISTS users (
      id           UUID PRIMARY KEY,
      email        VARCHAR(255) NOT NULL,
      display_name VARCHAR(255),
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  \`);
}
`;

describe("extractModelFields", () => {
  it("returns all declare fields with 1-indexed line numbers, skipping Sequelize implicits", () => {
    const fields = extractModelFields(baseUserModel);
    const names = fields.map((f) => f.fieldName);
    expect(names).toEqual(["email", "googleId", "displayName"]);
    // line numbers anchor to the source — sanity check `email` lives after
    // `declare id` (which was skipped because it's an implicit field).
    expect(fields[0].line).toBeGreaterThan(0);
    expect(new Set(fields.map((f) => f.line)).size).toBe(fields.length);
  });

  it("honours // schema-drift-ignore pragma on the declare line", () => {
    const model = `
      export class X extends Model {
        declare foo: string; // schema-drift-ignore
        declare bar: string;
      }
    `;
    const fields = extractModelFields(model);
    expect(fields.map((f) => f.fieldName)).toEqual(["bar"]);
  });

  it("does NOT match property declarations that aren't `declare` (regular ts class fields)", () => {
    const model = `
      export class X extends Model {
        foo: string = "no-declare-keyword";
        declare bar: string;
      }
    `;
    expect(extractModelFields(model).map((f) => f.fieldName)).toEqual(["bar"]);
  });

  it("ignores commented-out declare lines", () => {
    const model = `
      export class X extends Model {
        // declare ghost: string;
        /* declare orphaned: number; */
        declare real: string;
      }
    `;
    expect(extractModelFields(model).map((f) => f.fieldName)).toEqual(["real"]);
  });

  it("accepts optional declare syntax (?:)", () => {
    const model = `
      export class X extends Model {
        declare maybe?: string;
        declare required: string;
      }
    `;
    expect(extractModelFields(model).map((f) => f.fieldName)).toEqual([
      "maybe",
      "required",
    ]);
  });
});

describe("extractFieldRemaps", () => {
  it("captures `field: \"snake_name\"` declared inside Model.init", () => {
    const remap = extractFieldRemaps(baseUserModel);
    expect(remap.get("googleId")).toBe("google_id");
    expect(remap.get("displayName")).toBe("display_name");
    expect(remap.has("id")).toBe(false);
  });
});

describe("checkSchemaDrift — per-field finding", () => {
  it("flags a model field whose snake-cased column does not appear in any migration", () => {
    const r = checkSchemaDrift({
      models: [{ path: "backend/src/models/User.ts", content: baseUserModel }],
      migrations: [
        {
          path: "backend/src/database/migrations/001-create-users.ts",
          content: migrationWithEmailAndDisplayOnly,
        },
      ],
    });

    expect(r.filesScanned).toBe(1);
    expect(r.findings.length).toBe(1);
    expect(r.findings[0]).toMatchObject({
      modelPath: "backend/src/models/User.ts",
      modelName: "User",
      rule: "model-field-without-column",
      fieldName: "googleId",
      snakeFieldName: "google_id",
    });
    // Must point to the actual line of `declare googleId` (line 6 of
    // baseUserModel — 1-indexed).
    expect(r.findings[0].line).toBeGreaterThan(0);
  });

  it("does NOT flag a field whose `field: \"...\"` remap matches an existing column", () => {
    // The migration creates `display_name` and the model remaps
    // `displayName` → `display_name`. No finding for displayName.
    const r = checkSchemaDrift({
      models: [{ path: "backend/src/models/User.ts", content: baseUserModel }],
      migrations: [
        {
          path: "backend/src/database/migrations/001-create-users.ts",
          content: migrationWithEmailAndDisplayOnly,
        },
      ],
    });
    const names = r.findings.map((f) => f.fieldName);
    expect(names).not.toContain("displayName");
  });

  it("does NOT flag a field when its raw snake-name appears anywhere in the migration corpus", () => {
    // googleId snake form is `google_id`. Migration that mentions it
    // anywhere (CREATE TABLE column, ADD COLUMN, queryInterface.addColumn,
    // even `field: "google_id"`) satisfies the lint.
    const migrationWithAddColumn = `
      export async function up(q) {
        await q.sequelize.query('ALTER TABLE users ADD COLUMN google_id VARCHAR(255)');
      }
    `;
    const r = checkSchemaDrift({
      models: [{ path: "backend/src/models/User.ts", content: baseUserModel }],
      migrations: [
        {
          path: "backend/src/database/migrations/001-create-users.ts",
          content: migrationWithEmailAndDisplayOnly,
        },
        {
          path: "backend/src/database/migrations/002-add-google-id.ts",
          content: migrationWithAddColumn,
        },
      ],
    });
    expect(r.findings.length).toBe(0);
  });

  it("does NOT match prefix/suffix collisions (`role` vs `domain_role`)", () => {
    const model = `
      export class User extends Model {
        declare email: string;
        declare role: string;
      }
    `;
    // Migration mentions only `domain_role` — `role` substring exists
    // but is preceded by `_` so the word-boundary check rejects it.
    const migration = `
      CREATE TABLE users (email VARCHAR, domain_role VARCHAR);
    `;
    const r = checkSchemaDrift({
      models: [{ path: "backend/src/models/User.ts", content: model }],
      migrations: [
        {
          path: "backend/src/database/migrations/001-create-users.ts",
          content: migration,
        },
      ],
    });
    const names = r.findings.map((f) => f.fieldName);
    expect(names).toContain("role");
  });

  it("treats column names inside line/block comments as NOT present (no false negatives)", () => {
    const model = `
      export class User extends Model {
        declare email: string;
        declare googleId: string;
      }
    `;
    const migration = `
      // The next line is a comment: google_id will be added later.
      /* TODO: ADD COLUMN google_id */
      CREATE TABLE users (email VARCHAR);
    `;
    const r = checkSchemaDrift({
      models: [{ path: "backend/src/models/User.ts", content: model }],
      migrations: [
        {
          path: "backend/src/database/migrations/001-create-users.ts",
          content: migration,
        },
      ],
    });
    expect(r.findings.map((f) => f.fieldName)).toContain("googleId");
  });

  it("returns no findings when every field has a matching column", () => {
    const r = checkSchemaDrift({
      models: [
        {
          path: "backend/src/models/Account.ts",
          content: `
            export class Account extends Model {
              declare name: string;
            }
          `,
        },
      ],
      migrations: [
        {
          path: "backend/src/database/migrations/001-create.ts",
          content: `CREATE TABLE accounts (name VARCHAR(255))`,
        },
      ],
    });
    expect(r.findings).toEqual([]);
  });
});

describe("checkSchemaDrift — full-model finding", () => {
  it("emits ONE model-without-migration finding when all >=2 fields are missing", () => {
    const r = checkSchemaDrift({
      models: [
        {
          path: "backend/src/models/Stablecoin.ts",
          content: `
            export class Stablecoin extends Model {
              declare symbol: string;
              declare issuer: string;
              declare marketCap: number;
            }
          `,
        },
      ],
      migrations: [
        // Mentions an unrelated table only.
        {
          path: "backend/src/database/migrations/001-create-users.ts",
          content: `CREATE TABLE users (email VARCHAR)`,
        },
      ],
    });
    expect(r.findings.length).toBe(1);
    expect(r.findings[0].rule).toBe("model-without-migration");
    expect(r.findings[0].modelName).toBe("Stablecoin");
    expect(r.findings[0].fieldName).toBeUndefined();
  });

  it("does NOT collapse to model-without-migration when only one field exists", () => {
    // Single missing field → per-field finding, not full-model rollup.
    const r = checkSchemaDrift({
      models: [
        {
          path: "backend/src/models/Note.ts",
          content: `
            export class Note extends Model {
              declare body: string;
            }
          `,
        },
      ],
      migrations: [
        {
          path: "backend/src/database/migrations/001-create.ts",
          content: `CREATE TABLE elsewhere (id UUID)`,
        },
      ],
    });
    expect(r.findings.length).toBe(1);
    expect(r.findings[0].rule).toBe("model-field-without-column");
    expect(r.findings[0].fieldName).toBe("body");
  });
});
