import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import type ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

const emitDecoratorName = "Emit";

// Code copied from Vue/src/shared/util.js
const hyphenateRE = /\B([A-Z])/g;
const hyphenate = (str: string) => str.replace(hyphenateRE, "-$1").toLowerCase();

export const convertEmitMethod: ASTConverter<ts.MethodDeclaration> = (node, options) => {
  const $t = new TsHelper(options);

  const decorator = $t.getDecorator(node, emitDecoratorName);
  if (!decorator) return false;

  const methodName = node.name.getText();

  const decoratorArguments = (decorator.expression as ts.CallExpression).arguments;
  const eventName =
    decoratorArguments.length > 0 && $t.module.isStringLiteral(decoratorArguments[0])
      ? (decoratorArguments[0] as ts.StringLiteral).text
      : undefined;

  const createEmit = (event: string, expressions: ts.Expression[]) =>
    $t.createExpressionStatement(
      $t.createCallExpression($t.createPropertyAccess("context", "emit"), undefined, [
        $t.factory.createStringLiteral(hyphenate(methodName)),
        ...expressions,
      ])
    );

  const valueIdentifier =
    node.parameters.length > 0
      ? $t.factory.createIdentifier(node.parameters[0].name.getText())
      : undefined;

  let haveResult = false;
  const transformer: () => ts.TransformerFactory<ts.Statement> = () => {
    return (context) => {
      const deepVisitor: ts.Visitor = (node) => {
        if ($t.module.isReturnStatement(node)) {
          haveResult = true;
          return createEmit(
            eventName || hyphenate(methodName),
            (node.expression ? [node.expression] : []).concat(
              valueIdentifier ? [valueIdentifier] : []
            )
          );
        }
        return $t.module.visitEachChild(node, deepVisitor, context);
      };

      return (node) => $t.module.visitNode(node, deepVisitor);
    };
  };

  const originalBodyStatements = node.body ? node.body.statements : $t.factory.createNodeArray([]);
  let bodyStatements = $t.module.transform(
    originalBodyStatements.map((el) => el),
    [transformer()],
    { module: $t.module.ModuleKind.ESNext }
  ).transformed;
  if (!haveResult) {
    bodyStatements = [
      ...originalBodyStatements,
      createEmit(eventName || hyphenate(methodName), valueIdentifier ? [valueIdentifier] : []),
    ];
  }

  const outputMethod = $t.createArrowFunctionFromNode(node, bodyStatements, true);
  const emitConstStatement = $t.createConstStatement(methodName, outputMethod);

  return {
    tag: "Emit",
    kind: ASTResultKind.COMPOSITION,
    imports: [],
    reference: ReferenceKind.VARIABLE,
    attributes: [methodName],
    nodes: [$t.copySyntheticComments(emitConstStatement, node)] as ts.Statement[],
  };
};
