import { getSingleFileProgram } from './parser'
import { convertAST } from './convert'
import { InputUncouthOptions, getDefaultUncouthOptions, mergeUncouthOptions } from './options'
import { format } from './format'
import path from 'path'
import { readVueSFCOrTsFile, existsFileSync, FileInfo } from './file'
import { setDebugMode } from './debug'
import * as BuiltInPlugins from './plugins/builtIn'

export function convert (content: string, inputOptions: InputUncouthOptions): string {
  const options = mergeUncouthOptions(getDefaultUncouthOptions(inputOptions.typescript), inputOptions)
  const { ast, program } = getSingleFileProgram(content, options)

  return format(convertAST(ast, options, program), options)
}

export function convertFile (filePath: string, root: string, config: string): { file: FileInfo, result: string } {
  root = (typeof root === 'string')
    ? (
      path.isAbsolute(root) ? root : path.resolve(process.cwd(), root)
    )
    : process.cwd()
  config = (typeof config === 'string') ? config : '.uncouth.js'
  if (config.endsWith('.ts')) {
    require('ts-node/register')
  }
  const inputOptions: InputUncouthOptions = existsFileSync(path.resolve(root, config))
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ? require(path.resolve(root, config)) as InputUncouthOptions
    : {}
  const options = mergeUncouthOptions(getDefaultUncouthOptions(inputOptions.typescript), inputOptions)
  options.root = root

  if (options.debug) {
    setDebugMode(true)
  }

  const file = readVueSFCOrTsFile(filePath, options)
  return {
    file,
    result: convert(file.content, options)
  }
}

export * from './plugins/types'
export { BuiltInPlugins }
export * from './utils'
export { getDefaultUncouthOptions, UncouthOptions } from './options'
