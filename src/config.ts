import fs from "fs";
import os from "os";
import path from "path";

/**
 * The application configuration: the database connection string and the
 * currently logged-in user (empty string when nobody is logged in).
 */
export type Config = {
  dbUrl: string;
  currentUserName: string;
};

const CONFIG_FILE_NAME = ".gatorconfig.json";

/** Returns the absolute path to the per-user config file (~/.gatorconfig.json). */
function getConfigFilePath(): string {
  return path.join(os.homedir(), CONFIG_FILE_NAME);
}

/** Persists the given config to disk as JSON with snake_case keys. */
function writeConfig(cfg: Config): void {
  const rawConfig = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };
  fs.writeFileSync(getConfigFilePath(), JSON.stringify(rawConfig, null, 2));
}

/**
 * Validates raw JSON config and normalizes it into a typed {@link Config}.
 *
 * Throws when the file is not an object, `db_url` is missing or not a string,
 * or `current_user_name` is present but not a string.
 */
function validateConfig(rawConfig: any): Config {
  if (rawConfig === null || typeof rawConfig !== "object") {
    throw new Error("invalid config: expected an object");
  }
  if (typeof rawConfig.db_url !== "string") {
    throw new Error("invalid config: db_url must be a string");
  }
  if (
    rawConfig.current_user_name !== undefined &&
    typeof rawConfig.current_user_name !== "string"
  ) {
    throw new Error("invalid config: current_user_name must be a string");
  }
  return {
    dbUrl: rawConfig.db_url,
    currentUserName: rawConfig.current_user_name ?? "",
  };
}

/**
 * Reads and validates the config file from disk.
 *
 * @throws if the file is missing, contains invalid JSON, or fails validation.
 */
export function readConfig(): Config {
  const raw = fs.readFileSync(getConfigFilePath(), "utf-8");
  return validateConfig(JSON.parse(raw));
}

/** Updates the currently logged-in user in the config file. */
export function setUser(userName: string): void {
  const cfg = readConfig();
  cfg.currentUserName = userName;
  writeConfig(cfg);
}
