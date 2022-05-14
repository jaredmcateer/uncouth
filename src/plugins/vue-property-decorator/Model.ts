import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import type ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

const modelDecoratorName = "Model";

export const convertModel: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
  if (!node.decorators) {
    return false;
  }
  const decorator = node.decorators.find(
    (el) => (el.expression as ts.CallExpression).expression.getText() === modelDecoratorName
  );
  if (decorator) {
    const $t = new TsHelper(options);
    const decoratorArguments = (decorator.expression as ts.CallExpression).arguments;

    if (decoratorArguments.length > 1) {
      const eventName = (decoratorArguments[0] as ts.StringLiteral).text;
      const propArguments = decoratorArguments[1];

      const propAssignment = $t.factory.createPropertyAssignment(
        "prop",
        $t.factory.createStringLiteral(node.name.getText())
      );
      const eventAssignment = $t.factory.createPropertyAssignment(
        "event",
        $t.factory.createStringLiteral(eventName)
      );
      const modelObject = $t.factory.createObjectLiteralExpression(
        [propAssignment, eventAssignment],
        true
      );
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
    }
  }

  return false;
};
