import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "../index.js";
import { feeds, users } from "../schema.js";

/** Creates a new feed owned by the given user and returns the created row. */
export async function createFeed(name: string, url: string, userId: string) {
  const [result] = await db
    .insert(feeds)
    .values({ name: name, url: url, userId: userId })
    .returning();
  return result;
}

/** Returns every feed joined with the name of the user who created it. */
export async function getFeedsWithUsers() {
  return db
    .select({
      id: feeds.id,
      name: feeds.name,
      url: feeds.url,
      userName: users.name,
    })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id));
}

/** Returns the feed with the given URL, or `undefined` if none exists. */
export async function getFeedByURL(url: string) {
  const [result] = await db.select().from(feeds).where(eq(feeds.url, url));
  return result;
}

/** Records that a feed was successfully fetched by updating its timestamps. */
export async function markFeedFetched(feedId: string) {
  await db
    .update(feeds)
    .set({ lastFetchedAt: new Date(), updatedAt: new Date() })
    .where(eq(feeds.id, feedId));
}

/** Returns the feed fetched least recently, with never-fetched feeds first. */
export async function getNextFeedToFetch() {
  const [result] = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`);
  return result;
}
