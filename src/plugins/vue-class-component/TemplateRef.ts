import { ASTConverter, ASTResultKind, ReferenceKind } from "../types";
import ts from "typescript";
import { UncouthOptions } from "../../options";
import { TsHelper } from "../../helpers/TsHelper";

export const convertTemplateRef: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
  const signatures = getPropertySignatures(node);
  const tsHelper = new TsHelper(options);

  if (!signatures) {
    return false;
  }

  const refs: ts.Statement[] = [];
  const names: string[] = [];

  signatures.forEach((signature) => {
    const [name, statement] = getVarStatement(tsHelper, signature);
    names.push(name);
    refs.push(statement);
  });

  return {
    tag: "TemplateRef",
    kind: ASTResultKind.COMPOSITION,
    imports: tsHelper.namedImports(["ref"]),
    reference: ReferenceKind.TEMPLATE_REF,
    attributes: names,
    nodes: refs,
  };
};

function getPropertySignatures(node: ts.PropertyDeclaration) {
  if (node.name.getText() !== "$refs") {
    return false;
  }

  const typeLiteral = node.getChildren().find((child): child is ts.TypeLiteralNode => {
    return child.kind === ts.SyntaxKind.TypeLiteral;
  });

  if (!typeLiteral) {
    return false;
  }

  const signatures = typeLiteral.members.filter((child): child is ts.PropertySignature => {
    return child.kind === ts.SyntaxKind.PropertySignature;
  });

  if (!signatures.length) {
    return false;
  }

  return signatures;
}

function getVarStatement(
  tsHelper: TsHelper,
  signature: ts.PropertySignature
): [string, ts.VariableStatement] {
  const $t = tsHelper;

  const name = signature.name.getText();

  const refType = signature.type ? [signature.type] : undefined;
  const callExpr = $t.createCallExpression("ref", refType, [$t.factory.createNull()]);
  const refConstStatement = $t.createConstStatement(name, callExpr);

  const refConstWithTodo = $t.addTodoComment(
    refConstStatement,
    "Check for potential naming collisions from $refs conversion",
    true
  );

  return [name, $t.copySyntheticComments(refConstWithTodo, signature)];
}
