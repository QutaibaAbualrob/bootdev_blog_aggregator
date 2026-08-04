import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: process.cwd(), encoding: "utf-8" });

test("type-checks", () => {
  run("npx", ["tsc", "--noEmit"]);
});

test("login sets the current user in config", () => {
  const out = run("npx", ["tsx", "./src/index.ts", "login", "alice"]);
  assert.match(out, /user alice has been set/);

  const config = JSON.parse(
    run("cat", [process.env.HOME + "/.gatorconfig.json"])
  );
  assert.equal(config.current_user_name, "alice");
  assert.equal(config.db_url, "postgres://example");
});
