import { Plugin } from 'esbuild';
import PATH from 'path';
import browserslist from 'browserslist';
import { transform, browserslistToTargets, CSSModulesConfig } from 'lightningcss';
import { readFile } from 'fs/promises';
import qs from 'query-string';
import deepmerge from 'deepmerge';

import { transformLess } from './transform-less';
import { codeWithSourceMap, cssExportsToJs, parsePath, resolvePath } from './utils';
import { convertLessError } from './less-utils';

export { transformLess, convertLessError };

type StyleLoaderOptions = {
  filter?: RegExp;
  cssModules?: CSSModulesConfig;
  onTransform?: (code: string, path: string) => Promise<{ css: string; map: string }>;
};

const onTransform: StyleLoaderOptions['onTransform'] = async (code: string, path: string) => {
  const extname = PATH.extname(path);
  if (extname === '.less') {
    const result = await transformLess(code, path).catch((error) => {
      throw convertLessError(error);
    });
    return result;
  } else if (extname === '.styl') {
    // TODO: support stylus
    throw new Error('stylus is not supported yet');
  } else if (extname === '.scss' || extname === '.sass') {
    // TODO: support sass
    throw new Error('sass is not supported yet');
  } else {
    return { css: code, map: '' };
  }
};

const defaultOptions: StyleLoaderOptions = {
  filter: /\.(css|scss|sass|less)(\?.*)?$/,
  cssModules: { pattern: '[local]__[hash]' },
  onTransform,
};

export const styleLoader = (options: StyleLoaderOptions = {}): Plugin => {
  const opts = deepmerge(defaultOptions, options);

  return {
    name: 'style-loader',
    setup(build) {
      const buildOptions = build.initialOptions;

      build.onResolve({ filter: opts.filter, namespace: 'file' }, (args) => {
        const parsedPath = parsePath(args.path);
        return {
          path: parsedPath.path,
          namespace: 'style-loader',
          pluginData: {
            rawPath: args.path,
            query: qs.parse(parsedPath.query),
            resolveDir: args.resolveDir,
            absolutePath: resolvePath(args).path,
          },
        };
      });
      build.onLoad({ filter: /.*/, namespace: 'style-loader' }, async (args) => {
        let cssContent: string;
        let cssSourceMap: string;
        const pluginData = args.pluginData;
        args.path = pluginData.absolutePath;

        let entryContent: string = cssExportsToJs({}, pluginData.rawPath);

        // enable css modules
        // 1. if the file name contains `.modules.` or `.module.`
        // 2. if the query contains `modules`
        const enableCssModules = /\.modules?\.(css|less|sass|scss)/.test(args.path) || 'modules' in pluginData.query;

        const fileContent = await readFile(args.path, 'utf-8');

        try {
          const result = await opts.onTransform(fileContent, args.path);
          cssContent = result.css;
          cssSourceMap = result.map;
        } catch (error) {
          return {
            errors: [error],
            resolveDir: PATH.dirname(args.path),
          };
        }

        const { code, map, exports } = transform({
          targets: browserslistToTargets(browserslist('>= 0.25%, not dead')),
          inputSourceMap: cssSourceMap,
          sourceMap: true,
          filename: args.path,
          cssModules: enableCssModules ? opts.cssModules : false,
          code: Buffer.from(cssContent),
        });
        // TODO: throw error if css is invalid

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
          pluginData: {
            ...pluginData,
            cssContent,
          },
        };
      });

      build.onResolve({ filter: opts.filter, namespace: 'style-loader' }, (args) => {
        const parsedPath = parsePath(args.path);
        return {
          path: parsedPath.path,
          namespace: 'css-loader',
          pluginData: args.pluginData,
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'css-loader' }, async (args) => {
        const pluginData = args.pluginData;
        const cssContent = pluginData.cssContent;

        return {
          contents: cssContent,
          loader: 'css',
          resolveDir: pluginData.resolveDir,
        };
      });
    },
  };
};
