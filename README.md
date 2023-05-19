# esbuild-style-loader

[![npm version](https://badge.fury.io/js/esbuild-style-loader.svg)](https://badge.fury.io/js/esbuild-style-loader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A style (`.css` `.less` `.scss` `.styl`) loader for esbuild.

## Features

- Support for CSS, SCSS, Less, Stylus, PostCSS, and CSS Modules

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
