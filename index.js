const tree = require("./src/tree");
const log = require("./src/log");

const defaultConfig = {
  baseDir: null,
  includeNpm: false,
  fileExtensions: ["js"],
  requireConfig: null,
  webpackConfig: null,
  tsConfig: null,
  dependencyFilter: false,
  detectiveOptions: null,
  callbackFunctions: null,
  exportPath: null,
};

class PathHelper {
  /**
   * Class constructor.
   * @constructor
   * @api public
   * @param {String|Array|Object} path
   * @param {Object} config
   * @return {Promise}
   */
  constructor(path, config) {
    this.skipped = [];
    this.depends = [];
    this.noDepends = [];

    if (!path) {
      throw new Error("path argument not provided");
    }

    this.config = Object.assign({}, defaultConfig, config);

    if (typeof path === "object" && !Array.isArray(path)) {
      this.tree = path;
      log("using predefined tree %o", path);
      return Promise.resolve(this);
    }

    if (typeof path === "string") {
      path = [path];
    }

    return tree(path, this.config).then((res) => {
      this.tree = res.tree;
      this.skipped = res.skipped;
      this.depends = res.pathCache;
      this.noDepends = res.pathAlone;
      return this;
    });
  }

  /**
   * Return the module dependency graph as an object.
   * @return {Object}
   */
  obj() {
    return this.tree;
  }

  /**
   * Return the dependency module list
   * @return {Object}
   */
  dependList() {
    return {
      dependList: this.depends,
    };
  }

  /**
   * Return the none dependency module list
   * @return {Object}
   */
  noDependList() {
    return {
      noDependList: this.noDepends,
    };
  }
}

/**
 * Expose API.
 * @param {String|Array} path
 * @param {Object} config
 * @return {Promise}
 */
module.exports = (path, config) => new PathHelper(path, config);
