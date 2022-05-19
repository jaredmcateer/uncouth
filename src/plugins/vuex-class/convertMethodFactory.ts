import ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";
import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";

const u = undefined;

let $t: TsHelper;

type MethodFactory = (
  decorator: string,
  storeProperty: string
) => ASTConverter<ts.PropertyDeclaration>;

export const convertVuexMethodFactory: MethodFactory = (decoratorName, storeProperty) => {
  const isAsync = () => decoratorName === "Action";
  let storeKey: string;

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
      [parameters, typeReference, arg] = unknownMethodType();

      dispatchArgs = $t.factory.createNodeArray([...dispatchArgs, arg]);
    }

    const block = $t.factory.createBlock([createDispatchReturn(dispatchArgs)]);

    const arrowFunc = $t.factory.createArrowFunction(
      isAsync() ? [asyncKeyword] : u,
      u,
      parameters,
      typeReference,
      $t.rocketToken,
      block
    );

    return arrowFunc;
  }

  function createDispatchReturn(params: ts.NodeArray<ts.Expression>): ts.ReturnStatement {
    const _store = $t.factory.createIdentifier(storeKey);
    const _call = $t.factory.createIdentifier(storeProperty);
    const _accessExpr = $t.factory.createPropertyAccessExpression(_store, _call);
    const _callExpr = $t.factory.createCallExpression(_accessExpr, u, params);
    const _returnValExpr = isAsync() ? $t.factory.createAwaitExpression(_callExpr) : _callExpr;
    const returnStatement = $t.factory.createReturnStatement(_returnValExpr);

    return returnStatement;
  }

  function isFunctionType(node: ts.Node | undefined): node is ts.FunctionTypeNode {
    return node?.kind === ts.SyntaxKind.FunctionType;
  }

  function isPromiseTypeReference(funcType: ts.FunctionTypeNode): boolean {
    return (
      $t.module.isTypeReferenceNode(funcType.type) && funcType.type.typeName.getText() === "Promise"
    );
  }

  function unknownMethodType(): [
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

  return (node, options) => {
    $t = new TsHelper(options);
    storeKey = options.vuexKey;
    const decorator = $t.getDecorator(node, decoratorName);

    if (!decorator) return false;

    const methodName = node.name.getText();
    const args = (decorator.expression as ts.CallExpression).arguments;
    const dispatchArgs =
      args.length === 1
        ? args
        : ts.factory.createNodeArray([$t.factory.createStringLiteral(methodName)]);
    const value = createArrowFunction(node.type, dispatchArgs);
    const constStatement = $t.createConstStatement(methodName, value);
    let storeMethod = $t.copySyntheticComments(constStatement, node);

    if (!isFunctionType(node.type)) {
      storeMethod = $t.addTodoComment(
        constStatement,
        "check function dispatch call signature is correct",
        true
      );
    }

    return {
      tag: `Method-Vuex-${decoratorName}`,
      kind: ASTResultKind.COMPOSITION,
      imports: $t.namedImports(["useStore"], "vuex"),
      composables: [{ default: options.vuexKey, func: "useStore" }],
      reference: ReferenceKind.VARIABLE,
      attributes: [methodName],
      nodes: [storeMethod],
    };
  };
};
