import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import type ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

const injectDecoratorName = "Inject";

export const convertInject: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
  if (!node.decorators) {
    return false;
  }
  const decorator = node.decorators.find(
    (el) => (el.expression as ts.CallExpression).expression.getText() === injectDecoratorName
  );
  if (decorator) {
    const $t = new TsHelper(options);

    const decoratorArguments = (decorator.expression as ts.CallExpression).arguments;
    let injectKeyExpr: ts.Expression = $t.factory.createStringLiteral(node.name.getText());
    let defaultValueExpr: ts.Expression | undefined;

    if (decoratorArguments.length > 0) {
      const injectArgument = decoratorArguments[0];
      if ($t.module.isObjectLiteralExpression(injectArgument)) {
        const fromProperty = injectArgument.properties.find((el) => el.name?.getText() === "from");
        if (fromProperty && $t.module.isPropertyAssignment(fromProperty)) {
          injectKeyExpr = fromProperty.initializer;
        }
        const defaultProperty = injectArgument.properties.find(
          (el) => el.name?.getText() === "default"
        );
        if (defaultProperty && $t.module.isPropertyAssignment(defaultProperty)) {
          defaultValueExpr = defaultProperty.initializer;
        }
      } else {
        injectKeyExpr = injectArgument;
      }
    }

    const injectArgs = [injectKeyExpr, ...(defaultValueExpr ? [defaultValueExpr] : [])];
    const injectType = node.type
      ? [$t.factory.createKeywordTypeNode(node.type.kind as any)]
      : undefined;
    const injectExpression = $t.createCallExpression("inject", injectType, injectArgs);
    const injectConstStatement = $t.createConstStatement(node.name.getText(), injectExpression);

    return {
      tag: "Inject",
      kind: ASTResultKind.COMPOSITION,
      imports: $t.namedImports(["inject"]),
      reference: ReferenceKind.VARIABLE,
      attributes: [node.name.getText()],
      nodes: [$t.copySyntheticComments(injectConstStatement, node)] as ts.Statement[],
    };
  }

  return false;
};
