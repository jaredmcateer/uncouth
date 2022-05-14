import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import type ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

export const convertData: ASTConverter<ts.PropertyDeclaration> = (node, options, program) => {
  if (!node.initializer) {
    return false;
  }
  const $t = new TsHelper(options);

  const dataName = node.name.getText();

  const checker = program.getTypeChecker();
  const isRef = $t.isPrimitiveType(checker.getTypeAtLocation(node.initializer));

  const tag = isRef ? "Data-ref" : "Data-reactive";
  const callName = isRef ? "ref" : "reactive";

  const callExpr = $t.createCallExpression(callName, undefined, [
    $t.removeComments(node.initializer),
  ]);
  const dataConstStatement = $t.createConstStatement(dataName, callExpr);

  return {
    tag,
    kind: ASTResultKind.COMPOSITION,
    imports: $t.namedImports([callName]),
    reference: isRef ? ReferenceKind.VARIABLE_VALUE : ReferenceKind.VARIABLE,
    attributes: [dataName],
    nodes: [$t.copySyntheticComments(dataConstStatement, node)],
  };
};
