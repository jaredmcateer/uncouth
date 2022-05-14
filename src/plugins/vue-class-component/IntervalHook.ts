import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import type ts from "typescript";
import { isInternalHook, getMappedHook } from "../../utils";
import { TsHelper } from "../../helpers/TsHelper";

export const convertIntervalHook: ASTConverter<ts.MethodDeclaration> = (node, options) => {
  const intervalHookName = node.name.getText();

  if (isInternalHook(intervalHookName)) {
    const $t = new TsHelper(options);
    const namedImport = getMappedHook(intervalHookName);
    const needNamedImports = [];

    if (namedImport) {
      needNamedImports.push(namedImport);
    }

    let outputNode: ts.NodeArray<ts.Statement> | ts.ExpressionStatement | undefined =
      node.body?.statements;

    if (needNamedImports.length > 0) {
      const outputMethod = $t.createArrowFunctionFromNode(node);
      outputNode = $t.createExpressionStatement(needNamedImports[0], undefined, [outputMethod]);
    }

    if (!outputNode) {
      return false;
    }

    const nodes: ts.Statement[] =
      needNamedImports.length > 0
        ? [$t.copySyntheticComments(outputNode as ts.Statement, node)]
        : (outputNode as ts.NodeArray<ts.Statement>).map((el, index) => {
            if (index === 0) {
              return $t.copySyntheticComments(el, node);
            }
            return el;
          });

    return {
      tag: "IntervalHook",
      kind: ASTResultKind.COMPOSITION,
      attributes: needNamedImports.length > 0 ? needNamedImports : [],
      imports: $t.namedImports(needNamedImports),
      reference: ReferenceKind.NONE,
      nodes,
    };
  }

  return false;
};
