import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import type ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

const watchDecoratorName = "Watch";

export const convertWatch: ASTConverter<ts.MethodDeclaration> = (node, options) => {
  if (!node.decorators) {
    return false;
  }
  const decorator = node.decorators.find(
    (el) => (el.expression as ts.CallExpression).expression.getText() === watchDecoratorName
  );
  if (decorator) {
    const $t = new TsHelper(options);
    const decoratorArguments = (decorator.expression as ts.CallExpression).arguments;
    if (decoratorArguments.length > 1) {
      const keyName = (decoratorArguments[0] as ts.StringLiteral).text;
      const watchArguments = decoratorArguments[1];

      const method = $t.createArrowFunctionFromNode(node);

      const watchOptions: ts.PropertyAssignment[] = [];
      if ($t.module.isObjectLiteralExpression(watchArguments)) {
        watchArguments.properties.forEach((el) => {
          if (!$t.module.isPropertyAssignment(el)) return;
          watchOptions.push(el);
        });
      }

      const thisPropertyAccess = $t.createPropertyAccess(
        $t.factory.createThis(),
        $t.factory.createIdentifier(keyName)
      );
      const watchArgs = $t.factory.createObjectLiteralExpression(watchOptions);
      const watchArgsArray = [thisPropertyAccess, method, watchArgs];
      const watchExprStatement = $t.createExpressionStatement("watch", undefined, watchArgsArray);
      const watchExprWithComments = $t.copySyntheticComments(watchExprStatement, node);

      return {
        tag: "Watch",
        kind: ASTResultKind.COMPOSITION,
        imports: $t.namedImports(["watch"]),
        reference: ReferenceKind.VARIABLE,
        attributes: [keyName],
        nodes: [watchExprWithComments] as ts.ExpressionStatement[],
      };
    }
  }

  return false;
};
