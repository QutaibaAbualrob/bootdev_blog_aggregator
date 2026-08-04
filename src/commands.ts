import { setUser } from "./config.js";

export type CommandHandler = (cmdName: string, ...args: string[]) => void;

function handlerLogin(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("a username is required");
  }
  const username = args[0];
  setUser(username);
  console.log(`user ${username} has been set`);
}

export type CommandsRegistry = Record<string, CommandHandler>;

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler
): void {
  registry[cmdName] = handler;
}

export function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): void {
  const handler = registry[cmdName];
  if (handler === undefined) {
    throw new Error(`unknown command: ${cmdName}`);
  }
  handler(cmdName, ...args);
}

export { handlerLogin };
