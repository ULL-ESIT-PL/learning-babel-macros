# Learning Babel Macros

## What is 

[macros][] is both a plugin and a proposal of a standard interface for npm-modules that provide 
compile-time code transformations (the same as a Babel plugin) but without requiring the user to add 
the babel plugin to their Babel configuration system. To use it 

1. You have to install the [macros][]
2. You have to add `macros` to the plugins section of your [.babelrc](/.babelrc) file: `{ "plugins": ["macros"] }`

## Simple example

Here is an example: The [yaml][] macro is a [Babel macro](https://github.com/kentcdodds/babel-plugin-macros) for loading YAML files. We first install the macro:

```
npm install --save-dev yaml.macro
```

then we write some YAML file [file.yml](/file.yml):

```yaml
- YAML file
- with: some contents
```

then we write some JavaScript file [use-yml.cjs](/src/use-yml.cjs):

```js
const yaml = require('yaml.macro'); 

const foo = yaml('./file.yml');
```

then we simple run `babel src/use-yml.cjs` and we get the following result:

`➜  babel-macros git:(main) ✗ npx babel src/use-yml.cjs`
```js
const foo = ["YAML file", {
  "with": "some contents"
}];
```

See [/docs/yaml.md](/docs/yaml.md) for more information on the `yaml.macro`.

## Writing Macros

A macro is a JavaScript module whose name matches `/[./]macro(\.c?js)?$/` that exports a function. Here's a simple example:

```javascript
const { createMacro, MacroError } = require('babel-plugin-macros')
module.exports = createMacro(myMacro)

function myMacro({references, state, babel}) { 
  ...
}
```

### The `createMacro`  and `MacroError` functions

`createMacro` is simply a function that ensures your macro is only
called in the context of a babel transpilation and will throw an
error with a helpful message if someone does not have babel-plugin-macros
configured correctly. 

Use `MacroError` to throw an error inside your macro.

### The `myMacro` function

The function you export from your macro module 

```javascript
function myMacro({references, state, babel}) { 
  ...
}
```

is called with an object that has the following properties:

- `references` is an object that contains arrays of all the references to things imported from the macro.
  They are keyed based on the name of the import. 
  The items in each array are the paths to the references.
- `state` The state of the file being traversed. It's the second argument you receive in a visitor function in a normal babel plugin. This `state` object is used to store and share information across different visitor methods. It can hold any kind of data that the macro might need to maintain state across different nodes of the AST. The state object typically contains the following properties:
  - `opts`: Contains the options passed to the plugin.
  - `file`: Provides information about the file being processed, such as the filename and the AST.
  - `path`: The current path being visited (available within visitor methods).
  - Custom properties defined by the plugin to store intermediate results or configuration data.
- `babel` is the `babel-plugin-macros` module. It is also the same thing you get if you `require('babel-core')`.

Here is the full code of the [yaml][] macro:

```js
module.exports = createMacro(yamlMacro)

function yamlMacro({ references, state }) {
  for (const { parentPath } of references.default) {
    if (parentPath.type !== 'CallExpression')
      throw new MacroError('yaml.macro only supports usage as a function call')

    let argPath, argOptions
    try {
      const args = parentPath.get('arguments')
      argPath = args[0].evaluate().value
      if (args.length > 1) argOptions = args[1].evaluate().value
    } catch (error) {
      error.message = `yaml.macro argument evaluation failed: ${error.message}`
      throw error
    }
    /* istanbul ignore if */
    if (!argPath) throw new MacroError('yaml.macro argument evaluation failed')

    const dirname = path.dirname(state.file.opts.filename)
    const fullPath = require.resolve(argPath, { paths: [dirname] })
    const fileContent = fs.readFileSync(fullPath, { encoding: 'utf-8' })

    const options = Object.assign({}, argOptions, {
      intAsBigInt: false,
      json: true,
      mapAsMap: false
    })
    const res = YAML.parse(fileContent, options)
    const exp = parseExpression(JSON.stringify(res))
    parentPath.replaceWith(exp)
  }
}
```

### Ways to use a macro

It can be published to the npm registry (for generic macros) or used locally 
(for domain-specific macros).

## The `babel-plugin-macros` API

There are two parts to the `babel-plugin-macros` API:

1. [The filename convention](https://github.com/kentcdodds/babel-plugin-macros/blob/main/other/docs/author.md#filename)
   - The way that `babel-plugin-macros` determines whether to run a macro is based on the source string of the `require` statement. It must match this regex: `/[./]macro(\.c?js)?$/`. For instance: `require('yaml.macro')`
2. [The function you export](https://github.com/kentcdodds/babel-plugin-macros/blob/main/other/docs/author.md#function-api)

See 
* [babel-plugin-macros Usage for macros authors](https://github.com/kentcdodds/babel-plugin-macros/blob/main/other/docs/author.md) for the complete information.
* [eemeli/yaml.macro/macro.js](https://github.com/eemeli/yaml.macro/blob/master/macro.js)

## idx macro

See section [doc/idx-macro](doc/idx-macro).


[macros]: https://www.npmjs.com/package/babel-plugin-macros 
[yaml]: https://github.com/eemeli/yaml.macro/tree/master