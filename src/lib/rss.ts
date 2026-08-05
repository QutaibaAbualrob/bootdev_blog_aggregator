import { XMLParser } from "fast-xml-parser";

/** A single post inside an RSS channel. */
export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

/** The normalized structure of a parsed RSS 2.0 feed. */
export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

/**
 * Downloads an RSS feed from the given URL, parses its XML, and normalizes it
 * into a {@link RSSFeed}.
 *
 * Items with missing or malformed fields are skipped.
 *
 * @throws if the document is not a valid RSS feed or the channel metadata is
 * incomplete.
 */
export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const res = await fetch(feedURL, {
    headers: { "User-Agent": "gator" },
  });
  const xml = await res.text();

  const parser = new XMLParser({ processEntities: false });
  const parsed = parser.parse(xml);

  if (parsed.rss?.channel === undefined) {
    throw new Error("invalid feed: no channel found");
  }
  const channel = parsed.rss.channel;

  const title = channel.title;
  const link = channel.link;
  const description = channel.description;
  if (typeof title !== "string" || typeof link !== "string" || typeof description !== "string") {
    throw new Error("invalid feed: missing channel metadata");
  }

  let rawItems: unknown[] = [];
  if (channel.item !== undefined) {
    rawItems = Array.isArray(channel.item) ? channel.item : [channel.item];
  }

  const items: RSSItem[] = [];
  for (const item of rawItems) {
    const rawItem = item as Record<string, unknown>;
    if (
      item === null ||
      typeof item !== "object" ||
      typeof rawItem.title !== "string" ||
      typeof rawItem.link !== "string" ||
      typeof rawItem.description !== "string" ||
      typeof rawItem.pubDate !== "string"
    ) {
      continue;
    }
    items.push({
      title: rawItem.title,
      link: rawItem.link,
      description: rawItem.description,
      pubDate: rawItem.pubDate,
    });
  }

  return {
    channel: {
      title,
      link,
      description,
      item: items,
    },
  };
}
