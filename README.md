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

See the examples in folder [src/tan-li](/src/tan-li).

Instead of installing the `idx` plugin and its dependence like this:

```
➜  tan-li git:(main) ✗ npm install idx babel-plugin-idx
```

we install only the `idx.macro`:

```
➜  tan-li git:(main) ✗ npm i idx.macro                   
```
And  assuming we have added `macros` to the plugins section of our babel config file:

`➜  tan-li git:(main) ✗ cat babel.config.js`
```js
module.exports = {
  plugins: ['babel-plugin-macros'],
};
```

We can run babel to transform the input code::

`➜  tan-li git:(main) ✗ npx babel use-macro.mjs`
```js
var _ref;
const friends_of_friends = (_ref = props) != null ? (_ref = _ref.user) != null ? (_ref = _ref.friends) != null ? (_ref = _ref[0]) != null ? _ref.friends : _ref : _ref : _ref : _ref;
```

Here is the source of the [idx.macro](/src/idx.macro):

```js
const t = require('@babel/types');
const { createMacro } = require('babel-plugin-macros');

module.exports = createMacro(({ state, references }) => {
  references.default.forEach(referencePath => {
    if (referencePath.parentPath.type === 'CallExpression') {
      idx_transform(referencePath.parentPath, state);
    } else {
      throw Error(
        `idx.macro can only be used a function, and can not be passed around as an argument.`
      );
    }
  });
});
```
Since we are looking for `CallExpression` nodes in the AST, 

Where `idx_transform` is a function that transforms the code:

```js
const idx_transform = (path, state) => {
  const node = path.node;
  checkIdxArguments(state.file, node); // This will throw an error if the arguments are not correct
  const temp = path.scope.generateUidIdentifier('ref'); // Generate an identifier that doesn't collide with any locally defined
variables.
  const replacement = makeChain(node.arguments[1].body, {
    file: state.file,
    input: node.arguments[0],
    base: node.arguments[1].params[0],
    temp,
  });
  path.replaceWith(replacement);
  path.scope.push({ id: temp });
};
```

and the function `checkIdxArguments` checks the arguments of the `idx` function:

```js
function checkIdxArguments(file, node) {
  const args = node.arguments;
  if (args.length !== 2) {
    throw file.buildCodeFrameError(
      node,
      'The `idx` function takes exactly two arguments.'
    );
  }
  const arrowFunction = args[1];
  if (!t.isArrowFunctionExpression(arrowFunction)) {
    throw file.buildCodeFrameError(
      arrowFunction,
      'The second argument supplied to `idx` must be an arrow function.'
    );
  }
  if (!t.isExpression(arrowFunction.body)) {
    throw file.buildCodeFrameError(
      arrowFunction.body,
      'The body of the arrow function supplied to `idx` must be a single ' +
        'expression (without curly braces).'
    );
  }
  if (arrowFunction.params.length !== 1) {
    throw file.buildCodeFrameError(
      arrowFunction.params[2] || arrowFunction,
      'The arrow function supplied to `idx` must take exactly one parameter.'
    );
  }
  const input = arrowFunction.params[0];
  if (!t.isIdentifier(input)) {
    throw file.buildCodeFrameError(
      arrowFunction.params[0],
      'The parameter supplied to `idx` must be an identifier.'
    );
  }
}
```

[macros]: https://www.npmjs.com/package/babel-plugin-macros 
[yaml]: https://github.com/eemeli/yaml.macro/tree/master