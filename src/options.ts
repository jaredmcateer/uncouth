import ts from "typescript";
import { ASTConvertPlugins } from "./plugins/types";
import { getDefaultPlugins } from "./plugins";
import * as vueTemplateCompiler from "vue-template-compiler";

export interface UncouthOptions {
  root: string;
  debug: boolean;
  compatible: boolean;
  setupPropsKey: string;
  setupContextKey: string;
  typescript: typeof ts;
  vueTemplateCompiler: typeof vueTemplateCompiler;
  prettierConfig: string;
  plugins: ASTConvertPlugins;
}

export type InputUncouthOptions = Partial<UncouthOptions>;

export function getDefaultUncouthOptions(tsModule: typeof ts = ts): UncouthOptions {
  return {
    root: process.cwd(),
    debug: false,
    compatible: false,
    setupPropsKey: "props",
    setupContextKey: "context",
    typescript: tsModule,
    vueTemplateCompiler: vueTemplateCompiler,
    prettierConfig: ".prettierrc",
    plugins: getDefaultPlugins(tsModule),
  };
}

export function mergeUncouthOptions(
  original: UncouthOptions,
  merged: InputUncouthOptions
): UncouthOptions {
  return {
    ...original,
    ...merged,
  };
}
