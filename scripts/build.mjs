import { copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import manifest from '../package.json' with { type: 'json' };

const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../lib/', import.meta.url);
// Bundle the ESM-only change-case dependency for CommonJS consumers.
const external = [...Object.keys(manifest.dependencies), ...Object.keys(manifest.peerDependencies)].filter(
  (name) => name !== 'change-case',
);
const options = {
  entrypoints: [fileURLToPath(new URL('../src/index.ts', import.meta.url))],
  outdir: fileURLToPath(output),
  target: 'node',
  sourcemap: 'linked',
  external,
};

await rm(output, { recursive: true, force: true });
await Promise.all([
  Bun.build({ ...options, format: 'cjs', naming: 'index.js', define: { 'import.meta.url': '__filename' } }),
  Bun.build({ ...options, format: 'esm', naming: 'index.mjs' }),
]);

const compiler = Bun.spawn(['bun', 'run', 'tsc', '-p', 'tsconfig.build.json'], {
  cwd: root,
  stdout: 'inherit',
  stderr: 'inherit',
});
const code = await compiler.exited;
if (code !== 0) {
  process.exit(code);
}
await copyFile(new URL('index.d.ts', output), new URL('index.d.mts', output));
