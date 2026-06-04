import { sql } from "drizzle-orm";
import { db } from "./client";
import { users, type User } from "./schema";
import { v4 as uuid } from "uuid";

export interface UpsertUserInput {
  email: string;
  name?: string | null;
  picture?: string | null;
  google_id?: string | null;
}

export async function upsertUser(input: UpsertUserInput): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      id: uuid(),
      email: input.email,
      name: input.name ?? null,
      picture: input.picture ?? null,
      googleId: input.google_id ?? null,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        googleId: input.google_id != null ? input.google_id : sql`${users.googleId}`,
        name: input.name ?? null,
        picture: input.picture ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}
