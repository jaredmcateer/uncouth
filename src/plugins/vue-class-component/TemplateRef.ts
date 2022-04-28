import { ASTConverter, ASTResultKind, ReferenceKind } from '../types'
import ts from 'typescript'
import { addTodoComment, copySyntheticComments } from '../../utils'

export const convertTemplateRef: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
  const signatures = getPropertySignatures(node)

  if (!signatures) {
    return false
  }

  const refs: ts.Statement[] = []
  const names: string[] = []

  signatures.forEach((signature) => {
    const [name, statement] = getVarStatement(options.typescript, signature)
    names.push(name)
    refs.push(statement)
  })

  return {
    tag: 'TemplateRef',
    kind: ASTResultKind.COMPOSITION,
    imports: [{
      named: ['ref'],
      external: (options.compatible) ? '@vue/composition-api' : 'vue'
    }],
    reference: ReferenceKind.TEMPLATE_REF,
    attributes: names,
    nodes: refs
  }
}

function getPropertySignatures (node: ts.PropertyDeclaration) {
  if (node.name.getText() !== '$refs') {
    return false
  }

  const typeLiteral = node
    .getChildren()
    .find((child): child is ts.TypeLiteralNode => {
      return child.kind === ts.SyntaxKind.TypeLiteral
    })

  if (!typeLiteral) {
    return false
  }

  const signatures = typeLiteral
    .members
    .filter((child): child is ts.PropertySignature => {
      return child.kind === ts.SyntaxKind.PropertySignature
    })

  if (!signatures.length) {
    return false
  }

  return signatures
}

function getVarStatement (tsModule: typeof ts, signature: ts.PropertySignature): [string, ts.VariableStatement] {
  const name = signature.name.getText()
  const ref = tsModule.createIdentifier('ref')

  const callExpr = tsModule.createCall(
    ref,
    signature.type ? [signature.type] : undefined,
    [tsModule.createNull()]
  )

  const varDeclaration = tsModule.createVariableDeclaration(
    tsModule.createIdentifier(name),
    undefined,
    callExpr
  )
  const varDeclarationList = tsModule.createVariableDeclarationList(
    [varDeclaration],
    tsModule.NodeFlags.Const
  )
  const varStatement = tsModule.createVariableStatement(
    undefined,
    varDeclarationList
  )

  const varStatementWithTodo = addTodoComment(
    tsModule,
    varStatement,
    'Check for potential naming collisions from $refs conversion',
    true
  )

  return [name, copySyntheticComments(tsModule, varStatementWithTodo, signature)]
}
