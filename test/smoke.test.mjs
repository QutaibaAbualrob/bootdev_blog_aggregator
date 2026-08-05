import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: process.cwd(), encoding: "utf-8" });

const runCli = (args, expectFail = false) => {
  try {
    return run("npx", ["tsx", "./src/index.ts", ...args]);
  } catch (err) {
    if (expectFail) return err.stderr;
    throw err;
  }
};

const DB_URL = "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable";

before(() => {
  run("psql", [DB_URL, "-c", "TRUNCATE users CASCADE;"]);
});

test("type-checks", () => {
  run("npx", ["tsc", "--noEmit"]);
});

test("register then login flow works", () => {
  const reg = runCli(["register", "lane"]);
  assert.match(reg, /user created/);

  const login = runCli(["login", "lane"]);
  assert.match(login, /user lane has been set/);

  const config = JSON.parse(
    run("cat", [process.env.HOME + "/.gatorconfig.json"])
  );
  assert.equal(config.current_user_name, "lane");
  assert.equal(config.db_url, DB_URL);
});

test("register duplicate user fails", () => {
  const out = runCli(["register", "lane"], true);
  assert.match(out, /already exists/);
});

test("login with unknown user fails", () => {
  const out = runCli(["login", "ghost"], true);
  assert.match(out, /does not exist/);
});

test("reset clears all users", () => {
  runCli(["register", "resettest"]);
  const out = runCli(["reset"]);
  assert.match(out, /users reset/);

  // resettest should no longer be login-able
  const login = runCli(["login", "resettest"], true);
  assert.match(login, /does not exist/);
});

test("users lists all users with current marker", () => {
  runCli(["register", "lane"]);
  runCli(["register", "allan"]);
  runCli(["login", "allan"]);

  const out = runCli(["users"]);
  assert.match(out, /\* lane/);
  assert.match(out, /\* allan \(current\)/);
});

test("agg starts the feed collection loop", () => {
  runCli(["register", "agguser"]);
  runCli([
    "addfeed",
    "Hacker News",
    "https://news.ycombinator.com/rss",
  ]);

  // run agg briefly, then SIGINT the whole process group
  const child = spawn(
    "npx",
    ["tsx", "./src/index.ts", "agg", "1s"],
    { cwd: process.cwd(), detached: true }
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGINT");
      } catch {
        // process already gone
      }
      resolve();
    }, 4000);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("exit", () => {
      clearTimeout(timer);
      assert.match(out, /Collecting feeds every 1s/);
      assert.match(out, /fetching feed: Hacker News/);
      resolve();
    });
  });
});

test("addfeed creates a feed linked to current user", () => {
  runCli(["register", "feeduser"]);
  const out = runCli([
    "addfeed",
    "Lane's Blog",
    "https://blog.boot.dev/index.xml",
  ]);
  assert.match(out, /feed: Lane's Blog/);
  assert.match(out, /url: https:\/\/blog\.boot\.dev\/index\.xml/);
  assert.match(out, /user: feeduser/);
});

test("feeds lists all feeds with creator usernames", () => {
  runCli(["register", "kahya"]);
  runCli(["addfeed", "Hacker News RSS", "https://hnrss.org/newest"]);
  runCli(["register", "holgith"]);
  runCli(["addfeed", "Lanes Blog", "https://www.wagslane.dev/index.xml"]);
  runCli(["register", "ballan"]);

  const out = runCli(["feeds"]);
  assert.match(out, /Hacker News RSS/);
  assert.match(out, /kahya/);
  assert.match(out, /Lanes Blog/);
  assert.match(out, /holgith/);
  assert.ok(!out.includes("ballan"));
});

test("follow and following work for multiple users", () => {
  // alice creates feed (auto-follows)
  runCli(["register", "alice"]);
  runCli([
    "addfeed",
    "Go Blog",
    "https://go.dev/blog/feed.atom",
  ]);

  // bob follows alice's feed
  runCli(["register", "bob"]);
  const out = runCli(["follow", "https://go.dev/blog/feed.atom"]);
  assert.match(out, /feed: Go Blog/);
  assert.match(out, /user: bob/);

  const following = runCli(["following"]);
  assert.match(following, /Go Blog/);
});

test("unfollow removes the follow for the current user only", () => {
  // carol creates feed (auto-follows), dave follows it
  runCli(["register", "carol"]);
  runCli([
    "addfeed",
    "Rust Blog",
    "https://blog.rust-lang.org/feed.xml",
  ]);
  runCli(["register", "dave"]);
  runCli(["follow", "https://blog.rust-lang.org/feed.xml"]);

  // dave unfollows
  const out = runCli(["unfollow", "https://blog.rust-lang.org/feed.xml"]);
  assert.match(out, /unfollowed feed: Rust Blog/);

  // dave's following list is now empty
  const daveFollowing = runCli(["following"]);
  assert.ok(!daveFollowing.includes("Rust Blog"));

  // carol still follows it
  runCli(["login", "carol"]);
  const carolFollowing = runCli(["following"]);
  assert.match(carolFollowing, /Rust Blog/);
});

test("no args exits with error", () => {
  const out = runCli([], true);
  assert.match(out, /not enough arguments/);
});
