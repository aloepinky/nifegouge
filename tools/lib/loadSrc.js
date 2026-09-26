const fs = require('fs');
const path = require('path');
const Module = require('module');
const babel = require('@babel/core');

// Load a module out of src/ into a plain Node tool.
//
// src/ is written for the browser and compiled by CRA, so its files use `import`/`export` and
// `require` cannot read them. Rather than a tool keeping its own copy of a calculation the site
// already does — which is the way two numbers on one subject start to disagree — the file is put
// through @babel/core's CommonJS transform and evaluated. That is all `@babel/register` does,
// and it is not a dependency here.
//
// Only the module syntax is transformed. A file with JSX in it will not load, which is the
// point: what is worth sharing with a tool is the pure part, and pure parts have no JSX.

const cache = new Map();

function resolve(from, id) {
  const base = path.resolve(path.dirname(from), id);
  for (const candidate of [base, `${base}.js`, `${base}.mjs`, path.join(base, 'index.js')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Cannot resolve ${id} from ${from}`);
}

function load(file) {
  const full = path.resolve(file);
  if (cache.has(full)) return cache.get(full);

  const { code } = babel.transformFileSync(full, {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });

  const mod = new Module(full, null);
  mod.filename = full;
  mod.paths = Module._nodeModulePaths(path.dirname(full));
  // Seeded before evaluating, so a cycle between two src files resolves to the partial exports
  // rather than recursing until the stack runs out.
  cache.set(full, mod.exports);

  const req = (id) => (id.startsWith('.') ? load(resolve(full, id)) : require(id));
  // eslint-disable-next-line no-new-func
  const run = new Function('exports', 'require', 'module', '__filename', '__dirname', code);
  run(mod.exports, req, mod, full, path.dirname(full));
  cache.set(full, mod.exports);
  return mod.exports;
}

module.exports = { loadSrc: load };
