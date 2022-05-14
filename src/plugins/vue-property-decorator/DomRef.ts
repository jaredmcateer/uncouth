import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import type ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

const refDecoratorName = "Ref";

export const convertDomRef: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
  if (!node.decorators) {
    return false;
  }
  const decorator = node.decorators.find(
    (el) => (el.expression as ts.CallExpression).expression.getText() === refDecoratorName
  );
  if (decorator) {
    const $t = new TsHelper(options);
    const refName = node.name.getText();

    const refType = node.type ? [node.type] : undefined;
    const refExpression = $t.createCallExpression("ref", refType, [$t.factory.createNull()]);
    const refConstStatement = $t.createConstStatement(refName, refExpression);

    return {
      tag: "DomRef",
      kind: ASTResultKind.COMPOSITION,
      imports: $t.namedImports(["ref"]),
      reference: ReferenceKind.VARIABLE_NON_NULL_VALUE,
      attributes: [refName],
      nodes: [$t.copySyntheticComments(refConstStatement, node)],
    };
  }

  return false;
};
