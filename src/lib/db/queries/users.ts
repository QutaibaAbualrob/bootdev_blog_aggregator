import { eq } from "drizzle-orm";

import { db } from "../index.js";
import { users } from "../schema.js";

export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name: name }).returning();
  return result;
}

export async function getUserByName(name: string) {
  const [result] = await db.select().from(users).where(eq(users.name, name));
  return result;
}

export async function getUserByID(id: string) {
  const [result] = await db.select().from(users).where(eq(users.id, id));
  return result;
}

export async function resetUsers() {
  await db.delete(users);
}

export async function getUsers() {
  return db.select().from(users);
}
