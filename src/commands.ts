import { setUser, readConfig } from "./config.js";
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

export { handlerLogin, handlerRegister, handlerReset, handlerUsers };
