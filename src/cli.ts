import program from "commander";
import { convertFile } from "./index.js";
import inquirer from "inquirer";
import { writeFileInfo } from "./file";
import { version } from "../package.json";

function camelize(str: string) {
  return str.replace(/-(\w)/g, (_, c: string) => (c ? c.toUpperCase() : ""));
}

function getCmdOptions(cmd: { options: Array<{ long: string }> }) {
  const args: { [key: string]: boolean | string } = {};
  cmd.options.forEach((o: { long: string }) => {
    const key = camelize(o.long.replace(/^--/, ""));

    if (
      typeof (cmd as unknown as Record<string, string>)[key] !== "function" &&
      typeof (cmd as unknown as Record<string, string>)[key] !== "undefined"
    ) {
      args[key] = (cmd as unknown as Record<string, string>)[key];
    }
  });
  return args;
}

program.version(version).usage("<command> [options]");

program
  .command("single <filePath>")
  .description("convert vue component file from class to composition api")
  .option("-v, --view", "Output file content on stdout, and no write file.")
  .option("-o, --output", "Output result file path.")
  .option("-r, --root <root>", "Set root path for calc file absolute path. Default:`process.cwd()`")
  .option("-c, --config <config>", "Set uncouth config file path. Default: `'.uncouth.js'`")
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  .action(async (filePath: string, cmd) => {
    const cmdOptions = getCmdOptions(cmd);
    if (!cmdOptions.output && !cmdOptions.view) {
      const result = await inquirer.prompt({
        name: "ok",
        type: "confirm",
        message:
          "You aren't using -o option to set output file path, It will replace original file content.",
      });
      if (!result.ok) {
        return;
      }
    }

    const { file, result } = convertFile(
      filePath,
      cmdOptions.root as string,
      cmdOptions.config as string
    );
    if (cmdOptions.view) {
      console.log(result);
      return;
    }

    writeFileInfo(file, result);
    console.log("Please check the TODO comments on result.");
  });

program.parse(process.argv);
