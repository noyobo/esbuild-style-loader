import { browserslistToTargets, CSSModuleExports } from 'lightningcss';
import { OnResolveArgs, PluginBuild } from 'esbuild';
import PATH from 'path';
import browserslist from 'browserslist';
import { camelCase } from 'camel-case';

export const codeWithSourceMap = (code: string, map: string) => {
  return code + '/*# sourceMappingURL=data:application/json;base64,' + Buffer.from(map).toString('base64') + ' */';
};

export const cssExportsToJs = (exports: CSSModuleExports, entryFile: string) => {
  const keys = Object.keys(exports).sort();
  const values = keys.map((key) => exports[key]);

  let variablesCode = '';
  const exportCode = [];
  const defaultCode = [];

  keys.forEach((key, index) => {
    const clsVar = `s_${camelCase(key)}`;
    const clsSelector = values[index].name;
    variablesCode += `var ${clsVar} = "${clsSelector}";\n`;
    exportCode.push(`exports['${key}'] = ${clsVar};`);
    defaultCode.push(`'${key}':${clsVar}`);
  });

  const code = `${variablesCode};\n${exportCode.join('\n')};\nmodule.exports = {${defaultCode.join(',')}};\n`;

  if (entryFile) {
    return `require('${entryFile}');\n${code}`;
  }

  return code;
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

export const generateTargets = (queries: string) => {
  return browserslistToTargets(browserslist(queries));
};

export const replaceExtension = (file: string, ext: string) => {
  const extName = PATH.extname(file);
  return file.slice(0, file.length - extName.length) + ext;
};
