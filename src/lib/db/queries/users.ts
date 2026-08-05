import { eq } from "drizzle-orm";

import { db } from "../index.js";
import { users } from "../schema.js";

/** Creates a new user with the given name and returns the created row. */
export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name: name }).returning();
  return result;
}

/** Returns the user with the given name, or `undefined` if none exists. */
export async function getUserByName(name: string) {
  const [result] = await db.select().from(users).where(eq(users.name, name));
  return result;
}

/** Returns the user with the given ID, or `undefined` if none exists. */
export async function getUserByID(id: string) {
  const [result] = await db.select().from(users).where(eq(users.id, id));
  return result;
}

/** Deletes every user; feeds, feed follows, and posts are removed via cascade. */
export async function resetUsers() {
  await db.delete(users);
}

/** Returns all registered users. */
export async function getUsers() {
  return db.select().from(users);
}
