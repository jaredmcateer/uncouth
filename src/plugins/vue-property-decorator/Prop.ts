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
let $t: TsHelper;

export const convertProp: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
  if (!node.decorators) {
    return false;
  }
  const decorator = node.decorators.find(
    (el) => (el.expression as ts.CallExpression).expression.getText() === propDecoratorName
  );
  if (decorator) {
    const propType = "PropType";
    $t = new TsHelper(options);
    let type = node.type?.kind;
    const decoratorArguments = (decorator.expression as ts.CallExpression).arguments;
    const hasKnowableType =
      type !== undefined &&
      type !== ts.SyntaxKind.AnyKeyword &&
      type !== ts.SyntaxKind.UndefinedKeyword &&
      type !== ts.SyntaxKind.UnknownKeyword;
    let addedPropKey = false;
    let addTodoComplex = false;

    let props: ts.ObjectLiteralElementLike[] = [];
    const propName = node.name.getText();

    if (decoratorArguments.length > 0 || hasKnowableType) {
      const propArguments = decoratorArguments[0];
      if (propArguments && $t.module.isObjectLiteralExpression(propArguments)) {
        props = propArguments.properties.reduce((accumulator, property) => {
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
      } else if (node.type && hasKnowableType) {
        let primType: string | undefined;

        if ($t.module.isLiteralTypeNode(node.type)) {
          type = node.type.literal.kind;
        }

        let addTsType = false;

        switch (type) {
          case ts.SyntaxKind.StringLiteral:
            addTsType = true;
            primType = "String";
            break;
          case ts.SyntaxKind.StringKeyword:
            primType = "String";
            break;
          case ts.SyntaxKind.TrueKeyword:
          case ts.SyntaxKind.FalseKeyword:
            addTsType = true;
            primType = "Boolean";
            break;
          case ts.SyntaxKind.BooleanKeyword:
            primType = "Boolean";
            break;
          case ts.SyntaxKind.NumericLiteral:
            addTsType = true;
            primType = "Number";
            break;
          case ts.SyntaxKind.NumberKeyword:
            primType = "Number";
            break;
          default:
            addTodoComplex = true;
            break;
        }

        if (primType) {
          const vueIdentifier = $t.factory.createIdentifier(primType);
          const tsIdentifier = addTsType
            ? $t.factory.createIdentifier(node.type.getText())
            : undefined;
          props = [createPropTypeAssignment(vueIdentifier, tsIdentifier)];
        }
      }
    }
    const args = $t.factory.createObjectLiteralExpression(props.length > 0 ? props : undefined);
    let propAssignment = $t.factory.createPropertyAssignment(propName, args);
    propAssignment = addTodoComplex
      ? $t.addTodoComment(
          propAssignment,
          `Too complex to determine primitive type: ${node.type!.getText()} `,
          true
        )
      : propAssignment;

    return {
      tag: "Prop",
      kind: ASTResultKind.COMPOSITION,
      imports: addedPropKey ? $t.namedImports([propType]) : [],
      reference: ReferenceKind.PROPS,
      attributes: [propName],
      nodes: [$t.copySyntheticComments(propAssignment, node)],
    };
  }

  return false;
};

function createPropTypeAssignment(
  vueTypeIdentifier: ts.Identifier,
  tsTypeIdentifier?: ts.Identifier
) {
  const typeId = $t.factory.createIdentifier("type");

  if (!tsTypeIdentifier) {
    return $t.factory.createPropertyAssignment(typeId, vueTypeIdentifier);
  }

  const tsTypeRef = $t.factory.createTypeReferenceNode(tsTypeIdentifier, undefined);
  const propTypeId = $t.factory.createIdentifier("PropType");
  const propTypeRef = $t.factory.createTypeReferenceNode(propTypeId, [tsTypeRef]);
  const asExpr = $t.factory.createAsExpression(vueTypeIdentifier, propTypeRef);
  const propAssignment = $t.factory.createPropertyAssignment(typeId, asExpr);
  return propAssignment;
}

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
