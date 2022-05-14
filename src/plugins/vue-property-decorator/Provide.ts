import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

const provideDecoratorName = "Provide";

export const convertProvide: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
  if (!node.decorators) {
    return false;
  }
  const decorator = node.decorators.find(
    (el) => (el.expression as ts.CallExpression).expression.getText() === provideDecoratorName
  );
  if (decorator) {
    const $t = new TsHelper(options);
    const decoratorArguments = (decorator.expression as ts.CallExpression).arguments;
    const provideKeyExpr: ts.Expression =
      decoratorArguments.length > 0
        ? decoratorArguments[0]
        : $t.factory.createStringLiteral(node.name.getText());

    const provideArgs = [provideKeyExpr, ...(node.initializer ? [node.initializer] : [])];
    return {
      tag: "Provide",
      kind: ASTResultKind.COMPOSITION,
      imports: $t.namedImports(["provide"]),
      reference: ReferenceKind.NONE,
      attributes: [],
      nodes: [
        $t.copySyntheticComments(
          $t.createExpressionStatement("provide", undefined, provideArgs),
          node
        ),
      ] as ts.Statement[],
    };
  }

  return false;
};
