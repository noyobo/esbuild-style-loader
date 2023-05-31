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
- [x] Autoprefixer for CSS `>= 0.25%, not dead`
- [x] Support sourceMap
- [x] Fast compiler engine by [lightningcss](https://lightningcss.dev/)

## Default behavior

The following rules enable css-modules

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

## TODO

- [ ] Support for Stylus
- [ ] Support for Sass
  - [x] [sass](https://www.npmjs.com/package/sass) 
  - [ ] [node-sass](https://www.npmjs.com/package/node-sass) 
  - [ ] [sass-embedded](https://www.npmjs.com/package/sass-embedded) 
