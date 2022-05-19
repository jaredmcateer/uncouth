import type vueTemplateParser from "vue-template-compiler";
import type ts from "typescript";
import { ASTResult, ASTResultKind, ReferenceKind } from "./plugins/types";
import { TsHelper } from "./helpers/TsHelper";

export function isVueFile(path: string): boolean {
  return path.endsWith(".vue");
}
export function parseVueFile(
  vueTemplateParserModule: typeof vueTemplateParser,
  content: string
): vueTemplateParser.SFCDescriptor {
  return vueTemplateParserModule.parseComponent(content);
}

export function getNodeFromExportNode(
  tsModule: typeof ts,
  exportExpr: ts.Node
): ts.ClassDeclaration | undefined {
  switch (exportExpr.kind) {
    case tsModule.SyntaxKind.ClassDeclaration:
      return exportExpr as ts.ClassDeclaration;
  }
  return undefined;
}

export function getDefaultExportNode(
  tsModule: typeof ts,
  sourceFile: ts.SourceFile
): ts.ClassDeclaration | undefined {
  const exportStmts = sourceFile.statements.filter(
    (st) => st.kind === tsModule.SyntaxKind.ClassDeclaration
  );
  if (exportStmts.length === 0) {
    return undefined;
  }
  const exportNode = exportStmts[0] as ts.ClassDeclaration;

  return getNodeFromExportNode(tsModule, exportNode);
}

export function getDecoratorNames(tsModule: typeof ts, node: ts.Node): string[] {
  if (node.decorators) {
    return node.decorators.map((el) => {
      if (tsModule.isCallExpression(el.expression)) {
        return el.expression.expression.getText();
      } else {
        return el.expression.getText();
      }
    });
  }

  return [];
}

const $internalHooks = new Map<string, string | false>([
  ["beforeCreate", false],
  ["created", false],
  ["beforeMount", "onBeforeMount"],
  ["mounted", "onMounted"],
  ["beforeDestroy", "onBeforeUnmount"],
  ["destroyed", "onUnmounted"],
  ["beforeUpdate", "onBeforeUpdate"],
  ["updated", "onUpdated"],
  ["activated", "onActivated"],
  ["deactivated", "onDeactivated"],
  ["render", "onRender"],
  ["errorCaptured", "onErrorCaptured"], // 2.5
  ["serverPrefetch", "onServerPrefetch"], // 2.6
]);

export function isInternalHook(methodName: string): boolean {
  return $internalHooks.has(methodName);
}

export function getMappedHook(methodName: string): string | undefined | false {
  return $internalHooks.get(methodName);
}

export function isPrimitiveType(tsModule: typeof ts, returnType: ts.Type): boolean {
  return (
    !!(returnType.flags & tsModule.TypeFlags.NumberLike) ||
    !!(returnType.flags & tsModule.TypeFlags.StringLike) ||
    !!(returnType.flags & tsModule.TypeFlags.BooleanLike) ||
    !!(returnType.flags & tsModule.TypeFlags.Null) ||
    !!(returnType.flags & tsModule.TypeFlags.Undefined)
  );
}

export function convertNodeToASTResult<T extends ts.Node>(
  tsHelper: TsHelper,
  node: T
): ASTResult<T> {
  return {
    imports: [],
    kind: ASTResultKind.OBJECT,
    reference: ReferenceKind.NONE,
    attributes: [],
    tag: "InheritObjProperty",
    nodes: [tsHelper.addTodoComment(node, "Can't convert this object property.", false)],
  };
}

export function isString(val: unknown): val is string {
  return typeof val === "string";
}

export function isValidIdentifier(identifier: string): boolean {
  return /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/.test(identifier);
}
