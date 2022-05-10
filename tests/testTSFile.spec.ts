import { convertFile } from "../src";
import { FileKind } from "../src/file";
import path from "path";
import util from "util";
import { exec } from "child_process";

const execAsync = util.promisify(exec);

describe("testTSFile", () => {
  const filePath = "fixture/Input.ts";

  it("compatible", () => {
    const { file, result } = convertFile(filePath, __dirname, "config/.compatible.uncouth.js");
    expect(file.fsPath.includes(path.basename(filePath))).toBeTruthy();
    expect(path.isAbsolute(file.fsPath)).toBeTruthy();
    expect(file.kind).toBe(FileKind.TS);
    expect(file).not.toHaveProperty("start");
    expect(file).not.toHaveProperty("end");
    expect(result).toMatchSnapshot();
  });

  it("no compatible", () => {
    const { file, result } = convertFile(filePath, __dirname, "config/.nocompatible.uncouth.js");
    expect(file.fsPath.includes(path.basename(filePath))).toBeTruthy();
    expect(path.isAbsolute(file.fsPath)).toBeTruthy();
    expect(file.kind).toBe(FileKind.TS);
    expect(file).not.toHaveProperty("start");
    expect(file).not.toHaveProperty("end");
    expect(result).toMatchSnapshot();
  });

  it("compatible and ts config file", async (done) => {
    jest.setTimeout(10000);
    const { stdout, stderr } = await execAsync(
      `node ${path.resolve(
        __dirname,
        "../bin/uncouth"
      )} single -v -r ${__dirname} -c config/.compatible.uncouth.ts ${filePath}`
    );

    expect(stdout).toMatchSnapshot("stdout");
    expect(stderr).toMatchSnapshot("stderr");

    done();
  });
});
