import { ASTConverter, ASTResultKind, ReferenceKind } from "../../types";
import type ts from "typescript";
import { TsHelper } from "../../../helpers/TsHelper";

export const convertObjData: ASTConverter<ts.MethodDeclaration> = (node, options) => {
  if (node.name.getText() === "data") {
    const $t = new TsHelper(options);

    const returnStatement = node.body?.statements.find((el) => $t.module.isReturnStatement(el)) as
      | ts.ReturnStatement
      | undefined;

    if (!returnStatement || !returnStatement.expression) return false;

    const attributes = (returnStatement.expression as ts.ObjectLiteralExpression).properties.map(
      (el) => el.name?.getText() ?? ""
    );
    const bodyStatements =
      node.body?.statements.map((el) => {
        if ($t.module.isReturnStatement(el)) {
          const returnExpr = returnStatement.expression ? [returnStatement.expression] : [];
          const reactiveExpression = $t.createCallExpression("reactive", undefined, returnExpr);
          const toRefsExpression = $t.createCallExpression("toRefs", undefined, [
            reactiveExpression,
          ]);

          return $t.factory.createReturnStatement(toRefsExpression);
        }
        return el;
      }) ?? [];

    const arrowFn = $t.createArrowFunctionFromNode(node, bodyStatements, true);
    const iffeFn = $t.makeIife(arrowFn);

    const bindingElements = attributes.map((el) =>
      $t.factory.createBindingElement(undefined, undefined, el, undefined)
    );
    const objBindingPattern = $t.factory.createObjectBindingPattern(bindingElements);
    const dataRefsConst = $t.createConstStatement(objBindingPattern, iffeFn);

    return {
      tag: "Data-ref",
      kind: ASTResultKind.COMPOSITION,
      imports: $t.namedImports(["reactive", "toRefs"]),
      reference: ReferenceKind.VARIABLE_VALUE,
      attributes: attributes,
      nodes: [dataRefsConst],
    };
  }

  return false;
};
