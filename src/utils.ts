import { browserslistToTargets, CSSModuleExports } from 'lightningcss';
import { OnResolveArgs, PluginBuild } from 'esbuild';
import PATH from 'path';
import browserslist from 'browserslist';

export const codeWithSourceMap = (code: string, map: string) => {
  return code + '/*# sourceMappingURL=data:application/json;base64,' + Buffer.from(map).toString('base64') + ' */';
};

export const cssExportsToJs = (exports: CSSModuleExports, entryFile: string) => {
  const keys = Object.keys(exports).sort();
  const values = keys.map((key) => exports[key]);
  const exportCode = `export default ${JSON.stringify(
    Object.fromEntries(keys.map((key, index) => [key, values[index].name])),
  )};`;

  if (entryFile) {
    return `import '${entryFile}';\n${exportCode}`;
  }

  return exportCode;
};

/**
 * 从路径中解析文件路径和 query
 */
export const parsePath = (path: string) => {
  const queryIndex = path.indexOf('?');
  if (queryIndex === -1) {
    return { path: path, query: '' };
  } else {
    return {
      path: path.slice(0, queryIndex),
      query: path.slice(queryIndex + 1),
    };
  }
};

export async function resolvePath(args: OnResolveArgs, build: PluginBuild) {
  const { path, query } = parsePath(args.path);
  let absolutePath = path;
  if (!PATH.isAbsolute(absolutePath)) {
    const result = await build.resolve(absolutePath, {
      resolveDir: args.resolveDir,
      importer: args.importer,
      kind: args.kind,
    });
    absolutePath = result.path;
  }

  return { path: absolutePath, query };
}

export const generateTargets = (...args: Parameters<typeof browserslist>) => {
  return browserslistToTargets(browserslist(...args));
};
