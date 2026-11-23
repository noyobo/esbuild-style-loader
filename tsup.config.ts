import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  clean: true,
  dts: true,
  noExternal: ['change-case'],
  esbuildOptions(options, { format }) {
    if (format === 'cjs') {
      options.define = { ...options.define, 'import.meta.url': '__filename' };
    } else {
      options.supported = { ...options.supported, 'import-meta': true };
    }
  },
  format: ['cjs', 'esm'],
  outDir: 'lib',
  outExtension: ({ format }) => {
    return {
      js: format === 'cjs' ? '.js' : '.mjs',
    }
  },
  minify: false,
  target: 'es2016',
  sourcemap: true,
});
