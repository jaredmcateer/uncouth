import { ASTTransform, ASTResult, ReferenceKind, ASTResultKind } from "./types";
import ts from "typescript";
import { TsHelper } from "../helpers/TsHelper";

export const changeContextAndSort: ASTTransform = (astResults, options) => {
  const $t = new TsHelper(options);
  const getReferences = (reference: ReferenceKind) =>
    astResults
      .filter((el) => el.reference === reference)
      .map((el) => el.attributes)
      .reduce((array, el) => array.concat(el), []);

  const refVariables = getReferences(ReferenceKind.VARIABLE_VALUE);
  const domRefVariables = getReferences(ReferenceKind.VARIABLE_NON_NULL_VALUE);
  const templateRefVariables = getReferences(ReferenceKind.TEMPLATE_REF);
  const propVariables = getReferences(ReferenceKind.PROPS);
  const variables = getReferences(ReferenceKind.VARIABLE);

  const convertContextKey = (key: string) => {
    const contextKey = new Map([
      ["$attrs", "attrs"],
      ["$slots", "slots"],
      ["$parent", "parent"],
      ["$root", "root"],
      ["$listeners", "listeners"],
      ["$emit", "emit"],
    ]);

    return contextKey.get(key);
  };

  let dependents: string[] = [];

  const transformer: () => ts.TransformerFactory<ts.Node> = () => {
    return (context) => {
      const changeContext: ts.Visitor = (node) => {
        if ($t.module.isPropertyAccessExpression(node)) {
          const propertyName = node.name.text;

          if (node.expression.kind === $t.module.SyntaxKind.ThisKeyword) {
            if (refVariables.includes(propertyName)) {
              dependents.push(propertyName);
              return $t.createPropertyAccess(propertyName, "value");
            } else if (domRefVariables.includes(propertyName)) {
              dependents.push(propertyName);
              return $t.createNonNullPropertyAccess(propertyName, "value");
            } else if (propVariables.includes(propertyName)) {
              dependents.push(propertyName);
              return $t.createPropertyAccess(options.setupPropsKey, propertyName);
            } else if (variables.includes(propertyName)) {
              dependents.push(propertyName);
              return $t.factory.createIdentifier(propertyName);
            } else {
              const convertKey = convertContextKey(propertyName);
              if (convertKey) {
                return $t.createPropertyAccess(options.setupContextKey, convertKey);
              }

              const fallbackRoot = $t.createPropertyAccess(options.setupContextKey, "root");
              const fallback = $t.createPropertyAccess(fallbackRoot, propertyName);
              const comment = "Check this convert result, it can work well in 80% of cases.";

              return $t.addTodoComment(fallback, comment, true);
            }
          } else if (templateRefVariables.includes(propertyName)) {
            const refPropAccess = node
              .getChildren()
              .find((child): child is ts.PropertyAccessExpression => {
                return $t.module.isPropertyAccessExpression(child);
              });

            if (refPropAccess?.name.getText() === "$refs") {
              return $t.createNonNullPropertyAccess(propertyName, "value");
            }
          }
          return $t.module.visitEachChild(node, changeContext, context);
        }
        return $t.module.visitEachChild(node, changeContext, context);
      };

      return (node) => $t.module.visitNode(node, changeContext);
    };
  };

  const transformResults = astResults.map((astResult) => {
    if (astResult.kind === ASTResultKind.OBJECT) {
      return {
        ...astResult,
        nodeDependents: [],
      };
    }
    dependents = [];
    const nodes = $t.module.transform(astResult.nodes, [transformer()], {
      module: $t.module.ModuleKind.ESNext,
    }).transformed;

    const nodeDependents = dependents.slice();

    return {
      ...astResult,
      nodes,
      nodeDependents,
    };
  });

  const astResultNoDependents = transformResults.filter((el) => el.nodeDependents.length === 0);
  let otherASTResults = transformResults.filter((el) => el.nodeDependents.length !== 0);
  let result: ASTResult<ts.Node>[] = [...astResultNoDependents];
  const resultHaveDependents = astResultNoDependents
    .map((el) => el.attributes)
    .reduce((array, el) => array.concat(el), []);

  do {
    let hasPush = false;
    otherASTResults = otherASTResults.filter((el) => {
      if (el.nodeDependents.every((dependent) => resultHaveDependents.includes(dependent))) {
        result.push(el);
        hasPush = true;
        return false;
      } else {
        return true;
      }
    });
    if (!hasPush) {
      result = result.concat(otherASTResults);
      break;
    }
  } while (result.length < astResults.length);

  return result;
};

/** @deprecated renamed to changeContextAndSort to better reflect what it does */
export const removeThisAndSort = changeContextAndSort;
