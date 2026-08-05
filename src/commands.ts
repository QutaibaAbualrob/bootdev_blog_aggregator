import { setUser, readConfig } from "./config.js";
import { scrapeFeeds } from "./lib/scraper.js";
import {
  createFeed,
  getFeedByURL,
  getFeedsWithUsers,
} from "./lib/db/queries/feeds.js";
import { getPostsForUser } from "./lib/db/queries/posts.js";
import {
  createFeedFollow,
  deleteFeedFollowByUserAndURL,
  getFeedFollowsForUser,
} from "./lib/db/queries/feed_follows.js";
import { Feed, User } from "./lib/db/schema.js";
import type { UserCommandHandler } from "./middleware.js";
import {
  createUser,
  getUserByName,
  getUsers,
  resetUsers,
} from "./lib/db/queries/users.js";

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

async function handlerLogin(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("a username is required");
  }
  const username = args[0];
  const user = await getUserByName(username);
  if (user === undefined) {
    throw new Error(`user ${username} does not exist`);
  }
  setUser(username);
  console.log(`user ${username} has been set`);
}

async function handlerRegister(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("a name is required");
  }
  const name = args[0];
  const existing = await getUserByName(name);
  if (existing !== undefined) {
    throw new Error(`user ${name} already exists`);
  }
  const user = await createUser(name);
  setUser(name);
  console.log(`user created: ${JSON.stringify(user)}`);
}

async function handlerReset(cmdName: string, ...args: string[]) {
  await resetUsers();
  console.log("users reset");
}

async function handlerUsers(cmdName: string, ...args: string[]) {
  const users = await getUsers();
  const currentUser = readConfig().currentUserName;
  for (const user of users) {
    const isCurrent = user.name === currentUser;
    console.log(`* ${user.name}${isCurrent ? " (current)" : ""}`);
  }
}

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);
  if (match === null) {
    throw new Error(`invalid duration: ${durationStr}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
  }
  throw new Error(`invalid duration: ${durationStr}`);
}

function handleError(err: unknown) {
  console.error(err instanceof Error ? err.message : err);
}

async function handlerAgg(cmdName: string, ...args: string[]) {
  if (args.length < 1) {
    throw new Error("agg requires a time_between_reqs argument");
  }
  const timeBetweenRequests = parseDuration(args[0]);
  console.log(
    `Collecting feeds every ${timeBetweenRequests / 1000}s`
  );

  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

function printFeed(feed: Feed, user: User) {
  console.log(`feed: ${feed.name}`);
  console.log(`url: ${feed.url}`);
  console.log(`user: ${user.name}`);
}

function printFeedFollow(feedName: string, userName: string) {
  console.log(`feed: ${feedName}`);
  console.log(`user: ${userName}`);
}

async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length < 2) {
    throw new Error("addfeed requires a name and url");
  }
  const name = args[0];
  const url = args[1];

  const feed = await createFeed(name, url, user.id);
  printFeed(feed, user);

  const feedFollow = await createFeedFollow(user.id, feed.id);
  printFeedFollow(feedFollow.feedName, feedFollow.userName);
}

async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length < 1) {
    throw new Error("follow requires a url");
  }
  const url = args[0];

  const feed = await getFeedByURL(url);
  if (feed === undefined) {
    throw new Error(`feed with url ${url} does not exist`);
  }

  const feedFollow = await createFeedFollow(user.id, feed.id);
  printFeedFollow(feedFollow.feedName, feedFollow.userName);
}

async function handlerFollowing(cmdName: string, user: User, ...args: string[]) {
  const follows = await getFeedFollowsForUser(user.id);
  for (const follow of follows) {
    console.log(follow.feedName);
  }
}

async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length < 1) {
    throw new Error("unfollow requires a url");
  }
  const url = args[0];

  const feed = await getFeedByURL(url);
  if (feed === undefined) {
    throw new Error(`feed with url ${url} does not exist`);
  }

  await deleteFeedFollowByUserAndURL(user.id, url);
  console.log(`user ${user.name} unfollowed feed: ${feed.name}`);
}

async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  let limit = 2;
  if (args.length >= 1) {
    const parsed = parseInt(args[0], 10);
    if (Number.isNaN(parsed)) {
      throw new Error(`invalid limit: ${args[0]}`);
    }
    limit = parsed;
  }

  const posts = await getPostsForUser(user.id, limit);
  for (const post of posts) {
    console.log(`- ${post.title} (${post.feedName})`);
    console.log(`  ${post.url}`);
  }
}

export const userCommandHandlers: Record<string, UserCommandHandler> = {
  addfeed: handlerAddFeed,
  follow: handlerFollow,
  following: handlerFollowing,
  unfollow: handlerUnfollow,
  browse: handlerBrowse,
};

async function handlerFeeds(cmdName: string, ...args: string[]) {
  const feeds = await getFeedsWithUsers();
  for (const feed of feeds) {
    console.log(`* ${feed.name}: ${feed.url} (${feed.userName})`);
  }
}

export type CommandsRegistry = Record<string, CommandHandler>;

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];
  if (handler === undefined) {
    throw new Error(`unknown command: ${cmdName}`);
  }
  await handler(cmdName, ...args);
}

export {
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerUsers,
  handlerAgg,
  handlerFeeds,
};
