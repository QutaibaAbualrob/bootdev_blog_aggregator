import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

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
  run("psql", [DB_URL, "-c", "TRUNCATE users;"]);
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

test("no args exits with error", () => {
  const out = runCli([], true);
  assert.match(out, /not enough arguments/);
});
