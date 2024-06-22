# Case Study: idx macro

## The problem: nested optional chaining

Tan poses the problem in his article [Babel macros](https://lihautan.com/babel-macros) as follows:

> Take optional chaining for example, before having the optional chaining operator ?., we had a few ways to write props?.user?.friends?.[0]?.friend, which is:

> a mundane to write, not easy to read (less intentional), but most efficient possible:

```js
const firstFriend =
  props.user && props.user.friends && props.user.friends[0]
    ? props.user.friends[0].friend
    : null;

// or with ternary
const firstFriend = props
  ? props.user
    ? props.user.friends
      ? props.user.friends
        ? props.user.friends[0]
          ? props.user.friends[0].friend
          : null
        : null
      : null
    : null
  : null;
```
easy to write, easy to read, but with slightly more runtime overhead:

```js
const firstFriend = idx(props, _ => _.user.friends[0].friend);

function idx(input, accessor) {
  try {
    return accessor(input);
  } catch (e) {
    return null;
  }
}
```

## Running the idx macro

See the examples in folder [/src/tan-li](/src/tan-li).

Instead of installing the `idx` plugin and its dependence like this:

```
➜  tan-li git:(main) ✗ npm install idx babel-plugin-idx
```

we install only the `idx.macro`:

```
➜  tan-li git:(main) ✗ npm i idx.macro                   
```
And  assuming we have added `macros` to the plugins section of our [babel config file](/src/tan-li/babel.config.js):

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

Where the input code [/src/tan-li/use-macro.mjs](/src/tan-li/use-macro.mjs) is:

`➜  babel-macros git:(main) ✗ cat src/tan-li/use-macro.mjs`
```js 
import idx from 'idx.macro';
const friends_of_friends = idx(props, _ => _.user.friends[0].friends);
```

## The idx.macro source: createMacro

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

The function `createMacro` ensures your macro is only
called in the context of a babel transpilation and throws an
error with a helpful message if someone does not have 
configured correctly `babel-plugin-macros`

The second argument you're passed to a visitor in a normal babel plugin is `state`. This is the 
`state` property that is passed to the `createMacro` function. 

The object passed to the function `createMacro` has also a field called `babel` 
which is the `babel-plugin-macros` module but is skipped in this example.
 
The way that `babel-plugin-macros` determines whether to run a macro is based on the source string of the `import` or `require` statement. It must match this regex: `/[./]macro(\.c?js)?$/` in our example:

```js
import idx from 'idx.macro';
const friends_of_friends = idx(props, _ => _.user.friends[0].friends);
```

tells `babel-plugin-macros` to 

1. Look for the `idx.macro` import or require and since the name matches then
2. Collect in a `reference` list all the `path ` references to nodes `Identifier` with name `idx` in the AST
3. Call the macro exported by the module `idx.macro` with the `state`, `references` and `babel` objects. (The macro you create should export a function). 

The object `references` has as many  keys as `exports`  has the module macro.
That is the reason we write in this case `references.default`, since there is only one.
The items in each array are the `paths` to the references in the AST that 
match.

```js
references.default.forEach(referencePath => { ... });
```

This is how imagine it works:

The `babel-plugin-macros` traverses the AST  and each time it encounters a node containing a reference to `idx` stores the corresponding 
`path` in a list of nodes. Later calls the function exported by the macro with the `state`, `babel` with that list of nodes in the `references` object.

Notice that the line `if (referencePath.parentPath.type === 'CallExpression')`  refers to the `parentPath`
of the node that contains the reference since this points to the identifier and the parent is the "call" to the `idx` function.

```js
module.exports = createMacro(({ state, references }) => {
  references.default.forEach(referencePath => {
    if (referencePath.parentPath.type === 'CallExpression') { // 1
      idx_transform(referencePath.parentPath, state);
    } else { ...}
  });
});
```

In our example there is only one call to the `idx` function:

```js
idx(props, _ => _.user.friends[0].friends)
```

but if there were more calls to the `idx` function in the code, they would be stored in the `references.default` array.

## The AST transformer function idx_transform

Where `idx_transform` is a function that transforms the code:

```js
const idx_transform = (path, state) => {
  const node = path.node;
  checkIdxArguments(state.file, node); 
  const temp = path.scope.generateUidIdentifier('ref'); 
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

The function `checkIdxArguments` checks the arguments of the `idx` function
and  will throw an error if any of the arguments is not correct

The call `temp = path.scope.generateUidIdentifier('ref')` generates 
an `Identifier` node that doesn't collide with any of the variables defined 
in the scope of the node being visited `path.scope`. It returns something like
`Node { type: "Identifier", name: "_ref" }` in the example above. 

This generated identifier will be later inserted into the scope of the node being visited with
`path.scope.push({ id: temp })`:

`➜  tan-li git:(main) ✗ npx babel use-macro.mjs`
```js
var _ref;
const friends_of_friends = (_ref = props) != null ? (_ref = _ref.user) != null ? ...
```

## The function checkIdxArguments

The function `checkIdxArguments` checks the arguments of the `idx` function
and  will throw an error if any of the arguments is not correct

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

The `state.file`  object has a `buildCodeFrameError(node, mesage)` method of the `file` object that is used to build an error message with the line and column number of the node being visited.

## The function makeChain

### The call to `makeChain`

The node that will be used to replace the call is built by the function `makeChain`:

```js
  const replacement = makeChain(node.arguments[1].body, {
    file: state.file,
    input: node.arguments[0],
    base: node.arguments[1].params[0],
    temp,
  });
```

Notice that the `temp` variable is passed to the `makeChain` function.
The current node is a call to `idx` with two arguments, the first one is the input object
and the second one is an arrow function that will be used to access the properties of the input object:
  
```js
const friends_of_friends = idx(props, _ => _.user.friends[0].friends);
```

thus 

- `node.arguments[1].body` is the AST of the arrow function body and `node.arguments[0]`
is the AST of the input object.
- `node.arguments[1].params[0]` is the parameter of the arrow function, in this case `_`.
- The `state.file` object is passed to be used in the error messages. For instance `state.file.opts.filename` 
will give the full path `/Users/casianorodriguezleon/campus-virtual/2324/learning/babel-macros/src/tan-li/use-macro.mjs`  of the file being transformed. and `state.file.sourceFileName` will give the name of the file  `use-macro.mjs`.

### The code of `makeChain`

The function `makeChain` is a recursive function that builds the chain of properties and methods that will be used to access the input object:

```js
function makeChain(node, state, inside) {
  if (t.isCallExpression(node)) {
    return makeChain(
      node.callee,
      state,
      makeCondition(t.CallExpression(state.temp, node.arguments), state, inside)
    );
  } else if (t.isMemberExpression(node)) {
    return makeChain(
      node.object,
      state,
      makeCondition(
        t.MemberExpression(state.temp, node.property, node.computed),
        state,
        inside
      )
    );
  } else if (t.isIdentifier(node)) { // The base case
    if (node.name !== state.base.name) {
      throw state.file.buildCodeFrameError(
        node,
        'The parameter of the arrow function supplied to `idx` must match ' +
          'the base of the body expression.'
      );
    }
    return makeCondition(state.input, state, inside);
  } else { // The recursive call is not a CallExpression, MemberExpression or Identifier
    throw state.file.buildCodeFrameError(
      node,
      'The `idx` body can only be composed of properties and methods.'
    );
  }
}
```

The `if (t.isCallExpression(node)) { ... }` block is executed when the body is a `CallExpression` like 
in `idx(props, f => f().user)`. In such case the function `makeChain` is called recursively with the `callee`,
the same `state` and the `inside` argument is now the recursive call 
`makeCondition(t.CallExpression(state.temp, node.arguments), state, inside)`.

```js
  return makeChain(node.callee, state,
      makeCondition(t.CallExpression(state.temp, node.arguments), state, inside));
```

The `if (t.isMemberExpression(node)) { ... }` block is executed when the body is a `MemberExpression` like
in `idx(props, f => f.user`. In such case the function `makeChain` is called recursively with the `object`,
the same `state` and the `inside` argument is now the recursive call
```js
return makeChain(node.object, state,
  makeCondition(t.MemberExpression(state.temp, node.property, node.computed), state, inside)); 
```

The `if (t.isIdentifier(node)) { ... }` block is executed when the body is an `Identifier` like
in `idx(props, f => f`. In such case the function `makeChain` is called recursively with the `object`,
the same `state` and the `inside` argument is now the recursive call
```js
  if (node.name !== state.base.name) {
    throw state.file.buildCodeFrameError(
      node,
      'The parameter of the arrow function supplied to `idx` must match ' +
        'the base of the body expression.'
    );
  }
  return makeCondition(state.input, state, inside);
```

## The function makeCondition

The function `makeCondition` is used to build the conditional expression that will be used to access the properties of the input object:

```js
function makeCondition(node, state, inside) {
  if (inside) {
    return t.ConditionalExpression(
      t.BinaryExpression(
        '!=',
        t.AssignmentExpression('=', state.temp, node),
        t.NullLiteral()
      ),
      inside,
      state.temp
    );
  } else {
    return node;
  }
}
```

## References

* [dralletje/idx.macro](https://github.com/dralletje/idx.macro?tab=readme-ov-file) A 'babel-macros' version of 'babel-plugin-idx'
* [I Can Babel Macros (and So Can You!)](https://www.youtube.com/watch?v=1WNT5RCENfo) by Shawn "swyx" Wang. JSConf Hawaii 2019
* [Babel REPL](https://bvaughn.github.io/babel-repl/) by Brian Vaughn
* [Compilers are the New Frameworks](https://tomdale.net/2017/09/compilers-are-the-new-frameworks/) by Tom Dale
* [The new wave of frameworks: what can we learn from compiler-based frameworks?](https://youtu.be/pFq7Ch2e6Gw?si=KfxzklfTVNLyY6Of) by Tan Liu Hau 2023. Xitu Developers Conferences




[macros]: https://www.npmjs.com/package/babel-plugin-macros 
[yaml]: https://github.com/eemeli/yaml.macro/tree/master