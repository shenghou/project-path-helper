const os = require("os");
const path = require("path");
const { promisify } = require("util");
const commondir = require("commondir");
const walk = require("walkdir");
const dependencyTree = require("dependency-tree");
const fs = require("fs");

const stat = promisify(fs.stat);
const isWin = os.platform() === "win32";

class Tree {
  /**
   * Class constructor.
   * @constructor
   * @param  {Array} srcPaths
   * @param  {Object} config
   * @return {Promise}
   */
  constructor(srcPaths, config) {
    this.id = 1;
    this.srcPaths = srcPaths.map((file) => path.resolve(file));
    this.config = config;
    return this.getDirs()
      .then(this.setBaseDir.bind(this))
      .then(this.getFiles.bind(this))
      .then(this.generateTree.bind(this));
  }

  /**
   * Set base dir
   * @param {Array} dirs
   */
  setBaseDir(dirs) {
    if (this.config.baseDir) {
      this.baseDir = path.resolve(this.config.baseDir);
    } else {
      this.baseDir = commondir(dirs);
    }
  }

  /**
   * Get directories
   */
  getDirs() {
    return Promise.all(
      this.srcPaths.map((srcPath) => {
        return stat(srcPath).then((stats) =>
          stats.isDirectory() ? srcPath : path.dirname(path.resolve(srcPath)),
        );
      }),
    );
  }

  /**
   * Get all files
   */
  getFiles() {
    const files = [];
    return Promise.all(
      this.srcPaths.map((srcPath) => {
        return stat(srcPath).then((stats) => {
          if (stats.isFile()) {
            if (this.isGitPath(srcPath)) {
              return;
            }

            files.push(path.resolve(srcPath));
            return;
          }

          walk.sync(srcPath, (filePath, stat) => {
            if (
              this.isGitPath(filePath) ||
              this.isNpmPath(filePath) ||
              !stat.isFile()
            ) {
              return;
            }

            const ext = path.extname(filePath).replace(".", "");

            if (
              files.indexOf(filePath) < 0 &&
              this.config.fileExtension.indexOf(ext) >= 0
            ) {
              files.push(filePath);
            }
          });
        });
      }),
    ).then(() => files);
  }

  /**
   * Generate the tree
   * @param  {Array} files
   * @return {Object}
   */
  generateTree(files) {
    const depTree = {};
    const visited = {};
    const nonExistent = [];
    const pathCache = {};
    const pathAlone = {};

    files.forEach((file) => {
      if (visited[file]) {
        return;
      }

      Object.assign(
        depTree,
        dependencyTree({
          filename: file,
          directory: this.baseDir,
          requireConfig: this.config.requireConfig,
          webpackConfig: this.config.webpackConfig,
          tsConfig: this.config.tsConfig,
          visited,
          filter: (dependencyFilePath, traversedFilePath) => {
            let dependencyFilterRes = true;
            const isNpmPath = this.isNpmPath(dependencyFilePath);

            if (this.isGitPath(dependencyFilePath)) {
              return false;
            }

            if (this.config.dependencyFilter) {
              dependencyFilterRes = this.config.dependencyFilter(
                dependencyFilePath,
                traversedFilePath,
                this.baseDir,
              );
            }

            return (
              !isNpmPath &&
              (dependencyFilterRes || dependencyFilterRes === undefined)
            );
          },
          detective: this.config.detectiveOptions,
          nonExistent,
        }),
      );

      let tree = this.convertTree(depTree, {}, pathCache, pathAlone);

      if (
        this.config.exportPath &&
        typeof this.config.exportPath === "string"
      ) {
        fs.writeFileSync(filePagePath, JSON.stringify(tree, null, 2));
      }

      return {
        skipdded: nonExistent,
        tree,
        pathCache,
        pathAlone,
      };
    });
  }

  /**
   * Convert deep tree produced by dependency-tree
   * @param  {Object} depTree
   * @param  {Object} tree
   * @param  {Object} pathCache
   * @param  {Object} pathAlone
   * @return {Object}
   */
  convertTree(depTree, tree, pathCache, pathAlone) {
    const keys = Object.keys(depTree);
    keys.forEach((key) => {
      const processPath = this.processPath(key, pathCache);
      if (!tree[processPath]) {
        tree[processPath] = this.setResultData(key, processPath);
      }

      if (this.isEmptyObject(depTree[key])) {
        // if this file has no dependent, add it
        if (!pathAlone[key]) {
          pathAlone[key] = key;
        }

        tree[processPath].child.push(this.setResultData(key, processPath));
      } else {
        tree[processPath].child.push(
          this.convertTree(depTree[key], {}, pathCache, pathAlone),
        );
      }
    });

    return tree;
  }

  /**
   * Set result data
   * @param  {String} key
   * @param  {String} path
   * @return {Object} { name, path, child:[], key: value }
   */
  setResultData(key, path) {
    const baseResultData = {
      name: key,
      path,
      child: [],
    };

    // Add call back value if config
    if (
      this.config.callbackFunctions &&
      Array.isArray(this.config.callbackFunctions) &&
      this.config.callbackFunctions.length > 0
    ) {
      this.config.callbackFunctions.forEach((item) => {
        const callKey = item.key;
        const callValue = item.callback(path);
        // Filte default key
        if (String(callKey) === 'name' || String(callKey) === 'path' || String(callKey) === 'child') {
          return;
        }
        baseResultData[callKey] = callValue;
      });
    }
    return baseResultData;
  }

  /**
   * Absolute path
   * @param  {String} absPath
   * @param  {Object} cache
   * @return {String}
   */
  processPath(absPath, cache) {
    if (cache[absPath]) {
      return cache[absPath];
    }
    let relPath = path.resolve(this.baseDir, absPath);
    if (isWin) {
      relPath = relPath.replace(/\\/g, "/");
    }
    cache[absPath] = relPath;
    return relPath;
  }

  /**
   * Check if path is from .git folder
   * @param  {String} filePath
   * @return {Boolean}
   */
  isGitPath(filePath) {
    return filePath.split(path.sep).indexOf(".git") !== -1;
  }

  /**
   * Check if path is form NPM folder
   * @param  {String} path
   * @return {Boolean}
   */
  isNpmPath(path) {
    return path.indexOf("node_modules") >= 0;
  }

  /**
   * Check if value is empty object
   * @param  {Object} value
   * @return {Boolean}
   */
  isEmptyObject(value) {
    return Object.keys(value).length === 0 && value.constructor === Object;
  }

}

module.exports = (srcPaths, config) => new Tree(srcPaths, config);
