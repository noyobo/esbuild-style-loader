import * as esbuild from 'esbuild';
import type { BuildOptions } from 'esbuild';
import * as fse from 'fs-extra';
import { styleLoader } from '../src';

const OUTPUT_HTML = !!process.env.OUTPUT_HTML;

export const removeComments = (content: string) => {
  return content.replace(/\/\/ style-loader(.+)/g, '').replace(/\/\* css-loader(.+) \*\//g, '');
};

export const runTest = async (files: string[], outdir: string, options?: BuildOptions) => {
  const result = await esbuild
    .build(
      Object.assign(
        {
          entryPoints: files,
          outdir: outdir,
          bundle: true,
          write: false,
          sourcemap: true,
          logLevel: 'debug',
          external: OUTPUT_HTML ? undefined : ['react', 'react-dom'],
          target: ['es2015', 'chrome58', 'safari11'],
          plugins: [
            styleLoader({
              cssModules: { pattern: '[name]__[local]' },
              browsers: 'ios >= 11, android >= 5, chrome >= 54',
            }),
          ],

          loader: {
            '.ttf': 'file',
          },
        },
        options,
      ),
    )
    .then((result) => {
      const htmlPath = `${outdir}/index.html`;
      fse.ensureFileSync(htmlPath);
      fse.writeFileSync(
        htmlPath,
        `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
    <link type="text/css" href="./index.css" rel="stylesheet">
</head>
<body>
    <div id="root"></div>
    <script src="./index.js"></script>
</body>
</html>
`,
      );
      return result;
    });

  return result;
};
