import {
  ASTConverter,
  ASTResultKind,
  ASTTransform,
  ASTResultToObject,
  ReferenceKind,
} from "../types";
import ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

const propDecoratorName = "Prop";

export const convertProp: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
  if (!node.decorators) {
    return false;
  }
  const decorator = node.decorators.find(
    (el) => (el.expression as ts.CallExpression).expression.getText() === propDecoratorName
  );
  if (decorator) {
    const propType = "PropType";
    const $t = new TsHelper(options);
    const type = node.type?.kind;
    const decoratorArguments = (decorator.expression as ts.CallExpression).arguments;
    const hasKnowableType =
      type !== undefined &&
      type !== ts.SyntaxKind.AnyKeyword &&
      type !== ts.SyntaxKind.UndefinedKeyword &&
      type !== ts.SyntaxKind.UnknownKeyword;
    let addedPropKey = false;

    if (decoratorArguments.length > 0 || hasKnowableType) {
      const propName = node.name.getText();
      const propArguments = decoratorArguments[0] as ts.ObjectLiteralExpression;
      const props = propArguments.properties.reduce((accumulator, property) => {
        if (property.kind === ts.SyntaxKind.PropertyAssignment) {
          let initializer: ts.AsExpression = property.initializer as ts.AsExpression;
          if (node.type && property.name.getText() === "type") {
            const typeReference = $t.factory.createTypeReferenceNode(propType, [node.type]);
            initializer = $t.factory.createAsExpression(property.initializer, typeReference);
            addedPropKey = true;
          }

          const newProperty = $t.factory.createPropertyAssignment(property.name, initializer);
          accumulator.push(newProperty);
        }

        return accumulator;
      }, [] as ts.ObjectLiteralElementLike[]);

      const args = $t.factory.createObjectLiteralExpression(props);

      return {
        tag: "Prop",
        kind: ASTResultKind.COMPOSITION,
        imports: addedPropKey ? $t.namedImports([propType]) : [],
        reference: ReferenceKind.PROPS,
        attributes: [propName],
        nodes: [
          $t.copySyntheticComments($t.factory.createPropertyAssignment(propName, args), node),
        ],
      };
    }
  }

  return false;
};

export const mergeProps: ASTTransform = (astResults, options) => {
  const $t = new TsHelper(options);
  const propTags = ["Prop", "Model"];

  const propASTResults = astResults.filter((el) => propTags.includes(el.tag));
  const otherASTResults = astResults.filter((el) => !propTags.includes(el.tag));
  const modelASTResult = astResults.find((el) => el.tag === "Model");
  const imports = propASTResults.find((el) => el.imports.length > 0)?.imports || [];

  const mergeASTResult: ASTResultToObject = {
    tag: "Prop",
    kind: ASTResultKind.OBJECT,
    imports,
    reference: ReferenceKind.PROPS,
    attributes: propASTResults
      .map((el) => el.attributes)
      .reduce((array, el) => array.concat(el), []),
    nodes: [
      $t.createObjectPropertyAssignment("props", [
        ...propASTResults
          .map((el) => (el.tag === "Prop" ? el.nodes : [el.nodes[1]]))
          .reduce((array, el) => array.concat(el), [] as ts.ObjectLiteralElementLike[]),
      ] as ts.ObjectLiteralElementLike[]),
    ],
  };

  return [
    ...(modelASTResult
      ? [
          {
            ...modelASTResult,
            nodes: modelASTResult.nodes.slice(0, 1) as ts.PropertyAssignment[],
          },
        ]
      : []),
    mergeASTResult,
    ...otherASTResults,
  ];
};
