import { ASTConverter, ASTResultKind, ASTTransform, ASTResult, ReferenceKind } from "../types";
import type ts from "typescript";
import { TsHelper } from "../../helpers/TsHelper";

const convertAccessor =
  (type: "setter" | "getter"): ASTConverter<ts.AccessorDeclaration> =>
  (node, options) => {
    const $t = new TsHelper(options);
    const computedName = node.name.getText();
    const computedArrowFunction = $t.createArrowFunctionFromNode(node);

    return {
      tag: `Computed-${type}`,
      kind: ASTResultKind.COMPOSITION,
      imports: $t.namedImports(["computed"]),
      reference: ReferenceKind.VARIABLE,
      attributes: [computedName],
      nodes: [$t.copySyntheticComments(computedArrowFunction, node)],
    };
  };

export const convertGetter: ASTConverter<ts.GetAccessorDeclaration> = convertAccessor("getter");
export const convertSetter: ASTConverter<ts.SetAccessorDeclaration> = convertAccessor("setter");

export const mergeComputed: ASTTransform = (astResults, options) => {
  const $t = new TsHelper(options);
  const getterASTResults = astResults.filter((el) => el.tag === "Computed-getter");
  const setterASTResults = astResults.filter((el) => el.tag === "Computed-setter");
  const otherASTResults = astResults.filter(
    (el) => el.tag !== "Computed-getter" && el.tag !== "Computed-setter"
  );

  const computedASTResults: ASTResult<ts.Statement>[] = [];

  getterASTResults.forEach((getter) => {
    const getterName = getter.attributes[0];

    const setter = setterASTResults.find((el) => el.attributes.includes(getterName));

    const leadingComments = setter ? [] : $t.module.getSyntheticLeadingComments(getter.nodes[0]);
    const trailingComments = setter ? [] : $t.module.getSyntheticTrailingComments(getter.nodes[0]);

    let computedExpression: ts.Expression;
    if (setter) {
      computedExpression = $t.createObjectLiteralExpression([
        ["get", getter.nodes[0] as ts.Expression],
        ["set", setter.nodes[0] as ts.Expression],
      ]);
    } else {
      computedExpression = $t.module.setSyntheticTrailingComments(
        $t.module.setSyntheticLeadingComments(getter.nodes[0] as ts.Expression, undefined),
        undefined
      );
    }
    const computedCallExpr = $t.createCallExpression("computed", undefined, [computedExpression]);
    const computedConstStatement = $t.createConstStatement(getterName, computedCallExpr);

    computedASTResults.push({
      tag: "Computed",
      kind: ASTResultKind.COMPOSITION,
      imports: $t.namedImports(["computed"]),
      reference: ReferenceKind.VARIABLE_VALUE,
      attributes: [getterName],
      nodes: [
        setter
          ? computedConstStatement
          : $t.module.setSyntheticTrailingComments(
              $t.module.setSyntheticLeadingComments(computedConstStatement, leadingComments),
              trailingComments
            ),
      ] as ts.Statement[],
    });
  });

  return [...computedASTResults, ...otherASTResults];
};
