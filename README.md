**project-path-helper** is a tool for generating a module dependencies and other info if you want. Joel Kemp's awesome [dependency-tree](https://github.com/mrjoelkemp/node-dependency-tree) is used for extracting the dependency tree.

- Works for JavaScript (AMD, CommonJS, and ES6 modules)
- Also works for CSS preprocessors (Sass, Stylus, and Less)
- NPM installed dependencies are excluded by default (can be enabled)
- All core Node.js modules (assert, path, fs, etc) are excluded
- Will traverse child dependencies automatically
- Any other info if you want get

# Installation

```sh
# TODO
npm -g install project-path-helper
```

# API

## pathHelper(path: string|array|object, config: object)

> `path` is a single file or directory, or an array of files/directories to read. A predefined tree can also be passed in as an object.

> `config` is optional and should be the [configuration](#configuration) to use.

> Returns a `Promise` resolved with the Madge instance object.

## Functions

#### .obj()

> Returns an `Object` with all dependencies.

```javascript
const pathHelper = require("pathHelper");

pathHelper("path/to/app.js").then((res) => {
  console.log(res.obj());
});
```

#### .dependList()

> Returns an `Object` with all dependencies.

```javascript
const pathHelper = require("pathHelper");

pathHelper("path/to/app.js").then((res) => {
  console.log(res.dependList());
});
```

#### .noDependList()

> Returns an `Object` with all none dependencies.

```javascript
const pathHelper = require("pathHelper");

pathHelper("path/to/app.js").then((res) => {
  console.log(res.noDependList());
});
```

#### set callback function

> Returns an `Object` with all dependencies.

```javascript
const pathHelper = require("pathHelper");

function callFunc1(filePath) {
  return "hello words";
}

function callFunc2(filePath) {
  return path.extname(filePath);
}

const config = {
  detectiveCallArray: [
    { key: "words", callback: callFunc1 },
    { key: "ext", callback: callFunc2 },
  ],
};

pathHelper("path/to/app.js", config).then((res) => {
  console.log(res.obj());   
    // "/Users/housheng/Documents/voov/userCenter/user-center/src/web-tools/i18n/config.base.json": {
    //     "name": "/Users/housheng/Documents/voov/userCenter/user-center/src/web-tools/i18n/config.base.json",
    //     "path": "/Users/housheng/Documents/voov/userCenter/user-center/src/web-tools/i18n/config.base.json",
    //     "child": [
    //     {
    //         "name": "/Users/housheng/Documents/voov/userCenter/user-center/src/web-tools/i18n/config.base.json",
    //         "path": "/Users/housheng/Documents/voov/userCenter/user-center/src/web-tools/i18n/config.base.json",
    //         "child": [],
    //         "words": "hello words",
    //         "ext": ".json"
    //     }
    //     ],
    //     "words": "hello words",
    //     "ext": ".json"
    // }

});
```

# Configuration

| Property            | Type                                     | Default | Description                                                                                                                                                            |
| ------------------- | ---------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseDir`           | String                                   | null    | Base directory to use instead of the default                                                                                                                           |
| `includeNpm`        | Boolean                                  | false   | If shallow NPM modules should be included                                                                                                                              |
| `fileExtensions`    | Array                                    | ['js']  | Valid file extensions used to find files in directories                                                                                                                |
| `requireConfig`     | String                                   | null    | RequireJS config for resolving aliased modules                                                                                                                         |
| `webpackConfig`     | String                                   | null    | Webpack config for resolving aliased modules                                                                                                                           |
| `tsConfig`          | String\|Object                           | null    | TypeScript config for resolving aliased modules - Either a path to a tsconfig file or an object containing the config                                                  |
| `dependencyFilter`  | Function                                 | false   | Function called with a dependency filepath (exclude substree by returning false)                                                                                       |
| `detectiveOptions`  | Object                                   | false   | Custom `detective` options for [dependency-tree](https://github.com/dependents/node-dependency-tree) and [precinct](https://github.com/dependents/node-precinct#usage) |
| `exportPath`        | String                                   | null    | Export path if you set and the file format is JSON                                                                                                                     |
| `callbackFunctions` | Array<{key: String, callback: Function}> | null    | Set call back value if you want to set and the callback function parameter is filepath                                                                                 |
