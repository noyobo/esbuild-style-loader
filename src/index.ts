import { OnLoadArgs, OnResolveArgs, Plugin } from 'esbuild';
import PATH from 'path';
import { transform } from 'lightningcss';
import { readFile } from 'fs/promises';
import qs from 'query-string';

import { transformLess } from './transform-less';
import { codeWithSourceMap, cssExportsToJs, parsePath } from './utils';
import { convertLessError } from './less-utils';

type StyleLoaderOptions = { filter?: RegExp; cssModules?: { pattern: string } };

const defaultOptions: StyleLoaderOptions = {
  filter: /\.(css|scss|sass|less)(\?.*)?$/,
  cssModules: { pattern: '[local]__[hash]' },
};

function resolvePath(args: OnResolveArgs) {
  const { path, query } = parsePath(args.path);
  let absolutePath = path;
  if (PATH.isAbsolute(absolutePath)) {
    absolutePath = absolutePath;
  } else {
    absolutePath = PATH.join(args.resolveDir, absolutePath);
  }

  return { path: absolutePath, query };
}

function omit(obj: any, keys: string[]) {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export const styleLoader = (options: StyleLoaderOptions = {}): Plugin => {
  const opts = { ...defaultOptions, ...options };

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
        const extname = PATH.extname(args.path);
        let cssContent: string;
        let cssSourceMap: string;
        const pluginData = args.pluginData;
        args.path = pluginData.absolutePath;

        let entryContent: string = cssExportsToJs({}, pluginData.rawPath);

        const enableCssModules = /\.modules?\.(css|less|sass|scss)/.test(args.path) || 'modules' in pluginData.query;

        if (extname === '.scss' || extname === '.sass') {
          // TODO
        } else if (extname === '.less') {
          const fileContent = await readFile(args.path, 'utf-8');
          try {
            const result = await transformLess(fileContent, args.path);
            cssContent = result.css;
            cssSourceMap = result.map;
          } catch (error) {
            return { errors: [convertLessError(error)], resolveDir: PATH.dirname(args.path) };
          }
        } else if (extname === '.css') {
          cssContent = await readFile(args.path, 'utf-8');
        }

        if (enableCssModules) {
          const {
            code,
            map,
            exports = {},
          } = transform({
            inputSourceMap: cssSourceMap,
            sourceMap: true,
            filename: args.path,
            cssModules: opts.cssModules,
            code: Buffer.from(cssContent),
          });

          if (buildOptions.sourcemap && map) {
            cssContent = codeWithSourceMap(code.toString(), map.toString());
          } else {
            cssContent = code.toString();
          }

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
