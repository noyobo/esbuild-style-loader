import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PartialMessage } from 'esbuild';
import type { SourceSpan, Syntax } from 'sass';

const requireSass = createRequire(import.meta.url);

export function getDefaultSassImplementation() {
  let sassImplPkg = 'sass';

  try {
    requireSass.resolve('sass');
  } catch (ignoreError) {
    try {
      requireSass.resolve('node-sass');
      sassImplPkg = 'node-sass';
    } catch (_ignoreError) {
      try {
        requireSass.resolve('sass-embedded');
        sassImplPkg = 'sass-embedded';
      } catch (__ignoreError) {
        sassImplPkg = 'sass';
      }
    }
  }

  return requireSass(sassImplPkg);
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

export function convertScssError(
  error: Error & { sassMessage?: string; span?: SourceSpan },
  filePath: string,
): PartialMessage {
  const span = error.span;
  return {
    text: error.sassMessage || error.message,
    location: {
      file: span?.url?.protocol === 'file:' ? fileURLToPath(span.url) : filePath,
      line: span ? span.start.line + 1 : undefined,
      column: span?.start.column,
      lineText: span?.context?.split(/\r?\n/, 1)[0],
    },
    detail: error,
  };
}
