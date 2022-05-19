import ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";
import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";

const ACTION_DECORATOR = "Action";
const u = undefined;

let $t: TsHelper;

/**
 * @example
 * \@Action('myNamespace/someAction') doSomeAction: (text: string) => Promise<void>
 * // converts to
 * const doSomeAction = async (text: string): Promise<void> => {
 *   return await store.dispatch('myNamespace/someAction', text);
 * }
 * @param node
 * @param options
 * @returns
 */
export const convertAction: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
  $t = new TsHelper(options);
  const decorator = $t.getDecorator(node, ACTION_DECORATOR);

  if (!decorator) return false;

  const methodName = node.name.getText();
  const args = (decorator.expression as ts.CallExpression).arguments;
  const dispatchArgs =
    args.length === 1
      ? args
      : ts.factory.createNodeArray([$t.factory.createStringLiteral(methodName)]);
  const value = createArrowFunction(node.type, dispatchArgs);
  const constStatement = $t.createConstStatement(methodName, value);
  let storeActionMethod = $t.copySyntheticComments(constStatement, node);

  if (!isFunctionType(node.type)) {
    storeActionMethod = $t.addTodoComment(
      constStatement,
      "check function dispatch call signature is correct",
      true
    );
  }

  return {
    tag: "Action",
    kind: ASTResultKind.COMPOSITION,
    imports: $t.namedImports(["useStore"], "vuex"),
    composables: [{ default: options.vuexKey, func: "useStore" }],
    reference: ReferenceKind.VARIABLE,
    attributes: [methodName],
    nodes: [storeActionMethod],
  };
};

function createArrowFunction(
  nodeType: ts.TypeNode | undefined,
  dispatchArgs: ts.NodeArray<ts.Expression>
) {
  const asyncKeyword = $t.factory.createModifier(ts.SyntaxKind.AsyncKeyword);
  let parameters: ts.NodeArray<ts.ParameterDeclaration>;
  let typeReference: ts.TypeNode;

  if (isFunctionType(nodeType)) {
    parameters = nodeType.parameters;
    dispatchArgs = $t.factory.createNodeArray([
      ...dispatchArgs,
      $t.factory.createIdentifier(parameters[0].name.getText()),
    ]);

    if (isPromiseTypeReference(nodeType)) {
      typeReference = nodeType.type;
    } else {
      typeReference = $t.factory.createTypeReferenceNode("Promise", [nodeType.type]);
    }
  } else {
    let arg: ts.Identifier;
    [parameters, typeReference, arg] = unknownActionType();

    dispatchArgs = $t.factory.createNodeArray([...dispatchArgs, arg]);
  }

  const block = $t.factory.createBlock([createDispatchReturn(dispatchArgs)]);

  const arrowFunc = $t.factory.createArrowFunction(
    [asyncKeyword],
    u,
    parameters,
    typeReference,
    $t.rocketToken,
    block
  );

  return arrowFunc;
}

function getVariableName(decoratorArg: ts.Expression) {
  if ($t.module.isStringLiteral(decoratorArg)) {
    return decoratorArg.text;
  } else if ($t.module.isPropertyAccessExpression(decoratorArg)) {
    return decoratorArg.name.getText();
  } else {
    return decoratorArg.getText();
  }
}

function createDispatchReturn(params: ts.NodeArray<ts.Expression>): ts.ReturnStatement {
  const propertyAccessExpr = $t.factory.createPropertyAccessExpression(
    $t.factory.createIdentifier("store"),
    $t.factory.createIdentifier("dispatch")
  );
  const callExpr = $t.factory.createCallExpression(propertyAccessExpr, u, params);
  const returnStatement = $t.factory.createReturnStatement(
    $t.factory.createAwaitExpression(callExpr)
  );
  return returnStatement;
}

function isFunctionType(node: any): node is ts.FunctionTypeNode {
  return node?.kind === ts.SyntaxKind.FunctionType;
}

function isPromiseTypeReference(funcType: ts.FunctionTypeNode): boolean {
  return (
    $t.module.isTypeReferenceNode(funcType.type) && funcType.type.typeName.getText() === "Promise"
  );
}

function unknownActionType(): [
  ts.NodeArray<ts.ParameterDeclaration>,
  ts.TypeReferenceNode,
  ts.Identifier
] {
  const argIdentifier = $t.factory.createIdentifier("arg");
  const argType = $t.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
  const parameter = $t.factory.createParameterDeclaration(u, u, u, argIdentifier, u, argType, u);
  const parameters = $t.factory.createNodeArray([parameter]);
  const referenceNodeType = $t.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
  const typeReference = $t.factory.createTypeReferenceNode("Promise", [referenceNodeType]);

  return [parameters, typeReference, argIdentifier];
}
