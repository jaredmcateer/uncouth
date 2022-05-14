import ts from "typescript";
import { UncouthOptions } from "../options";
import { ASTConvertPlugins, ASTResult, ASTConverter, ASTResultKind } from "./types";
import { convertNodeToASTResult } from "../utils";
import { log } from "../debug";
import { convertObjName } from "./vue-class-component/object/ComponentName";
import { convertObjProps } from "./vue-class-component/object/Prop";
import { convertObjData } from "./vue-class-component/object/Data";
import { convertName, mergeName } from "./vue-class-component/ComponentName";
import { convertModel } from "./vue-property-decorator/Model";
import { convertProp, mergeProps } from "./vue-property-decorator/Prop";
import { convertDomRef } from "./vue-property-decorator/DomRef";
import { convertData } from "./vue-class-component/Data";
import { convertGetter, convertSetter, mergeComputed } from "./vue-class-component/Computed";
import { convertIntervalHook } from "./vue-class-component/IntervalHook";
import { convertWatch } from "./vue-property-decorator/Watch";
import { convertEmitMethod } from "./vue-property-decorator/Emit";
import { convertMethod } from "./vue-class-component/Method";
import { changeContextAndSort } from "./changeContextAndSort";
import { convertRender } from "./vue-class-component/Render";
import { convertInject } from "./vue-property-decorator/Inject";
import { convertProvide } from "./vue-property-decorator/Provide";
import { convertTemplateRef } from "./vue-class-component/TemplateRef";
import { TsHelper } from "../helpers/TsHelper";

export function getDefaultPlugins(tsModule: typeof ts): ASTConvertPlugins {
  return {
    [tsModule.SyntaxKind.Decorator]: {
      [tsModule.SyntaxKind.PropertyAssignment]: [convertObjName, convertObjProps],
      [tsModule.SyntaxKind.MethodDeclaration]: [convertObjData, convertIntervalHook],
    },
    [tsModule.SyntaxKind.Identifier]: [convertName],
    [tsModule.SyntaxKind.HeritageClause]: [
      // TODO: extends Minix
    ],
    [tsModule.SyntaxKind.PropertyDeclaration]: [
      convertModel,
      convertProp,
      convertDomRef,
      convertProvide,
      convertInject,
      convertData,
      convertTemplateRef,
    ],
    [tsModule.SyntaxKind.GetAccessor]: [convertGetter],
    [tsModule.SyntaxKind.SetAccessor]: [convertSetter],
    [tsModule.SyntaxKind.MethodDeclaration]: [
      convertRender,
      convertIntervalHook,
      convertWatch,
      convertEmitMethod,
      convertMethod,
    ],
    after: [mergeName, mergeProps, mergeComputed, changeContextAndSort],
  };
}

export function getDecoratorArgumentExpr(
  tsModule: typeof ts,
  node: ts.Node
): ts.ObjectLiteralExpression | undefined {
  if (tsModule.isCallExpression(node)) {
    if (node.arguments.length > 0) {
      return node.arguments[0] as ts.ObjectLiteralExpression;
    }
  }

  return undefined;
}

export function getASTResults(
  node: ts.ClassDeclaration,
  options: UncouthOptions,
  program: ts.Program
): ASTResult<ts.Node>[] {
  const $t = new TsHelper(options);
  const converterPlugins = options.plugins;

  let astResults: ASTResult<ts.Node>[] = [];
  node.forEachChild((child) => {
    if ($t.module.isDecorator(child)) {
      const objExpr = getDecoratorArgumentExpr($t.module, child.expression);
      if (objExpr) {
        objExpr.forEachChild((property) => {
          if (property.kind in converterPlugins[$t.module.SyntaxKind.Decorator]) {
            const objConverters = (
              converterPlugins[$t.module.SyntaxKind.Decorator] as unknown as {
                [index: number]: Array<ASTConverter<ts.Node>>;
              }
            )[property.kind];
            let converted = false;
            for (const converter of objConverters) {
              const result = converter(property, options, program);
              if (result) {
                astResults.push(result);
                converted = true;
                break;
              }
            }
            if (!converted) {
              astResults.push(convertNodeToASTResult($t, property));
            }
          }
        });
      }
    } else {
      if (child.kind in converterPlugins) {
        const converters = (
          converterPlugins as unknown as { [index: number]: Array<ASTConverter<ts.Node>> }
        )[child.kind];
        for (const converter of converters) {
          const result = converter(child, options, program);
          if (result) {
            astResults.push(result);
            break;
          }
        }
      }
    }
  });

  for (const fn of converterPlugins.after) {
    astResults = fn(astResults, options, program);
  }

  return astResults;
}

export function convertASTResultToSetupFn(
  astResults: ASTResult<ts.Node>[],
  options: UncouthOptions
): ts.MethodDeclaration {
  const $t = new TsHelper(options);

  const returnStatement = $t.addTodoComment(
    $t.factory.createReturnStatement(
      $t.factory.createObjectLiteralExpression([
        ...astResults
          .filter((el) => el.kind === ASTResultKind.COMPOSITION)
          .reduce((array, el) => array.concat(el.attributes), [] as string[])
          .map((el) => $t.factory.createShorthandPropertyAssignment(el, undefined)),
      ])
    ),
    "Please remove unused return variable",
    false
  );

  return $t.createMethod(
    "setup",
    [options.setupPropsKey, options.setupContextKey],
    [
      ...(astResults
        .filter((el) => el.kind === ASTResultKind.COMPOSITION)
        .map((el) => el.nodes)
        .reduce((array, el) => array.concat(el), []) as ts.Statement[]),
      returnStatement,
    ]
  );
}

export function convertASTResultToImport(
  astResults: ASTResult<ts.Node>[],
  options: UncouthOptions
): ts.ImportDeclaration[] {
  interface Clause {
    named: Set<string>;
    default?: string;
  }

  const $t = new TsHelper(options);

  const importMap = new Map<string, Clause>();
  for (const result of astResults) {
    for (const importInfo of result.imports) {
      const key: string = "external" in importInfo ? importInfo.external : importInfo.path;
      const temp: Clause = importMap.get(key) ?? { named: new Set() };
      if (!("default" in temp) && "default" in importInfo) {
        temp.default = importInfo.default;
      }
      temp.named.add("defineComponent");
      for (const named of importInfo.named || []) {
        temp.named.add(named);
      }
      importMap.set(key, temp);
    }
  }

  if (options.compatible && importMap.has("@vue/composition-api")) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const temp = importMap.get("@vue/composition-api")!;
    temp.named.add("defineComponent");
    importMap.set("@vue/composition-api", temp);
  }

  return Array.from(importMap).map((el) => {
    const [key, clause] = el;

    const name = clause.default ? $t.factory.createIdentifier(clause.default) : undefined;
    const importElements = [...clause.named].map((named) =>
      $t.factory.createImportSpecifier(false, undefined, $t.factory.createIdentifier(named))
    );
    const namedImports = $t.factory.createNamedImports(importElements);

    return $t.factory.createImportDeclaration(
      undefined,
      undefined,
      $t.factory.createImportClause(false, name, namedImports),
      $t.factory.createStringLiteral(key)
    );
  });
}

export function runPlugins(
  node: ts.ClassDeclaration,
  options: UncouthOptions,
  program: ts.Program
): ts.Statement[] {
  const $t = new TsHelper(options);
  log("Start Run ASTPlugins");
  const results = getASTResults(node, options, program);
  log("Finished ASTPlugins");

  log("Make setup function");
  const setupFn = convertASTResultToSetupFn(results, options);
  log("Make default export object");
  const dcIdentifier = $t.factory.createIdentifier("defineComponent");
  const dcOptionsProperties = [
    ...(results
      .filter((el) => el.kind === ASTResultKind.OBJECT)
      .map((el) => el.nodes)
      .reduce((array, el) => array.concat(el), []) as ts.PropertyAssignment[]),
    setupFn,
  ];
  const dcOptions = $t.factory.createObjectLiteralExpression(dcOptionsProperties, true);
  const dcExpression = $t.createCallExpression(dcIdentifier, undefined, [dcOptions]);
  const dcExportAssignment = $t.factory.createExportAssignment(
    undefined,
    undefined,
    undefined,
    dcExpression
  );

  const defineComponentExportAssignment = $t.copySyntheticComments(dcExportAssignment, node);

  log("Make ImportDeclaration");
  const importDeclaration = convertASTResultToImport(results, options);

  return [...importDeclaration, defineComponentExportAssignment];
}
