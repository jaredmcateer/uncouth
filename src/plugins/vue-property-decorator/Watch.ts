import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import type ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

const watchDecoratorName = "Watch";

export const convertWatch: ASTConverter<ts.MethodDeclaration> = (node, options) => {
  const $t = new TsHelper(options);

  const decorator = $t.getDecorator(node, watchDecoratorName);
  if (!decorator) return false;

  const decoratorArguments = (decorator.expression as ts.CallExpression).arguments;
  if (decoratorArguments.length <= 0) return false;

  const keyName = (decoratorArguments[0] as ts.StringLiteral).text;
  const watchArguments = decoratorArguments[1];
  const method = $t.createArrowFunctionFromNode(node);

  const watchOptions: ts.PropertyAssignment[] = [];
  if (watchArguments && $t.module.isObjectLiteralExpression(watchArguments)) {
    watchArguments.properties.forEach((el) => {
      if (!$t.module.isPropertyAssignment(el)) return false;
      watchOptions.push(el);
    });
  }

  const thisPropertyAccess = $t.createPropertyAccess(
    $t.createThis(),
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
};
