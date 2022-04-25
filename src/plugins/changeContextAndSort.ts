import { ASTTransform, ASTResult, ReferenceKind, ASTResultKind } from './types'
import ts from 'typescript'
import { addTodoComment } from '../utils'

export const changeContextAndSort: ASTTransform = (astResults, options) => {
  const tsModule = options.typescript
  const getReferences = (reference: ReferenceKind) => astResults
    .filter((el) => el.reference === reference)
    .map((el) => el.attributes)
    .reduce((array, el) => array.concat(el), [])

  const refVariables = getReferences(ReferenceKind.VARIABLE_VALUE)
  const domRefVariables = getReferences(ReferenceKind.VARIABLE_NON_NULL_VALUE)
  const templateRefVariables = getReferences(ReferenceKind.TEMPLATE_REF)
  const propVariables = getReferences(ReferenceKind.PROPS)
  const variables = getReferences(ReferenceKind.VARIABLE)

  const convertContextKey = (key: string) => {
    const contextKey = new Map([
      ['$attrs', 'attrs'],
      ['$slots', 'slots'],
      ['$parent', 'parent'],
      ['$root', 'root'],
      ['$listeners', 'listeners'],
      ['$emit', 'emit']
    ])

    return contextKey.get(key)
  }

  let dependents: string[] = []

  const transformer: () => ts.TransformerFactory<ts.Node> = () => {
    return (context) => {
      const changeContext: ts.Visitor = (node) => {
        if (tsModule.isPropertyAccessExpression(node)) {
          const propertyName = node.name.text

          if (node.expression.kind === tsModule.SyntaxKind.ThisKeyword) {
            if (refVariables.includes(propertyName)) {
              dependents.push(propertyName)
              return tsModule.createPropertyAccess(
                tsModule.createIdentifier(propertyName),
                tsModule.createIdentifier('value')
              )
            } else if (domRefVariables.includes(propertyName)) {
              dependents.push(propertyName)
              return tsModule.createNonNullExpression(
                tsModule.createPropertyAccess(
                  tsModule.createIdentifier(propertyName),
                  tsModule.createIdentifier('value')
                )
              )
            } else if (propVariables.includes(propertyName)) {
              dependents.push(propertyName)
              return tsModule.createPropertyAccess(
                tsModule.createIdentifier(options.setupPropsKey),
                tsModule.createIdentifier(propertyName)
              )
            } else if (variables.includes(propertyName)) {
              dependents.push(propertyName)
              return tsModule.createIdentifier(propertyName)
            } else {
              const convertKey = convertContextKey(propertyName)
              if (convertKey) {
                return tsModule.createPropertyAccess(
                  tsModule.createIdentifier(options.setupContextKey),
                  tsModule.createIdentifier(convertKey)
                )
              }

              return addTodoComment(
                tsModule,
                tsModule.createPropertyAccess(
                  tsModule.createPropertyAccess(
                    tsModule.createIdentifier(options.setupContextKey),
                    tsModule.createIdentifier('root')
                  ),
                  tsModule.createIdentifier(propertyName)
                ),
                'Check this convert result, it can work well in 80% case.',
                true
              )
            }
          } else if (templateRefVariables.includes(propertyName)) {
            const refPropAccess = node
              .getChildren()
              .find((child): child is ts.PropertyAccessExpression => {
                return tsModule.isPropertyAccessExpression(child)
              })

            if (refPropAccess?.name.getText() === '$refs') {
              return tsModule.createNonNullExpression(
                tsModule.createPropertyAccess(
                  tsModule.createIdentifier(propertyName),
                  tsModule.createIdentifier('value')
                )
              )
            }
          }
          return tsModule.visitEachChild(node, changeContext, context)
        }
        return tsModule.visitEachChild(node, changeContext, context)
      }

      return (node) => tsModule.visitNode(node, changeContext)
    }
  }

  const transformResults = astResults.map((astResult) => {
    if (astResult.kind === ASTResultKind.OBJECT) {
      return {
        ...astResult,
        nodeDependents: []
      }
    }
    dependents = []
    const nodes = tsModule.transform(
      astResult.nodes,
      [transformer()],
      { module: tsModule.ModuleKind.ESNext }
    ).transformed

    const nodeDependents = dependents.slice()

    return {
      ...astResult,
      nodes,
      nodeDependents
    }
  })

  const astResultNoDependents = transformResults.filter((el) => el.nodeDependents.length === 0)
  let otherASTResults = transformResults.filter((el) => el.nodeDependents.length !== 0)
  let result: ASTResult<ts.Node>[] = [...astResultNoDependents]
  const resultHaveDependents = astResultNoDependents.map((el) => el.attributes).reduce((array, el) => array.concat(el), [])
  do {
    let hasPush = false
    otherASTResults = otherASTResults.filter((el) => {
      if (el.nodeDependents.every((dependent) => resultHaveDependents.includes(dependent))) {
        result.push(el)
        hasPush = true
        return false
      } else {
        return true
      }
    })
    if (!hasPush) {
      result = result.concat(otherASTResults)
      break
    }
  } while (result.length < astResults.length)

  return result
}

/** @deprecated renamed to changeContextAndSort to better reflect what it does */
export const removeThisAndSort = changeContextAndSort
