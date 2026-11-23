const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdirSync, mkdtempSync, realpathSync, renameSync, rmSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { build } = require('esbuild');

const root = path.resolve(__dirname, '..');

async function testPackage() {
  // Keep the extracted package under the checkout so it resolves the locked dependencies.
  const directory = realpathSync(mkdtempSync(path.join(root, '.test-package-')));
  const originalWarn = console.warn;
  try {
    const filename = execFileSync('bun', ['pm', 'pack', '--ignore-scripts', '--destination', directory, '--quiet'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    execFileSync('tar', ['-xf', filename], { cwd: directory });
    const installed = path.join(directory, 'node_modules');
    mkdirSync(installed);
    renameSync(path.join(directory, 'package'), path.join(installed, 'esbuild-style-loader'));

    const commonjs = path.join(directory, 'consumer.cjs');
    const esm = path.join(directory, 'consumer.mjs');
    writeFileSync(esm, "export { styleLoader } from 'esbuild-style-loader';");
    const loaders = [
      createRequire(commonjs)('esbuild-style-loader').styleLoader,
      (await import(pathToFileURL(esm).href)).styleLoader,
    ];

    writeFileSync(
      path.join(directory, 'consumer.cts'),
      "import loader = require('esbuild-style-loader');\nexport const plugin: import('esbuild').Plugin = loader.styleLoader();",
    );
    writeFileSync(
      path.join(directory, 'consumer.mts'),
      "import { styleLoader, transformLess } from 'esbuild-style-loader';\n" +
        "export const plugin: import('esbuild').Plugin = styleLoader();\nexport const transform = transformLess;",
    );
    writeFileSync(
      path.join(directory, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { module: 'NodeNext', noEmit: true, strict: true, types: ['node', 'less'] },
        files: ['consumer.cts', 'consumer.mts'],
      }),
    );
    execFileSync('bun', ['run', 'tsc', '-p', path.join(directory, 'tsconfig.json')], { cwd: root, stdio: 'inherit' });

    const style = path.join(directory, "样式's theme.css");
    writeFileSync(
      path.join(directory, 'entry.js'),
      `import ${JSON.stringify(style)}; import './theme.scss';`,
    );
    writeFileSync(style, '.example { padding: 20px; font-size: var(-- 15px, 15px); }');
    writeFileSync(path.join(directory, 'theme.scss'), '$size: 24px; .theme { width: $size; }');
    for (const styleLoader of loaders) {
      const warnings = [];
      console.warn = (...args) => warnings.push(args);
      const result = await build({
        absWorkingDir: directory,
        entryPoints: ['entry.js'],
        outdir: 'out',
        bundle: true,
        write: false,
        sourcemap: true,
        logLevel: 'error',
        plugins: [styleLoader()],
      });

      const css = result.outputFiles.find((file) => file.path.endsWith('.css'))?.text;
      assert.match(css, /padding: 20px/);
      assert.match(css, /width: 24px/);
      const diagnostic = warnings.find(([message]) => message.includes('[esbuild-style-loader]'));
      assert.ok(diagnostic, 'Missing fallback warning from packed loader');
      assert.ok(diagnostic[0].includes(style), 'Fallback warning must contain the absolute style path');
      assert.match(diagnostic[1]?.message, /Unexpected token Dimension/);
    }
    console.log('Packed CommonJS and ES modules type-checked and emitted fallback CSS with the original diagnostic.');
  } finally {
    console.warn = originalWarn;
    rmSync(directory, { recursive: true, force: true });
  }
}

testPackage().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
