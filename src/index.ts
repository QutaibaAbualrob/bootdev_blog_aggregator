import {
  CommandsRegistry,
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerUsers,
  handlerAgg,
  handlerFeeds,
  userCommandHandlers,
  registerCommand,
  runCommand,
} from "./commands.js";
import { middlewareLoggedIn } from "./middleware.js";

/**
 * Entry point of the Gator CLI.
 *
 * Registers every command in the registry, then dispatches the first CLI
 * argument as the command name and passes the remaining arguments through.
 * Exits with a non-zero status code when invoked without arguments or when a
 * command fails.
 */
async function main() {
  const registry: CommandsRegistry = {};
  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "feeds", handlerFeeds);

  for (const [cmdName, handler] of Object.entries(userCommandHandlers)) {
    registerCommand(registry, cmdName, middlewareLoggedIn(handler));
  }

  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("not enough arguments provided");
    process.exit(1);
  }

  const [cmdName, ...cmdArgs] = args;

  try {
    await runCommand(registry, cmdName, ...cmdArgs);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  process.exit(0);
}

main();
