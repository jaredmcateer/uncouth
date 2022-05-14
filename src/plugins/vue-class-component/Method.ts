import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import type ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

export const convertMethod: ASTConverter<ts.MethodDeclaration> = (node, options) => {
  const $t = new TsHelper(options);
  const methodName = node.name.getText();

  const outputMethod = $t.createArrowFunctionFromNode(node);
  const methodConstStatement = $t.createConstStatement(methodName, outputMethod);

  return {
    tag: "Method",
    kind: ASTResultKind.COMPOSITION,
    imports: [],
    reference: ReferenceKind.VARIABLE,
    attributes: [methodName],
    nodes: [$t.copySyntheticComments(methodConstStatement, node)],
  };
};
