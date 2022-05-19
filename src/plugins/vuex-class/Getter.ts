import ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";
import { isValidIdentifier } from "../../utils";
import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";

const GETTER_DECORATOR = "Getter";
const u = undefined;

let $t: TsHelper;

/**
 * @example
 * \@Getter('myNamespace/someGetter') getSomething: boolean;
 * // converts to
 * const getSomething = computer(() => {
 *  return store.getter('myNamespace/someGetter');
 * })
 */
export const convertVuexGetter: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
  $t = new TsHelper(options);
  const decorator = $t.getDecorator(node, GETTER_DECORATOR);

  if (!decorator) return false;

  const computedGetterName = node.name.getText();
  const decoratorArgs = (decorator.expression as ts.CallExpression).arguments;
  const getterPath = decoratorArgs.length === 1 ? decoratorArgs[0].getText() : computedGetterName;
  const getterAccessExpr = getAccessExpression(getterPath);
  const getterArrowFunc = [createArrowFunction(getterAccessExpr)];
  const typeArgs = node.type ? [node.type] : [];
  const computedCallExpr = $t.createCallExpression("computed", typeArgs, getterArrowFunc);
  const constStatement = $t.createConstStatement(computedGetterName, computedCallExpr);
  const computedGetterStatement = $t.copySyntheticComments(constStatement, node);

  return {
    tag: "Computed",
    kind: ASTResultKind.COMPOSITION,
    imports: [...$t.namedImports(["useStore"], "vuex"), ...$t.namedImports(["computed"])],
    composables: [{ default: options.vuexKey, func: "useStore" }],
    reference: ReferenceKind.VARIABLE_VALUE,
    attributes: [computedGetterName],
    nodes: [computedGetterStatement],
  };
};

function createArrowFunction(
  getterAccessExpr: ts.ElementAccessExpression | ts.PropertyAccessExpression
) {
  const _return = $t.factory.createReturnStatement(getterAccessExpr);
  const _body = $t.factory.createBlock([_return]);
  const arrowFunc = $t.factory.createArrowFunction(u, u, [], u, $t.rocketToken, _body);

  return arrowFunc;
}

function getAccessExpression(id: string) {
  const _id = $t.factory.createIdentifier(id);
  const _store = $t.factory.createIdentifier("store");
  const _dispatch = $t.factory.createIdentifier("dispatch");
  const _accessorExpr = $t.factory.createPropertyAccessExpression(_store, _dispatch);

  // 'myNamespace/foo' needs bracket notation to access on getter
  if (!isValidIdentifier(id)) {
    return $t.factory.createElementAccessExpression(_accessorExpr, _id);
  }

  return $t.factory.createPropertyAccessExpression(_accessorExpr, _id);
}
