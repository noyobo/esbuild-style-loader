import { readFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import colors from 'colors';
import deepmerge from 'deepmerge';
import type { OnResolveArgs, PartialMessage, Plugin } from 'esbuild';
import { type CSSModulesConfig, type TransformResult, transform } from 'lightningcss';

import { convertLessError } from './less-utils.ts';
import { convertScssError } from './sass-utils.ts';
import { transformLess } from './transform-less.ts';
import { transformSass } from './transform-sass.ts';
import type { StyleTransformResult } from './types.ts';
import { codeWithSourceMap, cssExportsToJs, generateTargets, parsePath, resolvePath } from './utils.ts';

colors.enable();

export { transformLess, convertLessError };

type StyleLoaderOptions = {
  filter?: RegExp;
  namespace?: string[];
  cssModules?: CSSModulesConfig;
  browsers?: string;
  publicPath?: string;
};

const defaultOptions: StyleLoaderOptions = {
  filter: /\.(css|scss|sass|less)(\?.*)?$/,
  cssModules: { pattern: '[local]__[hash]' },
  browsers: '> 0.25%, not dead',
};

export const styleLoader = (options: StyleLoaderOptions = {}): Plugin => {
  const opts = deepmerge(defaultOptions, options);

  const targets = generateTargets(opts.browsers);

  const allNamespaces = Array.from(new Set(['file'].concat(opts.namespace || [])));

  const getLogger = (build) => {
    const { logLevel } = build.initialOptions;
    if (logLevel === 'debug' || logLevel === 'verbose') {
      return (...args) => {
        console.log('[esbuild-style-loader]'.magenta.bold, ...args);
      };
    }
    return () => void 0;
  };

  return {
    name: 'style-loader',
    setup(build) {
      const buildOptions = build.initialOptions;
      const logger = getLogger(build);
      const cwd = process.cwd();

      const styleTransform = async (filePath: string): Promise<StyleTransformResult> => {
        const ext = extname(filePath);
        if (ext === '.less') {
          return await transformLess(filePath, {
            sourcemap: !!buildOptions.sourcemap,
            alias: buildOptions.alias,
          }).catch((error) => {
            logger(`transform less error: ${filePath}`.red.bold);
            logger(error);
            throw convertLessError(error, filePath);
          });
        }
        if (ext === '.styl') {
          // TODO: support stylus
          throw new Error('stylus is not supported yet');
        }
        if (ext === '.scss' || ext === '.sass') {
          return await transformSass(filePath, {
            sourcemap: !!buildOptions.sourcemap,
            alias: buildOptions.alias,
          }).catch((error) => {
            logger(`transform sass error: ${filePath}`.red.bold);
            logger(error);
            throw convertScssError(error, filePath);
          });
        }
        const code = await readFile(filePath, 'utf-8');
        return { css: code, map: '' };
      };

      const handleResolve = async (args: OnResolveArgs) => {
        const { path: fullPath, query } = await resolvePath(args, build);
        return {
          path: fullPath,
          namespace: 'style-loader',
          pluginData: {
            rawPath: args.path,
            cssModules: new URLSearchParams(query.trim().replace(/^#/, '&')).has('modules'),
            resolveDir: args.resolveDir,
          },
        };
      };

      /**
       * you can use `namespace` to control the order of the plugins
       */

      for (const namespace of allNamespaces) {
        build.onResolve({ filter: opts.filter, namespace }, handleResolve);
      }

      build.onLoad({ filter: /.*/, namespace: 'style-loader' }, async (args) => {
        let cssContent: string;
        let cssSourceMap: string;
        let watchImports: string[] = [];
        const pluginData = args.pluginData;

        let entryContent: string = cssExportsToJs({}, pluginData.rawPath);

        // enable css modules
        // 1. if the file name contains `.modules.` or `.module.`
        // 2. if the query contains `modules`
        const styleFile = args.path;
        const enableCssModules = /\.modules?\.(css|less|sass|scss)/.test(styleFile) || pluginData.cssModules;
        let result: StyleTransformResult;

        try {
          const t = Date.now();
          result = await styleTransform(styleFile);
          logger('Compile', relative(cwd, styleFile).blue.underline, `in ${Date.now() - t}ms`);
          cssContent = result.css;
          cssSourceMap = result.map;
          watchImports = result.imports;
        } catch (error) {
          return {
            errors: [
              error instanceof Error ? { text: error.message, location: { file: styleFile }, detail: error } : error,
            ],
            resolveDir: dirname(styleFile),
            watchFiles: [styleFile],
          };
        }

        let transformResult: TransformResult | undefined;

        const watchFiles = [styleFile];

        if (watchImports) {
          watchFiles.push(...watchImports);
        }

        try {
          const t = Date.now();
          transformResult = transform({
            targets: targets,
            inputSourceMap: cssSourceMap,
            sourceMap: true,
            filename: styleFile,
            cssModules: enableCssModules ? opts.cssModules : false,
            code: Buffer.from(cssContent),
          });
          logger(`Transform css in ${Date.now() - t}ms`);
        } catch (error) {
          if (enableCssModules) {
            const line = error?.loc?.line;
            const diagnostic: PartialMessage = {
              text: error?.message || String(error),
              location: {
                file: styleFile,
                line,
                column: error?.loc?.column,
                lineText:
                  line && typeof error.source === 'string' ? error.source.split(/\r?\n/)[line - 1] : undefined,
              },
              detail: error,
            };
            return { errors: [diagnostic], resolveDir: dirname(styleFile), watchFiles };
          }
          // Ray's default esbuild log level filters plugin warnings.
          console.warn(`[esbuild-style-loader] ${styleFile}: Lightning CSS failed; using CSS before conversion`, error);
        }

        if (transformResult) {
          const { code, map, exports } = transformResult;
          cssContent = buildOptions.sourcemap && map ? codeWithSourceMap(code.toString(), map.toString()) : code.toString();
          if (exports) {
            entryContent = cssExportsToJs(exports, pluginData.rawPath);
          }
        }

        return {
          contents: entryContent,
          loader: 'js',
          pluginName: 'style-loader',
          resolveDir: pluginData.resolveDir,
          watchFiles: watchFiles,
          pluginData: { ...pluginData, cssContent },
          warnings: result.warnings,
        };
      });

      build.onResolve({ filter: opts.filter, namespace: 'style-loader' }, async (args) => {
        const parsedPath = parsePath(args.path);

        const result = await build.resolve(parsedPath.path, {
          kind: args.kind,
          resolveDir: args.resolveDir,
          importer: args.importer,
        });

        if (result.errors.length) {
          return {
            errors: result.errors,
            resolveDir: dirname(args.path),
            watchFiles: [args.path],
          };
        }

        return {
          path: result.path,
          namespace: 'css-loader',
          pluginData: args.pluginData,
          watchFiles: [args.path],
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'css-loader' }, async (args) => {
        const pluginData = args.pluginData;
        const { cssContent, rawPath } = pluginData;

        return {
          contents: cssContent,
          loader: 'css',
          resolveDir: dirname(args.path),
          watchFiles: [rawPath],
        };
      });

      build.onResolve({ filter: /^\//, namespace: 'css-loader' }, async (args) => {
        if (opts.publicPath) {
          // absolute files base on publicPath
          return { path: join(opts.publicPath, `.${args.path}`) };
        }
        return { external: true };
      });
    },
  };
};
