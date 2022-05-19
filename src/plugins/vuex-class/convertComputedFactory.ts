import ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";
import { isValidIdentifier } from "../../utils";
import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";

type ConverterFactory = (
  decoratorName: "State" | "Getter",
  storeProperty: "state" | "getters"
) => ASTConverter<ts.PropertyDeclaration>;

export const convertVuexComputedFactory: ConverterFactory = (decoratorName, storeProperty) => {
  let $t: TsHelper;

  function getAccessExpression(id: string, storeKey: string) {
    const _id = $t.factory.createIdentifier(id);
    const _store = $t.factory.createIdentifier(storeKey);
    const _dispatch = $t.factory.createIdentifier(storeProperty);
    const _accessorExpr = $t.factory.createPropertyAccessExpression(_store, _dispatch);

    // 'myNamespace/foo' needs bracket notation to access on getter
    if (!isValidIdentifier(id)) {
      return $t.factory.createElementAccessExpression(_accessorExpr, _id);
    }

    return $t.factory.createPropertyAccessExpression(_accessorExpr, _id);
  }

  function createSimpleArrowFunction(returnValueExpr: ts.Expression): ts.ArrowFunction {
    const u = undefined;
    const _return = $t.factory.createReturnStatement(returnValueExpr);
    const _body = $t.factory.createBlock([_return]);
    const arrowFunc = $t.factory.createArrowFunction(u, u, [], u, $t.rocketToken, _body);

    return arrowFunc;
  }

  return (node, options) => {
    $t = new TsHelper(options);
    const storeKey = options.vuexKey;
    const decorator = $t.getDecorator(node, decoratorName);

    if (!decorator) return false;

    const computedStateName = node.name.getText();
    const decoratorArgs = (decorator.expression as ts.CallExpression).arguments;
    const statePath = decoratorArgs.length === 1 ? decoratorArgs[0].getText() : computedStateName;
    const stateAccessExpr = getAccessExpression(statePath, storeKey);
    const stateArrowFunc = [createSimpleArrowFunction(stateAccessExpr)];
    const typeArgs = node.type ? [node.type] : [];
    const computedCallExpr = $t.createCallExpression("computed", typeArgs, stateArrowFunc);
    const constStatement = $t.createConstStatement(computedStateName, computedCallExpr);
    const computedStateStatement = $t.copySyntheticComments(constStatement, node);

    return {
      tag: `Computed-Vuex-${decoratorName}`,
      kind: ASTResultKind.COMPOSITION,
      imports: [...$t.namedImports(["useStore"], "vuex"), ...$t.namedImports(["computed"])],
      composables: [{ default: options.vuexKey, func: "useStore" }],
      reference: ReferenceKind.VARIABLE_VALUE,
      attributes: [computedStateName],
      nodes: [computedStateStatement],
    };
  };
};
