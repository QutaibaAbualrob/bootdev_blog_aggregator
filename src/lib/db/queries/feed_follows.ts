import { eq, and, inArray } from "drizzle-orm";

import { db } from "../index.js";
import { feedFollows, feeds, users } from "../schema.js";

/**
 * Makes the given user follow the given feed and returns the follow row
 * joined with the feed and user names.
 */
export async function createFeedFollow(userId: string, feedId: string) {
  const [newFeedFollow] = await db
    .insert(feedFollows)
    .values({ userId: userId, feedId: feedId })
    .returning();

  const [result] = await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      feedName: feeds.name,
      userName: users.name,
    })
    .from(feedFollows)
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .where(eq(feedFollows.id, newFeedFollow.id));

  return result;
}

/** Returns every feed-follow row for a user, joined with feed and user names. */
export async function getFeedFollowsForUser(userId: string) {
  return db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      feedName: feeds.name,
      userName: users.name,
    })
    .from(feedFollows)
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .where(eq(feedFollows.userId, userId));
}

/** Deletes the given user's follow of the feed at the given URL. */
export async function deleteFeedFollowByUserAndURL(userId: string, url: string) {
  const feedIds = db.select({ id: feeds.id }).from(feeds).where(eq(feeds.url, url));
  await db
    .delete(feedFollows)
    .where(and(eq(feedFollows.userId, userId), inArray(feedFollows.feedId, feedIds)));
}
