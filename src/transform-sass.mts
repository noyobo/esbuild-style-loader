import { readFile } from 'node:fs/promises';
import type * as sass from 'sass';
import { fileSyntax, getDefaultSassImplementation, resolveCanonicalize } from './sass-utils.mts';
let sassEngine: typeof sass;

import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PartialMessage } from 'esbuild';
import type { ImporterResult, PromiseOr, SourceSpan } from 'sass';
import type { StyleTransformResult } from './types.mts';

export const transformSass = async (
  filePath: string,
  options: { sourcemap: boolean; alias?: Record<string, string> },
): Promise<StyleTransformResult> => {
  const { sourcemap } = options;
  if (!sassEngine) {
    try {
      sassEngine = getDefaultSassImplementation();
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  }
  const syntax = fileSyntax(filePath);
  const basedir = path.dirname(filePath);
  const contents = await readFile(filePath, 'utf-8');
  const warnings: PartialMessage[] = [];

  const alias = options.alias || {};

  const result = await sassEngine.compileStringAsync(contents, {
    sourceMapIncludeSources: true,
    sourceMap: sourcemap,
    syntax,
    alertColor: false,
    logger: {
      warn(message: string, options: { deprecation: boolean; span?: SourceSpan; stack?: string }) {
        if (!options.span) {
          warnings.push({ text: `sass warning: ${message}` });
        } else {
          const filename = options.span.url?.pathname ?? filePath;
          const esbuildMsg: PartialMessage = {
            text: message,
            location: {
              file: filename as string,
              line: options.span.start.line,
              column: options.span.start.column,
              lineText: options.span.text,
            },
            detail: {
              deprecation: options.deprecation,
              stack: options.stack,
            },
          };

          warnings.push(esbuildMsg);
        }
      },
    },
    importer: {
      load(canonicalUrl: URL): PromiseOr<ImporterResult | null, 'async'> {
        const pathname = fileURLToPath(canonicalUrl);
        const contents = fs.readFileSync(pathname, 'utf8');
        return {
          contents,
          syntax: fileSyntax(pathname),
          sourceMapUrl: sourcemap ? canonicalUrl : undefined,
        };
      },
      canonicalize(url: string): URL | null {
        const urlPath = resolveCanonicalize(filePath, url, alias);
        if (urlPath) {
          return pathToFileURL(urlPath);
        }
        return null;
      },
    },
  });

  const sourceMap = result.sourceMap;

  if (sourceMap) {
    sourceMap.sourceRoot = basedir;
    sourceMap.sources = sourceMap.sources.map((source) => {
      return path.relative(basedir, source.startsWith('data:') ? filePath : fileURLToPath(source));
    });
  }

  const imports = result.loadedUrls.map((url) => fileURLToPath(url));

  return {
    css: result.css,
    map: result.sourceMap ? JSON.stringify(result.sourceMap) : '',
    imports,
    warnings,
  };
};
