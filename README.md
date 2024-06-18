# Learning Babel Macros

[macros][] is both a plugin and a proposal of a standard interface for npm-modules that provide abrir Babel compile-time code transformations (a Babel plugin) but without requiring the user to add the babel plugin to their build system. To use it 

1. You have to install the [macros][]
2. You have to add `macros` to the plugins section of your [.babelrc](/.babelrc) file: `{ "plugins": ["macros"] }`

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

The signature of the `yaml` function is 

`yaml(path: string, options?: {}): any`

Relative `path` values should start with `.`. I

Internally, the macro uses [`yaml`](https://www.npmjs.com/package/yaml) and supports its [parser `options`](https://eemeli.org/yaml/#options) as a second argument. 

As the macro arguments are [evaluated](https://github.com/babel/babel/blob/master/packages/babel-traverse/src/path/evaluation.js) at build time, **they should not be dynamically modified by preceding code**.

Multiple calls to load the same YAML file will not be cached.

[macros]: https://www.npmjs.com/package/babel-plugin-macros 
[yaml]: https://github.com/eemeli/yaml.macro/tree/master