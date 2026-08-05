import { fetchFeed } from "./rss.js";
import {
  getNextFeedToFetch,
  markFeedFetched,
} from "./db/queries/feeds.js";
import { createPost } from "./db/queries/posts.js";

export async function scrapeFeeds() {
  const feed = await getNextFeedToFetch();
  if (feed === undefined) {
    console.log("no feeds to fetch");
    return;
  }

  console.log(`fetching feed: ${feed.name}`);
  const rssFeed = await fetchFeed(feed.url);
  await markFeedFetched(feed.id);

  for (const item of rssFeed.channel.item) {
    const publishedAt = new Date(item.pubDate);
    if (Number.isNaN(publishedAt.getTime())) {
      console.log(`skipping post with invalid date: ${item.title}`);
      continue;
    }
    try {
      await createPost({
        title: item.title,
        url: item.link,
        description: item.description,
        publishedAt: publishedAt,
        feedId: feed.id,
      });
    } catch (err) {
      console.error(
        `failed to save post: ${item.title}: ${
          err instanceof Error ? err.message : err
        }`
      );
    }
  }
}
