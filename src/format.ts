/* eslint-disable @typescript-eslint/no-var-requires */
import { UncouthOptions } from "./options";
import { log } from "./debug";
import prettier from "prettier";
import prettierTypescriptParser from "prettier/parser-typescript";
import { readFileSync } from "fs";

export function format(content: string, options: UncouthOptions): string {
  const configFile = options.prettierConfig ?? "";
  let config: prettier.Options = {
    plugins: [prettierTypescriptParser],
    parser: "typescript",
  };

  try {
    const text = readFileSync(configFile, "utf-8");
    const tmpConfig = prettier.resolveConfig.sync(text);
    if (!tmpConfig) throw new Error("File not found");
    config = tmpConfig;
  } catch (err) {
    log(`Error: invalid prettier configuration, falling back to default config... (error ${err}`);
  }

  log("Formatting code...");
  return prettier.format(content, config);
}
