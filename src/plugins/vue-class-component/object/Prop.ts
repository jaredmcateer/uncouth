import { ASTConverter, ASTResultKind, ReferenceKind } from "../../types";
import type ts from "typescript";
import { TsHelper } from "../../../helpers/TsHelper";

export const convertObjProps: ASTConverter<ts.PropertyAssignment> = (node, options) => {
  if (node.name.getText() === "props") {
    const $t = new TsHelper(options);
    const attributes = $t.module.isArrayLiteralExpression(node.initializer)
      ? node.initializer.elements
          .filter((expr) => expr.kind === $t.module.SyntaxKind.StringLiteral)
          .map((el) => (el as ts.StringLiteral).text)
      : (node.initializer as ts.ObjectLiteralExpression).properties.map(
          (el) => el.name?.getText() ?? ""
        );

    const nodes = $t.module.isArrayLiteralExpression(node.initializer)
      ? node.initializer.elements
          .filter((expr) => expr.kind === $t.module.SyntaxKind.StringLiteral)
          .map((el) =>
            $t.factory.createPropertyAssignment(
              (el as ts.StringLiteral).text,
              $t.factory.createNull()
            )
          )
      : (node.initializer as ts.ObjectLiteralExpression).properties.map(
          (el) => el as ts.PropertyAssignment
        );

    return {
      tag: "Prop",
      kind: ASTResultKind.OBJECT,
      reference: ReferenceKind.PROPS,
      imports: [],
      attributes,
      nodes,
    };
  }

  return false;
};
