# Uncouth

## Remove the class from your Vue components.

Converts class based components to Composition API.

Forked from the great work of yoyo930021: https://github.com/yoyo930021/vc2c

[Demo](https://jaredmcateer.github.io/uncouth/)

## Introduction

![](https://github.com/jaredmcateer/uncouth/blob/master/doc/flow.png)

ASTConvertPlugins is the most important part of this project, it can convert AST to composition APIs.
Custom decorator in ASTConvertPlugins are supported, such as `@Subscription`.
See [Writing a custom ASTConvert](#plugins) for more details.

## Supports

The files to be converted must meet the criteria below:

- Scripts must be written in Typescript. (JavaScript may be supported in the future.)
- All syntax must be valid.
- Node.js >= 8.16

### Supported features

- vue-class-component
  - Object
    - [x] `name`
    - [x] `props`
      - [x] `PropType<...>`
    - [x] `data`
    - [ ] `computed`
    - [ ] `methods`
    - [ ] `watch`
    - [x] intervalHook (ex: `mounted`)
    - [ ] `provide / inject`
    - [ ] `mixins`
    - [ ] `extends`
    - [x] `render`
  - Class
    - [x] `className`
    - [x] `computed`
    - [x] `data`
    - [x] intervalHook (ex: `mounted`)
    - [x] `render`
    - [x] `methods`
    - [ ] `Mixins`
    - [x] `$refs`
- vue-property-decorator
  - [x] `@Prop`
  - [ ] `@PropSync`
  - [x] `@Model`
  - [x] `@Watch`
  - [x] `@Provide / @Inject`
  - [ ] `@ProvideReactive / @InjectReactive`
  - [x] `@Emit`
  - [x] `@Ref`
- [x] replace `this` to `props`, `variable`, or `context`.
- [x] sort by dependency.

## Usage

The uncouth project has both CLI and API interface.

### CLI

```bash
# npm
npx uncouth single [cliOptions] <VueOrTSfilePath>

# yarn
yarn add uncouth
yarn uncouth single [cliOptions] <VueOrTSfilePath>

# volta
sudo volta install uncouth
uncouth single [cliOptions] <VueOrTSfilePath>
```

#### Options

```
-v, --view             Output file content on stdout, and no write file.
-o, --output           Output result file path.
-r, --root <root>      Set root path for calc file absolute path. Default:`process.cwd()`.
-c, --config <config>  Set uncouth config file path. Default: `'.uncouth.js'`.
-h, --help             Output usage information.
```

### API

```typescript
const { convert, convertFile } = require("uncouth");

// Get convert result script
const resultScript = convert(
  /* scriptContent */ fileContent, // can't include vue file content, if vue file, only input script element content
  /* {UncouthConfig} */ options
);

// Get FileInfo and scriptResult
const { file, result } = convertFile(
  /* VueOrTSfilePath */ filePath,
  /* rootPath */ cmdOptions.root,
  /* UncouthConfigFilePath */ cmdOptions.config
);
```

### Uncouth Config

```typescript
{
  // root path for calc file absolute path, if in CLI, --root value will replace. default:`process.cwd()`
  root?: string
  // show debug message. default: `false`
  debug?: boolean,
  // if true, use @vue/composition-api. default: `false`
  compatible?: boolean
  // first setup function parameter name. default: `props`
  setupPropsKey?: string
  // second setup function parameter name. default: `context`
  setupContextKey?: string
  // Use custom version typescript. default: Typescript 3.7.3
  typescript?: typeof ts
  // Use custom version vue-template-compiler, please match your project vue versions. default: vue-template-compiler 2.6.11
  vueTemplateCompiler?: typeof vueTemplateCompiler
  // Use custom prettier config file path. if file does not exist, use default uncouth prettier config.  default: `.prettierrc`
  prettierConfig?: string
  // Use custom ASTConvertPlugins for ASTConvert and ASTTransform
  plugins?: ASTConvertPlugins
}
```

## Plugins

### ASTConvertPlugins

```typescript
import * as ts from "typescript";
// import { ASTConvertPlugins, ASTConverter, ASTTransform } from 'uncouth'
export interface ASTConvertPlugins {
  [ts.SyntaxKind.Decorator]: {
    // @Component decorator argument ASTConvert
    [ts.SyntaxKind.PropertyAssignment]: Array<ASTConverter<ts.PropertyAssignment>>;
    [ts.SyntaxKind.MethodDeclaration]: Array<ASTConverter<ts.MethodDeclaration>>;
  };
  // Class child AST will forEach ASTConverter until return ASTResult by AST SyntaxKind
  [ts.SyntaxKind.Identifier]: Array<ASTConverter<ts.Identifier>>;
  [ts.SyntaxKind.HeritageClause]: Array<ASTConverter<ts.HeritageClause>>;
  [ts.SyntaxKind.PropertyDeclaration]: Array<ASTConverter<ts.PropertyDeclaration>>;
  [ts.SyntaxKind.GetAccessor]: Array<ASTConverter<ts.GetAccessorDeclaration>>;
  [ts.SyntaxKind.SetAccessor]: Array<ASTConverter<ts.SetAccessorDeclaration>>;
  [ts.SyntaxKind.MethodDeclaration]: Array<ASTConverter<ts.MethodDeclaration>>;
  // When all ASTConvert finished, run ASTTransform.
  after: Array<ASTTransform>;
}
```

### ASTConvertPlugins process

- Vue Class `@Component` decorator Object:

  - Uncouth will parse object properties of `@Component` argument by running `ASTConvert` functions in `plugins[ts.SyntaxKind.Decorator][property.kind as ts.SyntaxKind]` array.
  - When `ASTConvert` returns a `ASTResult`, uncouth will record the `ASTResult` and proceed to the next object property.
  - If `ASTConvert` returns `false`, uncouth will run the next `ASTConvert` function in the array.

- Vue Class:

  - Uncouth will parse `Class` AST childs by running `ASTConvert` functions in `plugins[AST.kind as ts.SyntaxKind]` array.
  - When `ASTConvert` returns a `ASTResult`, uncouth will record the `ASTResult` and proceed to the next object property.
  - If `ASTConvert` returns `false`, uncouth will run the next `ASTConvert` function in the array.

- Transform:
  - Uncouth will run all `ASTTransform` functions in `plugins.after` array after finishing the two steps above.
  - You can use it to merge or sort AST. ex: `computed`, `removeThis`.

### Tips

- You can use https://ts-ast-viewer.com/ to get Typescript ast.
- You can use built-in `ASTConvert` or `ASTTransform` in `ASTConvertPlugins`.
  ```typescript
  import { BuiltInPlugins } from "uncouth";
  const astConvert: ASTConvert = BuiltInPlugins.convertProp;
  ```
- You cas use built-in typescript AST utils.
  ```typescript
  import { getDecoratorNames, isInternalHook } from "uncouth";
  ```
- `ASTConvert` functions must be placed in order by it's strictness in `ASTConvertPlugins`. Stricter function should be placed up front.
- If you want to use Vue any property, you can see [link](https://github.com/yoyo930021/uncouth/blob/master/src/plugins/vue-property-decorator/Watch.ts#L75).

### ASTConvert Example

- [`built-ins`](https://github.com/yoyo930021/uncouth/blob/master/src/plugins)

## Roadmap

- Add more TODO: comments on needed.
- Support more features.
- Convert project.
