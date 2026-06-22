---
id: model-fields-match-schema
agent: backend
version: v1
description: Backend ORM models/entities MUST mirror the shared schema's interface fields exactly — never invent fields the schema doesn't declare. The shared schema is the single source of truth.
priority: 95
excludes: []
trigger:
  type: context
  always: true
---

# Model fields are dictated by `shared/schema.ts` — do NOT invent fields

The shared schema (`shared/schema.ts`, also copied to `backend/src/shared/schema.ts`)
is the SINGLE SOURCE OF TRUTH for every entity that crosses the API boundary.
When you write an ORM model / entity (Sequelize `Model`, TypeORM entity, Prisma
model, etc.), its persisted columns MUST correspond to the fields of the matching
`interface` in the shared schema.

**Hard rule:** the model's attribute set = the schema interface's field set.
- Every schema field → one model column (apply the project's naming convention,
  e.g. camelCase TS attribute ↔ snake_case `field`/column).
- DO NOT add a column that has no counterpart in the schema interface.
- DO NOT drop a schema field.
- Foreign-key id fields in the schema (e.g. `columnId`, `assigneeId`) map to FK
  columns; relation/association helpers are fine, but they don't add new
  *scalar* fields beyond what the schema declares.

A field that "feels obviously needed" is almost always either (a) already
expressed by an existing schema field under a different model, or (b) a genuine
schema gap. In neither case do you silently bolt it onto the model:
- If the concept already exists in the schema, USE that field. Re-read the schema
  before assuming something is missing.
- If you believe the schema is truly missing a field, that is a CONTRACT CHANGE:
  it must be made in `shared/schema.ts` first (so frontend + backend agree), not
  invented locally in one model. Do not write a model that diverges from the
  shipped schema and "file a request" — a divergent model is a bug.

## The trap that motivates this rule (status / soft-delete)

Two fields get hallucinated onto models constantly. Check the schema before adding
either:

- **A `status` enum.** Many domains represent "status" WITHOUT a status column.
  In a kanban/board domain, a task's status IS the column it sits in
  (`Task.columnId` → a user-defined `BoardColumn`); "change status" = move to
  another column (e.g. `PATCH /tasks/:id/status` whose body is `{ columnId }`).
  If columns are user-creatable/renamable, a hard-coded
  `status: "to_do" | "in_progress" | "done"` enum is doubly wrong — it duplicates
  `columnId` AND it can't represent a column the user later adds. If the schema's
  entity interface has no `status` field, the model gets no `status` column.

- **An `isDeleted` boolean.** Soft-delete is conventionally a nullable
  `deletedAt` timestamp. If the schema declares `deletedAt`, that IS the
  soft-delete mechanism — do NOT also add an `isDeleted` boolean. Query
  "not deleted" as `deletedAt IS NULL`.

## Self-check before you finish a model

1. Open the matching `interface` in `shared/schema.ts`.
2. List its fields. List your model's columns. They must be the SAME set
   (modulo naming convention).
3. For every extra model column, delete it — or, if it is genuinely required by
   the contract, stop and fix `shared/schema.ts` instead so both sides stay in
   sync.
4. Specifically confirm you did NOT add a `status` enum or an `isDeleted` boolean
   that the schema doesn't declare.
