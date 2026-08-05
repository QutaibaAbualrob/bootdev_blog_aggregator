import { desc, eq, and } from "drizzle-orm";

import { db } from "../index.js";
import { posts, feedFollows, feeds } from "../schema.js";

export async function createPost(input: {
  title: string;
  url: string;
  description: string | null;
  publishedAt: Date;
  feedId: string;
}) {
  const [result] = await db
    .insert(posts)
    .values({
      title: input.title,
      url: input.url,
      description: input.description,
      publishedAt: input.publishedAt,
      feedId: input.feedId,
    })
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function getPostsForUser(userId: string, limit: number) {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedId: posts.feedId,
      feedName: feeds.name,
    })
    .from(posts)
    .innerJoin(feeds, eq(posts.feedId, feeds.id))
    .innerJoin(feedFollows, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.userId, userId))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}
