import { describe, it, expect } from "vitest";
import {
  parseSchemaInterfaces,
  parseModelScalarFields,
  entityNameForModelFile,
} from "../model-schema-audit";

const SCHEMA = `
export type TaskId = string;

export interface Task {
  id: TaskId;
  projectId: ProjectId;
  columnId: BoardColumnId;
  title: string;
  description: string | null;
  assigneeId: UserId | null;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  position: number;
  createdBy: UserId;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BoardColumn {
  id: BoardColumnId;
  projectId: ProjectId;
  name: string;
  position: number;
}
`;

// A model that hallucinated `status` + `isDeleted` (the real taskflow bug).
const DRIFTED_MODEL = `
import { CreationOptional, DataTypes, Model } from "sequelize";
export class Task extends Model {
  declare id: CreationOptional<string>;
  declare projectId: string | null;
  declare columnId: string | null;
  declare title: string;
  declare description: string | null;
  declare assigneeId: string | null;
  declare priority: "low" | "medium" | "high";
  declare dueDate: Date | null;
  declare position: CreationOptional<number>;
  declare createdBy: string;
  declare status: "to_do" | "in_progress" | "done";
  declare isDeleted: CreationOptional<boolean>;
  declare deletedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  // association — must NOT be flagged as a scalar field
  declare project?: Project;
  declare columns?: BoardColumn[];
}
`;

// A clean model that mirrors the schema exactly.
const CLEAN_MODEL = `
export class BoardColumn extends Model {
  declare id: CreationOptional<string>;
  declare projectId: string;
  declare name: string;
  declare position: CreationOptional<number>;
}
`;

describe("parseSchemaInterfaces", () => {
  it("extracts top-level field names per entity (lowercased)", () => {
    const m = parseSchemaInterfaces(SCHEMA);
    expect(m.has("Task")).toBe(true);
    const task = m.get("Task")!;
    expect(task.has("columnid")).toBe(true);
    expect(task.has("deletedat")).toBe(true);
    // status is NOT a Task field in this kanban schema
    expect(task.has("status")).toBe(false);
    expect(task.has("isdeleted")).toBe(false);
  });
});

describe("parseModelScalarFields", () => {
  const known = new Set(["Task", "BoardColumn", "Project"]);

  it("captures scalar declares and skips associations", () => {
    const fields = parseModelScalarFields(DRIFTED_MODEL, known);
    expect(fields).toContain("status");
    expect(fields).toContain("isdeleted");
    expect(fields).toContain("columnid");
    // associations skipped
    expect(fields).not.toContain("project");
    expect(fields).not.toContain("columns");
  });

  it("a clean model yields only its real columns", () => {
    const fields = parseModelScalarFields(CLEAN_MODEL, known);
    expect(fields.sort()).toEqual(["id", "name", "position", "projectid"]);
  });
});

describe("drift detection (extra = model − schema)", () => {
  it("flags exactly status + isDeleted on the drifted Task model", () => {
    const interfaces = parseSchemaInterfaces(SCHEMA);
    const known = new Set(interfaces.keys());
    const modelFields = parseModelScalarFields(DRIFTED_MODEL, known);
    const schemaFields = interfaces.get("Task")!;
    const extra = [...new Set(modelFields)].filter((f) => !schemaFields.has(f));
    expect(extra.sort()).toEqual(["isdeleted", "status"]);
  });

  it("a schema-aligned model has zero extra fields", () => {
    const interfaces = parseSchemaInterfaces(SCHEMA);
    const known = new Set(interfaces.keys());
    const modelFields = parseModelScalarFields(CLEAN_MODEL, known);
    const schemaFields = interfaces.get("BoardColumn")!;
    const extra = modelFields.filter((f) => !schemaFields.has(f));
    expect(extra).toEqual([]);
  });
});

describe("entityNameForModelFile", () => {
  it("maps model/entity file paths to entity names", () => {
    expect(entityNameForModelFile("backend/src/models/Task.ts")).toBe("Task");
    expect(entityNameForModelFile("src/entities/BoardColumn.ts")).toBe(
      "BoardColumn",
    );
    expect(entityNameForModelFile("backend/src/models/index.ts")).toBe(null);
    expect(entityNameForModelFile("backend/src/api/task.service.ts")).toBe(null);
  });
});
