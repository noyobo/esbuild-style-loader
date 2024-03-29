import { OnResolveArgs, PartialMessage, Plugin } from 'esbuild';
import PATH from 'path';
import { CSSModulesConfig, transform } from 'lightningcss';
import { readFile } from 'fs/promises';
import qs from 'query-string';
import deepmerge from 'deepmerge';
import colors from 'colors';

import { transformLess } from './transform-less';
import { codeWithSourceMap, cssExportsToJs, generateTargets, parsePath, replaceExtension, resolvePath } from './utils';
import { convertLessError } from './less-utils';
import { transformSass } from './transform-sass';
import { TransformResult } from './types';
import { convertScssError } from './sass-utils';

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
        console.log(`[esbuild-style-loader]`.magenta.bold, ...args);
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

      const styleTransform = async (filePath: string): Promise<TransformResult> => {
        const extname = PATH.extname(filePath);
        if (extname === '.less') {
          return await transformLess(filePath, {
            sourcemap: !!buildOptions.sourcemap,
            alias: buildOptions.alias,
          }).catch((error) => {
            logger(`transform less error: ${filePath}`.red.bold);
            logger(error);
            throw convertLessError(error);
          });
        } else if (extname === '.styl') {
          // TODO: support stylus
          throw new Error('stylus is not supported yet');
        } else if (extname === '.scss' || extname === '.sass') {
          return await transformSass(filePath, {
            sourcemap: !!buildOptions.sourcemap,
            alias: buildOptions.alias,
          }).catch((error) => {
            logger(`transform sass error: ${filePath}`.red.bold);
            logger(error);
            throw convertScssError(error, filePath);
          });
        } else {
          const code = await readFile(filePath, 'utf-8');
          return { css: code, map: '' };
        }
      };

      const handleResolve = async (args: OnResolveArgs) => {
        const { path: fullPath, query } = await resolvePath(args, build);
        return {
          path: fullPath,
          namespace: 'style-loader',
          pluginData: {
            rawPath: args.path,
            query: qs.parse(query),
            resolveDir: args.resolveDir,
          },
        };
      };

      /**
       * you can use `namespace` to control the order of the plugins
       */

      allNamespaces.forEach((namespace) => {
        build.onResolve({ filter: opts.filter, namespace }, handleResolve);
      });

      build.onLoad({ filter: /.*/, namespace: 'style-loader' }, async (args) => {
        let cssContent: string;
        let cssSourceMap: string;
        let watchImports: string[] = [];
        const pluginData = args.pluginData;

        let entryContent: string = cssExportsToJs({}, pluginData.rawPath);

        // enable css modules
        // 1. if the file name contains `.modules.` or `.module.`
        // 2. if the query contains `modules`
        let styleFile = args.path;
        const enableCssModules = /\.modules?\.(css|less|sass|scss)/.test(styleFile) || 'modules' in pluginData.query;
        let result: TransformResult;

        try {
          const t = Date.now();
          result = await styleTransform(styleFile);
          logger(`Compile`, PATH.relative(cwd, styleFile).blue.underline, `in ${Date.now() - t}ms`);
          cssContent = result.css;
          cssSourceMap = result.map;
          watchImports = result.imports;
        } catch (error) {
          return {
            errors: [error],
            resolveDir: PATH.dirname(styleFile),
            watchFiles: [styleFile],
          };
        }

        let transformResult;

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
          logger(`Transform css error: ${styleFile}`.red.bold);
          logger(error);
          const { loc, fileName, source } = error;
          const lines = source.split('\n');
          const lineText = lines[loc.line - 1];
          return {
            errors: [
              {
                text: error.message,
                location: {
                  file: replaceExtension(fileName, '.css'),
                  line: loc.line,
                  column: loc.column,
                  lineText,
                },
              } as PartialMessage,
            ],
            resolveDir: PATH.dirname(styleFile),
            watchFiles,
          };
        }

        const { code, map, exports } = transformResult;

        if (buildOptions.sourcemap && map) {
          cssContent = codeWithSourceMap(code.toString(), map.toString());
        } else {
          cssContent = code.toString();
        }

        if (exports) {
          entryContent = cssExportsToJs(exports, pluginData.rawPath);
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
            resolveDir: PATH.dirname(args.path),
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
          resolveDir: PATH.dirname(args.path),
          watchFiles: [rawPath],
        };
      });

      build.onResolve({ filter: /^\//, namespace: 'css-loader' }, async (args) => {
        if (opts.publicPath) {
          // absolute files base on publicPath
          return { path: PATH.join(opts.publicPath, '.' + args.path) };
        }
        return { external: true };
      });
    },
  };
};
