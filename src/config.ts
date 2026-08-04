import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName: string;
};

const CONFIG_FILE_NAME = ".gatorconfig.json";

function getConfigFilePath(): string {
  return path.join(os.homedir(), CONFIG_FILE_NAME);
}

function writeConfig(cfg: Config): void {
  const rawConfig = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };
  fs.writeFileSync(getConfigFilePath(), JSON.stringify(rawConfig, null, 2));
}

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

export function readConfig(): Config {
  const raw = fs.readFileSync(getConfigFilePath(), "utf-8");
  return validateConfig(JSON.parse(raw));
}

export function setUser(userName: string): void {
  const cfg = readConfig();
  cfg.currentUserName = userName;
  writeConfig(cfg);
}
