import {
  ASTConverter,
  ASTResultKind,
  ASTTransform,
  ASTResultToObject,
  ReferenceKind,
} from "../types";
import ts from "typescript";
import { copySyntheticComments } from "../../utils";

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
    const tsModule = options.typescript;
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
          if (node.type && property.name.getText() === "type") {
            const typeReference = ts.createTypeReferenceNode(propType, [node.type]);
            property.initializer = tsModule.createAsExpression(property.initializer, typeReference);
            addedPropKey = true;
          }

          accumulator.push(property);
        }

        return accumulator;
      }, [] as ts.ObjectLiteralElementLike[]);

      const args = tsModule.createObjectLiteral(props);

      return {
        tag: "Prop",
        kind: ASTResultKind.COMPOSITION,
        imports: addedPropKey
          ? [
              {
                named: [propType],
                external: options.compatible ? "@vue/composition-api" : "vue",
              },
            ]
          : [],
        reference: ReferenceKind.PROPS,
        attributes: [propName],
        nodes: [
          copySyntheticComments(
            tsModule,
            tsModule.createPropertyAssignment(tsModule.createIdentifier(propName), args),
            node
          ),
        ],
      };
    }
  }

  return false;
};

export const mergeProps: ASTTransform = (astResults, options) => {
  const tsModule = options.typescript;
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
      tsModule.createPropertyAssignment(
        tsModule.createIdentifier("props"),
        tsModule.createObjectLiteral(
          [
            ...propASTResults
              .map((el) => (el.tag === "Prop" ? el.nodes : [el.nodes[1]]))
              .reduce((array, el) => array.concat(el), [] as ts.ObjectLiteralElementLike[]),
          ] as ts.ObjectLiteralElementLike[],
          true
        )
      ),
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
