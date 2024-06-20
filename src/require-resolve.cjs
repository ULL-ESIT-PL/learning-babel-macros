// require.resolve(path, { paths: [ ... ]}) is used to resolve the path of the file to be read.
// The `path` argument is the path of the file to be read.
// The `paths` option is an array of paths to resolve the file path from.
let fileName = "./file.yml"
c = require.resolve(
  fileName, 
  { paths: [ __dirname ]}
)
console.log(c)