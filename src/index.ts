import { Plugin } from 'esbuild';
import PATH from 'path';
import browserslist from 'browserslist';
import { transform, browserslistToTargets } from 'lightningcss';
import { readFile } from 'fs/promises';
import qs from 'query-string';

import { transformLess } from './transform-less';
import { codeWithSourceMap, cssExportsToJs, parsePath, resolvePath } from './utils';
import { convertLessError } from './less-utils';

type StyleLoaderOptions = { filter?: RegExp; cssModules?: { pattern: string } };

const defaultOptions: StyleLoaderOptions = {
  filter: /\.(css|scss|sass|less)(\?.*)?$/,
  cssModules: { pattern: '[local]__[hash]' },
};

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

        const { code, map, exports } = transform({
          targets: browserslistToTargets(browserslist('>= 0.25%, not dead')),
          inputSourceMap: cssSourceMap,
          sourceMap: true,
          filename: args.path,
          cssModules: enableCssModules ? opts.cssModules : false,
          code: Buffer.from(cssContent),
        });

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
