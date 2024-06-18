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

then we write some JavaScript file [use-yml.cjs](/use-yml.cjs):

```js
const yaml = require('yaml.macro'); 

const foo = yaml('./file.yml');
```

then we simple run `babel use-yml.cjs` and we get the following result:

`➜  babel-macros npx babel use-yml.cjs`
```js
const foo = ["YAML file", {
  "with": "some contents"
}];
```

### The signature of the `yaml` function 

Te signature is 

`yaml(path: string, options?: {}): any`

Relative `path` values should start with `.`. I

Internally, the macro uses [`yaml`](https://www.npmjs.com/package/yaml) and supports its [parser `options`](https://eemeli.org/yaml/#options) as a second argument. 

As the macro arguments are [evaluated](https://github.com/babel/babel/blob/master/packages/babel-traverse/src/path/evaluation.js) at build time, **they should not be dynamically modified by preceding code**.

Multiple calls to load the same YAML file will not be cached.

## Writing Macros

A macro is a JavaScript module that exports a function. Here's a simple example:

```javascript
const {createMacro} = require('babel-plugin-macros')

// `createMacro` is simply a function that ensures your macro is only
// called in the context of a babel transpilation and will throw an
// error with a helpful message if someone does not have babel-plugin-macros
// configured correctly
module.exports = createMacro(myMacro)

function myMacro({references, state, babel}) {
  // state is the second argument you're passed to a visitor in a
  // normal babel plugin. `babel` is the `babel-plugin-macros` module.
  // do whatever you like to the AST paths you find in `references`
  // read more below...
}
```

It can be published to the npm registry (for generic macros) or used locally 
(for domain-specific macros).

There are two parts to the `babel-plugin-macros` API:

1. [The filename convention](https://github.com/kentcdodds/babel-plugin-macros/blob/main/other/docs/author.md#filename)
2. [The function you export](https://github.com/kentcdodds/babel-plugin-macros/blob/main/other/docs/author.md#function-api)

See [babel-plugin-macros Usage for macros authors](https://github.com/kentcdodds/babel-plugin-macros/blob/main/other/docs/author.md) for more information.

[macros]: https://www.npmjs.com/package/babel-plugin-macros 
[yaml]: https://github.com/eemeli/yaml.macro/tree/master