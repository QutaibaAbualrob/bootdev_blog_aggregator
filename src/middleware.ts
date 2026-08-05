import { readConfig } from "./config.js";
import { getUserByName } from "./lib/db/queries/users.js";
import type { User } from "./lib/db/schema.js";
import type { CommandHandler } from "./commands.js";

/**
 * A command handler that requires a logged-in user, which is resolved from the
 * config file and passed as the second argument.
 */
export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

/**
 * Wraps a {@link UserCommandHandler} so it can only run when a user is logged
 * in. Resolves the current user from the config file and passes it to the
 * wrapped handler.
 *
 * @throws if no user is logged in or the logged-in user no longer exists.
 */
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
