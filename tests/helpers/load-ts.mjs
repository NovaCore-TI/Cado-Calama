import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
export function loadTs(file, mocks = {}, env = {}, globals = {}) {
  const cache = new Map();
  const sourcePath = (base) => {
    for (const extension of [".ts", ".tsx"])
      if (fs.existsSync(base + extension)) return base + extension;
    throw new Error("TypeScript module not found: " + base);
  };
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    const resolve = (id) => {
      if (id in mocks) return mocks[id];
      if (id === "server-only") return {};
      if (id.startsWith("@/"))
        return load(sourcePath(path.resolve("src", id.slice(2))));
      if (id.startsWith("."))
        return load(sourcePath(path.resolve(path.dirname(filename), id)));
      return require(id);
    };
    vm.runInNewContext(
      code,
      {
        module,
        exports: module.exports,
        require: resolve,
        process: { env, cwd: () => process.cwd() },
        console,
        URL,
        Buffer,
        Response,
        Headers,
        Date,
        performance,
        setTimeout,
        clearTimeout,
        fetch,
        ...globals,
      },
      { filename },
    );
    return module.exports;
  }
  return load(file);
}
export function database(resolve = () => ({ data: null, error: null })) {
  const calls = [];
  function from(table) {
    const state = { table, operation: "select", filters: [], payload: null };
    const query = new Proxy(
      {},
      {
        get(_, key) {
          if (key === "then")
            return (yes, no) => {
              calls.push(structuredClone(state));
              return Promise.resolve(resolve(state)).then(yes, no);
            };
          return (...args) => {
            if (["insert", "update", "upsert", "delete"].includes(key)) {
              state.operation = key;
              state.payload = args[0];
            } else if (!["select", "single", "maybeSingle"].includes(key))
              state.filters.push([key, ...args]);
            return query;
          };
        },
      },
    );
    return query;
  }
  return { calls, from };
}
