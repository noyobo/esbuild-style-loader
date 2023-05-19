import { CSSModuleExports } from 'lightningcss';

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
