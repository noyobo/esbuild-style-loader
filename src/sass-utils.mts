import { dirname, extname, isAbsolute, resolve } from 'node:path';
import type { PartialMessage } from 'esbuild';
import type { Syntax } from 'sass';

export function getDefaultSassImplementation() {
  let sassImplPkg = 'sass';

  try {
    require.resolve('sass');
  } catch (ignoreError) {
    try {
      require.resolve('node-sass');
      sassImplPkg = 'node-sass';
    } catch (_ignoreError) {
      try {
        require.resolve('sass-embedded');
        sassImplPkg = 'sass-embedded';
      } catch (__ignoreError) {
        sassImplPkg = 'sass';
      }
    }
  }

  return require(sassImplPkg);
}

export function fileSyntax(filename: string): Syntax {
  if (filename.endsWith('.scss')) {
    return 'scss';
  }
  return 'indented';
}

export function resolveCanonicalize(importer: string, file: string, alias: Record<string, string>) {
  const importerExt = extname(importer);
  const fileExt = extname(file);

  if (!fileExt) {
    file += importerExt;
  }

  // absolute path
  if (isAbsolute(file)) {
    return file;
  }

  const scope = file.split('/')[0];
  // alias
  if (alias[scope]) {
    const baseFile = file.slice(scope.length + 1);
    return resolve(alias[scope], baseFile);
  }

  return resolve(dirname(importer), file);
}

export function convertScssError(error, filePath: string) {
  const [message, _, lineText, ...rest] = error.message.split('\n');
  const stack = rest[rest.length - 1];
  const lineColumn = stack.match(/(\d+):(\d+)/);

  return {
    text: message,
    location: {
      file: filePath,
      line: Number(lineColumn[1]),
      column: Number(lineColumn[2]),
      lineText: lineText.trim().replace(/\d+\s│/, ''),
    },
  } as PartialMessage;
}
