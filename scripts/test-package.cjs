const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, realpathSync, rmSync, writeFileSync } = require('node:fs');
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
    const packagePath = path.join(directory, 'package');
    const { exports } = require(path.join(packagePath, 'package.json'));
    const loaders = [
      require(packagePath).styleLoader,
      (await import(pathToFileURL(path.join(packagePath, exports['.'].import.default)).href)).styleLoader,
    ];

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
    console.log('Packed CommonJS and ES modules emitted fallback CSS and the original diagnostic.');
  } finally {
    console.warn = originalWarn;
    rmSync(directory, { recursive: true, force: true });
  }
}

testPackage().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
