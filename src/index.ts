import {
  CommandsRegistry,
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerUsers,
  registerCommand,
  runCommand,
} from "./commands.js";

async function main() {
  const registry: CommandsRegistry = {};
  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);

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
