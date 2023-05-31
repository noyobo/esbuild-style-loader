import { fileSyntax, getDefaultSassImplementation, resolveCanonicalize } from './sass-utils';
import { readFile } from 'fs/promises';
import * as sass from 'sass';
let sassEngine: typeof sass;

import path from 'path';
import { ImporterResult, PromiseOr, SourceSpan } from 'sass';
import { fileURLToPath, pathToFileURL } from 'url';
import * as fs from 'fs';
import { TransformResult } from './types';
import { PartialMessage } from 'esbuild';

export const transformSass = async (
  filePath: string,
  options: { sourcemap: boolean; alias?: Record<string, string> },
): Promise<TransformResult> => {
  const { sourcemap } = options;
  if (!sassEngine) {
    sassEngine = getDefaultSassImplementation();
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
          const filename = options.span.url?.pathname ?? path;
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
        let contents = fs.readFileSync(pathname, 'utf8');
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