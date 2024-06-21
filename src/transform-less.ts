import { readFile } from 'fs/promises';
import lessEngine from 'less';
import { LessPluginModuleResolver } from 'less-plugin-module-resolver';
import type { TransformResult } from './types.js';

export const transformLess = async (
  filePath: string,
  options: { sourcemap: boolean; alias?: Record<string, string> },
): Promise<TransformResult> => {
  const code = await readFile(filePath, 'utf-8');
  const result = await lessEngine.render(code, {
    filename: filePath,
    syncImport: true,
    /**
     * Legacy compatible
     */
    plugins: [
      new LessPluginModuleResolver({
        alias: Object.assign({ '~': '' }, options.alias),
      }),
    ],
    sourceMap: options.sourcemap
      ? {
          sourceMapFileInline: false,
          outputSourceFiles: true,
        }
      : undefined,
  });

  let { css, map, imports } = result;

  imports = imports.filter((item) => item !== filePath);

  return { css, map, imports };
};
