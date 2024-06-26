## The signature of the `yaml` function 

Te signature of the `yaml` function used by the [yaml][].macro is 

`yaml(path: string, options?: {}): any`

Relative `path` values should start with `.`. I

Internally, the macro uses [`yaml`](https://www.npmjs.com/package/yaml) and supports its [parser `options`](https://eemeli.org/yaml/#options) as a second argument. 

As the macro arguments are [evaluated](https://github.com/babel/babel/blob/master/packages/babel-traverse/src/path/evaluation.js) at build time, **they should not be dynamically modified by preceding code**.

Multiple calls to load the same YAML file will not be cached.

[macros]: https://www.npmjs.com/package/babel-plugin-macros 
[yaml]: https://github.com/eemeli/yaml.macro/tree/master