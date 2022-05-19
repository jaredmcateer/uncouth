import ts from "typescript";
import { UncouthOptions } from "../options";
import { ImportModule } from "../plugins/types";
import { isString } from "../utils";

export class TsHelper {
  public module: typeof ts;
  private compatible: boolean;

  constructor(options: UncouthOptions) {
    this.module = options.typescript;
    this.compatible = options.compatible;
  }

  get factory(): ts.NodeFactory {
    return this.module.factory;
  }

  get rocketToken(): ts.PunctuationToken<ts.SyntaxKind.EqualsGreaterThanToken> {
    return this.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken);
  }

  getDecorator(node: ts.Node, decorator: string): ts.Decorator | undefined {
    if (!node?.decorators) return;

    return node.decorators.find(
      (el) => (el.expression as ts.CallExpression).expression.getText() === decorator
    );
  }

  getVueExternal(): "@vue/composition-api" | "vue" {
    return this.compatible ? "@vue/composition-api" : "vue";
  }

  namedImports(names: string[], external?: string): ImportModule[] {
    external = external || this.getVueExternal();
    return [
      {
        named: names,
        external,
      },
    ];
  }

  createIdentifier(name: string): ts.Identifier {
    return this.factory.createIdentifier(name);
  }

  createPropertyAccess(
    expr: ts.Expression | string,
    name: string | ts.MemberName
  ): ts.PropertyAccessExpression {
    const eIdentifier = isString(expr) ? this.createIdentifier(expr) : expr;
    const nIdentifier = isString(name) ? this.createIdentifier(name) : name;
    return this.factory.createPropertyAccessExpression(eIdentifier, nIdentifier);
  }

  createNonNullPropertyAccess(
    expression: ts.Expression | string,
    name: string | ts.MemberName
  ): ts.NonNullExpression {
    return this.factory.createNonNullExpression(this.createPropertyAccess(expression, name));
  }

  addTodoComment<T extends ts.Node>(node: T, comment: string, multiline: boolean): T {
    const kind = multiline
      ? this.module.SyntaxKind.MultiLineCommentTrivia
      : this.module.SyntaxKind.SingleLineCommentTrivia;

    return this.module.addSyntheticLeadingComment(node, kind, ` TODO: ${comment}`);
  }

  createObjectPropertyAssignment(
    name: string | ts.Identifier,
    properties: ts.ObjectLiteralElementLike[]
  ): ts.PropertyAssignment {
    name = isString(name) ? this.factory.createIdentifier(name) : name;
    return this.factory.createPropertyAssignment(
      name,
      this.factory.createObjectLiteralExpression(properties, true)
    );
  }

  createExpressionStatement(expression: ts.Expression): ts.ExpressionStatement;
  /**
   * Create a call expression and wrap in an expression statement
   * @param expression
   * @param typeArguments
   * @param argumentsArray
   */
  createExpressionStatement(
    expression: string | ts.Identifier,
    typeArguments?: ts.TypeNode[],
    argumentsArray?: ts.Expression[]
  ): ts.ExpressionStatement;
  createExpressionStatement(
    expression: string | ts.Identifier | ts.Expression,
    typeArguments?: ts.TypeNode[],
    argumentsArray?: ts.Expression[]
  ): ts.ExpressionStatement {
    if (isString(expression) || ts.isIdentifier(expression)) {
      expression = this.createCallExpression(expression, typeArguments, argumentsArray);
    }
    return this.factory.createExpressionStatement(expression);
  }

  copySyntheticComments<T extends ts.Node>(node: T, copyNode: ts.Node): T {
    const fullText = copyNode.getSourceFile().getFullText();
    const leadingComments = this.getLeadingComments(fullText, copyNode.pos);
    const trailingComments = this.getTrailingComments(fullText, copyNode.end);

    let result = node;
    for (const { pos, end, kind, hasTrailingNewLine } of leadingComments) {
      const text = this.getCommentText(fullText, { pos, end });
      result = this.module.addSyntheticLeadingComment(result, kind, text, hasTrailingNewLine);
    }

    for (const { pos, end, kind, hasTrailingNewLine } of trailingComments) {
      const text = this.getCommentText(fullText, { pos, end });
      result = this.module.addSyntheticTrailingComment(result, kind, text, hasTrailingNewLine);
    }

    return node;
  }

  createThis(): ts.ThisExpression {
    return this.factory.createThis();
  }

  createCallExpression(
    expr: string | ts.Identifier | ts.PropertyAccessExpression,
    typeArguments?: ts.TypeNode[],
    argumentsArray?: ts.Expression[]
  ): ts.CallExpression {
    const expression = isString(expr) ? this.createIdentifier(expr) : expr;
    return this.factory.createCallExpression(expression, typeArguments, argumentsArray);
  }

  createArrowFunctionFromNode(
    node: ts.MethodDeclaration | ts.AccessorDeclaration,
    bodyStatements?: ts.Statement[],
    multiline?: boolean
  ): ts.ArrowFunction {
    const { modifiers, typeParameters, type, body, parameters } = node;
    const rocketToken = this.factory.createToken(this.module.SyntaxKind.EqualsGreaterThanToken);
    const fnBody = bodyStatements
      ? this.factory.createBlock(bodyStatements, multiline)
      : body ?? this.factory.createBlock([], multiline);

    return this.factory.createArrowFunction(
      modifiers,
      typeParameters,
      parameters,
      type,
      rocketToken,
      fnBody
    );
  }

  createSimpleArrowFunction(returnValueExpr: ts.Expression): ts.ArrowFunction {
    const u = undefined;
    const _return = this.factory.createReturnStatement(returnValueExpr);
    const _body = this.factory.createBlock([_return]);
    const arrowFunc = this.factory.createArrowFunction(u, u, [], u, this.rocketToken, _body);

    return arrowFunc;
  }

  createConstStatement(
    name: string | ts.BindingName,
    expression: ts.Expression
  ): ts.VariableStatement {
    return this.factory.createVariableStatement(
      undefined,
      this.factory.createVariableDeclarationList(
        [this.factory.createVariableDeclaration(name, undefined, undefined, expression)],
        this.module.NodeFlags.Const
      )
    );
  }

  removeComments<T extends ts.Node>(node: T): T | ts.StringLiteral {
    if (this.module.isStringLiteral(node)) {
      return this.factory.createStringLiteral(node.text);
    }

    return node;
  }

  isPrimitiveType(returnType: ts.Type): boolean {
    return (
      !!(returnType.flags & this.module.TypeFlags.NumberLike) ||
      !!(returnType.flags & this.module.TypeFlags.StringLike) ||
      !!(returnType.flags & this.module.TypeFlags.BooleanLike) ||
      !!(returnType.flags & this.module.TypeFlags.Null) ||
      !!(returnType.flags & this.module.TypeFlags.Undefined)
    );
  }

  makeIife(fn: ts.ArrowFunction): ts.CallExpression {
    return this.factory.createCallExpression(
      this.factory.createParenthesizedExpression(fn),
      undefined,
      []
    );
  }

  createMethod(name: string, parameters: string[], body: ts.Statement[]): ts.MethodDeclaration {
    const params = parameters.map((param) =>
      this.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        param,
        undefined,
        undefined,
        undefined
      )
    );
    return this.factory.createMethodDeclaration(
      undefined,
      undefined,
      undefined,
      name,
      undefined,
      undefined,
      params,
      undefined,
      this.factory.createBlock(body, true)
    );
  }

  private getLeadingComments(text: string, pos: number): ts.CommentRange[] {
    return this.getCommentRange(text, pos, "Leading");
  }

  private getTrailingComments(text: string, pos: number): ts.CommentRange[] {
    return this.getCommentRange(text, pos, "Trailing");
  }

  private getCommentRange(
    text: string,
    pos: number,
    type: "Leading" | "Trailing"
  ): ts.CommentRange[] {
    const method = `get${type}CommentRanges` as const;
    return this.module[method](text, pos) || [];
  }

  private getCommentText(text: string, { pos, end }: { pos: number; end: number }) {
    return text
      .slice(pos, end)
      .replace(/\/\//g, "")
      .replace(/\/\*/g, "")
      .replace(/\*\//g, "")
      .replace(/ {2}\* ?/g, "* ")
      .replace(/ \*\//g, "*/")
      .replace(/ {2}$/g, "");
  }
}
