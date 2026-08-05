import { readConfig } from "./config.js";
import { getUserByName } from "./lib/db/queries/users.js";
import type { User } from "./lib/db/schema.js";
import type { CommandHandler } from "./commands.js";

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export function middlewareLoggedIn(
  handler: UserCommandHandler
): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const currentUserName = readConfig().currentUserName;
    const user = await getUserByName(currentUserName);
    if (user === undefined) {
      throw new Error(`user ${currentUserName} does not exist`);
    }
    await handler(cmdName, user, ...args);
  };
}
