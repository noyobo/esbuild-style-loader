import lessEngine from 'less';
import NpmImportPlugin from 'less-plugin-npm-import';

export const transformLess = async (inputContext: string, filePath: string) => {
  return await lessEngine.render(inputContext, {
    filename: filePath,
    syncImport: true,
    plugins: [new NpmImportPlugin({ prefix: '~' })],
    sourceMap: {
      sourceMapFileInline: false,
      outputSourceFiles: true,
    },
  });
};
