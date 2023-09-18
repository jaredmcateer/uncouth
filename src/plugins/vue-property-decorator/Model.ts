import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import type ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

const modelDecoratorName = "Model";

export const convertModel: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
  const $t = new TsHelper(options);

  const decorator = $t.getDecorator(node, modelDecoratorName);
  if (!decorator) return false;

  const decoratorArguments = (decorator.expression as ts.CallExpression).arguments;
  if (decoratorArguments.length <= 0) return false;

  const eventName = (decoratorArguments[0] as ts.StringLiteral).text;
  const propArguments = decoratorArguments[1];

  const modelObject = $t.createObjectLiteralExpression([
    ["prop", node.name.getText()],
    ["event", eventName],
  ]);
  const modelPropAssignment = $t.factory.createPropertyAssignment("model", modelObject);

  return {
    tag: "Model",
    kind: ASTResultKind.OBJECT,
    imports: [],
    reference: ReferenceKind.NONE,
    attributes: [node.name.getText()],
    nodes: [
      $t.copySyntheticComments(modelPropAssignment, node),
      $t.factory.createPropertyAssignment(node.name.getText(), propArguments),
    ] as ts.PropertyAssignment[],
  };
};
