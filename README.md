# esbuild-style-loader

[![npm version](https://badge.fury.io/js/esbuild-style-loader.svg)](https://badge.fury.io/js/esbuild-style-loader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![issues](https://img.shields.io/github/issues/noyobo/esbuild-style-loader.svg)](https://github.com/noyobo/esbuild-style-loader/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)
[![downloads](https://img.shields.io/npm/dm/esbuild-style-loader.svg)](https://www.npmjs.com/package/esbuild-style-loader)
[![Code Coverage](https://codecov.io/gh/noyobo/esbuild-style-loader/branch/main/graph/badge.svg)](https://codecov.io/gh/noyobo/esbuild-style-loader)
[![Node.js CI](https://github.com/noyobo/esbuild-style-loader/actions/workflows/node.js.yml/badge.svg)](https://github.com/noyobo/esbuild-style-loader/actions/workflows/node.js.yml)

A style loader for esbuild, support for CSS, SCSS, LESS, Stylus, and CSS Modules.

## Features

- [x] Zero configuration
- [x] Support for CSS Modules
- [x] Support for LESS `builtin`
- [x] Support for CSS
- [x] Autoprefixer for CSS
  - default: `ios >= 11, android >= 5, chrome >= 54`
- [x] Support sourceMap
- [x] Fast compiler engine by [lightningcss](https://lightningcss.dev/)

## Default behavior

The following rules enable css-modules

1. The file name ends with `/.modules?\.(css|less|scss|sass|styl)/`
2. The file query contains `modules` or `modules=true`
   - Can be used with plugins [esbuild-plugin-auto-css-modules](https://www.npmjs.com/package/esbuild-plugin-auto-css-modules)

```ts
import styles from './style.css?modules';
import styles from './style.module.css';
import styles from './style.modules.css';
import styles from './style.less?modules';
import styles from './style.module.less';
import styles from './style.modules.less';
```

Normal CSS files are not treated as CSS Modules

```ts
import './style.css';
import './style.less';
import styles from './style.css';
import styles from './style.less';
```

## Usage

```ts
import { build } from 'esbuild';
import { stylePlugin } from 'esbuild-style-loader';

const buildOptions = {
  plugins: [
    stylePlugin({
      filter: /\.(css|less|scss|sass|tyss)(\?.*)?$/,
      /**
       * Process file results from other plugins namespace
       */
      namespace: ['native-component', 'file'],
      /**
       * The browser setting for lightningcss
       */
      browsers: 'ios >= 11, android >= 5, chrome >= 54',
      cssModules: {
        pattern: process.env.CI_TEST === 'test' ? '[name]__[local]' : '[local]__[hash]',
      },
      /**
       * The public path for absolute paths in css
       */
      publicPath: __dirname,
    }),
  ],
};
```

if you want to use absolute paths, you can specify the `publicPath` option

## TODO

- [ ] Support for Stylus
- [ ] Support for Sass
  - [x] [sass](https://www.npmjs.com/package/sass)
  - [ ] [node-sass](https://www.npmjs.com/package/node-sass)
  - [ ] [sass-embedded](https://www.npmjs.com/package/sass-embedded)
